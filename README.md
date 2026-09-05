# Sara — Item Master Validator

Standalone tool for Sara Plaza Trading Co. Upload an item-list workbook, it's
validated against the live `UNIQE` master (Google Sheets), BARCODE/ITEMNAME
are auto-filled from the fixed formula, problem cells are solid-filled, and
the corrected workbook auto-downloads alongside an on-screen change log.

Built from `docs/original-spec.md` and `docs/validator-logic.md` — those
files are the source of truth for the business rules; this README covers
setup and deployment only.

## Stack
- React + Vite, deployed as a static site (Cloudflare Pages).
- [ExcelJS](https://github.com/exceljs/exceljs) for reading/writing `.xlsx`
  with cell fills preserved (community SheetJS can't write fills, so this
  project doesn't use it).
- Backend: a single Google Apps Script Web App (`gas/Code.gs`) that exposes
  the `UNIQE` master lists and the colour/size code lookups as JSON. It's
  read-only — the app never writes back to the Sheet.

## 1. Deploy the backend (Google Apps Script)
1. Open the master Google Sheet, then **Extensions → Apps Script**.
2. Paste the contents of `gas/Code.gs` in, replacing the default file.
3. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the `/exec` URL it gives you.
5. Whenever you edit `Code.gs`, deploy a **new version** (Deploy → Manage
   deployments → edit → New version) — the old code keeps serving otherwise.

The existing deployment used during design is already referenced as the
default in `src/lib/masterApi.js`; only redeploy if you need to change the
sheet or the script.

## 2. Local development
```bash
npm install
cp .env.example .env        # set VITE_GAS_URL if you deployed a new endpoint
npm run dev
```

## 3. Build
```bash
npm run build                # outputs to dist/
npm run preview              # sanity-check the production build locally
```

## 4. Deploy the frontend (Cloudflare Pages)
1. Push this repo to GitHub.
2. In Cloudflare Pages, **Create a project → Connect to Git** and pick the repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add an environment variable `VITE_GAS_URL` if you're using a different
   Apps Script deployment than the default.
5. Deploy. Every push to the connected branch redeploys automatically.

## Project structure
```
src/
  lib/
    constants.js    column lists, fill colours (UI chip + Excel ARGB), step script
    validate.js     pure validation engine (master check, whitespace, formulas)
    excel.js        ExcelJS read/write, fills, filename, download
    masterApi.js    fetch() wrapper for the GAS Web App
  components/       one component per screen/region (see docs/validator-logic.md)
  App.jsx           screen state machine: upload → processing → done | error
gas/Code.gs         Apps Script backend (doGet) — copy into Apps Script, see above
docs/               original spec + validation-logic reference docs
```

## Live Conditional Formatting in the exported file
On top of the static fills (which record "the tool touched/flagged this cell
at export time"), every downloaded workbook also gets real Excel
**Conditional Formatting** rules for all five checks — not-in-master, case
mismatch, whitespace, BARCODE/ITEMNAME formula drift, and the BARCODE
`>12` character length rule. These re-evaluate live: if Sara edits a cell in
Excel afterward, the highlight updates or clears itself automatically, with
no macro and no need to re-run the tool.

**How it works:** `src/lib/conditionalFormat.js` writes two hidden reference
sheets into the workbook — `_SaraMaster` (a snapshot of each checked
column's master list) and `_SaraCodes` (the colour/size code tables) — and
defines named ranges over them (`Master_UFCOLOR`, `ColorCodeTable`, etc.).
Each checked column then gets Excel formula-based CF rules that reference
those named ranges, e.g. `=AND($F2<>"",COUNTIF(Master_UFCOLOR,$F2)=0)` for
"not in master." The BARCODE/ITEMNAME formula-drift rules recompute the same
concatenation formula from `validate.js` inline, using `VLOOKUP` against the
code tables.

**BARCODE/ITEMNAME auto-corrected cells keep both layers deliberately:** the
static light-green fill stays as the permanent record of "the tool corrected
this at export," while a *separate* live CF rule on the same cell watches for
future drift — if Sara later edits UFBRAND/UFNAME/UFCOLOR/UFSIZE and the
value stops matching the formula, it lights up again independently of the
static fill underneath.

**Known tradeoffs, by design:**
- The embedded master/code data is a **snapshot at download time**. If the
  live Google Sheet changes afterward, a previously-downloaded file's live
  checks still reflect what was true when it was exported, not the current
  master. Only the on-screen change log (generated at upload time) reflects
  the truly live master.
- CF ranges extend 200 rows past the current data (capped at 3,000 total) so
  rows added by hand later keep working, without unbounded recalculation
  cost on very large files.
- This duplicates the master/whitespace/formula business rules in two places
  (JS in `validate.js` and Excel formulas in `conditionalFormat.js`) that
  must be kept in sync if the rules ever change — verified end-to-end against
  real files using LibreOffice headless recalculation during development,
  but worth re-testing the same way after any change to either file.

## Notes on fidelity to the design handoff
- The processing screen runs real validation up front (fast even on large
  sheets) and then walks the eleven-step script with the true per-step
  counts, rather than a scripted mock run. For very large workbooks the
  validation loop in `validate.js` can be chunked with
  `requestIdleCallback`/yield points without changing its return contract.
- Header matching is always by name (`buildHeaderIndex`), never by column
  position, per the spec.
- `UFBRAND` / `UFMODELNO` / `UFYEARDETAILS` automatically rejoin the
  not-in-master check the moment their `UNIQE` list is populated —
  `isMasterCheckedColumn` checks list length at run time, no code change
  needed.
- Matching is case-sensitive and space-sensitive; a case-only mismatch is
  reported separately from "not in master" (see `classifyAgainstMaster`).
- Nothing is ever written back to the Google Sheet — the GAS endpoint is
  `doGet`-only.
