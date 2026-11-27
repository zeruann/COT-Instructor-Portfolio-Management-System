import { jsPDF } from 'jspdf';
import bukSuLogo from '../assets/buksu-logo.png';
import collegeLogo from '../assets/college-logo.png';
import {
  FACULTY_ROWS,
  CLASS_ROWS,
  FOOTER_ROWS,
  SUBJECT_COLUMNS,
  CHECKLIST_PAGE1_CLASS_COUNT,
  findApiRow,
  readBox,
  stateOf,
} from './complianceChecklistSchema';

const A4_W = 210;
const MARGIN = 5.08; // 0.2 inches (288 twips) on all sides
const CONTENT_W = A4_W - MARGIN * 2; // 199.84 mm
const LABEL_COL_W = 44.0;
const SUBJ_COL_W = (CONTENT_W - LABEL_COL_W) / SUBJECT_COLUMNS; // ~19.48 mm
const TABLE_START_Y = 33.5;
const FOOTER_Y = 287.5;
const BORDER_WIDTH_MM = 0.18;

// Normalize curly punctuation so WinAnsi built-in fonts render cleanly
function cleanText(val) {
  return String(val ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

function loadImageDataUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCheckbox(pdf, x, y, state, size = 2.6) {
  pdf.saveGraphicsState();
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(0, 0, 0);
  if (state?.pending) {
    pdf.setFillColor(253, 230, 138);
    pdf.rect(x, y, size, size, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text('...', x + size / 2, y + size - 0.6, { align: 'center' });
  } else {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, size, size, 'FD');
    if (state?.checked) {
      pdf.setLineWidth(0.32);
      pdf.line(x + size * 0.2, y + size * 0.55, x + size * 0.44, y + size * 0.78);
      pdf.line(x + size * 0.44, y + size * 0.78, x + size * 0.82, y + size * 0.24);
    }
  }
  pdf.restoreGraphicsState();
}

function drawLinkText(pdf, text, url, x, y, fontSize = 7.5, align = 'left') {
  const safe = cleanText(text);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);
  pdf.setTextColor(5, 99, 193);
  const w = pdf.getTextWidth(safe);
  const leftX = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  pdf.text(safe, leftX, y);
  pdf.setDrawColor(5, 99, 193);
  pdf.setLineWidth(0.15);
  pdf.line(leftX, y + 0.4, leftX + w, y + 0.4);
  if (url) {
    pdf.link(leftX, y - fontSize * 0.35, w, fontSize * 0.45, { url });
  }
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);
  pdf.setTextColor(0, 0, 0);
}

/**
 * Wraps and draws multi-segment inline text (`normal` black + optional `red` note)
 * starting after the checkbox inside a box cell.
 */
function drawRichInlineLines(pdf, title, note, x, y, maxW, fontSize = 7.8, lineH = 3.25) {
  const words = [];
  cleanText(title)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((w) => words.push({ text: w, red: false }));
  if (note) {
    cleanText(note)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => words.push({ text: w, red: true }));
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);
  const spaceW = pdf.getTextWidth(' ');

  const lines = [];
  let line = [];
  let lineW = 0;

  words.forEach((tok) => {
    const w = pdf.getTextWidth(tok.text);
    const needed = line.length > 0 ? spaceW + w : w;
    if (line.length > 0 && lineW + needed > maxW) {
      lines.push(line);
      line = [tok];
      lineW = w;
    } else {
      line.push(tok);
      lineW += needed;
    }
  });
  if (line.length > 0) lines.push(line);

  lines.forEach((ln, li) => {
    let cursorX = x;
    const cursorY = y + li * lineH;
    ln.forEach((tok, ti) => {
      const piece = ti > 0 ? ` ${tok.text}` : tok.text;
      if (tok.red) pdf.setTextColor(220, 0, 0);
      else pdf.setTextColor(0, 0, 0);
      pdf.text(piece, cursorX, cursorY);
      cursorX += pdf.getTextWidth(piece);
    });
  });

  pdf.setTextColor(0, 0, 0);
  return lines.length * lineH;
}

