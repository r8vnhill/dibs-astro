import { globby } from "globby";
import { readFile } from "node:fs/promises";

export const defaultSourcePatterns = [
    "src/**/*.{ts,tsx,astro}",
    "!src/**/*.d.ts",
];

export async function discoverSourceFiles(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const patterns = options.sourcePatterns ?? defaultSourcePatterns;
    const paths = await globby(patterns, {
        cwd,
        gitignore: true,
        onlyFiles: true,
    });

    return Promise.all(
        paths.sort().map(async (path) => ({
            path: path.replaceAll("\\", "/"),
            text: await readFile(`${cwd}/${path}`, "utf8"),
        })),
    );
}
