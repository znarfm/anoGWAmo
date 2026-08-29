import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { isPageDark, syncPanelTheme } from "./theme.js";

describe("theme.js", () => {
	let originalDocument;
	let originalWindow;

	beforeEach(() => {
		originalDocument = globalThis.document;
		originalWindow = globalThis.window;
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.window = originalWindow;
	});

	describe("isPageDark & syncPanelTheme", () => {
		test("detects data-darkreader-scheme on documentElement and syncs dark theme", () => {
			const attributes = new Set(["data-darkreader-scheme"]);
			globalThis.document = {
				documentElement: {
					hasAttribute: (attr) => attributes.has(attr),
				},
				body: null,
			};

			expect(isPageDark()).toBe(true);

			const panel = {
				classList: {
					add: (cls) => panel.classes.add(cls),
					remove: (cls) => panel.classes.delete(cls),
				},
				classes: new Set(),
				style: {},
			};

			syncPanelTheme(panel);
			expect(panel.classes.has("pup-dark")).toBe(true);
			expect(panel.style.colorScheme).toBe("dark");
		});

		test("detects data-darkreader-mode on documentElement and syncs dark theme", () => {
			const attributes = new Set(["data-darkreader-mode"]);
			globalThis.document = {
				documentElement: {
					hasAttribute: (attr) => attributes.has(attr),
				},
				body: null,
			};

			expect(isPageDark()).toBe(true);

			const panel = {
				classList: {
					add: (cls) => panel.classes.add(cls),
					remove: (cls) => panel.classes.delete(cls),
				},
				classes: new Set(),
				style: {},
			};

			syncPanelTheme(panel);
			expect(panel.classes.has("pup-dark")).toBe(true);
			expect(panel.style.colorScheme).toBe("dark");
		});

		test("syncs light theme when DarkReader attributes are removed", () => {
			const attributes = new Set();
			globalThis.document = {
				documentElement: {
					hasAttribute: (attr) => attributes.has(attr),
				},
				body: null,
			};

			expect(isPageDark()).toBe(false);

			const panel = {
				classList: {
					add: (cls) => panel.classes.add(cls),
					remove: (cls) => panel.classes.delete(cls),
				},
				classes: new Set(["pup-dark"]),
				style: { colorScheme: "dark" },
			};

			syncPanelTheme(panel);
			expect(panel.classes.has("pup-dark")).toBe(false);
			expect(panel.style.colorScheme).toBe("light");
		});

		test("DarkReader attribute changes trigger theme synchronization in mutation setup", async () => {
			const attributes = new Set();
			globalThis.document = {
				documentElement: {
					hasAttribute: (attr) => attributes.has(attr),
				},
				body: null,
			};

			const panel = {
				classList: {
					add: (cls) => panel.classes.add(cls),
					remove: (cls) => panel.classes.delete(cls),
				},
				classes: new Set(),
				style: {},
			};

			const filter = [
				"class",
				"data-theme",
				"style",
				"data-darkreader-scheme",
				"data-darkreader-mode",
			];

			let themeSyncCalls = 0;
			const sync = () => {
				themeSyncCalls++;
				syncPanelTheme(panel);
			};

			// Simulate mutation handler filtering
			const simulateAttributeMutation = (attrName) => {
				if (filter.includes(attrName)) {
					sync();
				}
			};

			// Mutate data-darkreader-scheme
			attributes.add("data-darkreader-scheme");
			simulateAttributeMutation("data-darkreader-scheme");
			expect(themeSyncCalls).toBe(1);
			expect(panel.classes.has("pup-dark")).toBe(true);

			// Mutate data-darkreader-mode
			attributes.delete("data-darkreader-scheme");
			attributes.add("data-darkreader-mode");
			simulateAttributeMutation("data-darkreader-mode");
			expect(themeSyncCalls).toBe(2);
			expect(panel.classes.has("pup-dark")).toBe(true);

			// Remove attributes
			attributes.delete("data-darkreader-mode");
			simulateAttributeMutation("data-darkreader-mode");
			expect(themeSyncCalls).toBe(3);
			expect(panel.classes.has("pup-dark")).toBe(false);
		});
	});
});
