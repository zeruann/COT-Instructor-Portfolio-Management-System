// server/reports/complianceWorkbook.js
//
// Builds the Faculty Compliance Checklist workbook from the OFFICIAL template
// (Faculty-Checklist-v13.xlsx or sample-export.xlsx). The template is opened,
// the boxes are ticked and the header is filled in, preserving the official
// layout, logos, merged cells, fonts, and print setup. A second "Documents"
// sheet lists every file with its link. The same buffer is used for the
// .xlsx download AND the Google Sheets export.

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const ExcelJS = require('exceljs');
const { google } = require('googleapis');

function resolveTemplatePath() {
  const p1 = path.join(__dirname, 'templates', 'Faculty-Checklist-v13.xlsx');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(__dirname, 'templates', 'sample-export.xlsx');
  if (fs.existsSync(p2)) return p2;
  return p1;
}

const CHECKED = '☑';
const EMPTY = '□';
const SUBJECT_COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // 8 subject columns

/* ------------------------------ TEMPLATE MAP ------------------------------- */
const SINGLE_CELLS = {
  A: 'A5', B: 'B5', C: 'D5', D: 'F5',
  E: 'A6', F: 'B6', G: 'D6', H: 'G6',
  I: 'A7', J: 'C7', L: 'E7',
  O: 'A40', P: 'F40', Q: 'A41', R: 'E41',
};

const TERMS = ['Midterm', 'Finalterm'];
const COS = ['CO 1', 'CO 2', 'CO 3', 'CO 4', 'CO 5'];
const CLASS_ROWS = [
  { row: 11, code: 'A', title: 'Instructional Load Report' },
  { row: 12, code: 'B', title: 'Official Class list' },
  { row: 13, code: 'C', title: 'Syllabus' },
  { row: 14, code: 'D', title: 'Instructional Materials' },
  { row: 15, code: 'E', title: 'Classroom Policies Acknowledgement Receipt' },
  { row: 16, code: 'F', title: 'Syllabus Acknowledgement Receipt' },
  { row: 17, code: 'G', title: 'Seat Plan' },
  { row: 18, code: 'H', title: 'Classroom Officers' },
  { row: 19, code: 'I', title: 'Attendance' },
  { row: 20, code: 'J', title: 'Preliminary Test' },
  { row: 21, code: 'K', title: 'Signed TOS', subs: TERMS },
  { row: 22, code: 'L', title: 'Test Questionaire', subs: TERMS },
  { row: 24, title: 'Instruction of the Activities', subs: COS },
  { row: 25, title: 'Sample of Checked Student Output', subs: COS },
  { row: 26, title: 'Answer Key or Rated Rubrics', subs: COS },
  { row: 30, title: 'Raw score (class record) attached' },
  { row: 31, title: 'Grade sheet (class record) signed' },
  { row: 32, title: 'Official Grade sheet (Registrar)' },
  { row: 33, title: 'Google Classroom Classwork Score' },
  { row: 36, title: 'Student Consultation Forms' },
  { row: 37, title: 'Samples Screen shots of online consultation platforms' },
  { row: 38, title: 'Evidence of addressing the student concerns' },
];

/* ------------------------------ DATA HELPERS ------------------------------- */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isDone = (s = '') => String(s).startsWith('☑');

function isChecked(x) {
  if (x == null) return false;
  if (typeof x === 'boolean') return x;
  if (typeof x === 'string') return isDone(x);
  return isDone(x.status);
}

function findApiRow(apiRows, tpl) {
  if (!Array.isArray(apiRows)) return undefined;
  const t = norm(tpl.title);
  const bare = (r) => norm(r.label).replace(/^[a-z]10/, '');
  return (
    apiRows.find((r) => bare(r) === t) ||
    (tpl.code
      ? apiRows.find((r) => norm(r.code).startsWith(norm(tpl.code)) && norm(r.code).length <= 4)
      : undefined) ||
    apiRows.find((r) => bare(r) && (bare(r).includes(t) || t.includes(bare(r))))
  );
}

function readBox(cell, sub) {
  if (!cell) return false;
  if (!sub) return isChecked(cell);
  const hit =
    cell.items?.find?.((i) => norm(i.label) === norm(sub)) ?? cell.subs?.[sub] ?? cell[sub];
  if (hit !== undefined) return isChecked(hit);
  return isChecked(cell);
}

/* ------------------------------ CELL WRITERS ------------------------------- */
function tickLeadingBox(cell, ticked) {
  const mark = ticked ? CHECKED : EMPTY;
  const v = cell.value;
  if (v && typeof v === 'object' && Array.isArray(v.richText)) {
    const runs = v.richText.map((r) => ({ ...r }));
    if (runs[0]) runs[0].text = runs[0].text.replace(EMPTY, mark);
    cell.value = { richText: runs };
  } else if (typeof v === 'string') {
    cell.value = v.replace(EMPTY, mark);
  }
}

function tickSubBoxes(cell, subs, ticks) {
  if (typeof cell.value !== 'string') return;
  let text = cell.value;
  subs.forEach((sub, i) => {
    if (!ticks[i]) return;
    text = text.replace(`${sub} ${EMPTY}`, `${sub} ${CHECKED}`);
  });
  cell.value = text;
}

