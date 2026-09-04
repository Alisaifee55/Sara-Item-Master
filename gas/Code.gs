/**
 * Sara — Item Master Validator: master data endpoint.
 *
 * Deploy: Extensions → Apps Script → paste → Deploy → New deployment →
 * Web app → Execute as: Me → Who has access: Anyone → copy the /exec URL.
 * Re-deploy (new version) after any edit, or the old code keeps serving.
 *
 * GET /exec                 → { masters, codes, meta }
 * GET /exec?part=masters    → masters only
 * GET /exec?part=codes      → codes only
 */

var SHEET_ID   = '1XmGUKblpCV5X8NUSenOlzKRoVtVZEuDmE-aIqjeSxMY';
var UNIQE_TAB  = 'UNIQE';
var CODES_TAB  = 'COLOR & SIZE CODE';

function doGet(e) {
  var part = (e && e.parameter && e.parameter.part) || 'all';
  var out = { ok: true, meta: { readAt: new Date().toISOString(), sheetId: SHEET_ID } };
  try {
    if (part === 'all' || part === 'masters') out.masters = readMasters_();
    if (part === 'all' || part === 'codes')   out.codes   = readCodes_();
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** UNIQE → { HEADER: [values] }. Each column is an independent ragged list. */
function readMasters_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(UNIQE_TAB);
  if (!sh) throw new Error('Sheet not found: ' + UNIQE_TAB);
  var values = sh.getDataRange().getValues();
  if (!values.length) return {};

  var headers = values[0];
  var masters = {};
  for (var c = 0; c < headers.length; c++) {
    var name = String(headers[c] || '').trim();
    if (!name) continue;
    var seen = {}, list = [];
    for (var r = 1; r < values.length; r++) {
      var v = values[r][c];
      if (v === '' || v === null || v === undefined) continue;
      v = String(v);                 // preserve case and internal spacing exactly
      if (seen[v]) continue;
      seen[v] = true;
      list.push(v);
    }
    masters[name] = list;           // may legitimately be [] (UFBRAND, UFMODELNO, UFYEARDETAILS)
  }
  return masters;
}

/** COLOR & SIZE CODE → { color: {name: code}, size: {name: code} }. Color A→B, Size D→E. */
function readCodes_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(CODES_TAB);
  if (!sh) throw new Error('Sheet not found: ' + CODES_TAB);
  var values = sh.getDataRange().getValues();
  var color = {}, size = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var cName = String(row[0] == null ? '' : row[0]).trim();   // A
    var cCode = String(row[1] == null ? '' : row[1]).trim();   // B
    var sName = String(row[3] == null ? '' : row[3]).trim();   // D
    var sCode = String(row[4] == null ? '' : row[4]).trim();   // E
    if (cName && cCode) color[cName] = cCode;
    if (sName && sCode) size[sName] = sCode;
  }
  return { color: color, size: size };
}
