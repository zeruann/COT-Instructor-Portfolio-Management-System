// client/src/pages/instructors/InstructorReports.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  Printer,
  ChevronDown,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  fetchComplianceReportData,
  exportComplianceGoogleSheet,
} from '../../api/reports';
import { downloadCompliancePdf } from '../../utils/compliancePdf';
import {
  FACULTY_ROWS,
  CLASS_ROWS,
  FOOTER_ROWS,
  SUBJECT_COLUMNS,
  computeCompletion,
  findApiRow,
  readBox,
  stateOf,
  isDone,
  isPending,
} from '../../utils/complianceChecklistSchema';
import { readStoredUserRecord } from '../../config/adminPermissions';
import { fetchFacultySummary } from '../../api/documents';
import InstructorAvatar from '../../components/InstructorAvatar';
// Logos extracted from Faculty-Checklist-v13.xlsx. Adjust the path to your assets folder.
import bukSuLogo from '../../assets/buksu-logo.png';
import collegeLogo from '../../assets/college-logo.png';
import googleSheetsIcon from '../../assets/google-sheets.svg';

const SHOW_PERIOD_ON_FORM = true; // the official form has no School Year field; set false to match it exactly

const focusRing =
  'focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 focus:outline-none';

const PRINT_CSS = `
@page { size: A4 portrait; margin: 10mm; }

@media print {
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body * { visibility: hidden !important; }
  #report-print-root, #report-print-root * { visibility: visible !important; }
  #report-print-root { position: absolute; left: 0; top: 0; width: 100%; }

  .report-sheet, .report-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .form-table { font-size: 8.5pt; line-height: 1.25; }
  .report-sheet thead { display: table-header-group; }
  .report-sheet tr, .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .report-sheet a { color: #000 !important; text-decoration: none !important; }
}
`;

const toApiYear = (y) => y.replace('–', '-');

/* -------------------------------------------------------------------------- */
/* PRESENTATIONAL PIECES                                                       */
/* -------------------------------------------------------------------------- */

