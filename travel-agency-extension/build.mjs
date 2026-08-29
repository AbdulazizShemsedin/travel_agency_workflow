import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");
const distDir = path.join(__dirname, "dist");

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

function copyFileSync(src, dest) {
  ensureDirectoryExistence(dest);
  fs.copyFileSync(src, dest);
}

function copyFolderSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticAssets() {
  console.log("Copying static assets to dist/...");

  // 1. manifest.json
  copyFileSync(
    path.join(__dirname, "manifest.json"),
    path.join(distDir, "manifest.json")
  );

  // 2. popup html and css
  copyFileSync(
    path.join(__dirname, "src/popup/popup.html"),
    path.join(distDir, "popup/popup.html")
  );
  copyFileSync(
    path.join(__dirname, "src/popup/popup.css"),
    path.join(distDir, "popup/popup.css")
  );

  // 3. icons
  copyFolderSync(
    path.join(__dirname, "icons"),
    path.join(distDir, "icons")
  );
}

async function build() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  copyStaticAssets();

  const buildOptions = {
    entryPoints: [
      { in: "src/background/serviceWorker.ts", out: "background/serviceWorker" },
      { in: "src/popup/popup.ts", out: "popup/popup" },
      { in: "src/content/bridgeContent.ts", out: "content/bridgeContent" },
    ],
    bundle: true,
    outdir: distDir,
    format: "esm",
    target: "es2022",
    sourcemap: true,
    minify: false,
    logLevel: "info",
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("✓ Extension build completed successfully into dist/");
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
