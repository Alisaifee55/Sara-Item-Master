# PROJECT PROMPT: Sara — Item Master Validator (Excel Upload & Auto-Highlight Tool)

## 1. Purpose
A standalone web app that lets Sara Plaza Trading Co. upload an item-list Excel file, validates specific columns against a live Master List (kept in Google Sheets), auto-fills missing BARCODE/ITEMNAME using a fixed formula, flags whitespace issues, and returns the **same Excel file** with problem cells solid-filled — ready to download.

## 2. Confirmed Decisions (from requirements discussion)
- **Architecture**: Standalone React app, deployed on Cloudflare Pages, source in GitHub. A **separate Google Apps Script (GAS) Web App** serves as the backend for the Master Sheet (read/refresh access to the `UNIQE` tab). No file data is ever written back to Google Sheets — the Sheet is read-only master reference.
- **Master source**: The `UNIQE` sheet inside the Google Sheet (mirrors `MASTER_FILE.xlsx` → `UNIQE` tab) is the single source of truth for allowed values, per column, independently (each column has its own ragged list of valid values — not row-linked).
- **Columns validated against master** (must exist in the corresponding `UNIQE` column list):
  `UFCOLOR, UFSIZE, UFCLOTHING, UFFABRIC, UFSEASON, UFTYPE, UFFABRICDETAILS, UFPRICELEVEL, UFFASHIONCUT, UFCATALOGUENAME, NAMEINREGIONALLANGUAGE`
- **Columns with NO master list currently available**: `UFBRAND`, `UFMODELNO`, `UFYEARDETAILS` — the `UNIQE` sheet has these headers but zero populated values. **These three are excluded from "not-in-master" checking** until Sara populates a master list for them. (`UFBRAND` and `UFMODELNO` still get the whitespace check below.)
- **Matching strictness**: Values not found in the master list — **including near-typos** (e.g. "ALINE" vs "A LINE", "EXCULUSIVE" vs "EXCLUSIVE") — are all treated simply as "not in master." No fuzzy-match/suggestion feature. Matching itself is case-sensitive and space-sensitive (i.e., a case difference and a not-found-at-all are both real mismatches, just shown in different colors — see §4).

## 3. Formula-Based Auto-Fill: BARCODE & ITEMNAME
Derived from the working formulas found in `MASTER_FILE.xlsx` → `EXPORT FILE` sheet:

- **BARCODE** = `UFBRAND & UFNAME & ColorCode(UFCOLOR) & SizeCode(UFSIZE)`
- **ITEMNAME** = `UFBRAND & "-" & UFNAME & "-" & UFCOLOR & "-" & UFSIZE`

Where `ColorCode` and `SizeCode` are looked up from the `COLOR & SIZE CODE` sheet (Color: columns A→B, Size: columns D→E).

**Behavior on upload:**
| Cell state | Action |
|---|---|
| BARCODE or ITEMNAME blank | Auto-calculate using the formula above and fill it in |
| BARCODE or ITEMNAME filled, and matches the formula result | Leave as-is, no flag |
| BARCODE or ITEMNAME filled, but does **not** match the formula result | Overwrite with the correct formula-calculated value, fill Light Green |

⚠️ **Open dependency**: This formula assumes the uploaded file's columns are named/ordered so `UFBRAND`, `UFNAME`, `UFCOLOR`, `UFSIZE` can be identified — matching will be done **by header name**, not fixed column position, so column order in the uploaded file doesn't need to match the master file exactly.

## 4. Whitespace Check — UFBRAND & UFMODELNO
Check every value in `UFBRAND` and `UFMODELNO` for:
- Leading space
- Trailing space
- Double/multiple internal spaces

→ Fill cell **Yellow** if any of the above is found. (This check is independent of the master-list check, since these two columns have no master list.)

## 5. Highlight Color Legend
| Condition | Fill Color |
|---|---|
| Value not found in master list at all | Solid Coral/Red |
| Value found in master list but differs only by case | Solid Purple/Orchid |
| Leading/trailing/double space (UFBRAND, UFMODELNO only) | Solid Yellow |
| BARCODE/ITEMNAME auto-corrected to formula result | Solid Light Green |

**BARCODE/ITEMNAME behavior — finalized:** whenever a BARCODE or ITEMNAME is blank, or is filled but doesn't match the formula result, the tool **overwrites it with the correct formula-calculated value** and fills that cell Light Green — so Sara can see at a glance everywhere the tool made a correction.

**Header names — finalized:** uploaded files will always use the same header names as the master file (`UFNAME`, `UFCOLOR`, `UFSIZE`, etc.), so header-name-based column matching is safe with no separate mapping step needed.

## 6. Resolved
All open items from the previous draft are now settled — see §3 and §5 above. Nothing outstanding; this spec is ready to build from.

## 7. Output
- Same Excel file, same sheet structure, returned as a downloadable `.xlsx` with the fills applied and BARCODE/ITEMNAME auto-filled where blank.
- A short on-screen summary after processing: counts of "not in master," "case mismatch," "space issue," and "formula mismatch" per column.
- **Auto-download — finalized:** once processing completes, the corrected file downloads automatically (no "Download" click required). File is named **`Master-DDMMYY.xlsx`** using the current date (e.g. a file processed on 4 September 2026 downloads as `Master-040926.xlsx`).
- **On-screen change log — finalized:** alongside the auto-download, the screen displays what the tool actually changed/filled — not just aggregate counts but a reviewable list/table (e.g. row + column + old value → new value, or a per-cell breakdown grouped by highlight color) so Sara can see exactly what happened without opening the spreadsheet first.

## 8. Tech Stack
- **Frontend**: React + Vite, deployed to Cloudflare Pages, source in GitHub (per stated stack preference).
- **Excel read/write in-browser**: SheetJS (xlsx) — preserves formatting, allows applying cell fills before generating the download.
- **Backend**: Google Apps Script Web App (`doGet`) exposing the `UNIQE` sheet's per-column master lists as JSON, refreshed on each app load (no caching of stale master data).
- **Hosting for logo/PWA icon**: bundled in the React app's public assets.

## 9. UI/UX Direction
- **Palette**: Riviera-inspired pastel theme — teal as the primary surface/accent color, warm orange for calls-to-action, golden/mustard as a secondary accent, on a soft off-white background.
- **Icons**: monochromatic flat icon style throughout (single-tone line/fill icons, no gradients or 3D effects), consistent stroke weight.
- **Logo**: the Sara emblem (green "S" script mark), background/white patch removed so it sits cleanly on the teal/pastel UI. Used as the app's favicon and PWA home-screen icon (multiple sizes: 192×192, 512×512, maskable variant).
- **Core screens**: (1) Upload screen with drag-and-drop, (2) Processing/summary screen showing mismatch counts per color/category, (3) Download screen with the corrected file ready to save.
- **File upload — finalized:** two ways in, both always available on the upload screen — a visible "Upload" button, **and** drag-and-drop accepted anywhere on the screen (not confined to a small drop box), so Sara can drop the file anywhere on the page.
- **Live processing visibility — finalized:** while the file is being validated/processed, the screen shows real, legible progress of what's happening (e.g. current step: "Checking UFCOLOR against master," "Auto-filling BARCODE," running counts as they're found) rather than a generic spinner — so Sara can watch the tool work instead of waiting on a blank loader.
- **Completion — finalized:** the moment processing finishes, the corrected file auto-downloads (see §7) and the screen simultaneously shows the on-screen change log — both happen together, no extra click needed to trigger the download.

---
*This is a specification document, not yet built. All decisions are finalized — ready for implementation whenever Sara gives the go-ahead.*
