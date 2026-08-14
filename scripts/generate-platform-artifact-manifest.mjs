import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildPlatformArtifactManifest } from "./lib/platform-artifact-manifest.mjs";

const argumentsByName = new Map(
    process.argv.slice(2).flatMap((argument, index, argumentsList) =>
        argument.startsWith("--") ? [[argument, argumentsList[index + 1]]] : [],
    ),
);
const outDir = path.resolve(argumentsByName.get("--dist") ?? "dist");
const outputPath = argumentsByName.get("--out");
const manifest = await buildPlatformArtifactManifest(outDir);
const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

if (outputPath) {
    const resolvedOutputPath = path.resolve(outputPath);
    await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await writeFile(resolvedOutputPath, serializedManifest, "utf8");
    console.log(`Platform artifact manifest written to ${path.relative(process.cwd(), resolvedOutputPath)}.`);
} else {
    process.stdout.write(serializedManifest);
}
