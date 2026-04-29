import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    buildBibliographyReport,
    formatBibliographyReportCsv,
} from "./lib/bibliography-report-read-model.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(projectRoot, "src/data/bibliography/catalog.graph.generated.jsonld");
const outputDir = path.join(projectRoot, "reports");
const outputJson = path.join(outputDir, "bibliography-report.json");
const outputCsv = path.join(outputDir, "bibliography-report.csv");

const relativeProjectPath = (filePath) =>
    path.relative(projectRoot, filePath).replaceAll("\\", "/");

const raw = await readFile(catalogPath, "utf8");
const report = buildBibliographyReport(raw, {
    catalogPath: relativeProjectPath(catalogPath),
    sourceLabel: relativeProjectPath(catalogPath),
});

await mkdir(outputDir, { recursive: true });
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(outputCsv, formatBibliographyReportCsv(report), "utf8");

console.log(`Bibliography report written to ${relativeProjectPath(outputJson)}`);
console.log(`Bibliography CSV written to ${relativeProjectPath(outputCsv)}`);
