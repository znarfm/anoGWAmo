# PUP Latin Honors GWA Checker

A browser extension that automatically computes your cumulative GWA directly on the PUP SIS Grades page (`https://sis8.pup.edu.ph/student/grades`).

## Features

- Computes cumulative GWA across **all semesters**, not just one at a time
- **Excludes non-academic subjects** from the GWA computation: PATHFIT, NSTP, CWTS
- Checks **all PUP Latin Honors disqualifiers**:
  - Any grade lower than 2.5 (in any subject, academic or non-academic)
  - Any failing grade of 5.0
  - Any Incomplete (`Inc.`) or Withdrawn (`W`) mark
- Works for **ongoing students** too – marks the GWA as projected when some grades are still pending
- Shows a **detailed breakdown**: which subjects are included, which are excluded, and why
- Collapsible panel injected directly into the grades page

## Latin Honors Thresholds (PUP)

| Honor | GWA Range |
|---|---|
| Summa Cum Laude | 1.0000 – 1.1500 |
| Magna Cum Laude | 1.1501 – 1.3500 |
| Cum Laude | 1.3501 – 1.6000 |

## Installation

### Chrome / Brave / Edge (Chromium-based)

1. Go to `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `pup-gwa-checker` folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select any file inside the `pup-gwa-checker` folder (e.g., `manifest.json`)

> Note: Firefox temporary add-ons are removed when Firefox restarts. For permanent installation, the extension would need to be signed via AMO.

## Usage

1. Log in to PUPSIS at `https://sis8.pup.edu.ph/student/`
2. Navigate to the **Grades** page
3. The GWA panel will appear automatically at the top of the page

## Notes

- The GWA computation follows the formula: `GWA = Σ(Grade × Units) / Σ(Units)` using only academic courses with finalized numeric grades.
- This tool is **for reference only**. Official GWA is determined by the PUP Registrar.
- Transferees from outside the PUP System are not eligible for Latin Honors regardless of GWA.
- The extension only activates on `https://sis8.pup.edu.ph/student/grades*` and does not send any data anywhere.
