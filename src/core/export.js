import extApi from "webextension-polyfill";
import {
	checkDisqualifiers,
	computeModeA,
	computeModeB,
	computeModeC,
	prepareChartData,
} from "./compute.js";
import { escapeHTML, honorFor, isNonAcademic } from "./utils.js";

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
			margin-bottom: 24px;
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
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 16px;
			margin-bottom: 20px;
		}
		.summary-card {
			background: #fbfbf9;
			border: 1px solid rgba(74, 4, 4, 0.1);
			border-radius: 8px;
			padding: 16px 20px;
			text-align: center;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}
		.summary-label {
			margin: 0 0 6px 0;
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			color: #8c6a3f;
			letter-spacing: 1.5px;
		}
		.summary-value {
			margin: 0 0 8px 0;
			font-family: 'Playfair Display', serif;
			font-size: 42px;
			font-weight: 800;
			line-height: 1;
			color: #4A0404;
		}
		.status-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			padding: 5px 14px;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.3px;
		}
		.status-honor {
			background: #eef5f0;
			color: #1b5e20;
			border: 1px solid rgba(27, 94, 32, 0.25);
		}
		.status-disq {
			background: #fdf2f2;
			color: #b71c1c;
			border: 1px solid rgba(183, 28, 28, 0.25);
		}
		.status-none {
			background: #f3f1ec;
			color: #6b6262;
			border: 1px solid rgba(107, 98, 98, 0.2);
		}
		.disq-alert {
			background: #fdf2f2;
			border: 1px solid rgba(183, 28, 28, 0.25);
			border-left: 4px solid #b71c1c;
			border-radius: 6px;
			padding: 12px 16px;
			margin-bottom: 24px;
			font-size: 12px;
			color: #5c1414;
		}
		.disq-alert strong {
			color: #b71c1c;
			display: block;
			margin-bottom: 6px;
			font-size: 13px;
		}
		.disq-alert ul {
			margin: 0;
			padding-left: 18px;
		}
		.disq-alert li {
			margin-bottom: 3px;
		}
		.planner-targets {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 10px;
			margin-bottom: 24px;
		}
		.target-box {
			background: #fbfbf9;
			border: 1px solid rgba(74, 4, 4, 0.1);
			border-radius: 6px;
			padding: 10px 8px;
			text-align: center;
		}
		.target-label {
			font-size: 10px;
			font-weight: 700;
			text-transform: uppercase;
			color: #6b6262;
			letter-spacing: 0.5px;
			margin-bottom: 4px;
		}
		.target-val {
			font-size: 13px;
			font-weight: 700;
			color: #4a0404;
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
			table, tr, .summary, .disq-alert, .planner-targets {
				break-inside: avoid;
				page-break-inside: avoid;
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
	let completedUnits = 0;
	let remainingUnits = 0;
	let modeCData = null;

	if (currentMode === "A") {
		const res = computeModeA(semesters);
		gwaVal = res.gwa;
		unitsVal = res.totalUnits;
	} else if (currentMode === "B") {
		const res = computeModeB(semesters);
		gwaVal = res.gwa;
		unitsVal = res.totalUnits;
	} else if (currentMode === "C") {
		modeCData = computeModeC(curriculum, userProjections);
		gwaVal = modeCData.projectedGwa;
		completedUnits = modeCData.totalUnits;
		remainingUnits = modeCData.remainingUnits;
		unitsVal = modeCData.totalAcademicUnits;
	}

	let disqualifiers = [];
	if (semesters && semesters.length > 0) {
		const res = checkDisqualifiers(semesters);
		disqualifiers = res.disqualifiers;
	} else if (curriculum && curriculum.length > 0) {
		curriculum.forEach((subj) => {
			const gs = (subj.gradeRaw ?? "").trim().toLowerCase();
			if (subj.grade === 5.0)
				disqualifiers.push(
					`Failing grade (5.0) in ${subj.code} – ${subj.description}`,
				);
			if (gs === "inc." || gs === "inc")
				disqualifiers.push(
					`Incomplete (Inc.) in ${subj.code} – ${subj.description}`,
				);
			if (gs === "w" || gs === "w.")
				disqualifiers.push(
					`Withdrawn (W) in ${subj.code} – ${subj.description}`,
				);
			if (subj.grade !== null && subj.grade !== 5.0 && subj.grade > 2.5)
				disqualifiers.push(
					`Grade below 2.5 in ${subj.code} – ${subj.description}: ${subj.grade}`,
				);
		});
	}

	const hasDisqualifiers = disqualifiers.length > 0;
	const rawHonor = honorFor(gwaVal);
	let badgeIcon = "";
	let badgeMsg = "";
	let badgeClass = "";

	if (hasDisqualifiers) {
		badgeIcon = "✗";
		badgeMsg = "Disqualified from Latin Honors";
		badgeClass = "status-disq";
	} else if (rawHonor) {
		badgeIcon = "✓";
		badgeMsg = currentMode === "C" ? `Projected: ${rawHonor}` : rawHonor;
		badgeClass = "status-honor";
	} else if (gwaVal !== null) {
		badgeIcon = "○";
		badgeMsg =
			gwaVal > 1.6
				? "No Latin Honors (GWA > 1.6000)"
				: "Below Cum Laude Threshold";
		badgeClass = "status-none";
	} else {
		badgeIcon = "○";
		badgeMsg = "No Grades Recorded";
		badgeClass = "status-none";
	}

	const title =
		currentMode === "C" ? "Projected Academic Plan" : "Academic Record";
	const nameStr = studentInfo?.name
		? `${studentInfo.name} ${studentInfo.id ? `(${studentInfo.id})` : ""}`
		: "Anonymous Student";
	const gwaFormatted = gwaVal !== null ? gwaVal.toFixed(4) : "N/A";

	let disqAlertHTML = "";
	if (hasDisqualifiers) {
		disqAlertHTML = `
            <div class="disq-alert">
                <strong>⚠️ Latin Honors Disqualification Detected (PUP Criteria)</strong>
                <ul>
                    ${disqualifiers.map((d) => `<li>${escapeHTML(d)}</li>`).join("")}
                </ul>
            </div>
        `;
	}

	let targetsHTML = "";
	if (currentMode === "C" && modeCData && remainingUnits > 0) {
		targetsHTML = `
            <div class="planner-targets">
                ${modeCData.requiredAverages
									.map((h) => {
										const reqMsg =
											h.req < 1.0
												? "N/A"
												: h.req > 3.0
													? "Guaranteed"
													: `≤ ${h.req.toFixed(4)}`;
										const borderTopColor =
											h.label === "Summa Cum Laude"
												? "#B48600"
												: h.label === "Magna Cum Laude"
													? "#4A0404"
													: "#8C6A3F";
										return `
                    <div class="target-box" style="border-top: 3px solid ${borderTopColor};">
                        <div class="target-label">${escapeHTML(h.label)}</div>
                        <div class="target-val">${reqMsg}</div>
                    </div>`;
									})
									.join("")}
            </div>
        `;
	}

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
		const chronologicalSemesters = [...semesters].reverse();
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
                ${chronologicalSemesters
									.map(
										(sem) => `
                <tbody>
                    <tr>
                        <td colspan="4" style="padding-top: 24px; padding-bottom: 4px; font-weight: bold; font-size: 14px; color: #800000; border-bottom: 1px solid #ddd;">${escapeHTML(sem.label)}</td>
                    </tr>
                    ${sem.subjects
											.map(
												(s) => `
                        <tr style="border-bottom: 1px solid #f0f0f0; ${isNonAcademic(s.code) ? "color: #999;" : ""}">
                            <td style="padding: 6px 8px; font-weight: 600;">${escapeHTML(s.code)}</td>
                            <td style="padding: 6px 8px;">${escapeHTML(s.description)}</td>
                            <td style="padding: 6px 8px;">${s.units !== null ? s.units : "—"}</td>
                            <td style="padding: 6px 8px; font-weight: bold;">${escapeHTML(s.gradeRaw || "—")}</td>
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
                <div class="summary-card">
                    <div class="summary-label">${currentMode === "C" ? "Projected Final GWA" : "Cumulative GWA"}</div>
                    <div class="summary-value">${gwaFormatted}</div>
                    <div class="status-badge ${badgeClass}">${badgeIcon} ${escapeHTML(badgeMsg)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Academic Units</div>
                    <div class="summary-value" style="font-size: 38px;">${unitsVal}</div>
                    <div style="font-size: 11px; color: #8c6a3f; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${currentMode === "C" ? `${completedUnits} completed · ${remainingUnits} remaining` : "Total computed"}</div>
                </div>
            </div>
            ${disqAlertHTML}
            ${targetsHTML}
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
