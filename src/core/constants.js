export const NON_ACADEMIC_PREFIXES = ["PATHFIT", "NSTP", "CWTS", "ROTC"];

export const HONORS = [
	{
		label: "Summa Cum Laude",
		min: 1.0,
		max: 1.15,
		color: "var(--pup-honor-summa)",
	},
	{
		label: "Magna Cum Laude",
		min: 1.1501,
		max: 1.35,
		color: "var(--pup-honor-magna)",
	},
	{
		label: "Cum Laude",
		min: 1.3501,
		max: 1.6,
		color: "var(--pup-honor-cumlaude)",
	},
];

export const GRADE_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];

export const SIS_HOSTS = [
	"https://sis1.pup.edu.ph/student/grades*",
	"https://sis2.pup.edu.ph/student/grades*",
	"https://sis8.pup.edu.ph/student/grades*",
];

export const MODE_KEY = "pup_gwa_mode";
export const CURR_KEY = "anoGWAmo_curriculum";
export const PROJ_KEY = "anoGWAmo_projections";
