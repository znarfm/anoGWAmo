import extApi from "webextension-polyfill";
import {
	computeModeA,
	computeModeB,
	computeModeC,
} from "../src/core/compute.js";
import {
	CURR_KEY,
	GRADE_OPTIONS,
	MODE_KEY,
	PROJ_KEY,
} from "../src/core/constants.js";
import { exportToPDF, renderChartToImage } from "../src/core/export.js";
import { honorColor, honorFor } from "../src/core/utils.js";
import GWAChart from "../src/gwa-chart.js";

async function render() {
	const app = document.getElementById("app");
	app.innerHTML = "";

	try {
		const res = await extApi.storage.local.get([
			"anoGWAmo_data",
			CURR_KEY,
			PROJ_KEY,
			MODE_KEY,
		]);
		const data = res.anoGWAmo_data;
		const curriculum = res[CURR_KEY] || [];
		const projections = res[PROJ_KEY] || {};
		const mode = res[MODE_KEY] || "B";

		if (
			(!data?.semesters || data.semesters.length === 0) &&
			curriculum.length === 0
		) {
			const tpl = document.getElementById("tpl-empty").content.cloneNode(true);
			tpl.querySelector("#btn-login").addEventListener("click", () => {
				extApi.tabs.create({ url: "https://sisstudents.pup.edu.ph" });
			});
			app.appendChild(tpl);
			return;
		}

		const tpl = document
			.getElementById("tpl-dashboard")
			.content.cloneNode(true);

		let gwa, totalUnits, totalAcademicUnits, reqAverages;
		if (mode === "C") {
			const res = computeModeC(curriculum, projections);
			gwa = res.projectedGwa;
			totalUnits = res.totalUnits;
			totalAcademicUnits = res.totalAcademicUnits;
			reqAverages = res.requiredAverages;
		} else {
			const res =
				mode === "A"
					? computeModeA(data.semesters)
					: computeModeB(data.semesters);
			gwa = res.gwa;
			totalUnits = res.totalUnits;
		}

		const honor = honorFor(gwa);
		const hasDisqualifiers =
			data?.disqData?.disqualifiers && data.disqData.disqualifiers.length > 0;
		const isOngoing =
			mode !== "C" &&
			data &&
			data.disqData &&
			data.disqData.pending &&
			data.disqData.pending.length > 0;

		const modeBtns = tpl.querySelectorAll(".mode-btn");
		modeBtns.forEach((btn) => {
			btn.classList.toggle("active", btn.dataset.mode === mode);
			btn.addEventListener("click", async () => {
				await extApi.storage.local.set({ [MODE_KEY]: btn.dataset.mode });
				render();
			});
		});

		if (mode === "C") {
			const plTpl = document
				.getElementById("tpl-planner")
				.content.cloneNode(true);
			plTpl.querySelector("#pl-gwa").textContent =
				gwa !== null ? gwa.toFixed(4) : "—";
			plTpl.querySelector("#pl-gwa").style.color = honorColor(honor);
			plTpl.querySelector("#pl-units").textContent =
				`${totalUnits} / ${totalAcademicUnits} acad units`;

			const globalSel = plTpl.querySelector("#pl-global-select");
			const baseline = projections["GLOBAL"] || "";
			if (globalSel) {
				globalSel.value = baseline;
				globalSel.addEventListener("change", async (e) => {
					const val = e.target.value;
					if (val === "") delete projections["GLOBAL"];
					else projections["GLOBAL"] = val;
					await extApi.storage.local.set({ [PROJ_KEY]: projections });
					render();
				});
			}

			const targetsGrid = plTpl.querySelector("#pl-targets");
			reqAverages.forEach((h) => {
				const card = document.createElement("div");
				card.className = "pl-target-card";
				card.style.borderLeft = `3px solid ${h.color}`;
				const msg =
					h.req < 1.0
						? "N/A"
						: h.req > 3.0
							? "Guaranteed"
							: `≤ ${h.req.toFixed(4)}`;
				card.innerHTML = `<div class="pl-t-lab">${h.label}</div><div class="pl-t-val">${msg}</div>`;
				targetsGrid.appendChild(card);
			});

			tpl.querySelector(".main-card").replaceWith(plTpl);
			tpl.querySelector("#ds-status-card").style.display = "none";
		} else {
			tpl.querySelector("#ds-gwa").textContent =
				gwa !== null ? gwa.toFixed(4) : "N/A";
			let colorKey = honorColor(honor);

			let icon, msg;
			if (hasDisqualifiers) {
				icon = "✗";
				msg = "Disqualified";
				colorKey = "rgba(180, 0, 0, 1)";
			} else if (!honor) {
				icon = "○";
				msg =
					gwa !== null
						? gwa > 1.6
							? "No Latin Honors"
							: "Below Threshold"
						: "No Grades";
			} else {
				icon = "✓";
				msg = isOngoing ? `Projected: ${honor}` : honor;
			}

			tpl.querySelector("#ds-gwa").style.color = colorKey;
			tpl.querySelector("#ds-units").textContent =
				`${totalUnits} academic units computed`;
			tpl.querySelector("#ds-status-icon").textContent = icon;
			tpl.querySelector("#ds-status-text").textContent = msg;
		}

		const timestamp = data
			? data.timestamp
			: curriculum.length > 0
				? Date.now()
				: null;
		if (timestamp) {
			const date = new Date(timestamp);
			tpl.querySelector("#ds-timestamp").textContent =
				`Last synced: ${date.toLocaleString()}`;
		}

		tpl.querySelector("#btn-update").addEventListener("click", () => {
			extApi.tabs.create({
				url: "https://sisstudents.pup.edu.ph",
			});
		});

		const exportBtn = tpl.querySelector("#btn-export");
		if (exportBtn) {
			exportBtn.addEventListener("click", () => {
				exportBtn.textContent = "⏳";
				exportBtn.style.pointerEvents = "none";
				const chartImageUrl = data?.semesters
					? renderChartToImage(GWAChart, mode, data.semesters)
					: "";
				exportToPDF({
					currentMode: mode,
					studentInfo: data?.studentInfo,
					semesters: data?.semesters,
					curriculum,
					userProjections: projections,
					chartImageUrl,
					onComplete: () => {
						exportBtn.textContent = "📥 Export PDF";
						exportBtn.style.pointerEvents = "all";
					},
				});
			});
		}

		app.appendChild(tpl);
	} catch (error) {
		console.error(error);
		app.innerHTML = `<div class="empty-state"><p>Error loading data.</p></div>`;
	}
}

extApi.storage.onChanged.addListener((changes, areaName) => {
	if (areaName === "local") {
		const relevantKeys = ["anoGWAmo_data", CURR_KEY, PROJ_KEY, MODE_KEY];
		if (relevantKeys.some((k) => k in changes)) {
			render();
		}
	}
});

document.addEventListener("DOMContentLoaded", render);
