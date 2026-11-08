const AuditLog = require('../models/AuditLog');

const DOCUMENT_NAMES = {
    FAC_B_BACHELORS_DIPLOMA: "Bachelor's Diploma",
    FAC_B_BACHELORS_TOR: "Bachelor's Transcript of Records (TOR)",
    FAC_B_MASTERS_DIPLOMA: "Master's Diploma",
    FAC_B_MASTERS_TOR: "Master's Transcript of Records (TOR)",
    FAC_B_PHD_DIPLOMA: "PhD Diploma",
    FAC_B_PHD_TOR: "PhD Transcript of Records (TOR)",
    FAC_A_PDS: "Personal Data Sheet (PDS)",
    FAC_C_SERVICE_RECORD: "Service Records",
    FAC_D_SEMINAR: "Seminars & Workshops",
    FAC_E_AWARD: "Grants & Awards",
    FAC_F_RESEARCH: "Research",
    FAC_G_EXTENSION: "Extension Involvement",
    FAC_H_PRODUCTION: "Production",
    FAC_I_MEMBERSHIP: "Professional Organization Membership",
    FAC_J_LICENSURE: "Passed Licensure Examinations (PRC ID)",
    FAC_L_IPCR: "IPCR",
    FAC_X_PERFORMANCE_EVAL: "Performance Evaluation",
    FAC_X_EMPLOYMENT_CONTRACT: "Employment Contract",
    FAC_X_MEDICAL_CLEARANCE: "Medical Clearance",
    CLS_SYLLABUS: "Course Syllabus",
    CLS_TOS: "Table of Specifications (TOS)",
    CLS_EXAM: "Examination Questionnaire",
    CLS_RUBRIC: "Grading Rubric",
    CLS_GRADESHEET: "Grading Sheet",
    CLS_ATTENDANCE: "Class Attendance",
    CLS_CLASS_RECORD: "Class Record",
    CLS_INSTRUCTIONAL_MATERIAL: "Instructional Material",
};

const formatDocumentLabel = (keyOrName) => {
    if (!keyOrName || keyOrName === '—') return '—';
    if (DOCUMENT_NAMES[keyOrName]) return DOCUMENT_NAMES[keyOrName];
    if (typeof keyOrName === 'string' && /^[A-Z0-9]+_[A-Z0-9_]+$/.test(keyOrName)) {
        return keyOrName
            .replace(/^(FAC_[A-Z]_|CLS_[A-Z]_|FAC_|CLS_)/, '')
            .replace(/_/g, ' ')
            .toLowerCase()
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }
    return keyOrName;
};

const formatDetailsText = (details) => {
    if (!details || details === '—') return '—';
    return details.replace(/\b(FAC_[A-Z]_[A-Z0-9_]+|FAC_[A-Z0-9_]+|CLS_[A-Z0-9_]+)\b/g, (match) =>
        formatDocumentLabel(match)
    );
};

// GET /api/settings/audit-logs (Administrator gets all, Instructor gets their own)
exports.getAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            action,
            actorRole,
            search,
            startDate,
            endDate,
        } = req.query;

        const query = {};

        // If regular instructor, restrict strictly to their own activities
        if (req.user?.accountType !== 'Administrator') {
            query.actorId = req.user.id;
        } else if (actorRole && actorRole !== 'all') {
            // Admin can filter by role
            query.actorRole = actorRole;
        }

        // Category filter: support grouped 'system' and 'document' categories
        if (category && category !== 'all') {
            if (category === 'system') {
                query.$or = [
                    { category: { $in: ['auth', 'account', 'system', 'settings'] } },
                    { action: { $regex: '^(auth|account|system|settings)\\.' } },
                ];
            } else if (category === 'document') {
                query.$or = [
                    { category: 'document' },
                    { action: { $regex: '^document\\.' } },
                ];
            } else {
                query.category = category;
            }
        }

        // Specific Action filter
        if (action && action !== 'all') {
            query.action = action;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.at = {};
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                query.at.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                query.at.$lte = eDate;
            }
        }

        // Search across Log ID, action, details, document name, file name, actor, target
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            const searchConditions = [
                { logId: searchRegex },
                { action: searchRegex },
                { details: searchRegex },
                { documentName: searchRegex },
                { fileName: searchRegex },
                { targetLabel: searchRegex },
                { actorName: searchRegex },
            ];

            if (query.$or) {
                // If there was already an $or from category, combine them with $and
                query.$and = [{ $or: query.$or }, { $or: searchConditions }];
                delete query.$or;
            } else {
                query.$or = searchConditions;
            }
        }

        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const [rawLogs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ at: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            AuditLog.countDocuments(query),
        ]);

        const logs = rawLogs.map((item, index) => {
            const yr = new Date(item.at || Date.now()).getFullYear();
            let cleanLogId = item.logId;

            if (cleanLogId && /^LOG\d{4}-\d+$/i.test(cleanLogId)) {
                cleanLogId = cleanLogId.toUpperCase();
            } else {
                const digits = (item.logId || '').replace(/\D/g, '');
                const suffix = digits
                    ? digits.slice(-4)
                    : (item._id ? String(parseInt(item._id.toString().slice(-4), 16) % 10000) : String(index + 1));
                cleanLogId = `LOG${yr}-${suffix.padStart(4, '0')}`;
            }

            const documentRaw =
                item.documentName ||
                item.targetLabel ||
                item.meta?.document ||
                '—';

            const document = formatDocumentLabel(documentRaw);

            const detailsRaw =
                item.details ||
                (item.meta?.changedFields && Array.isArray(item.meta.changedFields)
                    ? `Changed: ${item.meta.changedFields.join(', ')}`
                    : item.targetLabel || '—');

            const details = formatDetailsText(detailsRaw);

            const fileName =
                item.fileName ||
                item.meta?.fileName ||
                item.meta?.originalName ||
                '—';

            return {
                ...item,
                logId: cleanLogId,
                details,
                document,
                fileName,
            };
        });

        res.json({
            logs,
            total,
            totalPages: Math.ceil(total / parsedLimit),
            currentPage: parsedPage,
        });
    } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        res.status(500).json({ message: 'Failed to retrieve audit logs.' });
    }
};

