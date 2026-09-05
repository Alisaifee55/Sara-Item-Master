import {
  MASTER_CHECKED_COLUMNS,
  NO_MASTER_YET_COLUMNS,
  WHITESPACE_CHECKED_COLUMNS,
  REQUIRED_FORMULA_COLUMNS,
  BARCODE_COL,
  ITEMNAME_COL,
  BARCODE_MAX_LENGTH
} from './constants.js';

const SPACE_ISSUE_RE = /^\s|\s$|\s{2,}/;

/** Leading/trailing/double-internal-space check. Flag only, never trim. */
export function hasSpaceIssue(v) {
  return SPACE_ISSUE_RE.test(v);
}

/**
 * A column is only checked against the master if it's in the checked list
 * AND (per §1 of validator-logic.md) its master list is non-empty — this is
 * what makes UFBRAND/UFMODELNO/UFYEARDETAILS "re-enable automatically the
 * moment their UNIQE list is populated" without a code change.
 */
export function isMasterCheckedColumn(header, masters) {
  if (!MASTER_CHECKED_COLUMNS.includes(header)) return false;
  const list = masters[header];
  return Array.isArray(list) && list.length > 0;
}

/**
 * Classify a single cell value against its column's master list.
 * @returns {'ok'|'caseMismatch'|'notMaster'}
 */
export function classifyAgainstMaster(value, masterList) {
  if (masterList.includes(value)) return 'ok';
  const lower = value.toLowerCase();
  const caseMatch = masterList.find((m) => m.toLowerCase() === lower);
  if (caseMatch) return { kind: 'caseMismatch', expected: caseMatch };
  return { kind: 'notMaster' };
}

/**
 * Build the {header: columnIndex} map from a header row. Header matching is
 * always by name, never by position.
 */
export function buildHeaderIndex(headerRow) {
  const index = {};
  headerRow.forEach((h, i) => {
    const name = String(h == null ? '' : h).trim();
    if (name) index[name] = i;
  });
  return index;
}

/** Which required/checked headers are absent from the uploaded sheet. */
export function findMissingHeaders(headerIndex, masters) {
  const missing = [];
  const requiredSet = new Set(REQUIRED_FORMULA_COLUMNS);
  const checkedSet = new Set(MASTER_CHECKED_COLUMNS);
  for (const name of new Set([...requiredSet, ...checkedSet])) {
    if (!(name in headerIndex)) missing.push(name);
  }
  return missing;
}

/**
 * Compute BARCODE / ITEMNAME for a row.
 * BARCODE  = UFBRAND & UFNAME & ColorCode(UFCOLOR) & SizeCode(UFSIZE)
 * ITEMNAME = UFBRAND & "-" & UFNAME & "-" & UFCOLOR & "-" & UFSIZE
 *
 * If a colour/size code lookup misses, BARCODE is left unresolved (caller
 * must not write a half-built value) and the miss is reported against the
 * source UFCOLOR/UFSIZE cell as a not-in-master issue instead.
 */
export function computeFormulas(row, codes) {
  const brand = row.UFBRAND ?? '';
  const name = row.UFNAME ?? '';
  const color = row.UFCOLOR ?? '';
  const size = row.UFSIZE ?? '';

  const colorCode = codes.color[color];
  const sizeCode = codes.size[size];

  const itemname = `${brand}-${name}-${color}-${size}`;

  let barcode = null;
  let barcodeBlockedBy = null;
  if (colorCode === undefined) barcodeBlockedBy = 'UFCOLOR';
  else if (sizeCode === undefined) barcodeBlockedBy = 'UFSIZE';
  else barcode = `${brand}${name}${colorCode}${sizeCode}`;

  return { barcode, itemname, barcodeBlockedBy };
}

/**
 * Run the full validation pass over parsed rows.
 * @param {string[][]} rows - raw grid, rows[0] is the header row
 * @param {Record<string,string[]>} masters
 * @param {{color: Record<string,string>, size: Record<string,string>}} codes
 * @param {(step: {id:string,label:string}, counts: object) => void} [onStep] - optional progress callback
 */
