import GWAChart from "../gwa-chart.js";
export const NON_ACADEMIC_PREFIXES = ["PATHFIT", "NSTP", "CWTS", "ROTC"];

export const HONORS = [
  { label: "Summa Cum Laude", min: 1.0000, max: 1.1500, color: "var(--pup-honor-summa)" },
  { label: "Magna Cum Laude", min: 1.1501, max: 1.3500, color: "var(--pup-honor-magna)" },
  { label: "Cum Laude",       min: 1.3501, max: 1.6000, color: "var(--pup-honor-cumlaude)" },
];

export const MODE_KEY = "pup_gwa_mode";
export const CURR_KEY = "anoGWAmo_curriculum";
export const PROJ_KEY = "anoGWAmo_projections";

export function escapeHTML(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

export function isNonAcademic(code) {
  const c = code.trim().toUpperCase();
  return NON_ACADEMIC_PREFIXES.some(p => c.startsWith(p));
}

export function parseGrade(raw) {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function honorFor(gwa) {
  if (gwa === null) return null;
  for (const h of HONORS) if (gwa >= h.min && gwa <= h.max) return h.label;
  return null;
}

export function honorColor(label) {
  if (label === "Summa Cum Laude") return "var(--pup-honor-summa)";
  if (label === "Magna Cum Laude") return "var(--pup-honor-magna)";
  if (label === "Cum Laude")       return "var(--pup-honor-cumlaude)";
  return "var(--pup-honor-none)";
}

// ── Manual Mode ───────────────────────────────────────────────────────────────────

export function computeModeA(semesters) {
  let pts = 0, units = 0;
  const included = [], excluded = [];
  semesters.forEach(sem => {
    sem.subjects.forEach(subj => {
      if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) {
        pts += subj.grade * subj.units; units += subj.units;
        included.push({ ...subj, semLabel: sem.label });
      } else {
        excluded.push({ ...subj, semLabel: sem.label });
      }
    });
  });
  return { gwa: units > 0 ? pts / units : null, totalUnits: units, included, excluded };
}

// ── Site GPA Mode ───────────────────────────────────────────────────────────────────

export function computeModeB(semesters) {
  let pts = 0, units = 0;
  const breakdown = [], skipped = [];
  semesters.forEach(sem => {
    if (sem.siteGpa === null) { skipped.push(`${escapeHTML(sem.label)} – no site GPA available`); return; }
    let semUnits = 0;
    sem.subjects.forEach(subj => {
      if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) semUnits += subj.units;
    });
    if (semUnits === 0) { skipped.push(`${escapeHTML(sem.label)} – 0 academic units with grades`); return; }
    pts += sem.siteGpa * semUnits; units += semUnits;
    breakdown.push({ label: sem.label, siteGpa: sem.siteGpa, units: semUnits });
  });
  return { gwa: units > 0 ? pts / units : null, totalUnits: units, breakdown, skipped };
}

// ── Planner Mode ───────────────────────────────────────────────────────────────────

export function computeModeC(curriculum, userProjections = {}) {
  let pts = 0, units = 0;
  let remainingUnits = 0;
  let pPts = 0, pUnits = 0;
  let unprojectedUnits = 0;
  const pendingBySem = {};
  const pending = [];

  curriculum.forEach(subj => {
    if (subj.isNonAcademic || subj.units === null) return;
    
    if (subj.grade !== null && subj.grade <= 3.0) {
       pts += subj.grade * subj.units;
       units += subj.units;
    } else if (subj.grade === null) {
       remainingUnits += subj.units;
       pending.push(subj);

       const cleanYear = subj.schoolYear && subj.schoolYear.endsWith("Year") ? subj.schoolYear : `${subj.schoolYear}`;
       const semKey = `${cleanYear} - ${subj.semester || "Unknown Sem"}`;
       
       if (!pendingBySem[semKey]) pendingBySem[semKey] = { units: 0, subjects: [] };
       pendingBySem[semKey].subjects.push(subj);
       pendingBySem[semKey].units += subj.units;
       
       const semProjGrade = userProjections[semKey] !== undefined ? userProjections[semKey] : null;
       const globalProjGrade = userProjections["GLOBAL"] !== undefined ? userProjections["GLOBAL"] : null;
       
       let projGrade = null;
       if (semProjGrade !== null && semProjGrade !== "") projGrade = semProjGrade;
       else if (globalProjGrade !== null && globalProjGrade !== "") projGrade = globalProjGrade;

       if (projGrade !== null) {
          const p = parseFloat(projGrade);
          pPts += p * subj.units;
          pUnits += subj.units;
       } else {
          unprojectedUnits += subj.units;
       }
    }
  });

  const currentGwa = units > 0 ? pts / units : null;

  let projectedGwa = null;
  const totalU = units + remainingUnits;
  if (remainingUnits > 0) {
     projectedGwa = (pts + pPts) / (totalU);
  } else {
     projectedGwa = currentGwa;
  }

  const requiredAverages = HONORS.map(h => {
     if (remainingUnits === 0) return { ...h, req: null };
     const req = (h.max * totalU - pts) / remainingUnits;
     return { ...h, req };
  });

  return { 
    gwa: currentGwa, 
    projectedGwa, 
    totalUnits: units, 
    totalAcademicUnits: totalU, 
    remainingUnits, 
    pUnits, 
    unprojectedUnits, 
    pendingBySem, 
    pending,
    requiredAverages 
  };
}

