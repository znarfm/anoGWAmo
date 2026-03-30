/**
 * anoGWAmo?
 * Manual: manual computation, excludes PATHFIT/NSTP/CWTS/ROTC by code prefix
 * Site GPA: uses the per-semester GPA values already shown by the PUPSIS
 *         website, then re-weights them by academic units for a cumulative figure.
 */

import extApi from "webextension-polyfill";
import { 
  HONORS, MODE_KEY, CURR_KEY, PROJ_KEY, 
  isNonAcademic, parseGrade, honorFor, honorColor, 
  computeModeA, computeModeB, computeModeC, exportToPDF 
} from "./core/utils.js";
import GWAChart from "./gwa-chart.js";

// ── Scrape ──────────────────────────────────────────────────────────────────

async function triggerCurriculumSync(onComplete) {
  const evalBtn = Array.from(document.querySelectorAll("a, button, .btn"))
    .find(el => el.textContent.trim().includes("Curriculum Evaluation"));

  if (!evalBtn) {
    alert("anoGWAmo: 'Curriculum Evaluation' button not found on this page.");
    return false;
  }

  evalBtn.click();

  let attempts = 0;
  const modalData = await new Promise((resolve) => {
    const interval = setInterval(() => {
      const modal = document.querySelector(".modal-content");
      if (modal && modal.querySelector("table.modaltbldsp")) {
        clearInterval(interval);
        resolve(modal);
      }
      if (attempts++ > 40) { // Timeout after 20 seconds
        clearInterval(interval);
        resolve(null);
      }
    }, 500);
  });

  if (modalData) {
    const data = scrapeCurriculumModal(modalData);
    await extApi.storage.local.set({ [CURR_KEY]: data });
    
    // Auto-close modal using simple vanilla click since it might be handled differently
    const closeBtn = modalData.querySelector('[data-dismiss="modal"], .close');
    if (closeBtn) closeBtn.click();
    else {
      // Fallback close by removing backdrop manually if jQuery is failing
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove();
      modalData.parentElement.parentElement.classList.remove('show');
      modalData.parentElement.parentElement.style.display = 'none';
    }
    
    if (onComplete) onComplete(data);
    return true;
  }
  
  alert("anoGWAmo: Failed to load curriculum modal.");
  return false;
}

function scrapeCurriculumModal(modal) {
  const curriculum = [];
  modal.querySelectorAll(".card.card-theme").forEach(card => {
    const yearLabel = card.querySelector(".card-title")?.textContent.trim() ?? "Unknown Year";
    
    // Find all tables within this year's card
    const tables = card.querySelectorAll("table.modaltbldsp");
    tables.forEach(table => {
      let semLabel = "Unknown Semester";
      const wrapper = table.closest(".dataTables_wrapper");
      if (wrapper && wrapper.previousElementSibling && wrapper.previousElementSibling.tagName === "H5") {
        semLabel = wrapper.previousElementSibling.textContent.trim();
      }

      table.querySelectorAll("tbody tr").forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 8) return;
        const code        = cells[0]?.textContent.trim() ?? "";
        const description = cells[3]?.textContent.trim() ?? "";
        const units       = parseFloat(cells[4]?.textContent.trim() ?? "");
        const gradeRaw    = cells[7]?.textContent.trim() ?? "";
        
        if (!code) return;

        let schoolYear = cells[5]?.textContent.trim() ?? "";
        let semester   = cells[6]?.textContent.trim() ?? "";
        // If empty (e.g. unenrolled), use the card's headers
        if (!schoolYear) schoolYear = yearLabel;
        if (!semester) semester = semLabel;

        const grade = parseGrade(gradeRaw);
        let finalUnits = isNaN(units) || units === 0 ? null : units;
        
        // Default academic subjects (non-PATHFIT/NSTP) to 3 units if 0/null
        if (!isNonAcademic(code) && (finalUnits === null || finalUnits === 0)) {
          finalUnits = 3.0;
        }

        curriculum.push({
          code, description,
          units:         finalUnits,
          grade,
          gradeRaw,
          schoolYear,
          semester,
          isNonAcademic: isNonAcademic(code),
          isPassed: row.classList.contains("passed") && grade !== null && grade <= 3.0,
          isFailed: grade === 5.0 || gradeRaw.toLowerCase().includes("fail"),
        });
      });
    });
  });
  return curriculum;
}

