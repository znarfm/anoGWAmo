import extApi from "webextension-polyfill";
import { generateReportHTML, getReportStyles } from "../src/core/export.js";

async function init() {
	const container = document.getElementById("report-container");
	const btnPrint = document.getElementById("btn-print");
	const btnClose = document.getElementById("btn-close");

	btnPrint?.addEventListener("click", () => window.print());
	btnClose?.addEventListener("click", () => window.close());

	try {
		const params = new URLSearchParams(window.location.search);
		const reportId = params.get("id");
		const storageKey = reportId
			? `anoGWAmo_report_${reportId}`
			: "anoGWAmo_reportData";

		const res = await extApi.storage.local.get(storageKey);
		const data = res[storageKey];

		if (reportId) {
			await extApi.storage.local.remove(storageKey);
		}

		if (!data) {
			if (container)
				container.innerHTML =
					'<p style="text-align: center; color: #888;">No report data found. Please open the extension and click "Export to PDF" again.</p>';
			return;
		}

		// Inject shared report styles
		const styleEl = document.createElement("style");
		styleEl.textContent = getReportStyles();
		document.head.appendChild(styleEl);

		const fullHTML = generateReportHTML(data);
		const parser = new DOMParser();
		const doc = parser.parseFromString(fullHTML, "text/html");

		if (container) {
			container.innerHTML = doc.body.innerHTML;
		}

		setTimeout(() => {
			window.print();
		}, 300);
	} catch (err) {
		console.error("Failed to render report:", err);
		if (container) {
			container.innerHTML =
				'<p style="text-align: center; color: #8C2222;">Error loading report.</p>';
		}
	}
}

document.addEventListener("DOMContentLoaded", init);
