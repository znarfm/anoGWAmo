import { HONORS } from "./constants.js";
import { isNonAcademic, parseGrade } from "./utils.js";

export function computeModeA(semesters) {
	let pts = 0,
		units = 0;
	const included = [],
		excluded = [];
	semesters.forEach((sem) => {
		sem.subjects.forEach((subj) => {
			if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null) {
				pts += subj.grade * subj.units;
				units += subj.units;
				included.push({ ...subj, semLabel: sem.label });
			} else {
				excluded.push({ ...subj, semLabel: sem.label });
			}
		});
	});
	return {
		gwa: units > 0 ? pts / units : null,
		totalUnits: units,
		included,
		excluded,
	};
}

export function computeModeB(semesters) {
	let pts = 0,
		units = 0;
	const breakdown = [],
		skipped = [];
	semesters.forEach((sem) => {
		if (sem.siteGpa === null) {
			skipped.push(`${sem.label} – no site GPA available`);
			return;
		}
		let semUnits = 0;
		sem.subjects.forEach((subj) => {
			if (!subj.isNonAcademic && subj.grade !== null && subj.units !== null)
				semUnits += subj.units;
		});
		if (semUnits === 0) {
			skipped.push(`${sem.label} – 0 academic units with grades`);
			return;
		}
		pts += sem.siteGpa * semUnits;
		units += semUnits;
		breakdown.push({ label: sem.label, siteGpa: sem.siteGpa, units: semUnits });
	});
	return {
		gwa: units > 0 ? pts / units : null,
		totalUnits: units,
		breakdown,
		skipped,
	};
}

export function computeModeC(curriculum, userProjections = {}) {
	let pts = 0,
		units = 0;
	let remainingUnits = 0;
	let pPts = 0,
		pUnits = 0;
	let unprojectedUnits = 0;
	const pendingBySem = {};
	const pending = [];

	curriculum.forEach((subj) => {
		if (subj.isNonAcademic || subj.units === null) return;

		if (subj.grade !== null && subj.grade <= 3.0) {
			pts += subj.grade * subj.units;
			units += subj.units;
		} else if (subj.grade === null) {
			remainingUnits += subj.units;
			pending.push(subj);

			const cleanYear = subj.schoolYear?.endsWith("Year")
				? subj.schoolYear
				: `${subj.schoolYear}`;
			const semKey = `${cleanYear} - ${subj.semester || "Unknown Sem"}`;

			if (!pendingBySem[semKey])
				pendingBySem[semKey] = { units: 0, subjects: [] };
			pendingBySem[semKey].subjects.push(subj);
			pendingBySem[semKey].units += subj.units;

			const semProjGrade =
				userProjections[semKey] !== undefined ? userProjections[semKey] : null;
			const globalProjGrade =
				userProjections.GLOBAL !== undefined ? userProjections.GLOBAL : null;

			let projGrade = null;
			if (semProjGrade !== null && semProjGrade !== "")
				projGrade = semProjGrade;
			else if (globalProjGrade !== null && globalProjGrade !== "")
				projGrade = globalProjGrade;

			if (projGrade !== null) {
				const p = parseFloat(projGrade);
				pPts += p * subj.units;
				pUnits += subj.units;
			} else {
				unprojectedUnits += subj.units;
			}
		}
	});

	const currentGwa = units > 0 ? pts / units : null;

	let projectedGwa = null;
	const totalU = units + remainingUnits;
	if (remainingUnits > 0) {
		projectedGwa = (pts + pPts) / totalU;
	} else {
		projectedGwa = currentGwa;
	}

	const requiredAverages = HONORS.map((h) => {
		if (remainingUnits === 0) return { ...h, req: null };
		const req = (h.max * totalU - pts) / remainingUnits;
		return { ...h, req };
	});

	return {
		gwa: currentGwa,
		projectedGwa,
		totalUnits: units,
		totalAcademicUnits: totalU,
		remainingUnits,
		pUnits,
		unprojectedUnits,
		pendingBySem,
		pending,
		requiredAverages,
	};
}

export function prepareChartData(currentMode, semesters) {
	const chartData = [];
	if (currentMode === "B") {
		const { breakdown } = computeModeB(semesters);
		breakdown.forEach((b) => {
			chartData.push({ semester: b.label, gwa: b.siteGpa });
		});
	} else if (currentMode === "A") {
		semesters.forEach((sem) => {
			let semPts = 0,
				semUnits = 0;
			sem.subjects.forEach((subj) => {
				const nonAcad =
					subj.isNonAcademic ?? (subj.code ? isNonAcademic(subj.code) : false);
				if (!nonAcad && subj.grade !== null && subj.units !== null) {
					semPts += subj.grade * subj.units;
					semUnits += subj.units;
				}
			});
			if (semUnits > 0)
				chartData.push({ semester: sem.label, gwa: semPts / semUnits });
		});
	}
	return chartData;
}

export function checkDisqualifiers(semesters) {
	const disqualifiers = [],
		pending = [];
	semesters.forEach((sem) => {
		sem.subjects.forEach((subj) => {
			const gs = (subj.gradeRaw ?? "").trim().toLowerCase();
			if (subj.grade === 5.0)
				disqualifiers.push(
					`Failing grade (5.0) in ${subj.code} – ${subj.description} [${sem.label}]`,
				);
			if (gs === "inc." || gs === "inc")
				disqualifiers.push(
					`Incomplete (Inc.) in ${subj.code} – ${subj.description} [${sem.label}]`,
				);
			if (gs === "w" || gs === "w.")
				disqualifiers.push(
					`Withdrawn (W) in ${subj.code} – ${subj.description} [${sem.label}]`,
				);
			if (subj.grade !== null && subj.grade !== 5.0 && subj.grade > 2.5)
				disqualifiers.push(
					`Grade below 2.5 in ${subj.code} – ${subj.description}: ${subj.grade} [${sem.label}]`,
				);
			if (subj.grade === null && !["inc.", "inc", "w", "w."].includes(gs))
				pending.push(`${subj.code} – ${subj.description} [${sem.label}]`);
		});
	});
	return { disqualifiers, pending };
}