function scrapeStudentInfo() {
  const h3 = document.querySelector(".card-header h3.text-danger.text-bold");
  if (!h3) return null;
  const text = h3.textContent.trim();
  const match = text.match(/(.+?)\s*\((.+?)\)/);
  if (match) {
    return { name: match[1].trim(), id: match[2].trim() };
  }
  return { name: text, id: "" };
}

function scrapeAll() {
  const semesters = [];
  document.querySelectorAll(".card.card-theme").forEach(card => {
    const label = card.querySelector(".card-title")?.textContent.trim() ?? "Unknown Semester";

    // Site GPA: <dt>GPA (excludes NSTP...)</dt><dd>1.17</dd>
    let siteGpa = null, siteGpaRaw = "";
    card.querySelectorAll("dt").forEach(dt => {
      if (dt.textContent.includes("GPA")) {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName === "DD") {
          siteGpaRaw = dd.textContent.trim();
          const p = parseFloat(siteGpaRaw);
          if (!isNaN(p)) siteGpa = p;
        }
      }
    });

    const subjects = [];
    card.querySelectorAll("table.tbldsp tbody tr").forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 7) return;
      const code        = cells[1]?.textContent.trim() ?? "";
      const description = cells[2]?.textContent.trim() ?? "";
      const units       = parseFloat(cells[4]?.textContent.trim() ?? "");
      const gradeRaw    = cells[6]?.textContent.trim() ?? "";
      let finalUnits = isNaN(units) || units === 0 ? null : units;
      
      // Default academic subjects to 3 units if 0/null
      if (!isNonAcademic(code) && (finalUnits === null || finalUnits === 0)) {
        finalUnits = 3.0;
      }

      subjects.push({
        code, description,
        units:         finalUnits,
        grade:         parseGrade(gradeRaw),
        gradeRaw,
        status:        cells[7]?.textContent.trim() ?? "",
        isNonAcademic: isNonAcademic(code),
      });
    });

    if (subjects.length > 0 || siteGpa !== null)
      semesters.push({ label, siteGpa, siteGpaRaw, subjects });
  });
  return semesters;
}

// ── Disqualifiers ────────────────────────────────────────────────────────────

function checkDisqualifiers(semesters) {
  const disqualifiers = [], pending = [];
  semesters.forEach(sem => {
    sem.subjects.forEach(subj => {
      const gs = (subj.gradeRaw ?? "").trim().toLowerCase();
      if (subj.grade === 5.0)
        disqualifiers.push(`Failing grade (5.0) in ${subj.code} – ${subj.description} [${sem.label}]`);
      if (gs === "inc." || gs === "inc")
        disqualifiers.push(`Incomplete (Inc.) in ${subj.code} – ${subj.description} [${sem.label}]`);
      if (gs === "w" || gs === "w.")
        disqualifiers.push(`Withdrawn (W) in ${subj.code} – ${subj.description} [${sem.label}]`);
      if (subj.grade !== null && subj.grade !== 5.0 && subj.grade > 2.5)
        disqualifiers.push(`Grade below 2.5 in ${subj.code} – ${subj.description}: ${subj.grade} [${sem.label}]`);
      if (subj.grade === null && !["inc.", "inc", "w", "w."].includes(gs))
        pending.push(`${subj.code} – ${subj.description} [${sem.label}]`);
    });
  });
  return { disqualifiers, pending };
}

// Computations are now handled by core/utils.js

// ── Shared HTML ───────────────────────────────────────────────────────────────

