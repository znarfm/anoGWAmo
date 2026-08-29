import extApi from "webextension-polyfill";
import { checkDisqualifiers, prepareChartData } from "./core/compute.js";
import { CURR_KEY, MODE_KEY, PROJ_KEY } from "./core/constants.js";
import { exportToPDF, renderChartToImage } from "./core/export.js";
import { renderModeA, renderModeB, renderModeC } from "./core/renderers.js";
import {
	scrapeAll,
	scrapeStudentInfo,
	triggerCurriculumSync,
} from "./core/scraper.js";
import { syncPanelTheme } from "./core/theme.js";
import GWAChart from "./gwa-chart.js";

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
	} catch (e) {
		console.error(e);
	}

	try {
		await extApi.storage.local.set({
			anoGWAmo_data: {
				studentInfo,
				semesters,
				disqData,
				timestamp: Date.now(),
			},
		});
	} catch (e) {
		console.error(e);
	}

	const panel = document.createElement("div");
	panel.id = "pup-gwa-panel";

	let chartInstance = null;

	function renderChartData() {
		const container = panel.querySelector("#pup-gwa-chart-wrapper");
		if (!container) return;

		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}

		if (currentMode === "C") {
			container.style.display = "none";
			return;
		}

		const chartData = prepareChartData(currentMode, semesters);

		if (chartData.length < 2) {
			container.style.display = "none";
			return;
		}

		container.style.display = "block";

		chartData.reverse();

		chartInstance = new GWAChart(container, {
			lineColor: "#800000",
			fillStart: "rgba(128, 0, 0, 0.3)",
			fillEnd: "rgba(128, 0, 0, 0.0)",
		});

		chartInstance.renderChart(chartData);
	}

	function render() {
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
        ${currentMode === "C" ? renderModeC(curriculum, userProjections) : currentMode === "B" ? renderModeB(semesters, disqData) : renderModeA(semesters, disqData)}
      </div>`;

		const parser = new DOMParser();
		const doc = parser.parseFromString(rawHTML, "text/html");
		panel.replaceChildren(...doc.body.childNodes);

		panel.querySelectorAll(".mode-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				currentMode = btn.dataset.mode;
				try {
					extApi.storage.local.set({ [MODE_KEY]: currentMode });
				} catch (_) {}
				render();
			});
		});

		const newBody = panel.querySelector(".pup-gwa-body");
		if (newBody && scrollTop) newBody.scrollTop = scrollTop;

		panel.querySelectorAll(".pup-sync-btn").forEach((btn) => {
			btn.addEventListener("click", async (e) => {
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
			});
		});

		panel.querySelectorAll(".pup-grade-select").forEach((sel) => {
			sel.addEventListener("change", (e) => {
				const cd = e.target.dataset.code;
				const val = e.target.value;
				if (val === "") delete userProjections[cd];
				else userProjections[cd] = val;
				try {
					extApi.storage.local.set({ [PROJ_KEY]: userProjections });
				} catch (_) {}
				render();
			});
		});

		const exportBtn = panel.querySelector(".pup-export-btn");
		exportBtn.addEventListener("click", () => {
			exportBtn.textContent = "⏳";
			exportBtn.style.pointerEvents = "none";
			const chartImageUrl = renderChartToImage(
				GWAChart,
				currentMode,
				semesters,
			);
			exportToPDF({
				currentMode,
				studentInfo,
				semesters,
				curriculum,
				userProjections,
				chartImageUrl,
				onComplete: () => {
					exportBtn.textContent = "📥";
					exportBtn.style.pointerEvents = "all";
				},
			});
		});

		const toggleBtn = panel.querySelector(".pup-gwa-toggle");
		const body = panel.querySelector(".pup-gwa-body");
		toggleBtn.addEventListener("click", () => {
			const c = body.style.display === "none";
			body.style.display = c ? "" : "none";
			toggleBtn.textContent = c ? "▲" : "▼";
		});

		syncPanelTheme(panel);

		setTimeout(renderChartData, 0);
	}

	render();

	let themeTimeout = null;
	const debouncedSyncTheme = () => {
		if (themeTimeout) clearTimeout(themeTimeout);
		themeTimeout = setTimeout(() => syncPanelTheme(panel), 100);
	};

	const observer = new MutationObserver(debouncedSyncTheme);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "data-theme", "style"],
	});
	if (document.body) {
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class", "data-theme", "style"],
		});
	}

	return panel;
}

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

if (document.readyState === "loading")
	document.addEventListener("DOMContentLoaded", init);
else init();
