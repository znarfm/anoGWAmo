import extApi from "webextension-polyfill";
import {
	computeModeA,
	computeModeB,
	computeModeC,
	prepareChartData,
} from "./compute.js";
import { isNonAcademic } from "./utils.js";

export function renderChartToImage(GWAChartClass, currentMode, semesters) {
	if (currentMode === "C" || !semesters || semesters.length === 0) return "";

	const container = document.createElement("div");
	container.style.cssText =
		"width:700px;height:275px;position:absolute;left:-9999px";
	document.body.appendChild(container);

	const chart = new GWAChartClass(container);
	const chartData = prepareChartData(currentMode, semesters);

	if (chartData.length === 0) {
		chart.destroy();
		document.body.removeChild(container);
		return "";
	}

	chart.renderChart(chartData);
	const url = chart.canvas.toDataURL("image/png");
	chart.destroy();
	document.body.removeChild(container);
	return url;
}

export function getReportStyles() {
	return `
		@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
		* {
			box-sizing: border-box;
		}
		body {
			font-family: 'Outfit', sans-serif;
			color: #2A2424;
			padding: 40px;
			line-height: 1.5;
			background: #fff;
			margin: 0;
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
		.student-info {
			margin: 5px 0;
			font-size: 14px;
			font-weight: 600;
			font-style: italic;
		}
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
			margin: 0;
			font-size: 11px;
			text-transform: uppercase;
			color: #888;
			letter-spacing: 1px;
		}
		.summary-box p {
			margin: 5px 0 0 0;
			font-family: 'Playfair Display', serif;
			font-size: 28px;
			font-weight: 700;
			color: #4A0404;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
				padding: 0;
				background: #fff;
			}
			.no-print {
				display: none !important;
			}
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
	`;
}

export function generateReportHTML({
	currentMode,
	studentInfo,
	semesters = [],
	curriculum = [],
	userProjections = {},
	chartImageUrl = "",
}) {
	let gwaVal = null;
	let unitsVal = 0;
	if (currentMode === "A") {
		const res = computeModeA(semesters);
		gwaVal = res.gwa;
		unitsVal = res.totalUnits;
	} else if (currentMode === "B") {
		const res = computeModeB(semesters);
		gwaVal = res.gwa;
		unitsVal = res.totalUnits;
	} else if (currentMode === "C") {
		const res = computeModeC(curriculum, userProjections);
		gwaVal = res.projectedGwa;
		unitsVal = res.totalUnits + res.remainingUnits;
	}

	const title =
		currentMode === "C" ? "Projected Academic Plan" : "Academic Record";
	const nameStr = studentInfo?.name
		? `${studentInfo.name} ${studentInfo.id ? `(${studentInfo.id})` : ""}`
		: "Anonymous Student";
	const gwaFormatted = gwaVal !== null ? gwaVal.toFixed(4) : "N/A";

	let chartHTML = "";
	if (chartImageUrl) {
		chartHTML = `
        <div style="margin: 0 auto 30px auto; text-align: center; max-width: 700px; padding: 25px; border: 1.5px solid #eee; border-radius: 12px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
           <h4 style="margin: 0 0 15px 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 2px; font-weight: 700;">GWA Progression Performance</h4>
           <img src="${chartImageUrl}" style="width: 100%; height: auto; display: block;" alt="GWA Chart" />
        </div>
      `;
	}

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
                    ${curriculum
											.filter((s) => !isNonAcademic(s.code) && s.units !== null)
											.map((s) => {
												let gradeStr =
													s.grade !== null ? s.grade.toFixed(2) : "";
												let isProj = false;
												if (s.grade === null) {
													const yearPart = (s.schoolYear || "UNKNOWN").replace(
														/(FOURTH|THIRD|SECOND|FIRST) YEAR/,
														"$1 YEAR",
													);
													const semKey = `${yearPart} - ${s.semester || "UKNOWN SEM"}`;
													const p = parseFloat(
														userProjections[semKey] ||
															userProjections.GLOBAL ||
															null,
													);
													if (!Number.isNaN(p)) {
														gradeStr = p.toFixed(2);
														isProj = true;
													} else gradeStr = "—";
												}
												return `
                        <tr style="border-bottom: 1px solid #ddd; font-size: 13px; ${isProj ? "color: #8C2222; font-style: italic;" : ""}">
                            <td style="padding: 8px; font-weight: 600;">${s.code}</td>
                            <td style="padding: 8px;">${s.description} ${isProj ? '<span style="font-size:10px; color:#aaa;">(Proj)</span>' : ""}</td>
                            <td style="padding: 8px;">${s.units}</td>
                            <td style="padding: 8px; font-weight: bold;">${gradeStr}</td>
                        </tr>`;
											})
											.join("")}
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
                ${semesters
									.map(
										(sem) => `
                <tbody>
                    <tr>
                        <td colspan="4" style="padding-top: 24px; padding-bottom: 4px; font-weight: bold; font-size: 14px; color: #800000; border-bottom: 1px solid #ddd;">${sem.label}</td>
                    </tr>
                    ${sem.subjects
											.map(
												(s) => `
                        <tr style="border-bottom: 1px solid #f0f0f0; ${isNonAcademic(s.code) ? "color: #999;" : ""}">
                            <td style="padding: 6px 8px; font-weight: 600;">${s.code}</td>
                            <td style="padding: 6px 8px;">${s.description}</td>
                            <td style="padding: 6px 8px;">${s.units !== null ? s.units : "—"}</td>
                            <td style="padding: 6px 8px; font-weight: bold;">${s.gradeRaw || "—"}</td>
                        </tr>
                    `,
											)
											.join("")}
                </tbody>
                `,
									)
									.join("")}
            </table>
        `;
	}

	return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>anoGWAmo? Report</title>
            <style>
                ${getReportStyles()}
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="title">${title}</h1>
                <p class="student-info">${nameStr}</p>
                <p style="margin:0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Calculation Mode: ${currentMode === "C" ? "Planner" : currentMode === "A" ? "Manual" : "Site GPA"}</p>
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
}

export async function exportToPDF({
	currentMode,
	studentInfo,
	semesters,
	curriculum,
	userProjections,
	chartImageUrl,
	onComplete = () => {},
}) {
	try {
		const reportId =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
		const storageKey = `anoGWAmo_report_${reportId}`;

		await extApi.storage.local.set({
			[storageKey]: {
				currentMode,
				studentInfo,
				semesters,
				curriculum,
				userProjections,
				chartImageUrl,
			},
		});

		const reportUrl = extApi.runtime.getURL(
			`report/report.html?id=${encodeURIComponent(reportId)}`,
		);
		if (extApi.tabs?.create) {
			await extApi.tabs.create({ url: reportUrl });
		} else {
			window.open(reportUrl, "_blank");
		}
	} catch (err) {
		console.error("Failed to open report tab:", err);
	} finally {
		onComplete();
	}
}
