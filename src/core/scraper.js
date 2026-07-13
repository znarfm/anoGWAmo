import extApi from "webextension-polyfill";
import { CURR_KEY } from "./constants.js";
import { defaultUnitsFor, isNonAcademic, parseGrade } from "./utils.js";

export async function triggerCurriculumSync(onComplete) {
	const evalBtn = Array.from(document.querySelectorAll("a, button, .btn")).find(
		(el) => el.textContent.trim().includes("Curriculum Evaluation"),
	);

	if (!evalBtn) {
		alert("anoGWAmo: 'Curriculum Evaluation' button not found on this page.");
		return false;
	}

	evalBtn.click();

	let attempts = 0;
	const modalData = await new Promise((resolve) => {
		const interval = setInterval(() => {
			const modal = document.querySelector(".modal-content");
			if (modal?.querySelector("table.modaltbldsp")) {
				clearInterval(interval);
				resolve(modal);
			}
			if (attempts++ > 40) {
				clearInterval(interval);
				resolve(null);
			}
		}, 500);
	});

	if (modalData) {
		const data = scrapeCurriculumModal(modalData);
		await extApi.storage.local.set({ [CURR_KEY]: data });

		const closeBtn = modalData.querySelector('[data-dismiss="modal"], .close');
		if (closeBtn) closeBtn.click();
		else {
			const backdrop = document.querySelector(".modal-backdrop");
			if (backdrop) backdrop.remove();
			modalData.parentElement.parentElement.classList.remove("show");
			modalData.parentElement.parentElement.style.display = "none";
		}

		if (onComplete) onComplete(data);
		return true;
	}

	alert("anoGWAmo: Failed to load curriculum modal.");
	return false;
}

function scrapeCurriculumModal(modal) {
	const curriculum = [];
	modal.querySelectorAll(".card.card-theme").forEach((card) => {
		const yearLabel =
			card.querySelector(".card-title")?.textContent.trim() ?? "Unknown Year";

		const tables = card.querySelectorAll("table.modaltbldsp");
		tables.forEach((table) => {
			let semLabel = "Unknown Semester";
			const wrapper = table.closest(".dataTables_wrapper");
			if (
				wrapper?.previousElementSibling &&
				wrapper.previousElementSibling.tagName === "H5"
			) {
				semLabel = wrapper.previousElementSibling.textContent.trim();
			}

			table.querySelectorAll("tbody tr").forEach((row) => {
				const cells = row.querySelectorAll("td");
				if (cells.length < 8) return;
				const code = cells[0]?.textContent.trim() ?? "";
				const description = cells[3]?.textContent.trim() ?? "";
				const units = parseFloat(cells[4]?.textContent.trim() ?? "");
				const gradeRaw = cells[7]?.textContent.trim() ?? "";

				if (!code) return;

				let schoolYear = cells[5]?.textContent.trim() ?? "";
				let semester = cells[6]?.textContent.trim() ?? "";
				if (!schoolYear) schoolYear = yearLabel;
				if (!semester) semester = semLabel;

				const grade = parseGrade(gradeRaw);
				const finalUnits = defaultUnitsFor(
					code,
					Number.isNaN(units) || units === 0 ? null : units,
				);

				curriculum.push({
					code,
					description,
					units: finalUnits,
					grade,
					gradeRaw,
					schoolYear,
					semester,
					isNonAcademic: isNonAcademic(code),
					isPassed:
						row.classList.contains("passed") && grade !== null && grade <= 3.0,
					isFailed: grade === 5.0 || gradeRaw.toLowerCase().includes("fail"),
				});
			});
		});
	});
	return curriculum;
}

export function scrapeStudentInfo() {
	const h3 = document.querySelector(".card-header h3.text-danger.text-bold");
	if (!h3) return null;
	const text = h3.textContent.trim();
	const match = text.match(/(.+?)\s*\((.+?)\)/);
	if (match) {
		return { name: match[1].trim(), id: match[2].trim() };
	}
	return { name: text, id: "" };
}

export function scrapeAll() {
	const semesters = [];
	document.querySelectorAll(".card.card-theme").forEach((card) => {
		const label =
			card.querySelector(".card-title")?.textContent.trim() ??
			"Unknown Semester";

		let siteGpa = null,
			siteGpaRaw = "";
		card.querySelectorAll("dt").forEach((dt) => {
			if (dt.textContent.includes("GPA")) {
				const dd = dt.nextElementSibling;
				if (dd && dd.tagName === "DD") {
					siteGpaRaw = dd.textContent.trim();
					const p = parseFloat(siteGpaRaw);
					if (!Number.isNaN(p)) siteGpa = p;
				}
			}
		});

		const subjects = [];
		card.querySelectorAll("table.tbldsp tbody tr").forEach((row) => {
			const cells = row.querySelectorAll("td");
			if (cells.length < 7) return;
			const code = cells[1]?.textContent.trim() ?? "";
			const description = cells[2]?.textContent.trim() ?? "";
			const units = parseFloat(cells[4]?.textContent.trim() ?? "");
			const gradeRaw = cells[6]?.textContent.trim() ?? "";
			const finalUnits = defaultUnitsFor(
				code,
				Number.isNaN(units) || units === 0 ? null : units,
			);

			subjects.push({
				code,
				description,
				units: finalUnits,
				grade: parseGrade(gradeRaw),
				gradeRaw,
				status: cells[7]?.textContent.trim() ?? "",
				isNonAcademic: isNonAcademic(code),
			});
		});

		if (subjects.length > 0 || siteGpa !== null)
			semesters.push({ label, siteGpa, siteGpaRaw, subjects });
	});
	return semesters;
}
