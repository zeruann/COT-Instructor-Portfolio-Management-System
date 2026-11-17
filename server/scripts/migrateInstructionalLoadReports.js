// server/scripts/migrateInstructionalLoadReports.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Document = require('../models/Document');
const Class = require('../models/Class');

const STATUS_RANK = {
  approved: 3,
  pending_review: 2,
  rejected: 1,
  draft: 0,
};

async function migrateInstructionalLoadReports() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment.');
  }

  const isStandalone = mongoose.connection.readyState === 0;
  if (isStandalone) {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for Instructional Load Report migration.');
  }

  try {
    const docs = await Document.find({ requirementKey: 'CLASS_A_LOAD_REPORT' });
    console.log(`Found ${docs.length} Instructional Load Report documents across the database.`);

    // Group by ownerId and academicPeriodId
    const groups = new Map();
    for (const doc of docs) {
      const groupKey = `${doc.ownerId}:${doc.academicPeriodId || 'none'}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(doc);
    }

    let deduplicatedCount = 0;
    let updatedCount = 0;

    for (const [groupKey, groupDocs] of groups.entries()) {
      const [ownerId, periodIdStr] = groupKey.split(':');
      const academicPeriodId = periodIdStr !== 'none' ? periodIdStr : null;

      // Query all current active classes for this instructor & period
      const classQuery = { ownerId, archivedAt: null };
      if (academicPeriodId) {
        classQuery.academicPeriodId = academicPeriodId;
      }
      const activeClasses = await Class.find(classQuery).select('_id');
      const activeClassIdStrs = activeClasses.map((c) => c._id.toString());

      if (groupDocs.length > 1) {
        // Sort to pick the best document
        groupDocs.sort((a, b) => {
          const rankA = STATUS_RANK[a.status] ?? 0;
          const rankB = STATUS_RANK[b.status] ?? 0;
          if (rankB !== rankA) return rankB - rankA;

          const verA = a.versions?.length || 0;
          const verB = b.versions?.length || 0;
          if (verB !== verA) return verB - verA;

          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const primaryDoc = groupDocs[0];
        const dupDocs = groupDocs.slice(1);
        const dupIds = dupDocs.map((d) => d._id);

        // Gather all classIds from primary, duplicates, and active classes
        const combinedClassIds = Array.from(
          new Set([
            ...(primaryDoc.classIds || []).map(String),
            ...dupDocs.flatMap((d) => (d.classIds || []).map(String)),
            ...activeClassIdStrs,
          ])
        );

        primaryDoc.classIds = combinedClassIds;
        primaryDoc.slotKey = Document.buildSlotKey({
          ownerId: primaryDoc.ownerId,
          requirementKey: 'CLASS_A_LOAD_REPORT',
          academicPeriodId: primaryDoc.academicPeriodId,
          classIds: [],
        });
        await primaryDoc.save();

        // Delete duplicate MongoDB records only (DO NOT delete files from Google Drive)
        await Document.deleteMany({ _id: { $in: dupIds } });

        console.log(
          `Deduplicated ${dupDocs.length} duplicate(s) for instructor ${ownerId} in period ${periodIdStr}. Retained doc: ${primaryDoc._id} (status: ${primaryDoc.status}, linked to ${combinedClassIds.length} classes).`
        );
        deduplicatedCount += dupDocs.length;
        updatedCount += 1;
      } else {
        const primaryDoc = groupDocs[0];
        const combinedClassIds = Array.from(
          new Set([...(primaryDoc.classIds || []).map(String), ...activeClassIdStrs])
        );
        primaryDoc.classIds = combinedClassIds;
        primaryDoc.slotKey = Document.buildSlotKey({
          ownerId: primaryDoc.ownerId,
          requirementKey: 'CLASS_A_LOAD_REPORT',
          academicPeriodId: primaryDoc.academicPeriodId,
          classIds: [],
        });
        await primaryDoc.save();
        updatedCount += 1;
      }
    }

    console.log(
      `Migration completed. Total groups: ${groups.size}, deduplicated documents removed: ${deduplicatedCount}, documents standardized: ${updatedCount}.`
    );
    return { groups: groups.size, deduplicatedCount, updatedCount };
  } finally {
    if (isStandalone) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed.');
    }
  }
}

if (require.main === module) {
  migrateInstructionalLoadReports()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateInstructionalLoadReports;

