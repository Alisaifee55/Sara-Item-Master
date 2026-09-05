import {
  MASTER_CHECKED_COLUMNS,
  WHITESPACE_CHECKED_COLUMNS,
  BARCODE_COL,
  ITEMNAME_COL,
  BARCODE_MAX_LENGTH,
  FILL_KINDS
} from './constants.js';
import { isMasterCheckedColumn } from './validate.js';

// How far past the current data conditional formatting still applies, so
// rows Sara adds by hand later keep working without re-running the tool.
const CF_EXTRA_ROWS = 200;
const CF_MAX_LAST_ROW = 3000;

/** 0-based column index -> Excel column letter(s), e.g. 0 -> 'A', 26 -> 'AA'. */
function columnLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Picks a worksheet name that doesn't collide with anything already in the workbook. */
function uniqueSheetName(workbook, base) {
  let name = base;
  let i = 2;
  const taken = new Set(workbook.worksheets.map((w) => w.name));
  while (taken.has(name)) {
    name = `${base}${i}`;
    i += 1;
  }
  return name;
}

/**
 * Adds hidden reference sheets (a snapshot of the master lists + colour/size
 * code tables) plus live Conditional Formatting rules that mirror
 * validate.js's classification logic. Unlike the static fills applied
 * elsewhere, these re-evaluate every time the workbook recalculates — so if
 * Sara edits a cell in Excel later, the highlight updates itself.
 *
 * Caveat (documented to the user): the master/code data is a *snapshot* as
 * of this export. If the live Google Sheet changes later, this file's rules
 * still check against what was true at download time, not the current
 * master.
 *
 * @param {ExcelJS.Workbook} workbook
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Record<string,number>} headerIndex
 * @param {Record<string,string[]>} masters
 * @param {{color: Record<string,string>, size: Record<string,string>}} codes
 * @param {number} dataRowCount
 */
