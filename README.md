# anoGWAmo?

A browser extension that automatically computes your cumulative GWA directly on the [PUP SIS](https://sisstudents.pup.edu.ph/) Grades page.

## Features

- **Dual Computation Modes**: Toggle between **Manual** and **Site GPA** modes for verification.
- **Cumulative GWA**: Computes across **all semesters**, providing a comprehensive view of your academic performance.
- **Academic Focus**: Automatically excludes non-academic subjects (PATHFIT, NSTP, CWTS, ROTC) from the GWA computation.
- **Latin Honors Checker**: Automatically checks eligibility against PUP's strict disqualifiers.
- **Live Status**: Marks GWA as "Projected" if some grades are still pending.
- **Detailed Insights**: View exactly which subjects are included or excluded and why.
- **Seamless Integration**: Collapsible panel injected directly into the PUPSIS grades interface.

## Computation Modes

| Mode | Description |
| --- | --- |
| **Manual** | Scrapes every subject row, filters by code prefix, and computes GWA using individual grades and units. |
| **Site GPA** | Averages the per-semester GPA values already computed by PUPSIS, weighted by the academic units in each semester. |

## Latin Honors Eligibility (PUP)

The extension checks the following disqualifiers as per the PUP Student Handbook:

- Any grade lower than **2.5** in any subject (academic or non-academic).
- Any failing grade (**5.0**).
- Any Incomplete (**Inc.**) or Withdrawn (**W**) mark.

### Honor Thresholds

| Honor | GWA Range |
| --- | --- |
| Summa Cum Laude | 1.0000 – 1.1500 |
| Magna Cum Laude | 1.1501 – 1.3500 |
| Cum Laude | 1.3501 – 1.6000 |

## Installation

### Chrome / Brave / Edge (Chromium-based)

1. Go to `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `anoGWAmo` folder

## Usage

1. Log in to PUPSIS.
2. Navigate to the **Grades** page.
3. The **anoGWAmo?** panel will appear automatically at the top of the content area.
4. Use the mode switcher to toggle between computation methods.

## Technical Notes

- The GWA formula used is: `GWA = Σ(Grade × Units) / Σ(Units)`.
- **Supported Domains**: Works on `sis1.pup.edu.ph`, `sis2.pup.edu.ph`, and `sis8.pup.edu.ph`.
- **Privacy**: The extension runs entirely in your browser and does not send any data to external servers.
- **Disclaimer**: This tool is for reference only. Official GWA is determined by the PUP Registrar.
- **Eligibility**: Transferees from outside the PUP System are not eligible for Latin Honors regardless of GWA.
