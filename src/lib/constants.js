// Columns checked against the UNIQE master list.
export const MASTER_CHECKED_COLUMNS = [
  'UFCOLOR',
  'UFSIZE',
  'UFCLOTHING',
  'UFFABRIC',
  'UFSEASON',
  'UFTYPE',
  'UFFABRICDETAILS',
  'UFPRICELEVEL',
  'UFFASHIONCUT',
  'UFCATALOGUENAME',
  'NAMEINREGIONALLANGUAGE'
];

// Headers UNIQE has but with no populated master values yet — excluded from
// the not-in-master check until Sara populates them.
export const NO_MASTER_YET_COLUMNS = ['UFBRAND', 'UFMODELNO', 'UFYEARDETAILS'];

// Whitespace-only check (independent of the master check).
export const WHITESPACE_CHECKED_COLUMNS = ['UFBRAND', 'UFMODELNO'];

// Columns the formulas depend on — hard requirements for the uploaded sheet.
export const REQUIRED_FORMULA_COLUMNS = ['UFBRAND', 'UFNAME', 'UFCOLOR', 'UFSIZE'];

export const BARCODE_COL = 'BARCODE';
export const ITEMNAME_COL = 'ITEMNAME';

// UI chip colours (functional data colours, not theme colours) paired with
// the exact Excel solid-fill ARGB values.
export const FILL_KINDS = {
  notMaster: { label: 'Not in master', chip: '#e8836f', argb: 'FFF08080' },
  caseMismatch: { label: 'Case mismatch', chip: '#c07fc9', argb: 'FFDA70D6' },
  space: { label: 'Whitespace issue', chip: '#e8c65c', argb: 'FFFFD966' },
  formula: { label: 'Auto-filled / corrected', chip: '#9dc98a', argb: 'FFC6EFCE' },
  tooLong: {
    label: 'Barcode too long (>12 chars)',
    chip: '#8b0000',
    argb: 'FF8B0000',
    fontArgb: 'FFFFFFFF' // white text — the only category that needs it, dark red is too dark otherwise
  }
};

/** Cells longer than this are flagged — matches the physical barcode label limit. */
export const BARCODE_MAX_LENGTH = 12;

// The processing-screen step script (see README §Screens 2). Steps 3–7 group
// columns for legibility; the runtime emits real counts as each finishes.
export const STEP_SCRIPT = [
  { id: 'read', label: 'Reading workbook' },
  { id: 'master', label: 'Refreshing master from UNIQE' },
  { id: 'ufcolor', label: 'Checking UFCOLOR against master', columns: ['UFCOLOR'] },
  { id: 'ufsize', label: 'Checking UFSIZE against master', columns: ['UFSIZE'] },
  {
    id: 'group1',
    label: 'Checking UFCLOTHING · UFFABRIC · UFSEASON',
    columns: ['UFCLOTHING', 'UFFABRIC', 'UFSEASON']
  },
  {
    id: 'group2',
    label: 'Checking UFTYPE · UFFASHIONCUT · UFPRICELEVEL',
    columns: ['UFTYPE', 'UFFASHIONCUT', 'UFPRICELEVEL']
  },
  {
    id: 'group3',
    label: 'Checking UFCATALOGUENAME · NAMEINREGIONALLANGUAGE',
    columns: ['UFCATALOGUENAME', 'NAMEINREGIONALLANGUAGE']
  },
  {
    id: 'whitespace',
    label: 'Scanning UFBRAND · UFMODELNO for spaces',
    columns: WHITESPACE_CHECKED_COLUMNS
  },
  { id: 'barcode', label: 'Auto-filling BARCODE' },
  { id: 'itemname', label: 'Auto-filling ITEMNAME' },
  { id: 'toolong', label: 'Checking BARCODE length' },
  { id: 'write', label: 'Applying fills, formatting rules, and writing workbook' }
];
