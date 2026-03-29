import { $ } from "bun";
import { rm, mkdir, readFile, writeFile } from "fs/promises";
import AdmZip from "adm-zip";

async function run() {
  console.log("🧹 Cleaning dist...");
  await rm("./dist", { recursive: true, force: true }).catch(() => {});
  await mkdir("./dist/src", { recursive: true });
  await mkdir("./dist/popup", { recursive: true });
  await mkdir("./dist/icons", { recursive: true });
  await mkdir("./dist/files", { recursive: true });
  await mkdir("./dist/css", { recursive: true });

  console.log("📦 Copying static assets...");
  await $`cp -r icons/* dist/icons/`;
  await $`cp popup/popup.html dist/popup/`;
  await $`cp src/gwa-chart.* dist/src/`.catch(() => console.log("gwa-chart not found, skipping."));

  // Copy fonts
  console.log("🖋️ Bundling local fonts...");
  await $`cp node_modules/@fontsource/outfit/files/*.woff2 dist/files/`;
  await $`cp node_modules/@fontsource/playfair-display/files/*.woff2 dist/files/`;
  
  // Generate fonts.css
  const outfitCss = await readFile("node_modules/@fontsource/outfit/index.css", "utf8");
  const playfairCss = await readFile("node_modules/@fontsource/playfair-display/index.css", "utf8");
  const cssContext = outfitCss.replaceAll("./files/", "../files/") + "\n" + playfairCss.replaceAll("./files/", "../files/");
  await writeFile("dist/css/fonts.css", cssContext);

  console.log("🔨 Bundling JavaScript (content & popup)...");
  await Bun.build({
    entrypoints: ["src/content.js", "popup/popup.js"],
    outdir: "dist",
    target: "browser",
    minify: true,
  });

  console.log("🎨 Processing CSS...");
  let stylesCss = await readFile("src/styles.css", "utf8");
  stylesCss = stylesCss.replace(/@import url\(['"].*?['"]\);/g, "");
  await writeFile("dist/src/styles.css", stylesCss);

  let popupCss = await readFile("popup/popup.css", "utf8");
  popupCss = popupCss.replace(/@import url\(['"].*?['"]\);/g, "");
  const popupFinalCss = `@import "../css/fonts.css";\n` + popupCss;
  await writeFile("dist/popup/popup.css", popupFinalCss);

  console.log("⚙️  Generating Manifests...");
  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  
  manifest.content_scripts[0].js = ["src/gwa-chart.js", "src/content.js"];
  manifest.content_scripts[0].css = ["css/fonts.css", "src/gwa-chart.css", "src/styles.css"];

  const hosts = [
    "https://sis1.pup.edu.ph/student/grades*",
    "https://sis2.pup.edu.ph/student/grades*",
    "https://sis8.pup.edu.ph/student/grades*",
    "https://sisstudents.pup.edu.ph/student/grades*"
  ];
  manifest.host_permissions = hosts;
  manifest.content_scripts[0].matches = hosts;

  // Chrome Manifest
  await writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));
  
  console.log("🤐 Zipping Chrome extension...");
  const zipChrome = new AdmZip();
  zipChrome.addLocalFolder("dist");
  zipChrome.writeZip("dist/anoGWAmo-chrome.zip");
  
  // Firefox Manifest
  manifest.browser_specific_settings = {
    gecko: {
      id: "anogwamo@meinard.dev"
    }
  };
  await writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));

  console.log("🤐 Zipping Firefox extension...");
  const zipFirefox = new AdmZip();
  zipFirefox.addLocalFolder("dist");
  zipFirefox.writeZip("dist/anoGWAmo-firefox.zip");

  console.log("✅ Build Complete!");
}

run().catch(console.error);
