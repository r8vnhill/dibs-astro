import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogArtifactFromTurtle } from "./lib/bibliography-catalog-builder.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "src/data/bibliography/catalog.graph.ttl");
const outputPath = path.join(projectRoot, "src/data/bibliography/catalog.graph.generated.jsonld");

const rawTurtle = await readFile(sourcePath, "utf8");
const artifact = buildCatalogArtifactFromTurtle(rawTurtle, {
    sourceLabel: path.relative(projectRoot, sourcePath).replaceAll("\\", "/"),
});
const nextContent = `${JSON.stringify(artifact, null, 2)}\n`;

let currentContent = "";
try {
    currentContent = await readFile(outputPath, "utf8");
} catch {
    currentContent = "";
}

if (currentContent === nextContent) {
    console.log("Bibliography catalog already up to date.");
    process.exit(0);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, nextContent, "utf8");
console.log(
    `Bibliography catalog generated: ${
        path.relative(projectRoot, outputPath).replaceAll("\\", "/")
    }`,
);
