# Validation logic — Item Master Validator

Header matching is **by name**, never by column position. Uploaded files use the same header names as the master file, so no mapping step is needed. Read the header row, build `headerName → columnIndex`, and work from that.

## 1. Master lists
Source: the `UNIQE` sheet. Each column is an **independent, ragged list** of allowed values — values are not row-linked across columns. Load it as `{ [headerName]: string[] }`, dropping blanks.

**Checked against master (11):**
`UFCOLOR, UFSIZE, UFCLOTHING, UFFABRIC, UFSEASON, UFTYPE, UFFABRICDETAILS, UFPRICELEVEL, UFFASHIONCUT, UFCATALOGUENAME, NAMEINREGIONALLANGUAGE`

**Excluded from the not-in-master check:** `UFBRAND`, `UFMODELNO`, `UFYEARDETAILS` — the `UNIQE` sheet has these headers but no populated values. `UFBRAND` and `UFMODELNO` still get the whitespace check. Re-enable a column automatically the moment its `UNIQE` list is non-empty.

## 2. Matching rules
Matching is **case-sensitive and space-sensitive**. For a non-blank cell value `v` in a checked column:

1. `v` is in the list exactly → OK, no fill.
2. `v` is not in the list, but some master value equals `v` case-insensitively → **case mismatch**, orchid fill. Record the master's spelling as the expected value. Do not rewrite the cell.
3. Otherwise → **not in master**, coral fill. Do not rewrite the cell.

No fuzzy matching, no suggestions. Near-typos ("ALINE" vs "A LINE", "EXCULUSIVE" vs "EXCLUSIVE") are plain not-in-master.

Blank cells in checked columns are not flagged.

## 3. Whitespace check — UFBRAND and UFMODELNO only
Flag **yellow** if the value has a leading space, a trailing space, or two or more consecutive internal spaces:

```js
const hasSpaceIssue = v => /^\s|\s$|\s{2,}/.test(v);
```

Flag only — do not trim the value. This check is independent of the master check.

## 4. BARCODE and ITEMNAME auto-fill
Derived from the working formulas in `MASTER_FILE.xlsx → EXPORT FILE`:

```
BARCODE  = UFBRAND & UFNAME & ColorCode(UFCOLOR) & SizeCode(UFSIZE)
ITEMNAME = UFBRAND & "-" & UFNAME & "-" & UFCOLOR & "-" & UFSIZE
```

`ColorCode` and `SizeCode` come from the `COLOR & SIZE CODE` sheet — Color in columns A→B, Size in columns D→E.

Per row:

| Cell state | Action |
| --- | --- |
| Blank | Write the formula result, fill **light green** |
| Filled and equal to the formula result | Leave alone, no fill |
| Filled and different | **Overwrite** with the formula result, fill **light green** |

So light green always means "the tool wrote this". Record `oldValue → newValue` for the change log; use `(blank)` as the old value when the cell was empty.

If a code lookup misses (an unmapped colour or size), do not write a half-built barcode: leave the cell as-is and record it as a not-in-master issue on the source `UFCOLOR`/`UFSIZE` cell instead.

## 5. Output
- Same workbook, same sheet structure, with fills applied and BARCODE/ITEMNAME written. Nothing is ever written back to the Google Sheet — it is read-only master reference.
- Filename: `Master-DDMMYY.xlsx` from the current date (4 September 2026 → `Master-040926.xlsx`).
- Downloads automatically the moment processing finishes; the change log renders at the same time.

## 6. Excel fills
Solid pattern fills, ARGB:

| Meaning | ARGB |
| --- | --- |
| Not in master | `FFF08080` |
| Case mismatch | `FFDA70D6` |
| Space issue | `FFFFD966` |
| Formula corrected | `FFC6EFCE` |

**Library note:** community SheetJS cannot write cell fills. Either use SheetJS Pro, or read/write with a library that supports styling — `exceljs` handles solid fills and preserves the workbook well in the browser. Whichever you choose, verify round-tripping preserves the client's existing formatting; that is the main technical risk in this build.

## 7. Change record shape
```ts
type ChangeRecord = {
  row: number;        // 1-based sheet row, as seen in Excel
  column: string;     // header name
  kind: 'notMaster' | 'caseMismatch' | 'space' | 'formula';
  oldValue: string;   // '(blank)' when empty
  newValue?: string;  // only for 'formula'; for caseMismatch store "master has X"
};
```
Aggregate these for the per-category counts and the per-column breakdown; the log renders them directly.
