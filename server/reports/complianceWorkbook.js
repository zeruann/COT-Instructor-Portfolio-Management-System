// server/reports/complianceWorkbook.js
//
// Builds the Faculty Compliance Checklist workbook from the OFFICIAL template
// (Faculty-Checklist-v13.xlsx or sample-export.xlsx). The template is opened,
// the boxes are ticked, document links are embedded, and the header is filled
// in while preserving the official layout, logos, merged cells, and fonts.
// The redundant "Documents" worksheet is removed so only "Checklist" remains.

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
const EMPTY = '☐';
const BOX_REGEX = /[□☐☑]/;
const SUBJECT_COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // 8 subject columns

const SYMBOL_FONT = { name: 'Segoe UI Symbol', size: 10, color: { argb: 'FF000000' } };
const TEXT_FONT = { name: 'Cambria', size: 10, color: { argb: 'FF000000' } };
const LINK_FONT = { name: 'Cambria', size: 9, color: { argb: 'FF0563C1' }, underline: true };

function toValidLink(raw) {
  const s = String(raw || '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
}

function colLetterToNumber(col) {
  let num = 0;
  for (let i = 0; i < col.length; i += 1) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

function parseCellAddress(addr) {
  const m = /^([A-Z]+)(\d+)$/i.exec(String(addr || '').trim());
  if (!m) return null;
  return { col: colLetterToNumber(m[1].toUpperCase()), row: Number(m[2]) };
}

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

function readBoxLink(cell, sub) {
  if (!cell) return '';
  if (!sub) return cell.link || '';
  const hit =
    cell.items?.find?.((i) => norm(i.label) === norm(sub)) ?? cell.subs?.[sub] ?? cell[sub];
  if (hit !== undefined) return hit?.link || cell.link || '';
  return cell.link || '';
}

/* ------------------------------ CELL WRITERS ------------------------------- */
function splitLeadingBoxRuns(text, mark) {
  const cleaned = String(text || '').replace(BOX_REGEX, '').replace(/^\s+/, '');
  return [
    { font: SYMBOL_FONT, text: `${mark} ` },
    { font: TEXT_FONT, text: cleaned },
  ];
}

function tickLeadingBox(cell, ticked) {
  const mark = ticked ? CHECKED : EMPTY;
  const v = cell.value;

  if (v && typeof v === 'object' && Array.isArray(v.richText)) {
    const oldRuns = v.richText.map((r) => ({
      ...r,
      font: r.font
        ? {
          ...r.font,
          color: r.font.color?.argb ? r.font.color : { argb: 'FF000000' },
        }
        : TEXT_FONT,
    }));

    if (oldRuns[0]) {
      const leadRuns = splitLeadingBoxRuns(oldRuns[0].text, mark);
      cell.value = { richText: [...leadRuns, ...oldRuns.slice(1)] };
    } else {
      cell.value = { richText: oldRuns };
    }
    cell.font = TEXT_FONT;
  } else if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.length <= 2 && BOX_REGEX.test(trimmed)) {
      cell.value = mark;
      cell.font = SYMBOL_FONT;
    } else if (BOX_REGEX.test(v)) {
      cell.value = { richText: splitLeadingBoxRuns(v, mark) };
      cell.font = TEXT_FONT;
    } else {
      cell.value = v;
    }
  }
}

function cellToRuns(cell) {
  const v = cell.value;
  if (v && typeof v === 'object' && Array.isArray(v.richText)) {
    return v.richText.map((r) => ({
      font: r.font ? { ...r.font } : { ...TEXT_FONT },
      text: String(r.text ?? ''),
    }));
  }
  if (typeof v === 'string' && v.length > 0) {
    return [{ font: cell.font ? { ...cell.font } : { ...TEXT_FONT }, text: v }];
  }
  return [];
}

function trimTrailingNewlines(runs) {
  const copy = runs.map((r) => ({ ...r }));
  for (let i = copy.length - 1; i >= 0; i -= 1) {
    copy[i].text = copy[i].text.replace(/\s+$/, '');
    if (copy[i].text.length > 0) break;
    copy.pop();
  }
  return copy;
}