export function runValidation(rows, masters, codes, onStep) {
  const headerRow = rows[0] || [];
  const headerIndex = buildHeaderIndex(headerRow);
  const dataRows = rows.slice(1);

  const changes = [];
  const counts = { notMaster: 0, caseMismatch: 0, space: 0, formula: 0, tooLong: 0 };
  const byColumn = {}; // header -> { notMaster, caseMismatch, space, formula, tooLong }
  const flaggedCells = new Set(); // `${row}|${column}` already flagged by the master/whitespace pass

  const bump = (col, kind) => {
    counts[kind]++;
    if (!byColumn[col]) byColumn[col] = { notMaster: 0, caseMismatch: 0, space: 0, formula: 0, tooLong: 0 };
    byColumn[col][kind]++;
  };

  // Rows keyed by header name for the formula step, plus a parallel array of
  // per-row edits to apply back onto the grid.
  const edits = dataRows.map(() => ({})); // rowIdx -> { colIndex: newValue }

  function getCell(rIdx, header) {
    const cIdx = headerIndex[header];
    if (cIdx === undefined) return '';
    const v = dataRows[rIdx][cIdx];
    return v === undefined || v === null ? '' : String(v);
  }

  // --- 1. master-list checks (case-sensitive, space-sensitive) ---
  for (const col of MASTER_CHECKED_COLUMNS) {
    const cIdx = headerIndex[col];
    if (cIdx === undefined) continue;
    if (!isMasterCheckedColumn(col, masters)) continue; // no populated master yet
    const list = masters[col];

    for (let r = 0; r < dataRows.length; r++) {
      const raw = dataRows[r][cIdx];
      const v = raw === undefined || raw === null ? '' : String(raw);
      if (v === '') continue; // blanks not flagged

      const result = classifyAgainstMaster(v, list);
      if (result === 'ok') continue;

      flaggedCells.add(`${r + 2}|${col}`);
      if (result.kind === 'caseMismatch') {
        bump(col, 'caseMismatch');
        changes.push({
          row: r + 2, // +1 for header, +1 for 1-based
          column: col,
          kind: 'caseMismatch',
          oldValue: v,
          newValue: `master has ${result.expected}`
        });
      } else {
        bump(col, 'notMaster');
        changes.push({ row: r + 2, column: col, kind: 'notMaster', oldValue: v, newValue: undefined });
      }
    }
    onStep && onStep({ id: col }, counts);
  }

  // --- 2. whitespace checks ---
  for (const col of WHITESPACE_CHECKED_COLUMNS) {
    const cIdx = headerIndex[col];
    if (cIdx === undefined) continue;
    for (let r = 0; r < dataRows.length; r++) {
      const raw = dataRows[r][cIdx];
      const v = raw === undefined || raw === null ? '' : String(raw);
      if (v === '' || !hasSpaceIssue(v)) continue;
      bump(col, 'space');
      changes.push({ row: r + 2, column: col, kind: 'space', oldValue: v, newValue: undefined });
    }
  }
  onStep && onStep({ id: 'whitespace' }, counts);

  // --- 3. BARCODE / ITEMNAME auto-fill ---
  const barcodeIdx = headerIndex[BARCODE_COL];
  const itemnameIdx = headerIndex[ITEMNAME_COL];

  for (let r = 0; r < dataRows.length; r++) {
    const rowObj = {
      UFBRAND: getCell(r, 'UFBRAND'),
      UFNAME: getCell(r, 'UFNAME'),
      UFCOLOR: getCell(r, 'UFCOLOR'),
      UFSIZE: getCell(r, 'UFSIZE')
    };
    const { barcode, itemname, barcodeBlockedBy } = computeFormulas(rowObj, codes);

    if (barcodeIdx !== undefined) {
      const current = getCell(r, BARCODE_COL);
      if (barcode === null) {
        if (barcodeBlockedBy) {
          // Reported as a not-in-master issue on the source cell, not written —
          // but only if the master-check pass didn't already flag that same
          // cell (e.g. a value that's valid in UNIQE but has no code-table
          // entry yet). Avoids double-counting the same cell twice.
          const srcCol = barcodeBlockedBy;
          const srcIdx = headerIndex[srcCol];
          const cellKey = `${r + 2}|${srcCol}`;
          if (srcIdx !== undefined && !flaggedCells.has(cellKey)) {
            const srcVal = getCell(r, srcCol);
            flaggedCells.add(cellKey);
            bump(srcCol, 'notMaster');
            changes.push({ row: r + 2, column: srcCol, kind: 'notMaster', oldValue: srcVal, newValue: undefined });
          }
        }
      } else if (current !== barcode) {
        edits[r][barcodeIdx] = barcode;
        bump(BARCODE_COL, 'formula');
        changes.push({
          row: r + 2,
          column: BARCODE_COL,
          kind: 'formula',
          oldValue: current === '' ? '(blank)' : current,
          newValue: barcode
        });
      }
    }
  }
  onStep && onStep({ id: 'barcode' }, counts);

  for (let r = 0; r < dataRows.length; r++) {
    if (itemnameIdx === undefined) break;
    const rowObj = {
      UFBRAND: getCell(r, 'UFBRAND'),
      UFNAME: getCell(r, 'UFNAME'),
      UFCOLOR: getCell(r, 'UFCOLOR'),
      UFSIZE: getCell(r, 'UFSIZE')
    };
    const { itemname } = computeFormulas(rowObj, codes);
    const current = getCell(r, ITEMNAME_COL);
    if (current !== itemname) {
      edits[r][itemnameIdx] = itemname;
      bump(ITEMNAME_COL, 'formula');
      changes.push({
        row: r + 2,
        column: ITEMNAME_COL,
        kind: 'formula',
        oldValue: current === '' ? '(blank)' : current,
        newValue: itemname
      });
    }
  }
  onStep && onStep({ id: 'itemname' }, counts);

  // --- 4. BARCODE length check — runs against the *final* value: whatever
  // was just auto-filled above, or the original value if it was left alone. ---
  if (barcodeIdx !== undefined) {
    for (let r = 0; r < dataRows.length; r++) {
      const finalValue = edits[r][barcodeIdx] !== undefined ? edits[r][barcodeIdx] : getCell(r, BARCODE_COL);
      if (finalValue.length > BARCODE_MAX_LENGTH) {
        bump(BARCODE_COL, 'tooLong');
        changes.push({
          row: r + 2,
          column: BARCODE_COL,
          kind: 'tooLong',
          oldValue: finalValue,
          newValue: undefined
        });
      }
    }
  }
  onStep && onStep({ id: 'toolong' }, counts);

  return {
    headerIndex,
    dataRows,
    edits, // rowIdx -> { colIndex: newValue } to write
    changes, // ChangeRecord[]
    counts,
    byColumn
  };
}
