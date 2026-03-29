<div align="center">
  <img src="icons/icon128.png" alt="anoGWAmo? logo" width="128" height="128">
  <h1>anoGWAmo?</h1>
  <p><strong>The essential cumulative GWA calculator for PUP students.</strong></p>

  [![Chrome](https://img.shields.io/badge/Chrome-Compatible-success.svg)](https://www.google.com/chrome/)
  [![Firefox](https://img.shields.io/badge/Firefox-Compatible-success.svg)](https://www.mozilla.org/firefox/)
</div>

---

**anoGWAmo?** is a lightweight browser extension designed to inject a smart Grade Weighted Average (GWA) dashboard directly into the **PUP SIS Grades** page. It automates the tedious calculation of cumulative GWA while strictly adhering to the PUP Student Handbook guidelines for academic honors.

> [!NOTE]
> This extension is built by a student, for students. It is intended for reference only and does not represent official university records.

## ✨ Key Features

- 🧮 **Cumulative GWA Calculation**: Computes your performance across all available semesters instantly.
- 🎓 **Latin Honors Eligibility**: Automatically checks if you still qualify based on grades and academic marks.
- ⚖️ **Dual Mode Verification**:
  - **Manual Mode**: Scrapes each subject row to calculate the weighted average.
  - **Site GPA Mode**: Uses the pre-calculated semester averages from SIS for reference.
- 🚫 **Academic Filtering**: Automatically excludes non-credit subjects (PATHFIT, NSTP, CWTS, etc.) from the calculation.
- 📊 **Projected Status**: Marks your GWA as "Projected" if any grades are still pending (P).
- 🌓 **Seamless UI**: Collapsible, responsive panel that matches the PUP SIS aesthetic.

---

## 🛠️ How it Works

The extension uses the following weighted formula:
$$GWA = \frac{\sum(\text{Grade} \times \text{Units})}{\sum(\text{Units})}$$

It only counts academic subjects. For Latin Honors, it monitors for disqualifiers such as:

- Grades lower than **2.5**.
- Failing grades (**5.0**).
- **Incomplete (Inc.)** or **Withdrawn (W)** marks.

### Honor Thresholds

| Honor | GWA Range |
| :--- | :--- |
| **Summa Cum Laude** | 1.0000 – 1.1500 |
| **Magna Cum Laude** | 1.1501 – 1.3500 |
| **Cum Laude** | 1.3501 – 1.6000 |

---

## 🚀 Installation

### Chromium (Chrome, Edge, Brave)

1. Navigate to your browser's extensions page (e.g., `chrome://extensions`).
2. Enable **Developer Mode**.
3. Click **Load unpacked**.
4. Select the `anoGWAmo` folder.

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select any file within the project directory (e.g., `manifest.json`).

---

## 🔐 Privacy and Permissions

- **Local Execution**: All calculations are performed on your machine.
- **Zero Tracking**: No data is sent to external servers or collectors.
- **Minimal Permissions**: Only requests access to `sis1`, `sis2`, and `sis8` to function.

---

> [!IMPORTANT]
> Transferees from outside the PUP System are generally not eligible for Latin Honors regardless of GWA, as per the PUP Student Handbook.
