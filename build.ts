import { $ } from "bun";
import { zipSync } from "fflate";
import { SIS_HOSTS } from "./src/core/constants.js";

async function writeZip(sourceDir: string, outZipPath: string) {
	const files: Record<string, Uint8Array> = {};
	const glob = new Bun.Glob("**/*");

	for await (const file of glob.scan({ cwd: sourceDir, onlyFiles: true })) {
		files[file] = await Bun.file(`${sourceDir}/${file}`).bytes();
	}

	const zipped = zipSync(files, { level: 9 });
	await Bun.write(outZipPath, zipped);
}

async function run() {
	console.log("🧹 Cleaning dist...");
	await $`rm -rf dist`;
	await $`mkdir -p dist/chrome/src dist/chrome/popup dist/chrome/icons dist/chrome/files dist/chrome/css dist/chrome/report`;

	console.log("📦 Copying static assets...");
	await $`cp -r icons/* dist/chrome/icons/`;
	await $`cp popup/popup.html dist/chrome/popup/`;
	await $`cp report/report.html dist/chrome/report/`;
	await $`cp src/gwa-chart.css dist/chrome/src/`.catch(() =>
		console.log("gwa-chart.css not found, skipping."),
	);

	// Copy fonts
	console.log("🖋️ Bundling local fonts...");
	await $`cp node_modules/@fontsource/outfit/files/*.woff2 dist/chrome/files/`;
	await $`cp node_modules/@fontsource/playfair-display/files/*.woff2 dist/chrome/files/`;

	// Generate fonts.css
	const outfitCss = await Bun.file(
		"node_modules/@fontsource/outfit/index.css",
	).text();
	const playfairCss = await Bun.file(
		"node_modules/@fontsource/playfair-display/index.css",
	).text();
	const cssContext =
		outfitCss.replaceAll("./files/", "../files/") +
		"\n" +
		playfairCss.replaceAll("./files/", "../files/");
	await Bun.write("dist/chrome/css/fonts.css", cssContext);

	console.log("🔨 Bundling JavaScript (content, popup & report)...");
	await Bun.build({
		entrypoints: ["src/content.js", "popup/popup.js", "report/report.js"],
		outdir: "dist/chrome",
		target: "browser",
		minify: true,
	});

	console.log("🎨 Processing CSS...");
	let stylesCss = await Bun.file("src/styles.css").text();
	stylesCss = stylesCss.replace(/@import url\(['"].*?['"]\);/g, "");
	await Bun.write("dist/chrome/src/styles.css", stylesCss);

	let popupCss = await Bun.file("popup/popup.css").text();
	popupCss = popupCss.replace(/@import url\(['"].*?['"]\);/g, "");
	const popupFinalCss = `@import "../css/fonts.css";\n${popupCss}`;
	await Bun.write("dist/chrome/popup/popup.css", popupFinalCss);

	console.log("⚙️  Generating Manifests...");
	const baseManifest = await Bun.file("manifest.json").json();

	baseManifest.content_scripts[0].js = ["src/content.js"];
	baseManifest.content_scripts[0].css = [
		"css/fonts.css",
		"src/gwa-chart.css",
		"src/styles.css",
	];

	baseManifest.host_permissions = SIS_HOSTS;
	baseManifest.content_scripts[0].matches = SIS_HOSTS;
	if (baseManifest.web_accessible_resources?.[0]) {
		baseManifest.web_accessible_resources[0].matches = SIS_HOSTS.map((h) =>
			h.replace(/\/student\/grades.*$/, "/*"),
		);
	}

	// Chrome Manifest & files
	const chromeManifest = structuredClone(baseManifest);
	await Bun.write(
		"dist/chrome/manifest.json",
		JSON.stringify(chromeManifest, null, 2),
	);

	// Duplicate dist/chrome to dist/firefox
	console.log("🦊 Preparing Firefox build...");
	await $`cp -r dist/chrome dist/firefox`;

	// Firefox Manifest
	const firefoxManifest = structuredClone(baseManifest);
	firefoxManifest.browser_specific_settings = {
		gecko: {
			id: "ano.gwa.mo@meinard.dev",
			strict_min_version: "142.0",
			data_collection_permissions: {
				required: ["none"],
			},
		},
	};
	await Bun.write(
		"dist/firefox/manifest.json",
		JSON.stringify(firefoxManifest, null, 2),
	);

	console.log("🤐 Zipping Chrome extension...");
	await writeZip("dist/chrome", "dist/anoGWAmo-chrome.zip");

	console.log("🤐 Zipping Firefox extension...");
	await writeZip("dist/firefox", "dist/anoGWAmo-firefox.zip");

	console.log("✅ Build Complete!");
}

run().catch(console.error);
