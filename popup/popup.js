import extApi from "webextension-polyfill";
import {
	computeModeA,
	computeModeB,
	computeModeC,
} from "../src/core/compute.js";
import { CURR_KEY, MODE_KEY, PROJ_KEY } from "../src/core/constants.js";
import { exportToPDF, renderChartToImage } from "../src/core/export.js";
import { honorColor, honorFor } from "../src/core/utils.js";
import GWAChart from "../src/gwa-chart.js";

let renderSeq = 0;

async function render() {
	const currentSeq = ++renderSeq;

	try {
		const res = await extApi.storage.local.get([
			"anoGWAmo_data",
			CURR_KEY,
			PROJ_KEY,
			MODE_KEY,
		]);
		if (currentSeq !== renderSeq) return;

		const app = document.getElementById("app");
		if (!app) return;

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
			if (currentSeq !== renderSeq) return;
			app.replaceChildren(tpl);
			return;
		}

		const tpl = document
			.getElementById("tpl-dashboard")
			.content.cloneNode(true);

		let gwa, totalUnits, totalAcademicUnits, reqAverages, modeCData;
		if (mode === "C") {
			modeCData = computeModeC(curriculum, projections);
			gwa = modeCData.projectedGwa;
			totalUnits = modeCData.totalUnits;
			totalAcademicUnits = modeCData.totalAcademicUnits;
			reqAverages = modeCData.requiredAverages;
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
			btn.addEventListener("click", () => {
				extApi.storage.local.set({ [MODE_KEY]: btn.dataset.mode });
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
			const baseline = projections.GLOBAL || "";
			if (globalSel) {
				globalSel.value = baseline;
				globalSel.addEventListener("change", (e) => {
					const val = e.target.value;
					if (val === "") delete projections.GLOBAL;
					else projections.GLOBAL = val;
					extApi.storage.local.set({ [PROJ_KEY]: projections });
				});
			}

			const targetsGrid = plTpl.querySelector("#pl-targets");
			reqAverages.forEach((h) => {
				const card = document.createElement("div");
				card.className = "pl-target-card";
				card.style.borderTop = `3px solid ${h.color}`;
				const msg =
					h.req < 1.0
						? "N/A"
						: h.req > 3.0
							? "Guaranteed"
							: `≤ ${h.req.toFixed(4)}`;
				card.innerHTML = `<div class="pl-t-lab">${h.label}</div><div class="pl-t-val">${msg}</div>`;
				targetsGrid.appendChild(card);
			});

			const plList = plTpl.querySelector("#pl-list");
			if (plList && modeCData) {
				const { pending, pendingBySem } = modeCData;
				if (pending && pending.length > 0) {
					Object.entries(pendingBySem).forEach(([semKey, semData]) => {
						const semCard = document.createElement("div");
						semCard.className = "pl-sem-card";

						const semHeader = document.createElement("div");
						semHeader.className = "pl-sem-header";

						const titleSpan = document.createElement("span");
						titleSpan.className = "pl-sem-title";
						titleSpan.textContent = semKey;
						titleSpan.title = semKey;

						const targetDiv = document.createElement("div");
						targetDiv.className = "pl-sem-target";
						targetDiv.textContent = "Target: ";

						const semSelect = document.createElement("select");
						semSelect.className = "pl-select";
						semSelect.dataset.code = semKey;

						const defaultOpt = document.createElement("option");
						defaultOpt.value = "";
						defaultOpt.textContent = baseline
							? `(Global ${parseFloat(baseline).toFixed(2)})`
							: "--";
						semSelect.appendChild(defaultOpt);

						const grades = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];
						const currentProj = projections[semKey] ?? "";
						grades.forEach((g) => {
							const opt = document.createElement("option");
							const gStr = g.toFixed(2);
							opt.value = gStr;
							opt.textContent = gStr;
							if (parseFloat(currentProj) === g) {
								opt.selected = true;
							}
							semSelect.appendChild(opt);
						});

						semSelect.addEventListener("change", (e) => {
							const val = e.target.value;
							if (val === "") delete projections[semKey];
							else projections[semKey] = val;
							extApi.storage.local.set({ [PROJ_KEY]: projections });
						});

						targetDiv.appendChild(semSelect);
						semHeader.appendChild(titleSpan);
						semHeader.appendChild(targetDiv);
						semCard.appendChild(semHeader);

						const subjList = document.createElement("ul");
						subjList.className = "pl-subj-list";
						semData.subjects.forEach((s) => {
							const li = document.createElement("li");
							li.className = "pl-subj-item";

							const codeSpan = document.createElement("span");
							codeSpan.className = "pl-subj-code";
							codeSpan.textContent = s.code;

							const descSpan = document.createElement("span");
							descSpan.className = "pl-subj-desc";
							descSpan.textContent = s.description;
							descSpan.title = s.description;

							const unitsSpan = document.createElement("span");
							unitsSpan.className = "pl-subj-units";
							unitsSpan.textContent = `${s.units}u`;

							li.appendChild(codeSpan);
							li.appendChild(descSpan);
							li.appendChild(unitsSpan);
							subjList.appendChild(li);
						});
						semCard.appendChild(subjList);
						plList.appendChild(semCard);
					});
				} else {
					const emptyNote = document.createElement("p");
					emptyNote.className = "muted-note";
					emptyNote.style.textAlign = "center";
					emptyNote.textContent =
						"All academic units completed! No pending subjects.";
					plList.appendChild(emptyNote);
				}
			}

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

		if (currentSeq !== renderSeq) return;
		app.replaceChildren(tpl);
	} catch (error) {
		console.error(error);
		if (currentSeq === renderSeq) {
			const app = document.getElementById("app");
			if (app) {
				app.innerHTML = `<div class="empty-state"><p>Error loading data.</p></div>`;
			}
		}
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