// ── Export to PDF ─────────────────────────────────────────────────────────────────

export function exportToPDF({ currentMode, studentInfo, semesters, curriculum, userProjections, onComplete = () => {} }) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    let gwaVal = null;
    let unitsVal = 0;
    if (currentMode === "A") {
       const res = computeModeA(semesters);
       gwaVal = res.gwa; unitsVal = res.totalUnits;
    } else if (currentMode === "B") {
       const res = computeModeB(semesters);
       gwaVal = res.gwa; unitsVal = res.totalUnits;
    } else if (currentMode === "C") {
       const res = computeModeC(curriculum, userProjections);
       gwaVal = res.projectedGwa; unitsVal = res.totalUnits + res.remainingUnits; // Total planned units
    }

    const title = escapeHTML(currentMode === "C" ? "Projected Academic Plan" : "Academic Record");
    const nameStr = escapeHTML(studentInfo && studentInfo.name ? `${studentInfo.name} ${studentInfo.id ? `(${studentInfo.id})` : ''}` : "Anonymous Student");
    const gwaFormatted = gwaVal !== null ? gwaVal.toFixed(4) : "N/A";

    // ── Generate Chart Image ──────────────────────────────────────────────────
    let chartHTML = "";
    if (currentMode !== "C" && semesters && semesters.length > 0) {
        const dummyContainer = document.createElement('div');
        dummyContainer.style.width = '700px';
        dummyContainer.style.height = '275px';
        dummyContainer.style.position = 'absolute';
        dummyContainer.style.left = '-9999px';
        document.body.appendChild(dummyContainer);

        const chart = new GWAChart(dummyContainer);
        
        const chartData = [];
        if (currentMode === "B") {
            const { breakdown } = computeModeB(semesters);
            breakdown.forEach(b => chartData.push({ semester: b.label, gwa: b.siteGpa }));
        } else if (currentMode === "A") {
            semesters.forEach(sem => {
                let semPts = 0, semUnits = 0;
                sem.subjects.forEach(subj => {
                    if (!isNonAcademic(subj.code) && subj.grade !== null && subj.units !== null) {
                        semPts += subj.grade * subj.units;
                        semUnits += subj.units;
                    }
                });
                if (semUnits > 0) chartData.push({ semester: sem.label, gwa: semPts / semUnits });
            });
        }
        
        if (chartData.length > 0) {
            chart.renderChart(chartData);
            const chartBase64 = chart.canvas.toDataURL("image/png");
            chartHTML = `
              <div style="margin: 0 auto 30px auto; text-align: center; max-width: 700px; padding: 25px; border: 1.5px solid #eee; border-radius: 12px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                 <h4 style="margin: 0 0 15px 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 2px; font-weight: 700;">GWA Progression Performance</h4>
                 <img src="${chartBase64}" style="width: 100%; height: auto; display: block;" alt="GWA Chart" />
              </div>
            `;
        }
        chart.destroy();
        document.body.removeChild(dummyContainer);
    }
    // ────────────────────────────────────────────────────────────────────────
    
    let tableHTML = "";
    if (currentMode === "C") {
        tableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="border-bottom: 2px solid #800000; text-align: left; font-size: 14px;">
                        <th style="padding: 8px; width: 15%;">Code</th>
                        <th style="padding: 8px; width: 55%;">Description</th>
                        <th style="padding: 8px; width: 15%;">Units</th>
                        <th style="padding: 8px; width: 15%;">Grade/Target</th>
                    </tr>
                </thead>
                <tbody>
                    ${curriculum.filter(s => !isNonAcademic(s.code) && s.units !== null).map(s => {
                        let gradeStr = s.grade !== null ? s.grade.toFixed(2) : "";
                        let isProj = false;
                        if (s.grade === null) {
                           const yearPart = (s.schoolYear || "UNKNOWN").replace(/(FOURTH|THIRD|SECOND|FIRST) YEAR/, "$1 YEAR");
                           const semKey = `${yearPart} - ${s.semester || "UKNOWN SEM"}`;
                           const p = parseFloat(userProjections[semKey] || userProjections["GLOBAL"] || null);
                           if (!isNaN(p)) { gradeStr = p.toFixed(2); isProj = true; }
                           else gradeStr = "—";
                        }
                        return `
                        <tr style="border-bottom: 1px solid #ddd; font-size: 13px; ${isProj ? 'color: #8C2222; font-style: italic;' : ''}">
                            <td style="padding: 8px; font-weight: 600;">${escapeHTML(s.code)}</td>
                            <td style="padding: 8px;">${escapeHTML(s.description)} ${isProj ? '<span style="font-size:10px; color:#aaa;">(Proj)</span>' : ''}</td>
                            <td style="padding: 8px;">${s.units}</td>
                            <td style="padding: 8px; font-weight: bold;">${gradeStr}</td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        `;
    } else {
        tableHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px;">
                <thead>
                    <tr style="text-align: left; color: #666; font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 4px 8px; width: 15%;">Code</th>
                        <th style="padding: 4px 8px; width: 55%;">Description</th>
                        <th style="padding: 4px 8px; width: 15%;">Units</th>
                        <th style="padding: 4px 8px; width: 15%;">Grade</th>
                    </tr>
                </thead>
                ${semesters.map(sem => `
                <tbody>
                    <tr>
                        <td colspan="4" style="padding-top: 24px; padding-bottom: 4px; font-weight: bold; font-size: 14px; color: #800000; border-bottom: 1px solid #ddd;">${escapeHTML(sem.label)}</td>
                    </tr>
                    ${sem.subjects.map(s => `
                        <tr style="border-bottom: 1px solid #f0f0f0; ${isNonAcademic(s.code) ? 'color: #999;' : ''}">
                            <td style="padding: 6px 8px; font-weight: 600;">${escapeHTML(s.code)}</td>
                            <td style="padding: 6px 8px;">${escapeHTML(s.description)}</td>
                            <td style="padding: 6px 8px;">${s.units !== null ? s.units : '—'}</td>
                            <td style="padding: 6px 8px; font-weight: bold;">${escapeHTML(s.gradeRaw) || '—'}</td>
                        </tr>
                    `).join("")}
                </tbody>
                `).join("")}
            </table>
        `;
    }

    const docContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>anoGWAmo? Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
                body {
                    font-family: 'Outfit', sans-serif;
                    color: #2A2424;
                    padding: 40px;
                    line-height: 1.5;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #800000;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .title {
                    font-family: 'Playfair Display', serif;
                    font-size: 24px;
                    color: #4A0404;
                    margin: 0 0 8px 0;
                }
                .student-info { margin: 5px 0; font-size: 14px; font-weight: 600; font-style: italic; }
                .summary {
                    display: flex;
                    justify-content: space-around;
                    background: #fbfbf9;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    margin-bottom: 30px;
                    text-align: center;
                }
                .summary-box h3 {
                    margin: 0; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px;
                }
                .summary-box p {
                    margin: 5px 0 0 0; font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #4A0404;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; padding: 0; }
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    color: #bbb;
                    font-size: 10px;
                    letter-spacing: 0.5px;
                }
                .footer a {
                    color: #800000;
                    text-decoration: none;
                    font-weight: 700;
                    margin-left: 10px;
                }
                .footer-logo {
                    font-family: 'Playfair Display', serif;
                    font-style: italic;
                    font-size: 12px;
                    color: #4A0404;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="title">${title}</h1>
                <p class="student-info">${nameStr}</p>
                <p style="margin:0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Calculation Mode: ${currentMode === "C" ? "Planner" : (currentMode === "A" ? "Manual" : "Site GPA")}</p>
            </div>
            <div class="summary">
                <div class="summary-box">
                    <h3>${currentMode === "C" ? "Projected GWA" : "Cumulative GWA"}</h3>
                    <p>${gwaFormatted}</p>
                </div>
                <div class="summary-box">
                    <h3>Academic Units</h3>
                    <p style="font-size: 22px;">${unitsVal}</p>
                </div>
            </div>
            ${chartHTML}
            ${tableHTML}
            
            <div class="footer">
                <a href="https://github.com/znarfm/anoGWAmo" target="_blank">github.com / znarfm / <span class="footer-logo">anoGWAmo?</span></a>
            </div>
        </body>
        </html>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(docContent);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
            onComplete();
        }, 1000);
    }, 500);
}