function honorsTableHTML(gwa) {
  return `<table class="pup-honors-table-inner">
    <thead><tr><th>Honor</th><th>GWA Range</th><th>Status</th></tr></thead>
    <tbody>${HONORS.map(h => {
      const m = gwa !== null && gwa >= h.min && gwa <= h.max;
      return `<tr class="${m ? "row-match" : ""}">
        <td>${h.label}</td>
        <td>${h.min.toFixed(4)} – ${h.max.toFixed(4)}</td>
        <td>${m ? "✓ Your GWA" : (gwa !== null ? (gwa < h.min ? "Below" : "Above") : "–")}</td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function statusBadgeHTML(gwa, disqualifiers, isOngoing) {
  const honor = honorFor(gwa);
  let icon, msg, cls;
  if (disqualifiers.length > 0) {
    icon = "✗"; msg = "Disqualified from Latin Honors"; cls = "status-disqualified";
  } else if (!honor) {
    icon = "○";
    msg = gwa !== null
      ? (gwa > 1.6 ? `GWA ${gwa.toFixed(4)} – No Latin Honor bracket` : "Below Cum Laude threshold")
      : "No grades available yet";
    cls = "status-none";
  } else {
    icon = "✓";
    msg = isOngoing ? `Projected: ${honor} (some grades still pending)` : honor;
    cls = "status-honor";
  }
  const statusDiv = document.createElement("div");
  statusDiv.className = `pup-status ${cls}`;
  
  const iconSpan = document.createElement("span");
  iconSpan.className = "status-icon";
  iconSpan.textContent = icon;
  
  statusDiv.appendChild(iconSpan);
  statusDiv.append(` ${msg}`);
  
  return statusDiv.outerHTML;
}

function disqAndPendingHTML(disqualifiers, pending) {
  const dq = disqualifiers.length > 0
    ? `<ul class="pup-disq-list">${disqualifiers.map(d => `<li>⚠️ ${d}</li>`).join("")}</ul>`
    : "<p class='muted'>None detected</p>";
  const pg = pending.length > 0
    ? `<ul class="pup-subj-list">${pending.map(s => `<li>${s}</li>`).join("")}</ul>`
    : "<p class='muted'>None</p>";
  return `
    <details class="pup-section">
      <summary>⚠️ Disqualifiers (${disqualifiers.length})</summary>${dq}
    </details>
    <details class="pup-section">
      <summary>⏳ Pending Grades (${pending.length})</summary>${pg}
    </details>`;
}

const NOTE_HTML = `<p class="pup-gwa-note">For reference only. Official GWA is determined by the PUP Registrar. Transfer students from outside the PUP system are not eligible for Latin Honors.</p>`;

// ── Manual mode render ─────────────────────────────────────────────────────────────

function renderModeA(semesters, disqData) {
  const { gwa, totalUnits, included, excluded } = computeModeA(semesters);
  const { disqualifiers, pending } = disqData;
  const isOngoing = pending.length > 0;
  const honor = honorFor(gwa);

  const excHTML = excluded.length > 0
    ? `<ul class="pup-subj-list">${excluded.map(s =>
        `<li><span class="subj-code ${s.isNonAcademic ? "non-academic" : "no-grade"}">${s.code}</span>
        ${s.description} <em>[${s.semLabel}]</em>
        ${s.isNonAcademic ? "<span class='tag'>Non-Academic</span>" : "<span class='tag tag-warn'>No Grade</span>"}
        </li>`).join("")}</ul>`
    : "<p class='muted'>None</p>";

  const incHTML = included.length > 0
    ? `<table class="pup-included-table">
        <thead><tr><th>Code</th><th>Description</th><th>Units</th><th>Grade</th><th>Contribution</th></tr></thead>
        <tbody>${included.map(s => `<tr>
          <td>${s.code}</td><td>${s.description}</td><td>${s.units}</td>
          <td>${s.grade}</td><td>${(s.grade * s.units).toFixed(2)}</td>
        </tr>`).join("")}</tbody>
      </table>`
    : "<p class='muted'>No subjects included yet.</p>";

  return `
    <div class="pup-gwa-main">
      <div class="pup-gwa-score" style="color:${honorColor(honor)}">
        ${gwa !== null ? gwa.toFixed(4) : "N/A"}
      </div>
      <div class="pup-gwa-label">Cumulative GWA</div>
      <div class="pup-gwa-units">${totalUnits} academic units computed</div>
      ${statusBadgeHTML(gwa, disqualifiers, isOngoing)}
    </div>
    <div class="pup-honors-table">${honorsTableHTML(gwa)}</div>
    ${disqAndPendingHTML(disqualifiers, pending)}
    <details class="pup-section">
      <summary>📋 Excluded from GWA (${excluded.length})</summary>
      <p class="muted-sm">Non-academic subjects and subjects without a final grade are excluded from GWA computation but are still checked for disqualifiers.</p>
      ${excHTML}
    </details>
    <details class="pup-section">
      <summary>📊 Included in GWA (${included.length} subjects)</summary>${incHTML}
    </details>
    <p class="pup-gwa-note">
      <strong>Manual:</strong> reads every subject row, excludes
      <code>PATHFIT</code>, <code>NSTP</code>, <code>CWTS</code>, and <code>ROTC</code> by code prefix,
      and computes GWA from raw individual grades and units.
    </p>
    ${NOTE_HTML}`;
}

// ── Site GPA mode render ─────────────────────────────────────────────────────────────

function renderModeB(semesters, disqData) {
  const { gwa, totalUnits, breakdown, skipped } = computeModeB(semesters);
  const { disqualifiers, pending } = disqData;
  const isOngoing = pending.length > 0;
  const honor = honorFor(gwa);

  const bdHTML = breakdown.length > 0
    ? `<table class="pup-included-table">
        <thead><tr><th>Semester</th><th>Site GPA</th><th>Academic Units</th><th>Weighted Points</th></tr></thead>
        <tbody>
          ${breakdown.map(b => `<tr>
            <td>${b.label}</td><td>${b.siteGpa.toFixed(2)}</td>
            <td>${b.units}</td><td>${(b.siteGpa * b.units).toFixed(4)}</td>
          </tr>`).join("")}
          <tr class="breakdown-total">
            <td colspan="2"><strong>Cumulative GWA</strong></td>
            <td><strong>${totalUnits} units</strong></td>
            <td><strong>${gwa !== null ? gwa.toFixed(4) : "N/A"}</strong></td>
          </tr>
        </tbody>
      </table>`
    : "<p class='muted'>No semester GPA data found.</p>";

  const skippedHTML = skipped.length > 0
    ? `<details class="pup-section">
        <summary>⏭️ Skipped Semesters (${skipped.length})</summary>
        <ul class="pup-subj-list">${skipped.map(s => `<li>${s}</li>`).join("")}</ul>
      </details>`
    : "";

  return `
    <div class="pup-gwa-main">
      <div class="pup-gwa-score" style="color:${honorColor(honor)}">
        ${gwa !== null ? gwa.toFixed(4) : "N/A"}
      </div>
      <div class="pup-gwa-label">Cumulative GWA</div>
      <div class="pup-gwa-units">${totalUnits} academic units · ${breakdown.length} semester(s)</div>
      ${statusBadgeHTML(gwa, disqualifiers, isOngoing)}
    </div>
    <div class="pup-honors-table">${honorsTableHTML(gwa)}</div>
    <details class="pup-section" open>
      <summary>📊 Semester Breakdown (${breakdown.length})</summary>${bdHTML}
    </details>
    ${skippedHTML}
    ${disqAndPendingHTML(disqualifiers, pending)}
    <p class="pup-gwa-note">
      <strong>Site GPA:</strong> uses the per-semester GPA values already computed by PUPSIS
      (which the site labels as excluding NSTP and non-numeric ratings), then weights each by its
      semester's academic unit count to produce a cumulative GWA.
    </p>
    ${NOTE_HTML}`;
}

// Planner logic handled by core/utils.js

function renderModeC(curriculum, userProjections) {
  if (!curriculum || curriculum.length === 0) {
    return `
      <div class="pup-gwa-main">
        <div class="pup-gwa-label">Curriculum Planner</div>
        <p class="muted" style="margin: 10px 0;">We need to load your entire study journey first.</p>
        <button id="pup-sync-btn" class="pup-sync-btn secondary">📊 Click to Sync Curriculum</button>
        <p class="pup-gwa-note" style="margin-top: 5px;">This will quickly open and close the Curriculum Evaluation modal to copy your subjects.</p>
      </div>`;
  }

  const { gwa, projectedGwa, totalUnits, totalAcademicUnits, remainingUnits, pUnits, unprojectedUnits, pending, pendingBySem, requiredAverages } = computeModeC(curriculum, userProjections);
  const currentHonor = honorFor(gwa);
  const globalProj = userProjections["GLOBAL"] ?? "";

  let targetsHTML = "";
  if (remainingUnits > 0) {
    targetsHTML = `<div class="pup-targets-container">
      <h4 class="pup-targets-title">Target Average for Remaining ${remainingUnits} Units</h4>
      <div class="pup-targets-grid">
        ${requiredAverages.map(h => {
          let msg = "";
          let cls = "";
          if (h.req < 1.0) { msg = "Impossible"; cls = "target-impossible"; }
          else if (h.req > 3.0) { msg = "Guaranteed"; cls = "target-guaranteed"; }
          else { msg = `≤ ${h.req.toFixed(4)}`; cls = "target-possible"; }
          
          return `<div class="pup-target-card ${cls}" style="border-top-color: ${h.color}">
            <div class="pup-target-label">${h.label}</div>
            <div class="pup-target-val">${msg}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  } else {
     targetsHTML = `<div class="pup-targets-container">
       <p class="muted">All academic units completed. No remaining units to project.</p>
     </div>`;
  }

  let simulatorHTML = "";
  if (remainingUnits > 0) {
    const pGwaStr = projectedGwa !== null ? projectedGwa.toFixed(4) : "—";
    const pHonorVal = honorFor(projectedGwa);
    const resultColor = projectedGwa !== null ? honorColor(pHonorVal) : "var(--pup-text-muted)";
    
    let subtext = "";
    if (unprojectedUnits > 0 && pUnits > 0) {
      subtext = `<div style="font-size: 11px; margin-top: 6px; color: var(--pup-tag-warn-text);">${unprojectedUnits} units still missing projections (counted as 0 contribution).</div>`;
    } else if (unprojectedUnits > 0 && pUnits === 0) {
      subtext = `<div style="font-size: 11px; margin-top: 6px; color: var(--pup-text-muted);">Select targets below to see your Final GWA prediction.</div>`;
    }

    simulatorHTML = `
      <div class="pup-simulator-card">
        <label class="pup-simulator-text" for="pup-global-proj">
          Set a master baseline target: 
          <select id="pup-global-proj" class="pup-grade-select" data-code="GLOBAL" style="margin: 0 4px;">
            <option value="">--</option>
            ${[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0].map(v => 
              `<option value="${v.toFixed(2)}" ${parseFloat(globalProj) === v ? "selected" : ""}>${v.toFixed(2)}</option>`
            ).join("")}
          </select>
        </label>
        <div class="pup-simulator-result" style="color: ${resultColor}">
          <span class="pup-sim-label">Projected Final GWA</span>
          <span class="pup-sim-val">${pGwaStr}</span>
          ${pHonorVal ? `<span class="pup-sim-honor status-honor">${pHonorVal}</span>` : ""}
        </div>
        ${subtext}
      </div>
    `;
  }

  const pendingSemsHTML = pending.length > 0
    ? Object.entries(pendingBySem).map(([semKey, data]) => {
      const proj = userProjections[semKey] ?? "";
      let labelCls = proj === "" && globalProj !== "" ? "muted-sm" : "";
      return `
      <div class="pup-pending-sem">
        <div class="pup-pending-sem-title" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--pup-card-border); padding-bottom: 4px; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--pup-text-muted); text-transform: uppercase;">${semKey}</span>
          <div style="font-size: 11px; font-weight: 600; text-transform: none; display: flex; align-items: center;" class="${labelCls}">
            Average Target: 
            <select class="pup-grade-select" data-code="${semKey}" style="margin-left: 6px; font-size: 11px; padding: 2px 4px; min-width: 50px;">
              <option value="">${globalProj ? `(Global ${parseFloat(globalProj).toFixed(2)})` : "--"}</option>
              ${[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0].map(v => 
                `<option value="${v.toFixed(2)}" ${parseFloat(proj) === v ? "selected" : ""}>${v.toFixed(2)}</option>`
              ).join("")}
            </select>
          </div>
        </div>
        <ul class="pup-subj-list" style="margin-top: 6px; padding-left: 0;">
          ${data.subjects.map(s => `<li><span class="subj-code">${s.code}</span> <span class="pup-subj-desc">${s.description}</span> <span class="muted-sm" style="margin: 0 0 0 auto; white-space: nowrap;">${s.units}u</span></li>`).join("")}
        </ul>
      </div>
    `}).join("")
    : `<p class="muted">No pending academic subjects found. You're done!</p>`;

  return `
    <div class="pup-gwa-main">
      <div class="pup-gwa-score" style="color:${honorColor(currentHonor)}">
        ${gwa !== null ? gwa.toFixed(4) : "N/A"}
      </div>
      <div class="pup-gwa-label">Current Finalized GWA</div>
      <div class="pup-gwa-units">${totalUnits} / ${totalAcademicUnits} total academic units finalized</div>
    </div>
    <div class="pup-honors-table">${honorsTableHTML(gwa)}</div>
    ${targetsHTML}
    ${simulatorHTML}
    <details class="pup-section" open>
      <summary>🗓️ Remaining Subjects Details (${pending.length})</summary>
      <div class="pup-pending-scroll-area" style="padding-top: 8px;">
        ${pendingSemsHTML}
      </div>
    </details>
    <div style="text-align: right; margin-top: 10px;">
      <button id="pup-sync-btn-mini" class="pup-sync-btn secondary">↻ Re-Sync Curriculum</button>
    </div>
  `;
}


// ── Theme Detection ─────────────────────────────────────────────────────────

/**
 * Detects if the page is currently in dark mode (e.g., via Dark Reader
 * or if the body background is dark).
 */
function isPageDark() {
  // 1. Check for Dark Reader attributes
  const html = document.documentElement;
  if (html.hasAttribute("data-darkreader-scheme") || html.hasAttribute("data-darkreader-mode")) {
    return true;
  }

  // 2. Check body background color brightness
  const body = document.body;
  if (body) {
    const bg = window.getComputedStyle(body).backgroundColor;
    const match = bg.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      // Simple brightness formula (Y = 0.299R + 0.587G + 0.114B)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128; // Usually < 128 is considered dark
    }
  }

  return false;
}