/* -------------------------------- MAIN API --------------------------------- */
async function buildComplianceWorkbook(data, { schoolYear, semester } = {}) {
  const wb = new ExcelJS.Workbook();
  const templatePath = resolveTemplatePath();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];
  ws.name = 'Checklist';

  // Letterhead height and print setup adjustments
  ws.getRow(1).height = 72;
  const a1 = ws.getCell('A1').value;
  const a1Rich = a1?.richText ?? a1?.text?.richText;
  if (a1Rich) ws.getCell('A1').value = { richText: a1Rich };
  [15, 16, 18].forEach((r) => (ws.getRow(r).height = 26));
  ws.getRow(20).height = 48;
  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
  };

  const faculty = data?.facultyChecklist || [];
  const subjects = data?.classChecklist?.subjects || [];
  const classRows = data?.classChecklist?.rows || [];
  const docs = data?.documents || [];

  /* Header block */
  ws.getCell('B2').value = data?.instructorName || '';
  ws.getCell('F2').value = data?.department || '';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  ws.getCell('B3').value = [today, schoolYear && `S.Y. ${schoolYear}`, semester].filter(Boolean).join(' · ');
  ws.getCell('B3').alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getCell('B3').font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF000000' } };

  /* Faculty Portfolio + O–R: single boxes */
  const byLetter = {};
  faculty.forEach((i) => {
    byLetter[String(i.code || '').trim().charAt(0).toUpperCase()] = i;
  });
  for (const [letter, addr] of Object.entries(SINGLE_CELLS)) {
    let ticked = isChecked(byLetter[letter]);
    if (!ticked && !byLetter[letter]) {
      const apiRow = classRows.find((r) => norm(r.code).startsWith(letter.toLowerCase()) && norm(r.code).length <= 4);
      ticked = isChecked(apiRow?.values?.[0] ?? apiRow);
    }
    tickLeadingBox(ws.getCell(addr), ticked);
  }

  /* Class Portfolio header: subject + section codes */
  SUBJECT_COLS.forEach((col, i) => {
    ws.getCell(`${col}9`).value = subjects[i]?.code || '';
    ws.getCell(`${col}10`).value = subjects[i]?.section || '';
  });

  /* Class Portfolio matrix */
  for (const tpl of CLASS_ROWS) {
    const apiRow = findApiRow(classRows, tpl);
    SUBJECT_COLS.forEach((col, i) => {
      const cell = ws.getCell(`${col}${tpl.row}`);
      const apiCell = subjects[i] ? apiRow?.values?.[i] : undefined;
      if (tpl.subs) {
        tickSubBoxes(cell, tpl.subs, tpl.subs.map((s) => readBox(apiCell, s)));
      } else {
        tickLeadingBox(cell, readBox(apiCell));
      }
    });
  }

  /* Second sheet: every uploaded file with its link */
  addDocumentsSheet(wb, docs, { schoolYear, semester });

  return wb.xlsx.writeBuffer();
}

function addDocumentsSheet(wb, docs, { schoolYear, semester }) {
  // If a Documents sheet already exists in the template, remove or re-use it
  let ds = wb.getWorksheet('Documents');
  if (ds) {
    wb.removeWorksheet(ds.id);
  }

  ds = wb.addWorksheet('Documents', {
    views: [{ state: 'frozen', ySplit: 3 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '3:3',
    },
  });
  const font = { name: 'Cambria', size: 10 };
  const thin = { style: 'thin', color: { argb: 'FF000000' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ds.columns = [
    { width: 44 }, { width: 34 }, { width: 14 }, { width: 38 }, { width: 18 }, { width: 18 },
  ];

  ds.mergeCells('A1:F1');
  ds.getCell('A1').value = `Uploaded Documents${schoolYear ? ` · ${schoolYear}, ${semester}` : ''}`;
  ds.getCell('A1').font = { ...font, size: 12, bold: true };

  const headers = ['Requirement', 'Title', 'Date', 'File Name', 'Status', 'Link'];
  const head = ds.getRow(3);
  headers.forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { ...font, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    c.border = border;
    c.alignment = { vertical: 'middle' };
  });

  (docs || []).forEach((d, idx) => {
    const r = ds.getRow(4 + idx);
    [d.requirement, d.title, d.date, d.filename, d.status].forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v ?? '';
      c.font = font;
      c.border = border;
      c.alignment = { vertical: 'top', wrapText: true };
    });
    const link = r.getCell(6);
    link.value = d.link ? { text: 'View Document', hyperlink: d.link } : '—';
    link.font = d.link ? { ...font, color: { argb: 'FF0563C1' }, underline: true } : font;
    link.border = border;
    link.alignment = { vertical: 'top' };
  });

  if (!docs || docs.length === 0) {
    ds.mergeCells('A4:F4');
    ds.getCell('A4').value = 'No uploaded documents yet.';
    ds.getCell('A4').font = { ...font, italic: true };
  } else {
    ds.autoFilter = { from: 'A3', to: `F${3 + docs.length}` };
  }
}

/* ------------------------- GOOGLE SHEETS ------------------------ */
async function uploadAsGoogleSheet(buffer, { name, auth, rootFolderId }) {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      ...(rootFolderId ? { parents: [rootFolderId] } : {}),
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from(Buffer.from(buffer)),
    },
    fields: 'id, webViewLink',
  });
  return {
    spreadsheetId: res.data.id,
    spreadsheetUrl: res.data.webViewLink || `https://docs.google.com/spreadsheets/d/${res.data.id}/edit`,
  };
}

module.exports = {
  buildComplianceWorkbook,
  uploadAsGoogleSheet,
};
