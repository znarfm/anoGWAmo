import { expect, test, describe } from "bun:test";
import { honorFor, isNonAcademic, parseGrade, honorColor } from "./utils.js";

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
});
