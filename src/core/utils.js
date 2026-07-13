import { HONORS, NON_ACADEMIC_PREFIXES } from "./constants.js";

export function isNonAcademic(code) {
	const c = code.trim().toUpperCase();
	return NON_ACADEMIC_PREFIXES.some((p) => c.startsWith(p));
}

export function parseGrade(raw) {
	const t = (raw ?? "").trim();
	if (!t) return null;
	const n = parseFloat(t);
	return Number.isNaN(n) ? null : n;
}

export function honorFor(gwa) {
	if (gwa === null) return null;
	for (const h of HONORS) if (gwa >= h.min && gwa <= h.max) return h.label;
	return null;
}

export function honorColor(label) {
	if (!label) return "var(--pup-honor-none)";
	const h = HONORS.find((h) => h.label === label);
	return h ? h.color : "var(--pup-honor-none)";
}

export function defaultUnitsFor(code, units) {
	if (!isNonAcademic(code) && (units === null || units === 0)) return 3.0;
	return units;
}
