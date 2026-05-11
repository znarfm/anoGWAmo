import { expect, test, describe } from "bun:test";
import { honorFor, isNonAcademic, parseGrade, honorColor, prepareChartData } from "./utils.js";

describe("utils.js", () => {
  describe("isNonAcademic", () => {
    test("identifies non-academic courses", () => {
      expect(isNonAcademic("PATHFIT 1")).toBe(true);
      expect(isNonAcademic("NSTP 1")).toBe(true);
      expect(isNonAcademic("CWTS 1")).toBe(true);
      expect(isNonAcademic("ROTC 1")).toBe(true);
      expect(isNonAcademic("pathfit 2")).toBe(true);
    });

    test("identifies academic courses", () => {
      expect(isNonAcademic("COMP 20083")).toBe(false);
      expect(isNonAcademic("MATH 20013")).toBe(false);
    });
  });

  describe("parseGrade", () => {
    test("parses valid grades", () => {
      expect(parseGrade("1.0")).toBe(1.0);
      expect(parseGrade("1.25")).toBe(1.25);
      expect(parseGrade("3.0")).toBe(3.0);
    });

    test("handles null, empty, or invalid input", () => {
      expect(parseGrade(null)).toBe(null);
      expect(parseGrade("")).toBe(null);
      expect(parseGrade("  ")).toBe(null);
      expect(parseGrade("INC")).toBe(null);
    });
  });

  describe("honorFor", () => {
    test("returns null for null GWA", () => {
      expect(honorFor(null)).toBe(null);
    });

    test("identifies Summa Cum Laude boundaries", () => {
      expect(honorFor(1.0000)).toBe("Summa Cum Laude");
      expect(honorFor(1.1500)).toBe("Summa Cum Laude");
    });

    test("identifies Magna Cum Laude boundaries", () => {
      expect(honorFor(1.1501)).toBe("Magna Cum Laude");
      expect(honorFor(1.3500)).toBe("Magna Cum Laude");
    });

    test("identifies Cum Laude boundaries", () => {
      expect(honorFor(1.3501)).toBe("Cum Laude");
      expect(honorFor(1.6000)).toBe("Cum Laude");
    });

    test("returns null for GWAs outside honor ranges", () => {
      expect(honorFor(1.6001)).toBe(null);
      expect(honorFor(2.0)).toBe(null);
      expect(honorFor(5.0)).toBe(null);
    });
  });

  describe("honorColor", () => {
    test("returns correct colors for honor labels", () => {
      expect(honorColor("Summa Cum Laude")).toBe("var(--pup-honor-summa)");
      expect(honorColor("Magna Cum Laude")).toBe("var(--pup-honor-magna)");
      expect(honorColor("Cum Laude")).toBe("var(--pup-honor-cumlaude)");
    });

    test("returns default color for unknown labels", () => {
      expect(honorColor("No Honor")).toBe("var(--pup-honor-none)");
      expect(honorColor(null)).toBe("var(--pup-honor-none)");
    });
  });

  describe("prepareChartData", () => {
    const semesters = [
      {
        label: "First Semester 2023-2024",
        siteGpa: 1.25,
        subjects: [
          { code: "COMP 20083", grade: 1.0, units: 3, isNonAcademic: false },
          { code: "MATH 20013", grade: 1.5, units: 3, isNonAcademic: false },
          { code: "PATHFIT 1", grade: 1.0, units: 2, isNonAcademic: true }
        ]
      },
      {
        label: "Second Semester 2023-2024",
        siteGpa: 1.5,
        subjects: [
          { code: "COMP 20093", grade: 1.5, units: 3, isNonAcademic: false },
          { code: "ENGL 20013", grade: null, units: 3, isNonAcademic: false }
        ]
      }
    ];

    test("prepares data correctly for Mode B (Site GPA)", () => {
      const data = prepareChartData("B", semesters);
      expect(data).toEqual([
        { semester: "First Semester 2023-2024", gwa: 1.25 },
        { semester: "Second Semester 2023-2024", gwa: 1.5 }
      ]);
    });

    test("prepares data correctly for Mode A (Manual)", () => {
      const data = prepareChartData("A", semesters);
      expect(data).toEqual([
        { semester: "First Semester 2023-2024", gwa: 1.25 }, // (1.0*3 + 1.5*3) / 6 = 1.25
        { semester: "Second Semester 2023-2024", gwa: 1.5 }  // (1.5*3) / 3 = 1.5
      ]);
    });

    test("handles semesters with no academic units in Mode A", () => {
      const emptySems = [{ label: "Empty", subjects: [{ code: "PATHFIT 1", grade: 1.0, units: 2, isNonAcademic: true }] }];
      const data = prepareChartData("A", emptySems);
      expect(data).toEqual([]);
    });

    test("uses isNonAcademic utility if isNonAcademic property is missing", () => {
      const sems = [{
        label: "Test",
        subjects: [{ code: "PATHFIT 1", grade: 1.0, units: 2 }]
      }];
      const data = prepareChartData("A", sems);
      expect(data).toEqual([]);
    });
  });
});
