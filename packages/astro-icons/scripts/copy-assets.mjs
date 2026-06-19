import { cp, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(packageRoot, "src");
const distDir = resolve(packageRoot, "dist");

// Create dist if it doesn't exist
await mkdir(distDir, { recursive: true });

// Find all SVG files in src and copy them to dist in parallel
const svgFiles = (await readdir(srcDir)).filter((f) => f.endsWith(".svg"));

await Promise.all(
    svgFiles.map((file) => cp(resolve(srcDir, file), resolve(distDir, file))),
);

console.log(`✓ Copied ${svgFiles.length} SVG files from src/ to dist/.`);
