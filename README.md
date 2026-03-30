<div align="center">
  <img src="icons/icon128.png" alt="anoGWAmo? logo" width="128" height="128">
  <h1>anoGWAmo?</h1>
  <p><strong>The ultimate academic companion for PUP students.</strong></p>

  [![Chrome](https://img.shields.io/badge/Chrome-Compatible-success.svg)](https://www.google.com/chrome/)
  [![Firefox](https://img.shields.io/badge/Firefox-Compatible-success.svg)](https://www.mozilla.org/firefox/)
  [![Edge](https://img.shields.io/badge/Edge-Compatible-success.svg)](https://www.microsoft.com/edge/)
</div>

---

**anoGWAmo?** is a powerful, lightweight browser extension that injects an intelligent Grade Weighted Average (GWA) dashboard directly into the **PUP SIS Grades** page. It automates the tedious calculation of cumulative GWA while providing tools for academic planning and Latin Honors eligibility tracking.

> [!NOTE]
> This extension is built by a student, for students. It is intended for reference only and does not represent official university records.

## ✨ Key Features

- 🧮 **Dual Calculation Modes**:
  - **Manual Mode**: Scrapes every subject row for granular accuracy.
  - **Site GPA Mode**: Re-weights pre-computed SIS semester averages.
- 🗓️ **Curriculum Planner**: Map out your entire stay at PUP. Set target grades for future semesters and see your projected Final GWA in real-time.
- 📊 **Interactive GWA Charting**: Visualize your academic journey with beautiful, high-DPI Bezier curves. Hover for semester-specific insights and track your progress against the Cum Laude threshold.
- 📥 **Professional PDF Export**: Generate a clean, printable PDF report of your GWA record, including progress charts and subject breakdowns.
- 🎓 **Latin Honors Tracker**: Instant eligibility checks based on the PUP Student Handbook, monitoring for disqualifying marks (W, Inc, 5.0) or grades below 2.5.
- 🌓 **Theme-Aware UI**: Automatically detects and adapts to your browser's theme or "Dark Reader" settings for a seamless SIS experience.
- 🚫 **Academic Filtering**: Smarter detection and exclusion of non-credit subjects (PATHFIT, NSTP, CWTS, ROTC).

---

## 🛠️ How it Works

The extension computes your GWA using the standard weighted formula:
$$GWA = \frac{\sum(\text{Grade} \times \text{Units})}{\sum(\text{Units})}$$

### Honor Thresholds

| Honor | GWA Range |
| :--- | :--- |
| **Summa Cum Laude** | 1.0000 – 1.1500 |
| **Magna Cum Laude** | 1.1501 – 1.3500 |
| **Cum Laude** | 1.3501 – 1.6000 |

### ⚠️ Disqualification Monitoring

The extension flags any records that breach academic honor requirements:

- Grades lower than **2.5**.
- Failing grades (**5.0**).
- **Incomplete (Inc.)** or **Withdrawn (W)** marks.

---

## 🚀 Getting Started

### Installation

1. **Download the Extension**:
   - Go to the [Releases](https://github.com/znarfm/anoGWAmo/releases) page and download the latest `.zip` file according to your browser.
   - Extract the contents of the ZIP folder to a convenient location on your computer.
   - *Alternatively, you can clone this repository if you wish to build from source.*
2. **Open Extensions Page**:
   - `chrome://extensions` (Chromium: Chrome, Edge, Brave, etc.)
   - `about:debugging#/runtime/this-firefox` (Firefox)
3. **Load the Extension**:
   - **Chromium**: Enable **Developer Mode**, click **Load unpacked**, and select the extracted folder.
   - **Firefox**: Click **Load Temporary Add-on...** and select `manifest.json` from the extracted folder.
4. **Login to PUP SIS** and navigate to the **Grades** page to see the dashboard.

---

## 🔐 Privacy and Permissions

- **Local Processing**: Calculations happen entirely within your browser.
- **Zero Tracking**: No analytics, no external servers, no data collection.
- **Minimal Footprint**: Only requests access to official PUP SIS domains (`sis1`, `sis2`, `sis8`).

> [!IMPORTANT]
> Transferees from outside the PUP System are generally not eligible for Latin Honors regardless of GWA, as per the PUP Student Handbook.