function Box({ state }) {
  const { checked, pending } = state;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-[11px] w-[11px] shrink-0 items-center justify-center border border-black text-[9px] font-bold leading-none ${pending ? 'bg-amber-200' : 'bg-white'
        }`}
    >
      {checked ? '✓' : pending ? '…' : ''}
    </span>
  );
}

// Shows the original checkbox in place, with a centered "View file" below when a file exists
function Check({ state, label }) {
  const hasFile = (state.checked || state.pending) && Boolean(state.link);

  return (
    <span className="inline-flex flex-col items-center justify-center gap-0.5 text-center">
      <span className="inline-flex items-center justify-center gap-1">
        {label && <span className="text-[10px] font-medium leading-tight text-gray-800">{label}</span>}
        <Box state={state} />
      </span>
      {hasFile && (
        <a
          href={state.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 underline hover:text-blue-900 cursor-pointer text-[10.5px] whitespace-nowrap print:text-black print:no-underline"
          title="Open file in Google Drive"
        >
          View File
        </a>
      )}
    </span>
  );
}

function RedNote({ children }) {
  return <span className="text-[#ff0000]"> {children}</span>;
}

// A boxed requirement (Faculty Portfolio, and the O–R block)
function RequirementCell({ item, state, minH }) {
  if (item.blank) return <td colSpan={item.span} className="border border-black" />;

  const validFiles = (state.files || []).filter((f) => Boolean(f.link));
  const hasFile = (state.checked || state.pending) && (validFiles.length > 0 || Boolean(state.link));
  const singleLink = validFiles[0]?.link || state.link;

  return (
    <td colSpan={item.span} className={`border border-black p-1.5 align-top overflow-hidden ${minH}`}>
      <div className="flex flex-col h-full justify-between gap-1.5 min-w-0 w-full">
        {/* Requirement title & note with the original box in its original place */}
        <div className="flex items-start gap-1.5 min-w-0">
          <span className="mt-[2px] shrink-0">
            <Box state={state} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-gray-900">{item.title}</span>
            {item.note && <RedNote>{item.note}</RedNote>}
          </div>
        </div>

        {/* Requirement/file link(s) centered below the text (only when file exists) */}
        {hasFile && singleLink && (
          <div className="flex flex-col items-center justify-center gap-1 my-auto text-center w-full min-w-0 pt-1">
            {(validFiles.length > 0 ? validFiles : [{ link: singleLink, name: state.fileName || '' }]).map((file, idx, arr) => {
              const displayLabel =
                file.name && file.name !== 'Document'
                  ? file.name
                  : arr.length > 1
                    ? `View File (${idx + 1})`
                    : 'View File';

              return (
                <a
                  key={file.id || idx}
                  href={file.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 underline hover:text-blue-900 cursor-pointer text-[10.5px] leading-tight truncate w-full max-w-full min-w-0 block px-0.5 print:text-black print:no-underline"
                  title={file.name ? `Open ${file.name} in Google Drive` : 'Open file in Google Drive'}
                >
                  {displayLabel}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
}

function SectionBar({ children }) {
  return (
    <tr>
      <td
        colSpan={9}
        className="border border-black bg-[#d9d9d9] py-0.5 text-center font-bold"
      >
        {children}
      </td>
    </tr>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.tone === 'error';
  return (
    <div
      role="status"
      aria-live="polite"
      className="print:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-gray-900 py-3 pl-4 pr-2 text-sm font-medium text-white shadow-xl"
    >
      {isError ? (
        <AlertCircle size={18} className="shrink-0 text-red-400" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={18} className="shrink-0 text-emerald-400" aria-hidden="true" />
      )}
      <span>{toast.message}</span>
      {toast.actionUrl && (
        <a
          href={toast.actionUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-2 inline-flex items-center gap-1 rounded bg-brand-orange px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          {toast.actionLabel || 'Open'}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className={`ml-1 rounded p-1 text-gray-300 hover:text-white ${focusRing}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function SelectField({ id, label, value, onChange, children, badge }) {
  return (
    <div className="min-w-[150px]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-gray-700">
          {label}
        </label>
        {badge}
      </div>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          className={`w-full h-10 appearance-none rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 ${focusRing}`}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                              */
/* -------------------------------------------------------------------------- */

export default function InstructorReports({ instructorId: propInstructorId, onBack } = {}) {
  const [searchParams] = useSearchParams();
  const effectiveInstructorId = propInstructorId || searchParams.get('instructorId') || undefined;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState([]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [error, setError] = useState(null); // { message, retry }
  const [toast, setToast] = useState(null); // { message, tone }
  const [facultySummary, setFacultySummary] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    fetchFacultySummary(effectiveInstructorId)
      .then((sum) => {
        if (isCurrent) setFacultySummary(sum || {});
      })
      .catch((err) => console.warn('Could not load faculty summary for reports:', err));
    return () => {
      isCurrent = false;
    };
  }, [effectiveInstructorId]);

  const completion = useMemo(() => {
    if (facultySummary && Object.keys(facultySummary).length > 0) {
      return computeCompletion(facultySummary);
    }
    const apiPct = data?.instructor?.completionPercentage;
    if (typeof apiPct === 'number') {
      return {
        percent: apiPct,
        approvedPct: apiPct,
        pendingPct: 0,
        rejectedPct: 0,
        counts: null,
      };
    }
    return {
      percent: 0,
      approvedPct: 0,
      pendingPct: 0,
      rejectedPct: 0,
      counts: null,
    };
  }, [facultySummary, data?.instructor?.completionPercentage]);

  const instructorName = data?.instructor?.name || data?.instructorName || 'Instructor';
  const instructorRank = data?.instructor?.rank || 'Assistant Professor IV';
  const instructorDept = data?.instructor?.department || data?.department || 'IT Department';
  const instructorPhoto = data?.instructor?.photoUrl || null;

  const requestId = useRef(0); // ignore outdated responses
  const initializedPeriod = useRef(false);

  const loadReportData = useCallback(async (year, sem) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = { schoolYear: toApiYear(year), semester: sem };
      if (effectiveInstructorId) params.instructorId = effectiveInstructorId;
      const res = await fetchComplianceReportData(params);
      if (id !== requestId.current) return;
      if (res?.success) {
        setData(res);
        if (Array.isArray(res.academicPeriods)) setAvailablePeriods(res.academicPeriods);
        // Initialize the selectors from the active period returned by the report API.
        // Keep later user selections intact when their report requests complete.
        if (!initializedPeriod.current && res.currentPeriod) {
          initializedPeriod.current = true;
          setSchoolYear(String(res.currentPeriod.schoolYear || '').replace('-', '–'));
          const currentSemester = String(res.currentPeriod.semester || '');
          setSemester(
            currentSemester === 'Summer' || currentSemester.endsWith('Semester')
              ? currentSemester
              : `${currentSemester} Semester`
          );
        }
      }
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Error fetching compliance report data:', err);
      setError({
        message: "We couldn't load the report. Check your connection and try again.",
        retry: () => loadReportData(year, sem),
      });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [effectiveInstructorId]);

  useEffect(() => {
    loadReportData('', '');
    // The report endpoint resolves an empty selection to the active period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveInstructorId]);

  const handleYearChange = (e) => {
    setSchoolYear(e.target.value);
    loadReportData(e.target.value, semester);
  };
  const handleSemesterChange = (e) => {
    setSemester(e.target.value);
    loadReportData(schoolYear, e.target.value);
  };

  const isCurrent = useMemo(() => {
    if (!data?.currentPeriod) return false;
    return (
      data.currentPeriod.schoolYear === toApiYear(schoolYear) &&
      (`${data.currentPeriod.semester} Semester` === semester ||
        data.currentPeriod.semester === semester)
    );
  }, [data?.currentPeriod, schoolYear, semester]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.actionUrl ? 12000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Lock the window scroll while this page is open (the layout's inner area still scrolls).
  // Removes the second scrollbar / blank area. Restored when leaving the page.
  useEffect(() => {
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
    };
  }, []);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setError(null);
    try {
      const currentUser = readStoredUserRecord();
      await downloadCompliancePdf({
        data,
        schoolYear: toApiYear(schoolYear),
        semester,
        generatedOn,
        exportedByName: currentUser?.fullName || data?.instructorName || instructorName,
        singleState,
        subjects,
        classRows,
      });
      setToast({ message: 'Checklist PDF downloaded', tone: 'success' });
    } catch (err) {
      console.error('Download PDF error:', err);
      setError({
        message: err.message || "We couldn't create the PDF file. Try again.",
        retry: handleDownloadPdf,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportGoogleSheet = async () => {
    setIsExportingSheets(true);
    setError(null);

    // Open the tab NOW, while the click still counts as a user action (avoids popup blockers)
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.opener = null;
      newTab.document.title = 'Creating Google Sheet…';
      newTab.document.body.innerText = 'Creating your Google Sheet…';
    }

    try {
      const payload = {
        schoolYear: toApiYear(schoolYear),
        semester,
      };
      if (effectiveInstructorId) payload.instructorId = effectiveInstructorId;
      const res = await exportComplianceGoogleSheet(payload);
      if (!res?.spreadsheetUrl) throw new Error('No spreadsheet URL returned');

      if (newTab) {
        newTab.location.href = res.spreadsheetUrl;
        setToast({ message: 'Google Sheet created', tone: 'success' });
      } else {
        setToast({
          message: 'Google Sheet created',
          tone: 'success',
          actionUrl: res.spreadsheetUrl,
          actionLabel: 'Open sheet',
        });
      }
    } catch (err) {
      console.error('Export Google Sheets error:', err);
      if (newTab) newTab.close();
      const apiMsg = err.response?.data?.message;
      setToast({
        message: apiMsg || "Couldn't export to Google Sheets. Check the API settings in the Admin panel.",
        tone: 'error',
      });
    } finally {
      setIsExportingSheets(false);
    }
  };

  // ---- derived data --------------------------------------------------------
  const facultyList = data?.facultyChecklist || [];
  const classSubjects = data?.classChecklist?.subjects || [];
  const classRows = data?.classChecklist?.rows || [];
  const docList = data?.documents || [];

  const facultyByCode = useMemo(() => {
    const m = {};
    facultyList.forEach((i) => {
      m[String(i.code || '').trim().charAt(0).toUpperCase()] = i;
    });
    return m;
  }, [facultyList]);

  const subjects = Array.from({ length: SUBJECT_COLUMNS }, (_, i) => classSubjects[i] || null);
  const hiddenSubjects = Math.max(0, classSubjects.length - SUBJECT_COLUMNS);

  // Status for single-box requirements (Faculty Portfolio and O–R)
  const singleState = (item) => {
    if (item.blank) return stateOf(null);
    const fromFaculty = facultyByCode[item.code];
    if (fromFaculty) return stateOf(fromFaculty);
    const apiRow = findApiRow(classRows, { title: item.title, code: item.code });
    if (!apiRow) return stateOf(null);
    if (apiRow.status) return stateOf(apiRow);
    const vals = Array.isArray(apiRow.values) ? apiRow.values : [];
    const approvedVal = vals.find((v) => isDone(v?.status));
    if (approvedVal) return stateOf(approvedVal);
    const pendingVal = vals.find((v) => isPending(v?.status));
    if (pendingVal) return stateOf(pendingVal);
    return stateOf(vals[0] ?? apiRow);
  };

  const hasNoDocs = !loading && data?.documents && docList.length === 0;
  const busy = loading || !data;

  const generatedOn = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  );

  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ================================ PAGE TITLE ================================ */}
      <div className="print:hidden flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple transition hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 cursor-pointer"
            title="Back to all instructors"
            aria-label="Back to all instructors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
            {effectiveInstructorId && data?.instructorName
              ? `${data.instructorName}'s Reports`
              : 'Reports'}
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Review the Faculty Compliance Checklist, then print it or download it as PDF.
          </p>
        </div>
      </div>

      {/* ============================ TWO-COLUMN LAYOUT ============================ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-start print:block">
        {/* ---------------------- LEFT: PREVIEW (paper) ---------------------- */}
        <div className="order-2 min-w-0 lg:order-1">
          {/* ================================== PAPER =================================== */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-13.5rem)] rounded-xl bg-gray-200/70 p-3 sm:p-6 print:overflow-visible print:bg-transparent print:p-0 print:max-h-none shadow-inner">
            <div
              id="report-print-root"
              className="report-sheet mx-auto w-full min-w-[750px] max-w-[9000px] bg-white text-black shadow-md print:min-w-0 print:max-w-none print:shadow-none"
            >
              {loading ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 px-8 py-28 text-gray-500 print:hidden"
                  role="status"
                >
                  <Loader2 size={30} className="animate-spin text-brand-purple" aria-hidden="true" />
                  <p className="text-sm font-medium">Loading compliance records…</p>
                </div>
              ) : (
                <section
                  aria-label="Checklist sheet"
                  className="p-6 print:p-0"
                >
                    <table
                      className="form-table w-full table-fixed border-collapse border border-black text-[12px] leading-snug"
                      style={{ fontFamily: 'Cambria, "Cambria Math", Georgia, serif' }}
                    >
                      <colgroup>
                        <col style={{ width: '22%' }} />
                        {Array.from({ length: SUBJECT_COLUMNS }, (_, i) => (
                          <col key={i} style={{ width: `${78 / SUBJECT_COLUMNS}%` }} />
                        ))}
                      </colgroup>
                      <tbody>
                        {/* Letterhead */}
                        <tr>
                          <td
                            colSpan={9}
                            className="border border-black px-3 py-2"
                            style={{ fontFamily: '"Times New Roman", Times, serif' }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <img src={bukSuLogo} alt="" className="h-14 w-14 shrink-0 object-contain" />
                              <div className="text-center leading-tight">
                                <p className="text-[13px]">BUKIDNON STATE UNIVERSITY</p>
                                <p className="text-[13px]">COLLEGE OF TECHNOLOGIES</p>
                                <p className="text-[11px]">Malaybalay City, Bukidnon 8700</p>
                                <p className="text-[11px]">
                                  Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph
                                </p>
                                <p className="mt-1 text-[14px] font-bold">Faculty Compliance Checklist</p>
                              </div>
                              <img src={collegeLogo} alt="" className="h-14 w-14 shrink-0 object-contain" />
                            </div>
                          </td>
                        </tr>

                        {/* Faculty name / Department / Date */}
                        <tr style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                          <td className="border border-black px-1.5 py-1 font-bold">Faculty Name:</td>
                          <td colSpan={3} className="border border-black px-1.5 py-1">
                            {data?.instructorName || ''}
                          </td>
                          <td className="border border-black px-1.5 py-1 font-bold">Department:</td>
                          <td colSpan={4} className="border border-black px-1.5 py-1">
                            {data?.department || ''}
                          </td>
                        </tr>
                        <tr style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                          <td className="border border-black px-1.5 py-1 font-bold">Date:</td>
                          <td
                            colSpan={SHOW_PERIOD_ON_FORM ? 3 : 8}
                            className="border border-black px-1.5 py-1"
                          >
                            {generatedOn}
                          </td>
                          {SHOW_PERIOD_ON_FORM && (
                            <td colSpan={5} className="border border-black px-1.5 py-1">
                              <span className="font-bold">S.Y.:</span> {schoolYear}, {semester}
                            </td>
                          )}
                        </tr>

                        {/* Faculty Portfolio */}
                        <SectionBar>Faculty Portfolio</SectionBar>
                        {FACULTY_ROWS.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((item) => (
                              <RequirementCell
                                key={item.code}
                                item={item}
                                state={singleState(item)}
                                minH={ri === 2 ? 'h-14' : 'h-20'}
                              />
                            ))}
                          </tr>
                        ))}

                        {/* Class Portfolio */}
                        <SectionBar>Class Portfolio</SectionBar>
                        <tr>
                          <td className="border border-black px-1.5 py-1">Subject Code</td>
                          {subjects.map((s, i) => (
                            <td key={i} className="border border-black px-1 py-1 text-center font-semibold">
                              {s?.code || ''}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border border-black px-1.5 py-1">Section Code</td>
                          {subjects.map((s, i) => (
                            <td key={i} className="border border-black px-1 py-1 text-center font-semibold">
                              {s?.section || ''}
                            </td>
                          ))}
                        </tr>

                        {CLASS_ROWS.map((tpl, ri) => {
                          if (tpl.type === 'spacer') {
                            return (
                              <tr key={ri}>
                                <td colSpan={9} className="h-3 border border-black" />
                              </tr>
                            );
                          }
                          if (tpl.type === 'section') {
                            return <SectionBar key={ri}>{tpl.title}</SectionBar>;
                          }
                          const apiRow = findApiRow(classRows, tpl);
                          return (
                            <tr key={ri}>
                              <td className="border border-black px-1.5 py-1 align-top">
                                {tpl.title}
                                {tpl.note && <RedNote>{tpl.note}</RedNote>}
                              </td>
                              {subjects.map((s, ci) => {
                                const cell = apiRow?.values?.[ci];
                                return (
                                  <td
                                    key={ci}
                                    className="border border-black px-1 py-1 text-center align-top"
                                  >
                                    {tpl.empty ? null : tpl.subs ? (
                                      <span
                                        className={`inline-flex gap-x-3 gap-y-1 ${tpl.stack ? 'flex-col items-center' : 'flex-wrap justify-center'
                                          }`}
                                      >
                                        {tpl.subs.map((sub) => (
                                          <Check
                                            key={sub}
                                            label={<span>{sub}</span>}
                                            state={s ? readBox(cell, sub) : stateOf(null)}
                                          />
                                        ))}
                                      </span>
                                    ) : (
                                      <Check state={s ? readBox(cell) : stateOf(null)} />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {/* O–R footer block */}
                        {FOOTER_ROWS.map((row, ri) => (
                          <tr key={`f${ri}`}>
                            {row.map((item, i) => (
                              <RequirementCell
                                key={item.code || `b${i}`}
                                item={item}
                                state={singleState(item)}
                                minH="h-10"
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
              )}
            </div>
          </div>
        </div>





        {/* ------------------- RIGHT: PERIOD + DOWNLOAD (sticky panel) ------------------- */}

        <aside className="order-1 lg:order-2 lg:sticky lg:top-0 print:hidden shrink-0 self-start overscroll-contain">
          <div className="space-y-3.5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">

            {/* Header */}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Faculty Compliance Checklist
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                Choose the period, then download the official form or print it.
              </p>
            </div>

            {/* Instructor Status Progress Card (without button) */}
            <div className="flex min-w-0 items-center gap-3.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-2xs">
              {/* Left: Avatar */}
              <InstructorAvatar
                src={instructorPhoto}
                alt={instructorName}
                size="h-14 w-14 sm:h-16 sm:w-16"
                className="bg-orange-50 border border-orange-100"
                iconClassName="h-8 w-8 text-orange-400 sm:h-9 sm:w-9"
              />

              {/* Right: Info + Progress */}
              <div className="min-w-0 flex-1">
                <h3
                  title={instructorName}
                  className="truncate text-sm sm:text-base font-bold leading-tight text-brand-orange"
                >
                  {instructorName}
                </h3>
                <p className="mt-0.5 truncate text-xs font-normal text-gray-500">
                  {instructorRank}
                </p>
                <p className="truncate text-xs font-normal text-gray-400">
                  {instructorDept}
                </p>

                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-[#2e2a72]">
                      Completion Status
                    </span>
                    <span className="shrink-0 font-bold text-[#10b981]">
                      {completion?.percent != null ? `${completion.percent}%` : '0%'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    {completion?.approvedPct > 0 && (
                      <div
                        style={{ width: `${completion.approvedPct}%` }}
                        className="bg-[#10b981] transition-all duration-300"
                        title={`Approved: ${Math.round(completion.approvedPct)}%`}
                      />
                    )}
                    {completion?.pendingPct > 0 && (
                      <div
                        style={{ width: `${completion.pendingPct}%` }}
                        className="bg-amber-400 transition-all duration-300"
                        title={`Pending: ${Math.round(completion.pendingPct)}%`}
                      />
                    )}
                    {completion?.rejectedPct > 0 && (
                      <div
                        style={{ width: `${completion.rejectedPct}%` }}
                        className="bg-red-400 transition-all duration-300"
                        title={`Rejected: ${Math.round(completion.rejectedPct)}%`}
                      />
                    )}
                    {(!completion?.percent || completion?.percent === 0) &&
                      !completion?.pendingPct &&
                      !completion?.rejectedPct && (
                        <div className="w-full bg-gray-200" />
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Period Selection */}
            <div className="space-y-2.5">
              <SelectField
                id="school-year-select"
                label="School year"
                value={schoolYear}
                onChange={handleYearChange}
              >
                {availablePeriods.length > 0 ? (
                  Array.from(
                    new Set(availablePeriods.map((p) => p.schoolYear))
                  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map((year) => (
                    <option key={year} value={year.replace('-', '–')}>
                      {year.replace('-', '–')}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="2026–2027">2026–2027</option>
                    <option value="2025–2026">2025–2026</option>
                  </>
                )}
              </SelectField>

              <SelectField
                id="semester-select"
                label="Semester"
                value={semester}
                onChange={handleSemesterChange}
                badge={
                  isCurrent && (
                    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Current
                    </span>
                  )
                }
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </SelectField>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                  aria-hidden="true"
                />

                <div className="flex-1">
                  <p>{error.message}</p>

                  <button
                    type="button"
                    onClick={error.retry}
                    className={`mt-1.5 inline-flex items-center gap-1 rounded font-semibold text-red-700 underline hover:text-red-900 ${focusRing}`}
                  >
                    <RotateCw size={13} aria-hidden="true" />
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Export and Print Actions */}
            <div className="space-y-2">

              {/* Row 1: Google Sheets - Full Width */}
              <button
                type="button"
                onClick={handleExportGoogleSheet}
                disabled={isExportingSheets || busy}
                className={`group flex h-10.5 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50/70 hover:text-emerald-800 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
              >
                {isExportingSheets ? (
                  <Loader2
                    size={16}
                    className="animate-spin text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <img
                    src={googleSheetsIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-4.5 w-4.5 shrink-0 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                )}

                <span>
                  {isExportingSheets
                    ? 'Exporting…'
                    : 'Export to Google Sheets'}
                </span>
              </button>

              {/* Row 2: Download PDF + Print */}
              <div className="grid grid-cols-[1.6fr_0.8fr] gap-2">

                {/* Download PDF - Wider */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || busy}
                  className={`flex h-10.5 w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                >
                  {isGeneratingPdf ? (
                    <Loader2
                      size={15}
                      className="animate-spin shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Download
                      size={15}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                  )}

                  <span className="truncate">
                    {isGeneratingPdf ? 'Creating PDF…' : 'Download PDF'}
                  </span>
                </button>

                {/* Print - Narrower */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={busy}
                  className={`flex h-10.5 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                >
                  <Printer size={15} className="shrink-0" aria-hidden="true" />
                  Print
                </button>

              </div>
            </div>

            {/* Print Information */}
            <p className="text-center text-[11px] leading-tight text-gray-400">
              {hasNoDocs
                ? 'You have no uploaded documents yet, so every box is empty.'
                : 'Print gives you the official Faculty Compliance Checklist.'}
            </p>

            {/* Box Guide */}
            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs text-gray-600">
              <p className="font-semibold text-gray-800">
                Box guide
              </p>

              <p className="flex items-center gap-2">
                <Box state={{ checked: true }} />
                <span>Approved</span>
              </p>

              <p className="flex items-center gap-2">
                <Box state={{ pending: true }} />
                <span>Pending review</span>
              </p>

              <p className="flex items-center gap-2">
                <Box state={{}} />
                <span>Not submitted</span>
              </p>
            </div>

            {/* Hidden Subjects Warning */}
            {hiddenSubjects > 0 && (
              <p
                role="note"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
              >
                The official form has room for {SUBJECT_COLUMNS} classes.{' '}
                {hiddenSubjects} more{' '}
                {hiddenSubjects === 1 ? 'class is' : 'classes are'} not shown
                on the printed form.
              </p>
            )}

          </div>
        </aside>



      </div>
    </div>
  );
}
