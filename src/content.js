/**
 * anoGWAmo?
 * Manual: manual computation, excludes PATHFIT/NSTP/CWTS/ROTC by code prefix
 * Site GPA: uses the per-semester GPA values already shown by the PUPSIS
 *         website, then re-weights them by academic units for a cumulative figure.
 */

import extApi from "webextension-polyfill";

const NON_ACADEMIC_PREFIXES = ["PATHFIT", "NSTP", "CWTS", "ROTC"];
const HONORS = [
  { label: "Summa Cum Laude", min: 1.0000, max: 1.1500, color: "var(--pup-honor-summa)" },
  { label: "Magna Cum Laude", min: 1.1501, max: 1.3500, color: "var(--pup-honor-magna)" },
  { label: "Cum Laude",       min: 1.3501, max: 1.6000, color: "var(--pup-honor-cumlaude)" },
];
const MODE_KEY = "pup_gwa_mode";

function isNonAcademic(code) {
  const c = code.trim().toUpperCase();
  return NON_ACADEMIC_PREFIXES.some(p => c.startsWith(p));
}

function parseGrade(raw) {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function honorFor(gwa) {
  if (gwa === null) return null;
  for (const h of HONORS) if (gwa >= h.min && gwa <= h.max) return h.label;
  return null;
}

function honorColor(label) {
  if (label === "Summa Cum Laude") return "var(--pup-honor-summa)";
  if (label === "Magna Cum Laude") return "var(--pup-honor-magna)";
  if (label === "Cum Laude")       return "var(--pup-honor-cumlaude)";
  return "var(--pup-honor-none)";
}

// ── Scrape ──────────────────────────────────────────────────────────────────

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
      subjects.push({
        code, description,
        units:         isNaN(units) ? null : units,
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

// ── Manual Mode ───────────────────────────────────────────────────────────────────

function computeModeA(semesters) {
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

function computeModeB(semesters) {
  let pts = 0, units = 0;
  const breakdown = [], skipped = [];
  semesters.forEach(sem => {
    if (sem.siteGpa === null) { skipped.push(`${sem.label} – no site GPA available`); return; }
    let semUnits = 0;
    sem.subjects.forEach(subj => {
      if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) semUnits += subj.units;
    });
    if (semUnits === 0) { skipped.push(`${sem.label} – 0 academic units with grades`); return; }
    pts += sem.siteGpa * semUnits; units += semUnits;
    breakdown.push({ label: sem.label, siteGpa: sem.siteGpa, units: semUnits });
  });
  return { gwa: units > 0 ? pts / units : null, totalUnits: units, breakdown, skipped };
}

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

const NOTE_HTML = `<p class="pup-gwa-note">ℹ For reference only. Official GWA is determined by the PUP Registrar. Transfer students from outside the PUP system are not eligible for Latin Honors.</p>`;

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

async function createPanel(semesters) {
  const disqData = checkDisqualifiers(semesters);
  
  let currentMode = "B";
  try {
    const data = await extApi.storage.local.get([MODE_KEY]);
    if (data[MODE_KEY]) currentMode = data[MODE_KEY];
  } catch(e) { console.error(e); }

  try {
    await extApi.storage.local.set({ 
      anoGWAmo_data: { 
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
    if (!container || typeof GWAChart === 'undefined') return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
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
    panel.innerHTML = `
      <div class="pup-gwa-header">
        <span class="pup-gwa-title">🎓 anoGWAmo?</span>
        <div class="pup-header-controls">
          <div class="pup-mode-switcher">
            <button type="button" class="mode-btn ${currentMode === "A" ? "active" : ""}" data-mode="A">Manual</button>
            <button type="button" class="mode-btn ${currentMode === "B" ? "active" : ""}" data-mode="B">Site GPA</button>
          </div>
          <button type="button" class="pup-gwa-toggle" title="Collapse/Expand">▲</button>
        </div>
      </div>
      <div class="pup-gwa-body">
        <div id="pup-gwa-chart-wrapper" style="width: 100%; margin-bottom: 24px; display: none;"></div>
        ${currentMode === "B" ? renderModeB(semesters, disqData) : renderModeA(semesters, disqData)}
      </div>`;

    panel.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentMode = btn.dataset.mode;
        try { extApi.storage.local.set({ [MODE_KEY]: currentMode }); } catch(_) {}
        render();
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
  const panel = await createPanel(semesters);
  const sec = document.querySelector("section.content");
  if (sec) sec.insertBefore(panel, sec.firstChild);
  else document.body.appendChild(panel);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
