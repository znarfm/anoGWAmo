import { describe, expect, test } from "bun:test";
import {
	checkDisqualifiers,
	computeModeA,
	computeModeB,
	computeModeC,
} from "./compute.js";

describe("compute.js", () => {
	describe("computeModeA", () => {
		test("computes manual GWA and partitions included/excluded subjects correctly", () => {
			const semesters = [
				{
					label: "1st Year - 1st Sem",
					subjects: [
						{
							code: "COMP 20083",
							description: "Intro to Computing",
							grade: 1.0,
							units: 3,
							isNonAcademic: false,
						},
						{
							code: "MATH 20013",
							description: "Calculus 1",
							grade: 1.5,
							units: 3,
							isNonAcademic: false,
						},
						{
							code: "PATHFIT 1",
							description: "Movement Competency",
							grade: 1.0,
							units: 2,
							isNonAcademic: true,
						},
						{
							code: "NSTP 1",
							description: "CWTS 1",
							grade: 1.25,
							units: 3,
							isNonAcademic: true,
						},
					],
				},
				{
					label: "1st Year - 2nd Sem",
					subjects: [
						{
							code: "COMP 20093",
							description: "Data Structures",
							grade: 1.25,
							units: 3,
							isNonAcademic: false,
						},
						{
							code: "ENGL 20013",
							description: "Purposive Comm",
							grade: null,
							units: 3,
							isNonAcademic: false,
						},
					],
				},
			];

			const result = computeModeA(semesters);

			// Academic graded units: 3 + 3 + 3 = 9 units
			// Points: (1.0 * 3) + (1.5 * 3) + (1.25 * 3) = 3 + 4.5 + 3.75 = 11.25
			// GWA: 11.25 / 9 = 1.25
			expect(result.gwa).toBe(1.25);
			expect(result.totalUnits).toBe(9);
			expect(result.included.length).toBe(3);
			expect(result.excluded.length).toBe(3); // PATHFIT 1, NSTP 1, ENGL (grade: null)
			expect(result.included[0].semLabel).toBe("1st Year - 1st Sem");
		});

		test("returns null GWA when no academic subjects have grades", () => {
			const emptySems = [
				{
					label: "1st Year - 1st Sem",
					subjects: [
						{ code: "PATHFIT 1", grade: 1.0, units: 2, isNonAcademic: true },
						{ code: "COMP 20083", grade: null, units: 3, isNonAcademic: false },
					],
				},
			];

			const result = computeModeA(emptySems);
			expect(result.gwa).toBe(null);
			expect(result.totalUnits).toBe(0);
			expect(result.included.length).toBe(0);
			expect(result.excluded.length).toBe(2);
		});
	});

	describe("computeModeB", () => {
		test("computes site GPA weighted by semester academic units", () => {
			const semesters = [
				{
					label: "1st Year - 1st Sem",
					siteGpa: 1.25,
					subjects: [
						{ code: "COMP 20083", grade: 1.0, units: 3, isNonAcademic: false },
						{ code: "MATH 20013", grade: 1.5, units: 3, isNonAcademic: false },
						{ code: "PATHFIT 1", grade: 1.0, units: 2, isNonAcademic: true },
					],
				},
				{
					label: "1st Year - 2nd Sem",
					siteGpa: 1.75,
					subjects: [
						{ code: "COMP 20093", grade: 1.75, units: 6, isNonAcademic: false },
					],
				},
			];

			const result = computeModeB(semesters);

			// Sem 1: 6 academic units * 1.25 = 7.5
			// Sem 2: 6 academic units * 1.75 = 10.5
			// Total points: 18.0 / 12 units = 1.5
			expect(result.gwa).toBe(1.5);
			expect(result.totalUnits).toBe(12);
			expect(result.breakdown.length).toBe(2);
			expect(result.breakdown[0]).toEqual({
				label: "1st Year - 1st Sem",
				siteGpa: 1.25,
				units: 6,
			});
			expect(result.skipped.length).toBe(0);
		});

		test("skips semesters without siteGpa or with 0 graded academic units", () => {
			const semesters = [
				{
					label: "Sem Without GPA",
					siteGpa: null,
					subjects: [
						{ code: "COMP 1", grade: 1.0, units: 3, isNonAcademic: false },
					],
				},
				{
					label: "Sem Only Non-Acad",
					siteGpa: 1.0,
					subjects: [
						{ code: "PATHFIT 1", grade: 1.0, units: 2, isNonAcademic: true },
					],
				},
				{
					label: "Sem No Grades",
					siteGpa: 1.0,
					subjects: [
						{ code: "COMP 2", grade: null, units: 3, isNonAcademic: false },
					],
				},
			];

			const result = computeModeB(semesters);
			expect(result.gwa).toBe(null);
			expect(result.totalUnits).toBe(0);
			expect(result.breakdown.length).toBe(0);
			expect(result.skipped.length).toBe(3);
			expect(result.skipped[0]).toContain("no site GPA available");
			expect(result.skipped[1]).toContain("0 academic units with grades");
		});
	});

	describe("computeModeC", () => {
		const curriculum = [
			{
				code: "COMP 20083",
				description: "Intro to Computing",
				grade: 1.0,
				units: 3,
				isNonAcademic: false,
				schoolYear: "First Year",
				semester: "First Semester",
			},
			{
				code: "MATH 20013",
				description: "Calculus 1",
				grade: 1.5,
				units: 3,
				isNonAcademic: false,
				schoolYear: "First Year",
				semester: "First Semester",
			},
			{
				code: "PATHFIT 1",
				description: "PE 1",
				grade: 1.0,
				units: 2,
				isNonAcademic: true,
				schoolYear: "First Year",
				semester: "First Semester",
			},
			{
				code: "COMP 20093",
				description: "Data Structures",
				grade: null,
				units: 3,
				isNonAcademic: false,
				schoolYear: "First Year",
				semester: "Second Semester",
			},
			{
				code: "COMP 20103",
				description: "OOP",
				grade: null,
				units: 3,
				isNonAcademic: false,
				schoolYear: "First Year",
				semester: "Second Semester",
			},
		];

		test("computes baseline current GWA and handles global projection", () => {
			// Completed: 6 units, points = 3*1.0 + 3*1.5 = 7.5 -> current GWA = 1.25
			// Pending: 6 units
			// Projections: GLOBAL 1.25
			// Projected points = 7.5 + (6 * 1.25) = 15.0 / 12 units = 1.25
			const userProjections = { GLOBAL: "1.25" };
			const result = computeModeC(curriculum, userProjections);

			expect(result.gwa).toBe(1.25);
			expect(result.projectedGwa).toBe(1.25);
			expect(result.totalUnits).toBe(6);
			expect(result.totalAcademicUnits).toBe(12);
			expect(result.remainingUnits).toBe(6);
			expect(result.pUnits).toBe(6);
			expect(result.unprojectedUnits).toBe(0);
			expect(result.pending.length).toBe(2);
			expect(result.requiredAverages.length).toBe(3); // Summa, Magna, Cum Laude
		});

		test("supports semester-level projections overriding global baseline", () => {
			const semKey = "First Year - Second Semester";
			const userProjections = {
				GLOBAL: "2.00",
				[semKey]: "1.00",
			};

			const result = computeModeC(curriculum, userProjections);

			// Completed: 6 units @ 1.25 (7.5 pts)
			// Pending: 6 units @ 1.00 (6.0 pts)
			// Projected total: 13.5 / 12 = 1.125
			expect(result.projectedGwa).toBe(1.125);
			expect(result.pUnits).toBe(6);
			expect(result.unprojectedUnits).toBe(0);
		});

		test("handles unprojected units gracefully", () => {
			const result = computeModeC(curriculum, {});
			// Completed: 6 units (7.5 pts), remaining: 6 units unprojected
			// Projected GWA: 7.5 / 12 = 0.625 (no projection points added)
			expect(result.gwa).toBe(1.25);
			expect(result.unprojectedUnits).toBe(6);
			expect(result.pUnits).toBe(0);
		});

		test("detects disqualifiers in curriculum subjects", () => {
			const disqualifiedCurriculum = [
				{
					code: "MATH 101",
					description: "Algebra",
					grade: 5.0,
					gradeRaw: "5.0",
					units: 3,
					isNonAcademic: false,
					schoolYear: "1st Year",
					semester: "1st Sem",
				},
				{
					code: "COMP 101",
					description: "Prog",
					grade: 1.0,
					gradeRaw: "1.0",
					units: 3,
					isNonAcademic: false,
					schoolYear: "1st Year",
					semester: "1st Sem",
				},
			];

			const result = computeModeC(disqualifiedCurriculum);
			expect(result.hasDisqualifiers).toBe(true);
			expect(result.disqualifiers.length).toBe(1);
			expect(result.disqualifiers[0]).toContain("Failing grade (5.0)");
		});
	});

	describe("checkDisqualifiers", () => {
		test("detects 5.0, grades below 2.5, Incomplete (Inc), and Withdrawn (W)", () => {
			const semesters = [
				{
					label: "1st Year - 1st Sem",
					subjects: [
						{
							code: "MATH 101",
							description: "Algebra",
							grade: 5.0,
							gradeRaw: "5.0",
						},
						{
							code: "CHEM 101",
							description: "Chem",
							grade: 2.75,
							gradeRaw: "2.75",
						},
						{
							code: "PHYS 101",
							description: "Physics",
							grade: null,
							gradeRaw: "Inc.",
						},
						{
							code: "HIST 101",
							description: "History",
							grade: null,
							gradeRaw: "W",
						},
						{
							code: "COMP 101",
							description: "Programming",
							grade: null,
							gradeRaw: "",
						},
					],
				},
			];

			const { disqualifiers, pending } = checkDisqualifiers(semesters);

			expect(disqualifiers.length).toBe(4);
			expect(disqualifiers[0]).toContain("Failing grade (5.0)");
			expect(disqualifiers[1]).toContain("Grade below 2.5");
			expect(disqualifiers[2]).toContain("Incomplete (Inc.)");
			expect(disqualifiers[3]).toContain("Withdrawn (W)");
			expect(pending.length).toBe(1);
			expect(pending[0]).toContain("COMP 101");
		});

		test("returns empty lists for clean completed semesters", () => {
			const cleanSems = [
				{
					label: "1st Year - 1st Sem",
					subjects: [
						{
							code: "COMP 101",
							description: "Prog",
							grade: 1.0,
							gradeRaw: "1.0",
						},
						{
							code: "MATH 101",
							description: "Math",
							grade: 1.25,
							gradeRaw: "1.25",
						},
					],
				},
			];

			const { disqualifiers, pending } = checkDisqualifiers(cleanSems);
			expect(disqualifiers).toEqual([]);
			expect(pending).toEqual([]);
		});
	});
});
