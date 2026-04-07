<div align="center">
  <img src="icons/icon128.png" alt="anoGWAmo? logo" width="128" height="128">
  <h1>anoGWAmo?</h1>
  <p><strong>The ultimate academic companion for PUP students.</strong></p>

  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dfhmekddimnjbjllhocmejnbhdpfmhpe?logo=google-chrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/anogwamo/dfhmekddimnjbjllhocmejnbhdpfmhpe)
  [![Firefox Add-ons](https://img.shields.io/amo/v/anogwamo?logo=firefox-browser&logoColor=white&label=Firefox%20Add-ons)](https://addons.mozilla.org/en-US/firefox/addon/anogwamo/)
  [![Microsoft Edge Add-ons](https://img.shields.io/badge/Microsoft%20Edge-Add--ons-blue?logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/anogwamo/kgjfkhcbojllbmdpahhnagijnfpoeedg)
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

## 🚀 Installation

Install **anoGWAmo?** from your browser's extension store:

- [**Chrome Web Store**](https://chromewebstore.google.com/detail/anogwamo/dfhmekddimnjbjllhocmejnbhdpfmhpe)
- [**Firefox Add-ons**](https://addons.mozilla.org/en-US/firefox/addon/anogwamo/)
- [**Microsoft Edge Add-ons**](https://microsoftedge.microsoft.com/addons/detail/anogwamo/kgjfkhcbojllbmdpahhnagijnfpoeedg)

### For Developers

If you want to build from source or load the extension manually:

1. **Clone the repository**: `git clone https://github.com/znarfm/anoGWAmo.git`
2. **Install dependencies**: `bun install`
3. **Build the extension**: `bun run build.ts`
4. **Load the extension**:
   - **Chromium**: Go to `chrome://extensions`, enable **Developer Mode**, and click **Load unpacked** selecting the `dist` folder.
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...** and select `manifest.json` from the `dist` folder.
5. **Login to PUP SIS** and navigate to the **Grades** page to see the dashboard.

---

## 🔐 Privacy and Permissions

- **Local Processing**: Calculations happen entirely within your browser.
- **Zero Tracking**: No analytics, no external servers, no data collection.
- **Minimal Footprint**: Only requests access to official PUP SIS domains (`sis1`, `sis2`, `sis8`).

> [!IMPORTANT]
> Transferees from outside the PUP System are generally not eligible for Latin Honors regardless of GWA, as per the PUP Student Handbook.
