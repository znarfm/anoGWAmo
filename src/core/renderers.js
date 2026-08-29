import { computeModeA, computeModeB, computeModeC } from "./compute.js";
import { HONORS } from "./constants.js";
import { escapeHTML, honorColor, honorFor } from "./utils.js";

export function honorsTableHTML(gwa) {
	return `<table class="pup-honors-table-inner">
    <thead><tr><th>Honor</th><th>GWA Range</th><th>Status</th></tr></thead>
    <tbody>${HONORS.map((h) => {
			const m = gwa !== null && gwa >= h.min && gwa <= h.max;
			return `<tr class="${m ? "row-match" : ""}">
        <td>${escapeHTML(h.label)}</td>
        <td>${h.min.toFixed(4)} - ${h.max.toFixed(4)}</td>
        <td>${m ? "✓ Your GWA" : gwa !== null ? (gwa < h.min ? "Below" : "Above") : "-"}</td>
      </tr>`;
		}).join("")}</tbody>
  </table>`;
}

export function statusBadgeHTML(gwa, disqualifiers, isOngoing) {
	const honor = honorFor(gwa);
	let icon, msg, cls;
	if (disqualifiers.length > 0) {
		icon = "✗";
		msg = "Disqualified from Latin Honors";
		cls = "status-disqualified";
	} else if (!honor) {
		icon = "○";
		msg =
			gwa !== null
				? gwa > 1.6
					? `GWA ${gwa.toFixed(4)} – No Latin Honor bracket`
					: "Below Cum Laude threshold"
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

export function disqAndPendingHTML(disqualifiers, pending) {
	const dq =
		disqualifiers.length > 0
			? `<ul class="pup-disq-list">${disqualifiers.map((d) => `<li>⚠️ ${escapeHTML(d)}</li>`).join("")}</ul>`
			: "<p class='muted'>None detected</p>";
	const pg =
		pending.length > 0
			? `<ul class="pup-subj-list">${pending.map((s) => `<li>${escapeHTML(s)}</li>`).join("")}</ul>`
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

export function renderModeA(semesters, disqData) {
	const { gwa, totalUnits, included, excluded } = computeModeA(semesters);
	const { disqualifiers, pending } = disqData;
	const isOngoing = pending.length > 0;
	const honor = honorFor(gwa);

	const excHTML =
		excluded.length > 0
			? `<ul class="pup-subj-list">${excluded
					.map(
						(s) =>
							`<li><span class="subj-code ${s.isNonAcademic ? "non-academic" : "no-grade"}">${escapeHTML(s.code)}</span>
        ${escapeHTML(s.description)} <em>[${escapeHTML(s.semLabel)}]</em>
        ${s.isNonAcademic ? "<span class='tag'>Non-Academic</span>" : "<span class='tag tag-warn'>No Grade</span>"}
        </li>`,
					)
					.join("")}</ul>`
			: "<p class='muted'>None</p>";

	const incHTML =
		included.length > 0
			? `<table class="pup-included-table">
        <thead><tr><th>Code</th><th>Description</th><th>Units</th><th>Grade</th><th>Contribution</th></tr></thead>
        <tbody>${included
					.map(
						(s) => `<tr>
          <td>${escapeHTML(s.code)}</td><td>${escapeHTML(s.description)}</td><td>${s.units}</td>
          <td>${s.grade}</td><td>${(s.grade * s.units).toFixed(2)}</td>
        </tr>`,
					)
					.join("")}</tbody>
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

export function renderModeB(semesters, disqData) {
	const { gwa, totalUnits, breakdown, skipped } = computeModeB(semesters);
	const { disqualifiers, pending } = disqData;
	const isOngoing = pending.length > 0;
	const honor = honorFor(gwa);

	const bdHTML =
		breakdown.length > 0
			? `<table class="pup-included-table">
        <thead><tr><th>Semester</th><th>Site GPA</th><th>Academic Units</th><th>Weighted Points</th></tr></thead>
        <tbody>
          ${breakdown
						.map(
							(b) => `<tr>
            <td>${escapeHTML(b.label)}</td><td>${b.siteGpa.toFixed(2)}</td>
            <td>${b.units}</td><td>${(b.siteGpa * b.units).toFixed(4)}</td>
          </tr>`,
						)
						.join("")}
          <tr class="breakdown-total">
            <td colspan="2"><strong>Cumulative GWA</strong></td>
            <td><strong>${totalUnits} units</strong></td>
            <td><strong>${gwa !== null ? gwa.toFixed(4) : "N/A"}</strong></td>
          </tr>
        </tbody>
      </table>`
			: "<p class='muted'>No semester GPA data found.</p>";

	const skippedHTML =
		skipped.length > 0
			? `<details class="pup-section">
        <summary>⏭️ Skipped Semesters (${skipped.length})</summary>
        <ul class="pup-subj-list">${skipped.map((s) => `<li>${escapeHTML(s)}</li>`).join("")}</ul>
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

export function renderModeC(curriculum, userProjections) {
	if (!curriculum || curriculum.length === 0) {
		return `
      <div class="pup-gwa-main">
        <div class="pup-gwa-label">Curriculum Planner</div>
        <p class="muted" style="margin: 10px 0;">We need to load your entire study journey first.</p>
        <button id="pup-sync-btn" class="pup-sync-btn secondary">📊 Click to Sync Curriculum</button>
        <p class="pup-gwa-note" style="margin-top: 5px;">This will quickly open and close the Curriculum Evaluation modal to copy your subjects.</p>
      </div>`;
	}

	const {
		gwa,
		projectedGwa,
		totalUnits,
		totalAcademicUnits,
		remainingUnits,
		pUnits,
		unprojectedUnits,
		pending,
		pendingBySem,
		requiredAverages,
	} = computeModeC(curriculum, userProjections);
	const currentHonor = honorFor(gwa);
	const globalProj = userProjections.GLOBAL ?? "";

	let targetsHTML = "";
	if (remainingUnits > 0) {
		targetsHTML = `<div class="pup-targets-container">
      <h4 class="pup-targets-title">Target Average for Remaining ${remainingUnits} Units</h4>
      <div class="pup-targets-grid">
        ${requiredAverages
					.map((h) => {
						let msg = "";
						let cls = "";
						if (h.req < 1.0) {
							msg = "Impossible";
							cls = "target-impossible";
						} else if (h.req > 3.0) {
							msg = "Guaranteed";
							cls = "target-guaranteed";
						} else {
							msg = `≤ ${h.req.toFixed(4)}`;
							cls = "target-possible";
						}

						return `<div class="pup-target-card ${cls}" style="border-top-color: ${h.color}">
            <div class="pup-target-label">${escapeHTML(h.label)}</div>
            <div class="pup-target-val">${msg}</div>
          </div>`;
					})
					.join("")}
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
		const resultColor =
			projectedGwa !== null ? honorColor(pHonorVal) : "var(--pup-text-muted)";

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
            ${[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]
							.map(
								(v) =>
									`<option value="${v.toFixed(2)}" ${parseFloat(globalProj) === v ? "selected" : ""}>${v.toFixed(2)}</option>`,
							)
							.join("")}
          </select>
        </label>
        <div class="pup-simulator-result" style="color: ${resultColor}">
          <span class="pup-sim-label">Projected Final GWA</span>
          <span class="pup-sim-val">${pGwaStr}</span>
          ${pHonorVal ? `<span class="pup-sim-honor status-honor">${escapeHTML(pHonorVal)}</span>` : ""}
        </div>
        ${subtext}
      </div>
    `;
	}

	const pendingSemsHTML =
		pending.length > 0
			? Object.entries(pendingBySem)
					.map(([semKey, data]) => {
						const proj = userProjections[semKey] ?? "";
						const labelCls = proj === "" && globalProj !== "" ? "muted-sm" : "";
						const escapedSemKey = escapeHTML(semKey);
						return `
      <div class="pup-pending-sem">
        <div class="pup-pending-sem-title" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--pup-card-border); padding-bottom: 4px; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--pup-text-muted); text-transform: uppercase;">${escapedSemKey}</span>
          <div style="font-size: 11px; font-weight: 600; text-transform: none; display: flex; align-items: center;" class="${labelCls}">
            Average Target:
            <select class="pup-grade-select" data-code="${escapedSemKey}" style="margin-left: 6px; font-size: 11px; padding: 2px 4px; min-width: 50px;">
              <option value="">${globalProj ? `(Global ${parseFloat(globalProj).toFixed(2)})` : "--"}</option>
              ${[1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]
								.map(
									(v) =>
										`<option value="${v.toFixed(2)}" ${parseFloat(proj) === v ? "selected" : ""}>${v.toFixed(2)}</option>`,
								)
								.join("")}
            </select>
          </div>
        </div>
        <ul class="pup-subj-list" style="margin-top: 6px; padding-left: 0;">
          ${data.subjects.map((s) => `<li><span class="subj-code">${escapeHTML(s.code)}</span> <span class="pup-subj-desc">${escapeHTML(s.description)}</span> <span class="muted-sm" style="margin: 0 0 0 auto; white-space: nowrap;">${s.units}u</span></li>`).join("")}
        </ul>
      </div>
    `;
					})
					.join("")
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