function collectSingleBoxLinks(item) {
  if (!item) return [];
  const validFiles = (item.files || []).filter((f) => Boolean(toValidLink(f?.link)));
  const fallbackLink = toValidLink(item.link);

  if (validFiles.length > 0) {
    const visible = validFiles.slice(0, 3).map((f, idx) => ({
      label:
        f.name && f.name !== 'Document'
          ? String(f.name).trim()
          : validFiles.length > 1
            ? `View File (${idx + 1})`
            : 'View File',
      uri: toValidLink(f.link),
    }));
    if (validFiles.length > 3) {
      visible.push({
        label: `+${validFiles.length - 3} more (${fallbackLink ? 'Open Folder' : 'View More'})`,
        uri: fallbackLink || toValidLink(validFiles[3].link),
      });
    }
    return visible;
  }

  if (fallbackLink) {
    return [
      {
        label: item.name && item.name !== 'Document' ? String(item.name).trim() : 'View File',
        uri: fallbackLink,
      },
    ];
  }

  return [];
}

function buildSubBoxRuns(subs, ticks, links) {
  const runs = [];
  subs.forEach((sub, i) => {
    const mark = ticks[i] ? CHECKED : EMPTY;
    const subLink = links?.[i] || '';
    runs.push({
      font: TEXT_FONT,
      text: `${i > 0 ? '\n' : ''}${sub} `,
    });
    runs.push({
      font: SYMBOL_FONT,
      text: mark,
    });
    if (subLink) {
      runs.push({ font: TEXT_FONT, text: ' ' });
      runs.push({
        font: { ...LINK_FONT, size: 8.5 },
        text: 'View',
        link: subLink,
      });
    }
  });
  return runs;
}

/* -------------------------------- MAIN API --------------------------------- */
async function buildComplianceWorkbookWithLinks(data, { schoolYear, semester } = {}) {
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
  const richLinkCells = [];

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
  const rowLinkCounts = new Map();

  for (const [letter, addr] of Object.entries(SINGLE_CELLS)) {
    let item = byLetter[letter];
    let ticked = isChecked(item);
    if (!byLetter[letter]) {
      const apiRow = classRows.find((r) => norm(r.code).startsWith(letter.toLowerCase()) && norm(r.code).length <= 4);
      if (apiRow) {
        item = apiRow;
        ticked = isChecked(apiRow) || Boolean(apiRow?.values?.some((v) => isChecked(v)));
      }
    }
    const cell = ws.getCell(addr);
    tickLeadingBox(cell, ticked);

    const linkEntries = collectSingleBoxLinks(item);
    if (linkEntries.length > 0) {
      const baseRuns = trimTrailingNewlines(cellToRuns(cell));
      const allRuns = [...baseRuns];
      linkEntries.forEach((entry, idx) => {
        allRuns.push({ font: TEXT_FONT, text: idx === 0 ? '\n' : '\n' });
        allRuns.push({ font: LINK_FONT, text: entry.label, link: entry.uri });
      });
      cell.value = { richText: allRuns.map(({ font, text }) => ({ font, text })) };
      const pos = parseCellAddress(addr);
      if (pos) {
        richLinkCells.push({ row: pos.row, col: pos.col, runs: allRuns });
        rowLinkCounts.set(pos.row, Math.max(rowLinkCounts.get(pos.row) || 0, linkEntries.length));
      }
    }
  }

  // Ensure rows 40-41 (footer O-R) have enough room when file links are added
  for (const [rowNum, maxLinks] of rowLinkCounts.entries()) {
    const r = ws.getRow(rowNum);
    if (rowNum === 40 || rowNum === 41) {
      r.height = Math.max(r.height || 26, 28 + maxLinks * 13);
    } else if (rowNum === 7 && maxLinks >= 2) {
      r.height = Math.max(r.height || 57, 57 + (maxLinks - 1) * 13);
    } else if ((rowNum === 5 || rowNum === 6) && maxLinks >= 3) {
      r.height = Math.max(r.height || 82, (r.height || 82) + (maxLinks - 2) * 12);
    }
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
        const ticks = tpl.subs.map((s) => readBox(apiCell, s));
        const links = tpl.subs.map((s) => toValidLink(readBoxLink(apiCell, s)));
        const runs = buildSubBoxRuns(tpl.subs, ticks, links);
        cell.value = { richText: runs.map(({ font, text }) => ({ font, text })) };
        cell.font = TEXT_FONT;
        if (links.some(Boolean)) {
          richLinkCells.push({
            row: tpl.row,
            col: colLetterToNumber(col),
            runs,
          });
        }
      } else {
        const ticked = readBox(apiCell);
        const cellLink = toValidLink(readBoxLink(apiCell));
        if (cellLink) {
          const mark = ticked ? CHECKED : EMPTY;
          cell.value = { text: `${mark} View File`, hyperlink: cellLink };
          cell.font = LINK_FONT;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          tickLeadingBox(cell, ticked);
        }
      }
    });
  }

  // Ensure no redundant "Documents" worksheet from the template remains
  const existingDocsSheet = wb.getWorksheet('Documents');
  if (existingDocsSheet) {
    wb.removeWorksheet(existingDocsSheet.id);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, richLinkCells };
}

