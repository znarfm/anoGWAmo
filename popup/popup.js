import extApi from "webextension-polyfill";
const MODE_KEY = "pup_gwa_mode";

const HONORS = [
  { label: "Summa Cum Laude", min: 1.0000, max: 1.1500, color: "var(--pup-honor-summa)" },
  { label: "Magna Cum Laude", min: 1.1501, max: 1.3500, color: "var(--pup-honor-magna)" },
  { label: "Cum Laude",       min: 1.3501, max: 1.6000, color: "var(--pup-honor-cumlaude)" },
];

function honorFor(gwa) {
  if (gwa === null) return null;
  for (const h of HONORS) if (gwa >= h.min && gwa <= h.max) return h.label;
  return null;
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

async function render() {
  const app = document.getElementById('app');
  app.innerHTML = "";

  try {
    const res = await extApi.storage.local.get(['anoGWAmo_data', MODE_KEY]);
    const data = res.anoGWAmo_data;
    const mode = res[MODE_KEY] || "B";

    if (!data || !data.semesters || data.semesters.length === 0) {
      // Empty state
      const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
      tpl.querySelector('#btn-login').addEventListener('click', () => {
        extApi.tabs.create({ url: 'https://sisstudents.pup.edu.ph/' });
      });
      app.appendChild(tpl);
      return;
    }

    // Dashboard
    const tpl = document.getElementById('tpl-dashboard').content.cloneNode(true);
    
    // Compute data
    const comp = mode === "A" ? computeModeA(data.semesters) : computeModeB(data.semesters);
    const { gwa, totalUnits } = comp;
    
    const honor = honorFor(gwa);
    const hasDisqualifiers = data.disqData && data.disqData.disqualifiers && data.disqData.disqualifiers.length > 0;
    const isOngoing = data.disqData && data.disqData.pending && data.disqData.pending.length > 0;

    // Set UI elements
    const modeBtns = tpl.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      if (btn.dataset.mode === mode) btn.classList.add('active');
      else btn.classList.remove('active');
      
      btn.addEventListener('click', async () => {
        try {
          await extApi.storage.local.set({ [MODE_KEY]: btn.dataset.mode });
          render();
        } catch (e) {
          console.error(e);
        }
      });
    });
    tpl.querySelector('#ds-gwa').textContent = gwa !== null ? gwa.toFixed(4) : "N/A";
    let colorKey = "var(--pup-text)";
    
    let icon, msg, cls;
    if (hasDisqualifiers) {
      icon = "✗"; msg = "Disqualified"; cls = "rgba(255,0,0,0.1)"; colorKey = "darkred";
    } else if (!honor) {
      icon = "○"; msg = gwa !== null ? (gwa > 1.6 ? "No Latin Honors" : "Below Threshold") : "No Grades";
    } else {
      icon = "✓"; msg = isOngoing ? `Projected: ${honor}` : honor;
      const hb = HONORS.find(h => h.label === honor);
      if (hb) colorKey = hb.color;
    }

    tpl.querySelector('#ds-gwa').style.color = colorKey;
    tpl.querySelector('#ds-units').textContent = `${totalUnits} acad units computed`;
    tpl.querySelector('#ds-status-icon').textContent = icon;
    tpl.querySelector('#ds-status-text').textContent = msg;
    
    const date = new Date(data.timestamp || Date.now());
    tpl.querySelector('#ds-timestamp').textContent = `Last synced: ${date.toLocaleString()}`;

    // Update button
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
