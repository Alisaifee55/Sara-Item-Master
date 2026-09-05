import ExcelJS from 'exceljs';
import { FILL_KINDS } from './constants.js';
import { addLiveConditionalFormatting } from './conditionalFormat.js';

/** Thrown when the workbook can't be parsed at all — corrupt / password-protected / not really .xlsx. */
export class UnreadableWorkbookError extends Error {}

/**
 * Read the first worksheet of an uploaded file into a plain grid of strings.
 * @param {File} file
 * @returns {Promise<{ workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, rows: string[][] }>}
 */
export async function readWorkbook(file) {
  const workbook = new ExcelJS.Workbook();
  let buffer;
  try {
    buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  } catch (err) {
    throw new UnreadableWorkbookError(err && err.message ? err.message : 'Could not parse workbook');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new UnreadableWorkbookError('Workbook has no readable sheet');
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values.slice(1); // exceljs rows are 1-indexed with a leading undefined
    rows.push(values.map((v) => cellToString(v)));
  });

  if (rows.length === 0) {
    throw new UnreadableWorkbookError('Workbook has no rows');
  }

  return { workbook, worksheet, rows };
}

function cellToString(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    // rich text / formula result / hyperlink objects
    if (v.richText) return v.richText.map((rt) => rt.text).join('');
    if (v.result !== undefined) return cellToString(v.result);
    if (v.text !== undefined) return String(v.text);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}

/**
 * Apply the computed edits (new BARCODE/ITEMNAME values) and colour fills to
 * the worksheet in place, then return a downloadable Blob.
 *
 * @param {ExcelJS.Workbook} workbook
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Record<number, Record<number,string>>} edits - dataRowIdx -> {colIdx: value}
 * @param {Array<{row:number, column:string, kind:string}>} changes - 1-based sheet row, header name, fill kind
 * @param {Record<string,number>} headerIndex - header name -> 0-based column index
 * @param {Record<string,string[]>} masters - needed to build the live-CF hidden reference sheets
 * @param {{color: Record<string,string>, size: Record<string,string>}} codes
 * @param {number} totalDataRows - how many data rows the CF ranges should cover
 */
export async function applyChangesAndExport(
  workbook,
  worksheet,
  edits,
  changes,
  headerIndex,
  masters,
  codes,
  totalDataRows
) {
  // 1. Write formula-corrected values.
  for (const [rowIdxStr, colEdits] of Object.entries(edits)) {
    const dataRowIdx = Number(rowIdxStr);
    const sheetRow = dataRowIdx + 2; // header + 1-based
    for (const [colIdxStr, value] of Object.entries(colEdits)) {
      const colIdx = Number(colIdxStr);
      worksheet.getRow(sheetRow).getCell(colIdx + 1).value = value;
    }
  }

  // 2. Apply fills.
  //
  // IMPORTANT: workbooks exported from tools like Google Sheets often give
  // every cell in a row the *same style object by reference* (a shared XF
  // record) rather than one style per cell. `cell.fill = {...}` mutates
  // whatever style object the cell currently points to — if that object is
  // shared, every other cell pointing at it gets the fill too, silently
  // colouring the entire row instead of the one cell that changed.
  //
  // The fix is to always give the touched cell its own style object first,
  // by spreading its current style into a new one before touching `.fill`.
  // This breaks the shared reference for that cell only; every other cell
  // still points at the original (untouched) shared style.
  for (const change of changes) {
    const colIdx = headerIndex[change.column];
    if (colIdx === undefined) continue;
    const argb = FILL_KINDS[change.kind]?.argb;
    if (!argb) continue;
    const cell = worksheet.getRow(change.row).getCell(colIdx + 1);
    cell.style = {
      ...cell.style,
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb }
      }
    };
  }

  // 3. Live Conditional Formatting — re-evaluates on every recalculation, so
  // edits made later in Excel update or clear these highlights on their own.
  if (masters && codes) {
    addLiveConditionalFormatting(workbook, worksheet, headerIndex, masters, codes, totalDataRows || 0);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/** `Master-DDMMYY.xlsx` from the current date. */
export function buildOutputFilename(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `Master-${dd}${mm}${yy}.xlsx`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on a delay so the download has time to start in every browser.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