async function buildComplianceWorkbook(data, options = {}) {
  const { buffer } = await buildComplianceWorkbookWithLinks(data, options);
  return buffer;
}

function buildGoogleTextFormatRuns(runs) {
  const out = [];
  let offset = 0;

  for (const run of runs) {
    const text = String(run?.text ?? '');
    if (text.length === 0) continue;

    const format = {};
    if (run.font?.name) format.fontFamily = run.font.name;
    if (run.font?.size) format.fontSize = run.font.size;
    if (typeof run.font?.bold === 'boolean') format.bold = run.font.bold;
    if (typeof run.font?.underline === 'boolean') format.underline = run.font.underline;

    const argb = run.font?.color?.argb;
    if (typeof argb === 'string' && argb.length === 8) {
      format.foregroundColorStyle = {
        rgbColor: {
          red: parseInt(argb.slice(2, 4), 16) / 255,
          green: parseInt(argb.slice(4, 6), 16) / 255,
          blue: parseInt(argb.slice(6, 8), 16) / 255,
        },
      };
    }

    if (run.link) {
      format.link = { uri: run.link };
      format.underline = true;
      format.foregroundColorStyle = {
        rgbColor: { red: 0.02, green: 0.39, blue: 0.76 },
      };
    }

    out.push({ startIndex: offset, format });
    offset += text.length;
  }

  return { fullText: runs.map((r) => String(r?.text ?? '')).join(''), textFormatRuns: out };
}

async function applyRichLinksToGoogleSheet(spreadsheetId, richLinkCells, authCandidates) {
  if (!spreadsheetId || !Array.isArray(richLinkCells) || richLinkCells.length === 0) return;
  const auths = (authCandidates || []).filter(Boolean);
  if (auths.length === 0) return;

  let lastErr = null;
  for (const candidateAuth of auths) {
    try {
      const sheets = google.sheets({ version: 'v4', auth: candidateAuth });
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties(sheetId,title)',
      });
      const checklistSheet =
        meta.data?.sheets?.find((s) => s.properties?.title === 'Checklist') ||
        meta.data?.sheets?.[0];
      const sheetId = checklistSheet?.properties?.sheetId ?? 0;

      const requests = richLinkCells
        .map(({ row, col, runs }) => {
          const { fullText, textFormatRuns } = buildGoogleTextFormatRuns(runs);
          if (!fullText || textFormatRuns.length === 0) return null;
          return {
            updateCells: {
              range: {
                sheetId,
                startRowIndex: row - 1,
                endRowIndex: row,
                startColumnIndex: col - 1,
                endColumnIndex: col,
              },
              rows: [
                {
                  values: [
                    {
                      userEnteredValue: { stringValue: fullText },
                      textFormatRuns,
                    },
                  ],
                },
              ],
              fields: 'userEnteredValue,textFormatRuns',
            },
          };
        })
        .filter(Boolean);

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests },
        });
      }
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr) {
    console.warn('Could not apply rich-text links to exported Google Sheet:', lastErr.message);
  }
}

/* ------------------------- GOOGLE SHEETS ------------------------ */
async function uploadAsGoogleSheet(buffer, { name, auth, sheetsAuth, rootFolderId, richLinkCells } = {}) {
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

  await applyRichLinksToGoogleSheet(res.data.id, richLinkCells, [auth, sheetsAuth]);

  return {
    spreadsheetId: res.data.id,
    spreadsheetUrl: res.data.webViewLink || `https://docs.google.com/spreadsheets/d/${res.data.id}/edit`,
  };
}

module.exports = {
  buildComplianceWorkbook,
  buildComplianceWorkbookWithLinks,
  uploadAsGoogleSheet,
};