function drawLetterhead(pdf, logos) {
  if (logos.left) {
    pdf.addImage(logos.left, 'PNG', 38.5, 8.2, 18.5, 17.0);
  }
  if (logos.right) {
    pdf.addImage(logos.right, 'PNG', 153.0, 7.8, 19.2, 18.6);
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('BUKIDNON STATE UNIVERSITY', A4_W / 2, 12.2, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('COLLEGE OF TECHNOLOGIES', A4_W / 2, 16.3, { align: 'center' });

  pdf.setFontSize(7.5);
  pdf.text('Malaybalay City, Bukidnon 8700', A4_W / 2, 19.6, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text('Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph', A4_W / 2, 22.6, {
    align: 'center',
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.text('Faculty Compliance Checklist', A4_W / 2, 27.6, { align: 'center' });
}

function drawFooter(pdf, exporter, exportDateStr, pageNum, totalPages) {
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(`Exported By: ${cleanText(exporter)}  |  ${exportDateStr}`, MARGIN, FOOTER_Y);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Page ${pageNum} of ${totalPages}`, A4_W - MARGIN, FOOTER_Y, { align: 'right' });
}

function drawSectionBar(pdf, title, y, h = 5.4) {
  pdf.setFillColor(217, 217, 217);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);
  pdf.rect(MARGIN, y, CONTENT_W, h, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(cleanText(title), A4_W / 2, y + h / 2 + 1.0, { align: 'center' });
  return y + h;
}

function colX(colIdx) {
  if (colIdx === 0) return MARGIN;
  return MARGIN + LABEL_COL_W + (colIdx - 1) * SUBJ_COL_W;
}

function colSpanWidth(startCol, span) {
  let w = 0;
  for (let i = 0; i < span; i++) {
    w += startCol + i === 0 ? LABEL_COL_W : SUBJ_COL_W;
  }
  return w;
}

function drawBoxedRow(pdf, items, y, height, singleState, isCompact = false) {
  let curCol = 0;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);

  items.forEach((item) => {
    const x = colX(curCol);
    const w = colSpanWidth(curCol, item.span);
    curCol += item.span;

    pdf.rect(x, y, w, height, 'S');
    if (item.blank) return;

    const state = singleState(item);
    const padX = 1.5;
    const padY = isCompact ? 1.8 : 2.0;
    drawCheckbox(pdf, x + padX, y + padY, state, 2.5);

    const textX = x + padX + 3.6;
    const textMaxW = w - (padX * 2 + 3.6);
    const fontSize = isCompact ? 7.4 : 7.8;
    const lineH = isCompact ? 3.05 : 3.25;
    const textH = drawRichInlineLines(pdf, item.title, item.note, textX, y + padY + 2.2, textMaxW, fontSize, lineH);

    // Optional uploaded file links inside box when space remains
    const validFiles = (state.files || []).filter((f) => Boolean(f.link));
    const hasFile = (state.checked || state.pending) && (validFiles.length > 0 || Boolean(state.link));
    const singleLink = validFiles[0]?.link || state.link;
    if (hasFile && singleLink) {
      const linkYStart = y + padY + textH + 2.2;
      const list = validFiles.length > 0 ? validFiles : [{ link: singleLink, name: state.fileName || '' }];
      list.slice(0, 2).forEach((file, idx) => {
        const ly = linkYStart + idx * 3.1;
        if (ly > y + height - 1.2) return;
        let label = cleanText(file.name && file.name !== 'Document' ? file.name : list.length > 1 ? `View File (${idx + 1})` : 'View File');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        while (label.length > 4 && pdf.getTextWidth(label) > w - 4) {
          label = `${label.slice(0, -4)}...`;
        }
        drawLinkText(pdf, label, file.link, x + w / 2, ly, 7, 'center');
      });
    }
  });

  return y + height;
}

function drawClassRow(pdf, tpl, y, height, apiRow, subjects) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);

  // Label cell
  pdf.rect(MARGIN, y, LABEL_COL_W, height, 'S');
  const labelW = LABEL_COL_W - 2.6;
  const fullWords = [];
  cleanText(tpl.title).split(/\s+/).filter(Boolean).forEach((w) => fullWords.push({ text: w, red: false }));
  if (tpl.note) cleanText(tpl.note).split(/\s+/).filter(Boolean).forEach((w) => fullWords.push({ text: w, red: true }));

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.6);
  const spaceW = pdf.getTextWidth(' ');
  const lines = [];
  let ln = [];
  let lw = 0;
  fullWords.forEach((tok) => {
    const tw = pdf.getTextWidth(tok.text);
    const need = ln.length > 0 ? spaceW + tw : tw;
    if (ln.length > 0 && lw + need > labelW) {
      lines.push(ln);
      ln = [tok];
      lw = tw;
    } else {
      ln.push(tok);
      lw += need;
    }
  });
  if (ln.length > 0) lines.push(ln);

  const lineH = 3.1;
  const totalTextH = lines.length * lineH;
  const startY = y + Math.max(3.2, (height - totalTextH) / 2 + 2.2);
  lines.forEach((rowTokens, li) => {
    let cx = MARGIN + 1.3;
    const cy = startY + li * lineH;
    rowTokens.forEach((tok, ti) => {
      const piece = ti > 0 ? ` ${tok.text}` : tok.text;
      if (tok.red) pdf.setTextColor(220, 0, 0);
      else pdf.setTextColor(0, 0, 0);
      pdf.text(piece, cx, cy);
      cx += pdf.getTextWidth(piece);
    });
  });
  pdf.setTextColor(0, 0, 0);

  // 8 subject cells
  subjects.forEach((s, ci) => {
    const cx = colX(ci + 1);
    pdf.rect(cx, y, SUBJ_COL_W, height, 'S');
    if (tpl.empty) return;

    const cell = s ? apiRow?.values?.[ci] : undefined;
    if (!tpl.subs) {
      const st = s ? readBox(cell) : stateOf(null);
      const boxY = st.link && (st.checked || st.pending) ? y + height / 2 - 2.3 : y + (height - 2.6) / 2;
      drawCheckbox(pdf, cx + (SUBJ_COL_W - 2.6) / 2, boxY, st, 2.6);
      if (st.link && (st.checked || st.pending)) {
        drawLinkText(pdf, 'View File', st.link, cx + SUBJ_COL_W / 2, boxY + 5.3, 6.5, 'center');
      }
      return;
    }

    // Sub-checkboxes (Midterm / Finalterm or CO 1..CO 5)
    const count = tpl.subs.length;
    const pitch = count === 2 ? 5.2 : 4.5;
    const blockH = count * pitch;
    const topY = y + Math.max(1.8, (height - blockH) / 2);

    tpl.subs.forEach((sub, si) => {
      const st = s ? readBox(cell, sub) : stateOf(null);
      const rowY = topY + si * pitch;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(0, 0, 0);
      const lbl = cleanText(sub);
      const lblW = pdf.getTextWidth(lbl);
      const totalItemW = lblW + 1.2 + 2.5;
      const startX = cx + (SUBJ_COL_W - totalItemW) / 2;
      pdf.text(lbl, startX, rowY + 2.4);
      drawCheckbox(pdf, startX + lblW + 1.2, rowY + 0.2, st, 2.5);
    });
  });

  return y + height;
}

function getPage1ClassRowHeight(tpl) {
  if (tpl.subs) return 13.5;
  if (['B', 'C', 'E', 'F', 'H', 'J'].includes(tpl.code)) return 9.0;
  return 6.6;
}

function getPage2ClassRowHeight(tpl) {
  if (tpl.type === 'spacer') return 4.6;
  if (tpl.subs?.length === 5) return 25.5;
  if (tpl.subs?.length === 2) return 13.5;
  if (tpl.title.includes('Raw score') || tpl.title.includes('online consultation') || tpl.title.includes('Evidence')) {
    return 12.2;
  }
  if (tpl.title.includes('Grade sheet') || tpl.title.includes('Google Classroom')) return 9.0;
  return 6.6;
}

function drawPage1Checklist(pdf, logos, { data, generatedOn, schoolYear, semester, singleState, subjects, classRows }) {
  drawLetterhead(pdf, logos);
  let y = TABLE_START_Y;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);
  pdf.setTextColor(0, 0, 0);

  // Faculty Name & Department row
  const rowH = 6.8;
  const col1W = LABEL_COL_W;
  const col2W = SUBJ_COL_W * 3;
  const col3W = SUBJ_COL_W;
  const col4W = SUBJ_COL_W * 4;

  pdf.rect(MARGIN, y, col1W, rowH, 'S');
  pdf.rect(MARGIN + col1W, y, col2W, rowH, 'S');
  pdf.rect(MARGIN + col1W + col2W, y, col3W, rowH, 'S');
  pdf.rect(MARGIN + col1W + col2W + col3W, y, col4W, rowH, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Faculty Name:', MARGIN + 1.5, y + 4.4);
  pdf.text(cleanText(data?.instructorName || ''), MARGIN + col1W + col2W / 2, y + 4.4, { align: 'center' });
  pdf.text('Department:', MARGIN + col1W + col2W + 1.2, y + 4.4);
  pdf.text(cleanText(data?.department || ''), MARGIN + col1W + col2W + col3W + col4W / 2, y + 4.4, {
    align: 'center',
  });
  y += rowH;

  // Date & Period row
  pdf.rect(MARGIN, y, col1W, rowH, 'S');
  pdf.rect(MARGIN + col1W, y, CONTENT_W - col1W, rowH, 'S');
  pdf.text('Date:', MARGIN + 1.5, y + 4.4);
  const dateLine = [generatedOn, schoolYear && `S.Y. ${schoolYear}`, semester].filter(Boolean).join(' · ');
  pdf.text(cleanText(dateLine), MARGIN + col1W + 1.8, y + 4.4);
  y += rowH;

  // Faculty Portfolio
  y = drawSectionBar(pdf, 'Faculty Portfolio', y, 5.4);
  const facultyHeights = [28.0, 37.0, 20.0];
  FACULTY_ROWS.forEach((row, idx) => {
    y = drawBoxedRow(pdf, row, y, facultyHeights[idx], singleState);
  });

  // Class Portfolio
  y = drawSectionBar(pdf, 'Class Portfolio', y, 5.4);

  // Subject Code & Section Code
  ['Subject Code', 'Section Code'].forEach((label, rowIdx) => {
    const h = 7.0;
    pdf.rect(MARGIN, y, LABEL_COL_W, h, 'S');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(label, MARGIN + 1.5, y + 4.5);

    subjects.forEach((s, ci) => {
      const cx = colX(ci + 1);
      pdf.rect(cx, y, SUBJ_COL_W, h, 'S');
      const val = rowIdx === 0 ? s?.code : s?.section;
      if (val) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(cleanText(val), cx + SUBJ_COL_W / 2, y + 4.5, { align: 'center' });
      }
    });
    y += h;
  });

  // Class Rows A 1.0 -> K. 1.0 Signed TOS
  const page1Class = CLASS_ROWS.slice(0, CHECKLIST_PAGE1_CLASS_COUNT);
  page1Class.forEach((tpl) => {
    const apiRow = findApiRow(classRows, tpl);
    y = drawClassRow(pdf, tpl, y, getPage1ClassRowHeight(tpl), apiRow, subjects);
  });
}

function drawPage2Checklist(pdf, logos, { classRows, subjects, singleState }) {
  pdf.addPage('a4', 'portrait');
  drawLetterhead(pdf, logos);
  let y = TABLE_START_Y;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(BORDER_WIDTH_MM);

  const page2Class = CLASS_ROWS.slice(CHECKLIST_PAGE1_CLASS_COUNT);
  page2Class.forEach((tpl, idx) => {
    if (tpl.type === 'spacer') {
      // Template only keeps the final spacer row between Section N and Footer O–R
      if (idx !== page2Class.length - 1) return;
      pdf.rect(MARGIN, y, CONTENT_W, getPage2ClassRowHeight(tpl), 'S');
      y += getPage2ClassRowHeight(tpl);
    } else if (tpl.type === 'section') {
      y = drawSectionBar(pdf, tpl.title, y, 5.4);
    } else {
      const apiRow = findApiRow(classRows, tpl);
      y = drawClassRow(pdf, tpl, y, getPage2ClassRowHeight(tpl), apiRow, subjects);
    }
  });

  // Footer boxes O–R
  FOOTER_ROWS.forEach((row) => {
    y = drawBoxedRow(pdf, row, y, 13.0, singleState, true);
  });
}

/**
 * Generates a 2-page vector A4 Portrait PDF matching the official BukSU COT
 * Portfolio Checklist template (0.2 in margins, hairline borders, repeating
 * letterhead, Exported By + Page X of 2 footers, and clickable file hyperlinks).
 */
export async function downloadCompliancePdf({
  data,
  schoolYear,
  semester,
  generatedOn,
  exportedByName,
  singleState,
  subjects,
  classRows,
} = {}) {
  const [leftLogo, rightLogo] = await Promise.all([
    loadImageDataUrl(bukSuLogo),
    loadImageDataUrl(collegeLogo),
  ]);
  const logos = { left: leftLogo, right: rightLogo };

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  drawPage1Checklist(pdf, logos, {
    data,
    generatedOn,
    schoolYear,
    semester,
    singleState,
    subjects,
    classRows,
  });

  drawPage2Checklist(pdf, logos, {
    classRows,
    subjects,
    singleState,
  });

  // Stamp repeating footer with accurate total page count on every page
  const now = new Date();
  const exportDateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  const exporter = String(exportedByName || data?.instructorName || 'FACULTY').toUpperCase();
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawFooter(pdf, exporter, exportDateStr, p, totalPages);
  }

  const safeYear = String(schoolYear || 'Academic').replace(/[^\w-]+/g, '_');
  const safeSem = semester ? `_${String(semester).replace(/[^\w-]+/g, '_')}` : '';
  const safeName = data?.instructorName ? `_${String(data.instructorName).trim().replace(/[^\w-]+/g, '_')}` : '';
  pdf.save(`Compliance_Checklist${safeName}_${safeYear}${safeSem}.pdf`);
}
