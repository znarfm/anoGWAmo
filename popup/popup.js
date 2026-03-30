import extApi from "webextension-polyfill";
const MODE_KEY = "pup_gwa_mode";

const HONORS = [
  { label: "Summa Cum Laude", min: 1.0000, max: 1.1500, color: "var(--pup-honor-summa)" },
  { label: "Magna Cum Laude", min: 1.1501, max: 1.3500, color: "var(--pup-honor-magna)" },
  { label: "Cum Laude",       min: 1.3501, max: 1.6000, color: "var(--pup-honor-cumlaude)" },
];

const CURR_KEY = "anoGWAmo_curriculum";
const PROJ_KEY = "anoGWAmo_projections";

function honorFor(gwa) {
  if (gwa === null) return null;
  for (const h of HONORS) if (gwa >= h.min && gwa <= h.max) return h.label;
  return null;
}

function honorColor(label) {
  if (label === "Summa Cum Laude") return "var(--pup-honor-summa)";
  if (label === "Magna Cum Laude") return "var(--pup-honor-magna)";
  if (label === "Cum Laude")       return "var(--pup-honor-cumlaude)";
  return "var(--pup-text)";
}

function computeModeA(semesters) {
  let pts = 0, units = 0;
  semesters.forEach(sem => {
    sem.subjects.forEach(subj => {
      if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) {
        pts += subj.grade * subj.units; 
        units += subj.units;
      }
    });
  });
  return { gwa: units > 0 ? pts / units : null, totalUnits: units };
}

function computeModeB(semesters) {
  let pts = 0, units = 0;
  semesters.forEach(sem => {
    if (sem.siteGpa === null) return;
    let semUnits = 0;
    sem.subjects.forEach(subj => {
      if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) semUnits += subj.units;
    });
    if (semUnits === 0) return;
    pts += sem.siteGpa * semUnits; 
    units += semUnits;
  });
  return { gwa: units > 0 ? pts / units : null, totalUnits: units };
}

function computeModeC(curriculum, projections = {}) {
  let pts = 0, units = 0, rUnits = 0, pPts = 0;
  curriculum.forEach(s => {
    if (s.isNonAcademic || s.units === null) return;
    if (s.grade !== null && s.grade <= 3.0) {
      pts += s.grade * s.units; units += s.units;
    } else if (s.grade === null) {
      rUnits += s.units;
      const semKey = `${(s.schoolYear || "").toUpperCase()} - ${(s.semester || "").toUpperCase()}`;
      const p = parseFloat(projections[semKey] || projections["GLOBAL"] || null);
      if (!isNaN(p)) pPts += p * s.units;
    }
  });

  const totalU = units + rUnits;
  const pGwa = totalU > 0 ? (pts + pPts) / totalU : null;

  const reqAverages = HONORS.map(h => {
    if (rUnits === 0) return { ...h, req: null };
    const req = (h.max * totalU - pts) / rUnits;
    return { ...h, req };
  });

  return { gwa: pGwa, totalUnits: units, totalAcademicUnits: totalU, reqAverages };
}

async function render() {
  const app = document.getElementById('app');
  app.innerHTML = "";

  try {
    const res = await extApi.storage.local.get(['anoGWAmo_data', CURR_KEY, PROJ_KEY, MODE_KEY]);
    const data = res.anoGWAmo_data;
    const curriculum = res[CURR_KEY] || [];
    const projections = res[PROJ_KEY] || {};
    const mode = res[MODE_KEY] || "B";

    if ((!data || !data.semesters || data.semesters.length === 0) && curriculum.length === 0) {
      const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
      tpl.querySelector('#btn-login').addEventListener('click', () => {
        extApi.tabs.create({ url: 'https://sisstudents.pup.edu.ph/student/grades' });
      });
      app.appendChild(tpl);
      return;
    }

    // Dashboard
    const tpl = document.getElementById('tpl-dashboard').content.cloneNode(true);
    const mainContainer = tpl.querySelector('.dashboard');
    
    // Compute data
    let gwa, totalUnits, totalAcademicUnits, reqAverages;
    if (mode === "C") {
      const res = computeModeC(curriculum, projections);
      gwa = res.gwa;
      totalUnits = res.totalUnits;
      totalAcademicUnits = res.totalAcademicUnits;
      reqAverages = res.reqAverages;
    } else {
      const res = mode === "A" ? computeModeA(data.semesters) : computeModeB(data.semesters);
      gwa = res.gwa;
      totalUnits = res.totalUnits;
    }
    
    const honor = honorFor(gwa);
    const hasDisqualifiers = data && data.disqData && data.disqData.disqualifiers && data.disqData.disqualifiers.length > 0;
    const isOngoing = mode !== "C" && data && data.disqData && data.disqData.pending && data.disqData.pending.length > 0;

    // Mode Switcher setup
    const modeBtns = tpl.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
      btn.addEventListener('click', async () => {
        await extApi.storage.local.set({ [MODE_KEY]: btn.dataset.mode });
        render();
      });
    });

    if (mode === "C") {
       const plTpl = document.getElementById('tpl-planner').content.cloneNode(true);
       plTpl.querySelector('#pl-gwa').textContent = gwa !== null ? gwa.toFixed(4) : "—";
       plTpl.querySelector('#pl-gwa').style.color = honorColor(honor);
       plTpl.querySelector('#pl-units').textContent = `${totalUnits} / ${totalAcademicUnits} acad units`;
       
       const targetsGrid = plTpl.querySelector('#pl-targets');
       reqAverages.forEach(h => {
          const card = document.createElement('div');
          card.className = "pl-target-card";
          card.style.borderLeft = `3px solid ${h.color}`;
          let msg = h.req < 1.0 ? "N/A" : (h.req > 3.0 ? "Guaranteed" : `≤ ${h.req.toFixed(4)}`);
          card.innerHTML = `<div class="pl-t-lab">${h.label}</div><div class="pl-t-val">${msg}</div>`;
          targetsGrid.appendChild(card);
       });
       
       // Insert planner view instead of standard score card
       tpl.querySelector('.main-card').replaceWith(plTpl);
       tpl.querySelector('#ds-status-card').style.display = 'none';
    } else {
      tpl.querySelector('#ds-gwa').textContent = gwa !== null ? gwa.toFixed(4) : "N/A";
      let colorKey = honorColor(honor);
      
      let icon, msg;
      if (hasDisqualifiers) {
        icon = "✗"; msg = "Disqualified"; colorKey = "rgba(180, 0, 0, 1)";
      } else if (!honor) {
        icon = "○"; msg = gwa !== null ? (gwa > 1.6 ? "No Latin Honors" : "Below Threshold") : "No Grades";
      } else {
        icon = "✓"; msg = isOngoing ? `Projected: ${honor}` : honor;
      }

      tpl.querySelector('#ds-gwa').style.color = colorKey;
      tpl.querySelector('#ds-units').textContent = `${totalUnits} academic units computed`;
      tpl.querySelector('#ds-status-icon').textContent = icon;
      tpl.querySelector('#ds-status-text').textContent = msg;
    }
    
    const timestamp = data ? data.timestamp : (curriculum.length > 0 ? Date.now() : null);
    if (timestamp) {
       const date = new Date(timestamp);
       tpl.querySelector('#ds-timestamp').textContent = `Last synced: ${date.toLocaleString()}`;
    }

    tpl.querySelector('#btn-update').addEventListener('click', () => {
       extApi.tabs.create({ url: 'https://sisstudents.pup.edu.ph/' });
    });

    app.appendChild(tpl);
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="empty-state"><p>Error loading data.</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', render);