export function addLiveConditionalFormatting(workbook, worksheet, headerIndex, masters, codes, dataRowCount) {
  const lastRow = Math.min(dataRowCount + 1 + CF_EXTRA_ROWS, CF_MAX_LAST_ROW);
  if (lastRow < 2) return;

  let priority = 1;
  const nextPriority = () => priority++;

  // ---------- 1. hidden "_SaraMaster" sheet: one column per checked list ----------
  const masterSheetName = uniqueSheetName(workbook, '_SaraMaster');
  const masterSheet = workbook.addWorksheet(masterSheetName, { state: 'hidden' });
  const masterRanges = {}; // header -> defined name

  let masterCol = 0;
  for (const header of MASTER_CHECKED_COLUMNS) {
    if (!isMasterCheckedColumn(header, masters)) continue; // no populated list yet — skip, matches validate.js
    if (headerIndex[header] === undefined) continue; // column not even in this upload
    const list = masters[header];
    const colLetter = columnLetter(masterCol);
    masterSheet.getCell(`${colLetter}1`).value = header;
    list.forEach((v, i) => {
      masterSheet.getCell(`${colLetter}${i + 2}`).value = v;
    });
    const rangeName = `Master_${header}`;
    workbook.definedNames.add(`${quoteSheetName(masterSheetName)}!$${colLetter}$2:$${colLetter}$${list.length + 1}`, rangeName);
    masterRanges[header] = rangeName;
    masterCol += 1;
  }

  // ---------- 2. hidden "_SaraCodes" sheet: colour + size code tables ----------
  const codesSheetName = uniqueSheetName(workbook, '_SaraCodes');
  const codesSheet = workbook.addWorksheet(codesSheetName, { state: 'hidden' });
  let colorTableName = null;
  let sizeTableName = null;

  const colorEntries = Object.entries(codes.color || {});
  const sizeEntries = Object.entries(codes.size || {});

  if (colorEntries.length > 0) {
    codesSheet.getCell('A1').value = 'ColorName';
    codesSheet.getCell('B1').value = 'ColorCode';
    colorEntries.forEach(([name, code], i) => {
      codesSheet.getCell(`A${i + 2}`).value = name;
      codesSheet.getCell(`B${i + 2}`).value = code;
    });
    colorTableName = 'ColorCodeTable';
    workbook.definedNames.add(
      `${quoteSheetName(codesSheetName)}!$A$2:$B$${colorEntries.length + 1}`,
      colorTableName
    );
  }

  if (sizeEntries.length > 0) {
    codesSheet.getCell('D1').value = 'SizeName';
    codesSheet.getCell('E1').value = 'SizeCode';
    sizeEntries.forEach(([name, code], i) => {
      codesSheet.getCell(`D${i + 2}`).value = name;
      codesSheet.getCell(`E${i + 2}`).value = code;
    });
    sizeTableName = 'SizeCodeTable';
    workbook.definedNames.add(
      `${quoteSheetName(codesSheetName)}!$D$2:$E$${sizeEntries.length + 1}`,
      sizeTableName
    );
  }

  // ---------- 3. CF: master-list checks (not-in-master / case mismatch) ----------
  for (const [header, rangeName] of Object.entries(masterRanges)) {
    const colIdx = headerIndex[header];
    const L = columnLetter(colIdx);
    const ref = `${L}2:${L}${lastRow}`;
    const cell = `$${L}2`;

    worksheet.addConditionalFormatting({
      ref,
      rules: [
        {
          type: 'expression',
          formulae: [`AND(${cell}<>"",COUNTIF(${rangeName},${cell})=0)`],
          style: { fill: solidFill(FILL_KINDS.notMaster.argb) },
          priority: nextPriority(),
          stopIfTrue: true
        },
        {
          type: 'expression',
          formulae: [`AND(${cell}<>"",COUNTIF(${rangeName},${cell})>0,SUMPRODUCT(--EXACT(${rangeName},${cell}))=0)`],
          style: { fill: solidFill(FILL_KINDS.caseMismatch.argb) },
          priority: nextPriority(),
          stopIfTrue: true
        }
      ]
    });
  }

  // ---------- 4. CF: whitespace checks ----------
  for (const header of WHITESPACE_CHECKED_COLUMNS) {
    const colIdx = headerIndex[header];
    if (colIdx === undefined) continue;
    const L = columnLetter(colIdx);
    const ref = `${L}2:${L}${lastRow}`;
    const cell = `$${L}2`;

    worksheet.addConditionalFormatting({
      ref,
      rules: [
        {
          type: 'expression',
          formulae: [`AND(${cell}<>"",OR(LEFT(${cell},1)=" ",RIGHT(${cell},1)=" ",ISNUMBER(SEARCH("  ",${cell}))))`],
          style: { fill: solidFill(FILL_KINDS.space.argb) },
          priority: nextPriority(),
          stopIfTrue: true
        }
      ]
    });
  }

  // ---------- 5. CF: BARCODE — live formula-drift check + length check ----------
  const barcodeIdx = headerIndex[BARCODE_COL];
  const brandIdx = headerIndex.UFBRAND;
  const nameIdx = headerIndex.UFNAME;
  const colorIdx = headerIndex.UFCOLOR;
  const sizeIdx = headerIndex.UFSIZE;

  if (barcodeIdx !== undefined) {
    const L = columnLetter(barcodeIdx);
    const ref = `${L}2:${L}${lastRow}`;
    const cell = `$${L}2`;
    const rules = [];

    // Length rule always applies, and always wins visually over the drift
    // rule below (stopIfTrue + lower priority number = evaluated/shown first).
    rules.push({
      type: 'expression',
      formulae: [`LEN(${cell})>${BARCODE_MAX_LENGTH}`],
      style: {
        fill: solidFill(FILL_KINDS.tooLong.argb),
        font: { color: { argb: FILL_KINDS.tooLong.fontArgb } }
      },
      priority: nextPriority(),
      stopIfTrue: true
    });

    // Live drift rule: only if we have everything needed to recompute the
    // formula (all four source columns + both code tables present).
    if (
      brandIdx !== undefined &&
      nameIdx !== undefined &&
      colorIdx !== undefined &&
      sizeIdx !== undefined &&
      colorTableName &&
      sizeTableName
    ) {
      const brandCell = `$${columnLetter(brandIdx)}2`;
      const nameCell = `$${columnLetter(nameIdx)}2`;
      const colorCell = `$${columnLetter(colorIdx)}2`;
      const sizeCell = `$${columnLetter(sizeIdx)}2`;
      const colorLookup = `VLOOKUP(${colorCell},${colorTableName},2,FALSE)`;
      const sizeLookup = `VLOOKUP(${sizeCell},${sizeTableName},2,FALSE)`;

      rules.push({
        type: 'expression',
        formulae: [
          `AND(NOT(ISNA(${colorLookup})),NOT(ISNA(${sizeLookup})),${cell}<>(${brandCell}&${nameCell}&${colorLookup}&${sizeLookup}))`
        ],
        style: { fill: solidFill(FILL_KINDS.formula.argb) },
        priority: nextPriority(),
        stopIfTrue: true
      });
    }

    worksheet.addConditionalFormatting({ ref, rules });
  }

  // ---------- 6. CF: ITEMNAME — live formula-drift check (self-contained) ----------
  const itemnameIdx = headerIndex[ITEMNAME_COL];
  if (
    itemnameIdx !== undefined &&
    brandIdx !== undefined &&
    nameIdx !== undefined &&
    colorIdx !== undefined &&
    sizeIdx !== undefined
  ) {
    const L = columnLetter(itemnameIdx);
    const ref = `${L}2:${L}${lastRow}`;
    const cell = `$${L}2`;
    const brandCell = `$${columnLetter(brandIdx)}2`;
    const nameCell = `$${columnLetter(nameIdx)}2`;
    const colorCell = `$${columnLetter(colorIdx)}2`;
    const sizeCell = `$${columnLetter(sizeIdx)}2`;

    worksheet.addConditionalFormatting({
      ref,
      rules: [
        {
          type: 'expression',
          formulae: [`${cell}<>(${brandCell}&"-"&${nameCell}&"-"&${colorCell}&"-"&${sizeCell})`],
          style: { fill: solidFill(FILL_KINDS.formula.argb) },
          priority: nextPriority(),
          stopIfTrue: true
        }
      ]
    });
  }
}

function solidFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** Excel requires sheet-name-with-special-chars to be single-quoted in formulas/refs; ours are plain so this is a no-op guard. */
function quoteSheetName(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name}'`;
}