/**
 * Syncs the panel theme with the page.
 */
function syncPanelTheme(panel) {
  if (!panel) return;
  if (isPageDark()) {
    panel.classList.add("pup-dark");
    panel.style.colorScheme = "dark";
  } else {
    panel.classList.remove("pup-dark");
    panel.style.colorScheme = "light";
  }
}

// ── Panel ─────────────────────────────────────────────────────────────────────

async function createPanel(semesters, studentInfo) {
  const disqData = checkDisqualifiers(semesters);
  
  let currentMode = "B";
  let curriculum = [];
  let userProjections = {};

  try {
    const data = await extApi.storage.local.get([MODE_KEY, CURR_KEY, PROJ_KEY]);
    if (data[MODE_KEY]) currentMode = data[MODE_KEY];
    if (data[CURR_KEY]) curriculum = data[CURR_KEY];
    if (data[PROJ_KEY]) userProjections = data[PROJ_KEY];
  } catch(e) { console.error(e); }

  try {
    await extApi.storage.local.set({ 
      anoGWAmo_data: { 
        studentInfo,
        semesters, 
        disqData, 
        timestamp: Date.now() 
      } 
    });
  } catch(e) { console.error(e); }

  const panel = document.createElement("div");
  panel.id = "pup-gwa-panel";

  let chartInstance = null;

  function renderChartData() {
    const container = panel.querySelector('#pup-gwa-chart-wrapper');
    if (!container) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (currentMode === "C") {
      container.style.display = 'none';
      return;
    }

    const chartData = [];
    
    if (currentMode === "B") {
      const { breakdown } = computeModeB(semesters);
      breakdown.forEach(b => {
        chartData.push({ semester: b.label, gwa: b.siteGpa });
      });
    } else {
      semesters.forEach(sem => {
        let semPts = 0, semUnits = 0;
        sem.subjects.forEach(subj => {
          if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) {
            semPts += subj.grade * subj.units;
            semUnits += subj.units;
          }
        });
        if (semUnits > 0) {
          chartData.push({ semester: sem.label, gwa: semPts / semUnits });
        }
      });
    }

    if (chartData.length < 2) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'block';

    // Reverse to show older semesters first (assuming data is newest first like PUPSIS typically is)
    chartData.reverse();

    chartInstance = new GWAChart(container, {
      targetGWA: 1.60,
      lineColor: '#800000', // PUP Maroon
      fillStart: 'rgba(128, 0, 0, 0.3)',
      fillEnd: 'rgba(128, 0, 0, 0.0)'
    });

    chartInstance.renderChart(chartData);
  }

  function render() {
    // Preserve scroll position
    const oldBody = panel.querySelector(".pup-gwa-body");
    const scrollTop = oldBody ? oldBody.scrollTop : 0;

    const rawHTML = `
      <div class="pup-gwa-header">
        <a href="https://github.com/znarfm/anoGWAmo" target="_blank"><span class="pup-gwa-title">🎓 anoGWAmo?</span></a>
        <div class="pup-header-controls">
          <div class="pup-mode-switcher">
            <button type="button" class="mode-btn ${currentMode === "C" ? "active" : ""}" data-mode="C">Planner</button>
            <button type="button" class="mode-btn ${currentMode === "A" ? "active" : ""}" data-mode="A">Manual</button>
            <button type="button" class="mode-btn ${currentMode === "B" ? "active" : ""}" data-mode="B">Site GPA</button>
          </div>
          <button type="button" class="pup-export-btn" title="Export to PDF">📥</button>
          <button type="button" class="pup-gwa-toggle" title="Collapse/Expand">▲</button>
        </div>
      </div>
      <div class="pup-gwa-body">
        <div id="pup-gwa-chart-wrapper" style="width: 100%; margin-bottom: 24px; display: none;"></div>
        ${currentMode === "C" ? renderModeC(curriculum, userProjections) : (currentMode === "B" ? renderModeB(semesters, disqData) : renderModeA(semesters, disqData))}
      </div>`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHTML, "text/html");
    panel.replaceChildren(...doc.body.childNodes);

    panel.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentMode = btn.dataset.mode;
        try { extApi.storage.local.set({ [MODE_KEY]: currentMode }); } catch(_) {}
        render();
      });
    });

    const newBody = panel.querySelector(".pup-gwa-body");
    if (newBody && scrollTop) newBody.scrollTop = scrollTop;

    const syncBtns = panel.querySelectorAll(".pup-sync-btn");
    syncBtns.forEach(btn => btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const origText = btn.textContent;
      btn.textContent = "⏳ Syncing...";
      btn.style.pointerEvents = "none";
      await triggerCurriculumSync(async (data) => {
        curriculum = data;
        render();
      });
      btn.textContent = origText;
      btn.style.pointerEvents = "all";
    }));

    panel.querySelectorAll(".pup-grade-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const cd = e.target.dataset.code;
        const val = e.target.value;
        if (val === "") delete userProjections[cd];
        else userProjections[cd] = val;
        try { extApi.storage.local.set({ [PROJ_KEY]: userProjections }); } catch(_) {}
        render();
      });
    });

    const exportBtn = panel.querySelector(".pup-export-btn");
    exportBtn.addEventListener("click", () => {
       exportBtn.textContent = "⏳";
       exportBtn.style.pointerEvents = "none";
       exportToPDF({
           currentMode,
           studentInfo,
           semesters,
           curriculum,
           userProjections,
           onComplete: () => {
               exportBtn.textContent = "📥";
               exportBtn.style.pointerEvents = "all";
           }
       });
    });

    const toggleBtn = panel.querySelector(".pup-gwa-toggle");
    const body = panel.querySelector(".pup-gwa-body");
    toggleBtn.addEventListener("click", () => {
      const c = body.style.display === "none";
      body.style.display = c ? "" : "none";
      toggleBtn.textContent = c ? "▲" : "▼";
    });

    // Initial theme sync
    syncPanelTheme(panel);
    
    // Render the chart after DOM is updated
    setTimeout(renderChartData, 0);
  }

  render();

  // Watch for theme changes (e.g. Dark Reader toggled)
  const observer = new MutationObserver(() => syncPanelTheme(panel));
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: false });
  if (document.body) {
    observer.observe(document.body, { attributes: true, style: true });
  }

  return panel;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  if (document.getElementById("pup-gwa-panel")) return;
  const semesters = scrapeAll();
  if (semesters.length === 0) return;
  const studentInfo = scrapeStudentInfo();
  const panel = await createPanel(semesters, studentInfo);
  const sec = document.querySelector("section.content");
  if (sec) sec.insertBefore(panel, sec.firstChild);
  else document.body.appendChild(panel);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
