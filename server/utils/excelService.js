// server/utils/excelService.js
const ExcelJS = require('exceljs');

/**
 * Builds an authentic BukSU Faculty Compliance Checklist workbook
 * with 2 sheets:
 * 1. "Checklist" - Exact reproduction of BukSU College of Technologies Faculty Compliance Checklist
 * 2. "Documents" - Complete table of submitted files with status and Google Drive links
 */
async function generateComplianceWorkbook({
  instructorName = 'Juan Dela Cruz',
  department = 'IT Department',
  schoolYear = '2026-2027',
  semester = '1st Semester',
  facultyChecklist = [],
  classChecklist = { subjects: [], rows: [] },
  documents = [],
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bukidnon State University - College of Technologies';
  workbook.created = new Date();

  // Common styles
  const FONT_NAME = 'Arial';
  const BORDER_THIN = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
  const BORDER_MEDIUM = {
    top: { style: 'medium', color: { argb: 'FF000000' } },
    left: { style: 'medium', color: { argb: 'FF000000' } },
    bottom: { style: 'medium', color: { argb: 'FF000000' } },
    right: { style: 'medium', color: { argb: 'FF000000' } },
  };
  const FILL_SECTION_HEADER = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }, // Light gray section bar
  };
  const FILL_SUB_HEADER = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }, // Very light gray sub bar
  };

  function applyBoxBorders(ws, startCol, startRow, endCol, endRow) {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c);
        cell.border = {
          top: r === startRow ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.top,
          bottom: r === endRow ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.bottom,
          left: c === startCol ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.left,
          right: c === endCol ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.right,
        };
      }
    }
  }

  // =========================================================================
  // TAB 1: CHECKLIST (Official BukSU Layout)
  // =========================================================================
  const sheet = workbook.addWorksheet('Checklist', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // 9 Columns: A = Requirement (width ~42), B to I = 8 Subject/Section slots (width ~14 each)
  sheet.columns = [
    { width: 44 }, // A: Requirement / Category Label
    { width: 14 }, // B: Class 1
    { width: 14 }, // C: Class 2
    { width: 14 }, // D: Class 3
    { width: 14 }, // E: Class 4
    { width: 14 }, // F: Class 5
    { width: 14 }, // G: Class 6
    { width: 14 }, // H: Class 7
    { width: 14 }, // I: Class 8
  ];

  // -------------------------------------------------------------------------
  // 1. UNIVERSITY LETTERHEAD
  // -------------------------------------------------------------------------
  sheet.mergeCells('A1:I1');
  sheet.getCell('A1').value = 'BUKIDNON STATE UNIVERSITY';
  sheet.getCell('A1').font = { name: FONT_NAME, size: 12, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:I2');
  sheet.getCell('A2').value = 'COLLEGE OF TECHNOLOGIES';
  sheet.getCell('A2').font = { name: FONT_NAME, size: 10, bold: true };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A3:I3');
  sheet.getCell('A3').value = 'Malaybalay City, Bukidnon 8700';
  sheet.getCell('A3').font = { name: FONT_NAME, size: 8 };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A4:I4');
  sheet.getCell('A4').value = 'Tel: (088) 813-5661 to 5663; Telefax: (088) 813-2717, www.buksu.edu.ph';
  sheet.getCell('A4').font = { name: FONT_NAME, size: 8 };
  sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A5:I5');
  sheet.getCell('A5').value = 'Faculty Compliance Checklist';
  sheet.getCell('A5').font = { name: FONT_NAME, size: 11, bold: true };
  sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  // -------------------------------------------------------------------------
  // 2. FACULTY METADATA BAR
  // -------------------------------------------------------------------------
  // Row 6: Faculty Name & Department
  sheet.mergeCells('A6:E6');
  sheet.getCell('A6').value = `Faculty Name:  ${instructorName}`;
  sheet.getCell('A6').font = { name: FONT_NAME, size: 9, bold: true };
  sheet.getCell('A6').alignment = { vertical: 'middle' };

  sheet.mergeCells('F6:I6');
  sheet.getCell('F6').value = `Department:  ${department}`;
  sheet.getCell('F6').font = { name: FONT_NAME, size: 9, bold: true };
  sheet.getCell('F6').alignment = { vertical: 'middle' };

  // Row 7: Date & School Year
  sheet.mergeCells('A7:E7');
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  sheet.getCell('A7').value = `Date:  ${dateStr}`;
  sheet.getCell('A7').font = { name: FONT_NAME, size: 9 };
  sheet.getCell('A7').alignment = { vertical: 'middle' };

  sheet.mergeCells('F7:I7');
  sheet.getCell('F7').value = `School Year:  ${schoolYear}, ${semester}`;
  sheet.getCell('F7').font = { name: FONT_NAME, size: 9 };
  sheet.getCell('F7').alignment = { vertical: 'middle' };

  applyBoxBorders(sheet, 1, 6, 9, 7);

  // -------------------------------------------------------------------------
  // 3. FACULTY PORTFOLIO (11 BOXES GRID)
  // -------------------------------------------------------------------------
  sheet.mergeCells('A8:I8');
  const fpBar = sheet.getCell('A8');
  fpBar.value = 'Faculty Portfolio';
  fpBar.font = { name: FONT_NAME, size: 10, bold: true };
  fpBar.alignment = { horizontal: 'center', vertical: 'middle' };
  fpBar.fill = FILL_SECTION_HEADER;
  sheet.getRow(8).height = 20;
  applyBoxBorders(sheet, 1, 8, 9, 8);

  // Helper map from code to status/link
  const fpMap = {};
  (facultyChecklist || []).forEach((item) => {
    fpMap[item.code] = item;
  });

  function getFacultyRichValue(code, title, redHint) {
    const item = fpMap[code] || {};
    const isChecked = item.status && item.status.startsWith('☑');
    const boxPrefix = isChecked ? '☑ ' : '☐ ';
    const runs = [
      { text: `${boxPrefix}${code} ${title} `, font: { name: FONT_NAME, size: 8, bold: true } },
    ];
    if (redHint) {
      runs.push({ text: `${redHint}\n`, font: { name: FONT_NAME, size: 7, color: { argb: 'FFDC2626' }, italic: true } });
    }
    if (item.link) {
      runs.push({
        text: `\n→ ${item.status || 'View Document'}`,
        font: { name: FONT_NAME, size: 8, color: { argb: 'FF2563EB' }, underline: true },
      });
    } else if (item.status && item.status !== '☐') {
      runs.push({
        text: `\n(${item.status})`,
        font: { name: FONT_NAME, size: 7.5, color: { argb: isChecked ? 'FF16A34A' : 'FFEAB308' } },
      });
    }
    return { richText: runs };
  }

  // Row 9-10 (4 boxes across 9 columns: A-B, C-D, E-F, G-I)
  sheet.mergeCells('A9:B10');
  sheet.getCell('A9').value = getFacultyRichValue('A 1.0', 'Faculty Profile', '(Updated PDS)');
  sheet.getCell('A9').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('C9:D10');
  sheet.getCell('C9').value = getFacultyRichValue('B 1.0', 'Educational Attainment', '(TOR, Diploma or Certificate of Unit earned of Bachelors, Masters and PhD)');
  sheet.getCell('C9').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('E9:F10');
  sheet.getCell('E9').value = getFacultyRichValue('C 1.0', 'Service Records', '');
  sheet.getCell('E9').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('G9:I10');
  sheet.getCell('G9').value = getFacultyRichValue('D 1.0', 'List of Seminar, Workshop and sample copies', '(Updated list from PDS and Certificates of seminar workshops from August 2019-present) (Log all your Seminars, Workshops moving forward)');
  sheet.getCell('G9').alignment = { vertical: 'top', wrapText: true };

  applyBoxBorders(sheet, 1, 9, 2, 10);
  applyBoxBorders(sheet, 3, 9, 4, 10);
  applyBoxBorders(sheet, 5, 9, 6, 10);
  applyBoxBorders(sheet, 7, 9, 9, 10);

  // Row 11-12 (4 boxes: A-B, C-D, E-F, G-I)
  sheet.mergeCells('A11:B12');
  sheet.getCell('A11').value = getFacultyRichValue('E 1.0', 'Grants, Awards, Certification of commendation', '(Speakership) - (Arrange from Late to present)');
  sheet.getCell('A11').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('C11:D12');
  sheet.getCell('C11').value = getFacultyRichValue('F 1.0', 'Research proposals, and finished/Published', '(Arrange from Late to present and Certificate of publication and abstract)');
  sheet.getCell('C11').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('E11:F12');
  sheet.getCell('E11').value = getFacultyRichValue('G 1.0', 'Extension Involvement', '(Certificates of extension involvement, project leaders training designs etc.)');
  sheet.getCell('E11').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('G11:I12');
  sheet.getCell('G11').value = getFacultyRichValue('H 1.0', 'Production', "(Published IM's, Copyrighted, Patent and Utility Models) (Certificates of Copyrighted IM's, Patent or utility model approved application)");
  sheet.getCell('G11').alignment = { vertical: 'top', wrapText: true };

  applyBoxBorders(sheet, 1, 11, 2, 12);
  applyBoxBorders(sheet, 3, 11, 4, 12);
  applyBoxBorders(sheet, 5, 11, 6, 12);
  applyBoxBorders(sheet, 7, 11, 9, 12);

  // Row 13-14 (3 boxes across: A-C, D-F, G-I)
  sheet.mergeCells('A13:C14');
  sheet.getCell('A13').value = getFacultyRichValue('I 1.0', 'Membership to professional organization', '(Sample copy of professional membership form present)');
  sheet.getCell('A13').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('D13:F14');
  sheet.getCell('D13').value = getFacultyRichValue('J 1.0', 'Passed Licensure Examinations', '(Sample copy of PRC ID)');
  sheet.getCell('D13').alignment = { vertical: 'top', wrapText: true };

  sheet.mergeCells('G13:I14');
  sheet.getCell('G13').value = getFacultyRichValue('L 1.0', 'IPCR', '(Photocopy of IPCR from 1st and 2nd sem, current school year)');
  sheet.getCell('G13').alignment = { vertical: 'top', wrapText: true };

  applyBoxBorders(sheet, 1, 13, 3, 14);
  applyBoxBorders(sheet, 4, 13, 6, 14);
  applyBoxBorders(sheet, 7, 13, 9, 14);

  // -------------------------------------------------------------------------
  // 4. CLASS PORTFOLIO (Official Matrix Layout)
  // -------------------------------------------------------------------------
  sheet.mergeCells('A15:I15');
  const cpBar = sheet.getCell('A15');
  cpBar.value = 'Class Portfolio';
  cpBar.font = { name: FONT_NAME, size: 10, bold: true };
  cpBar.alignment = { horizontal: 'center', vertical: 'middle' };
  cpBar.fill = FILL_SECTION_HEADER;
  sheet.getRow(15).height = 20;
  applyBoxBorders(sheet, 1, 15, 9, 15);

  // Assigned classes (up to 8 subjects in columns B through I)
  const assignedSubjects = (classChecklist.subjects && classChecklist.subjects.length > 0)
    ? classChecklist.subjects
    : [
      { code: 'IT 141', section: 'T40' },
      { code: 'IT 149', section: 'T75' },
      { code: 'IT 122', section: 'T61' },
    ];

  // Row 16: Subject Code Header
  sheet.getCell('A16').value = 'Subject Code';
  sheet.getCell('A16').font = { name: FONT_NAME, size: 8.5, bold: true };
  sheet.getCell('A16').fill = FILL_SUB_HEADER;

  // Row 17: Section Code Header
  sheet.getCell('A17').value = 'Section Code';
  sheet.getCell('A17').font = { name: FONT_NAME, size: 8.5, bold: true };
  sheet.getCell('A17').fill = FILL_SUB_HEADER;

  for (let sIdx = 0; sIdx < 8; sIdx++) {
    const colNumber = sIdx + 2; // B is 2, I is 9
    const subj = assignedSubjects[sIdx];
    const subjCell = sheet.getCell(16, colNumber);
    const secCell = sheet.getCell(17, colNumber);

    subjCell.value = subj ? subj.code : '';
    subjCell.font = { name: FONT_NAME, size: 8.5, bold: true };
    subjCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subjCell.fill = FILL_SUB_HEADER;

    secCell.value = subj ? subj.section : '';
    secCell.font = { name: FONT_NAME, size: 8.5, bold: true };
    secCell.alignment = { horizontal: 'center', vertical: 'middle' };
    secCell.fill = FILL_SUB_HEADER;
  }
  applyBoxBorders(sheet, 1, 16, 9, 17);

  // Full structure of Class Portfolio rows matching BukSU form
  const matrixRows = [
    { code: 'A 1.0', label: 'Instructional Load Report', red: '' },
    { code: 'B 1.0', label: 'Official Class list', red: '(SIAS and Google Classroom)' },
    { code: 'C 1.0', label: 'Syllabus', red: '(with Form 17 and 18 include draft)' },
    { code: 'D 1.0', label: 'Instructional Materials', red: '' },
    { code: 'E 1.0', label: 'Classroom Policies Acknowledgement Receipt', red: '' },
    { code: 'F 1.0', label: 'Syllabus Acknowledgement Receipt', red: '' },
    { code: 'G 1.0', label: 'Seat Plan', red: '' },
    { code: 'H 1.0', label: 'Classroom Officers (with Signatures)', red: '' },
    { code: 'I 1.0', label: 'Attendance', red: '' },
    { code: 'J 1.0', label: 'Preliminary Test - Test Checker and Item Analyzer', red: '' },
    { code: 'K 1.0', label: 'Signed TOS', red: '(Midterm / Finalterm)', isTOS: true },
    { code: 'L 1.0', label: 'Test Questionnaire', red: '(Midterm / Finalterm)', isTOS: true },
    // Banner 1.1.0
    { isBanner: true, text: '1.1.0 Sample Checked Activities' },
    { code: '1.1.1', label: 'Instruction of the Activities (per Course Outcome)', isCO: true },
    { code: '1.1.2', label: 'Sample of Checked Student Output (3 students highest, middle, lowest)', isCO: true },
    { code: '1.1.3', label: 'Answer Key or Rated Rubrics', isCO: true },
    { code: '1.1.4', label: 'Return Output Receipt', isCO: false },
    // Banner M 1.0
    { isBanner: true, text: 'M 1.0 Class record and official grade' },
    { code: 'M 1.1', label: 'Raw score (class record) attached some (samples from LMS)' },
    { code: 'M 1.2', label: 'Grade sheet (class record) signed' },
    { code: 'M 1.3', label: 'Official Grade sheet (Registrar)' },
    { code: 'M 1.4', label: 'Google Classroom Classwork Score' },
    // Banner N 1.0
    { isBanner: true, text: 'N 1.0 Student consultation forms' },
    { code: 'N 1.1', label: 'Student Consultation Forms' },
    { code: 'N 1.2', label: 'Samples Screen shots of online consultation platforms (with section code)' },
    { code: 'N 1.3', label: 'Evidence of addressing the student concerns (with section code)' },
  ];

  let curRow = 18;
  matrixRows.forEach((item) => {
    if (item.isBanner) {
      sheet.mergeCells(`A${curRow}:I${curRow}`);
      const bCell = sheet.getCell(`A${curRow}`);
      bCell.value = item.text;
      bCell.font = { name: FONT_NAME, size: 9, bold: true };
      bCell.fill = FILL_SUB_HEADER;
      bCell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyBoxBorders(sheet, 1, curRow, 9, curRow);
      sheet.getRow(curRow).height = 18;
      curRow++;
      return;
    }

    // Label cell
    const labelCell = sheet.getCell(`A${curRow}`);
    const runs = [{ text: `${item.code} ${item.label} `, font: { name: FONT_NAME, size: 8 } }];
    if (item.red) {
      runs.push({ text: item.red, font: { name: FONT_NAME, size: 7.5, color: { argb: 'FFDC2626' }, italic: true } });
    }
    labelCell.value = { richText: runs };
    labelCell.alignment = { vertical: 'middle', wrapText: true };

    // Fill each subject column
    for (let sIdx = 0; sIdx < 8; sIdx++) {
      const colNum = sIdx + 2;
      const cell = sheet.getCell(curRow, colNum);
      const subj = assignedSubjects[sIdx];

      if (!subj) {
        cell.value = '';
      } else if (item.isTOS) {
        cell.value = 'Midterm ☐\nFinalterm ☐';
        cell.font = { name: FONT_NAME, size: 7.5 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else if (item.isCO) {
        cell.value = 'CO1☐ CO2☐\nCO3☐ CO4☐';
        cell.font = { name: FONT_NAME, size: 7 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else {
        cell.value = '☐';
        cell.font = { name: FONT_NAME, size: 8, color: { argb: 'FF9CA3AF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    applyBoxBorders(sheet, 1, curRow, 9, curRow);
    sheet.getRow(curRow).height = item.isTOS || item.isCO ? 24 : 18;
    curRow++;
  });

  // Bottom Rows: O & P
  sheet.mergeCells(`A${curRow}:D${curRow}`);
  sheet.getCell(`A${curRow}`).value = {
    richText: [
      { text: '☐ O 1.0 INC Completion requirement outputs ', font: { name: FONT_NAME, size: 8, bold: true } },
      { text: '(Sample Activity of the students attached assessment tools & INC form)', font: { name: FONT_NAME, size: 7, color: { argb: 'FFDC2626' }, italic: true } },
    ],
  };
  sheet.getCell(`A${curRow}`).alignment = { vertical: 'middle', wrapText: true };

  sheet.mergeCells(`E${curRow}:I${curRow}`);
  sheet.getCell(`E${curRow}`).value = {
    richText: [
      { text: '☐ P 1.0 Supervisory class observation result ', font: { name: FONT_NAME, size: 8, bold: true } },
      { text: '(Class observation rating of supervisors (chair/Dean))', font: { name: FONT_NAME, size: 7, color: { argb: 'FFDC2626' }, italic: true } },
    ],
  };
  sheet.getCell(`E${curRow}`).alignment = { vertical: 'middle', wrapText: true };
  applyBoxBorders(sheet, 1, curRow, 4, curRow);
  applyBoxBorders(sheet, 5, curRow, 9, curRow);
  sheet.getRow(curRow).height = 24;
  curRow++;

  // Bottom Rows: Q & R
  sheet.mergeCells(`A${curRow}:D${curRow}`);
  sheet.getCell(`A${curRow}`).value = {
    richText: [
      { text: '☐ Q 1.0 Summary of student evaluation ', font: { name: FONT_NAME, size: 8, bold: true } },
      { text: '(QAMIS Ratings screen shots and Sample comments/corrective actions)', font: { name: FONT_NAME, size: 7, color: { argb: 'FFDC2626' }, italic: true } },
    ],
  };
  sheet.getCell(`A${curRow}`).alignment = { vertical: 'middle', wrapText: true };

  sheet.mergeCells(`E${curRow}:I${curRow}`);
  sheet.getCell(`E${curRow}`).value = '☐ R 1.0 Learning Contract';
  sheet.getCell(`E${curRow}`).font = { name: FONT_NAME, size: 8, bold: true };
  sheet.getCell(`E${curRow}`).alignment = { vertical: 'middle' };
  applyBoxBorders(sheet, 1, curRow, 4, curRow);
  applyBoxBorders(sheet, 5, curRow, 9, curRow);
  sheet.getRow(curRow).height = 24;

  // =========================================================================
  // TAB 2: DOCUMENTS
  // =========================================================================
  const docSheet = workbook.addWorksheet('Documents', {
    views: [{ showGridLines: true }],
  });

  docSheet.columns = [
    { header: 'Requirement', key: 'requirement', width: 34 },
    { header: 'Document Title', key: 'title', width: 30 },
    { header: 'Date Uploaded', key: 'date', width: 16 },
    { header: 'File Name', key: 'filename', width: 26 },
    { header: 'Review Status', key: 'status', width: 18 },
    { header: 'Google Drive Link', key: 'link', width: 22 },
  ];

  const docHeaderRow = docSheet.getRow(1);
  docHeaderRow.height = 26;
  docHeaderRow.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  docHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF575488' }, // Brand purple header
  };
  docHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };

  (documents || []).forEach((item, index) => {
    const row = docSheet.addRow({
      requirement: item.requirement || '—',
      title: item.title || item.originalName || '—',
      date: item.date || '—',
      filename: item.filename || item.originalName || '—',
      status: item.status || 'Pending review',
      link: item.link ? { text: 'Open in Drive', hyperlink: item.link } : '—',
    });

    row.height = 20;
    row.font = { name: FONT_NAME, size: 8.5 };

    const statusCell = row.getCell('status');
    statusCell.font = {
      name: FONT_NAME,
      size: 8.5,
      bold: true,
      color: {
        argb: item.status === 'Approved' ? 'FF16A34A' : item.status === 'Rejected' ? 'FFDC2626' : 'FFEAB308',
      },
    };

    if (item.link) {
      row.getCell('link').font = { name: FONT_NAME, size: 8.5, color: { argb: 'FF2563EB' }, underline: true };
    }

    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = BORDER_THIN;
    }
  });

  return workbook;
}

module.exports = {
  generateComplianceWorkbook,
};
