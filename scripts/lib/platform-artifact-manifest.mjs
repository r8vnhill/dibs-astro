import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const headingPattern = /<h([1-6])\b([^>]*)>/gi;
const islandPattern = /<astro-island\b([^>]*)>/gi;
const localFragmentPattern = /href=["']([^"']*#[^"']+)["']/gi;

export async function buildPlatformArtifactManifest(outDir) {
    const htmlFiles = await findHtmlFiles(outDir);
    const pages = await Promise.all(
        htmlFiles.map(async (filePath) => buildPageArtifact(outDir, filePath)),
    );

    return {
        routes: pages.sort((left, right) => left.route.localeCompare(right.route)),
    };
}

async function findHtmlFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return findHtmlFiles(entryPath);
            return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
        }),
    );

    return files.flat();
}

async function buildPageArtifact(outDir, filePath) {
    const html = await readFile(filePath, "utf8");

    return {
        route: toRoute(outDir, filePath),
        headingIds: collectHeadingIds(html),
        localFragmentTargets: collectLocalFragmentTargets(html),
        islands: collectIslands(html),
    };
}

function toRoute(outDir, filePath) {
    const relativePath = path.relative(outDir, filePath).replaceAll("\\", "/");
    if (relativePath === "index.html") return "/";
    return `/${relativePath.replace(/\/index\.html$/, "/")}`;
}

function collectHeadingIds(html) {
    return collectMatches(html, headingPattern, ([, level, attributes]) => {
        const id = readAttribute(attributes, "id");
        return id ? { level: Number(level), id } : undefined;
    });
}

function collectLocalFragmentTargets(html) {
    return collectMatches(html, localFragmentPattern, ([, target]) => target).sort();
}

function collectIslands(html) {
    return collectMatches(html, islandPattern, ([, attributes]) => {
        const componentUrl = readAttribute(attributes, "component-url");
        const client = readAttribute(attributes, "client");
        return componentUrl ? { componentUrl, client: client ?? "load" } : undefined;
    }).sort((left, right) => left.componentUrl.localeCompare(right.componentUrl));
}

function collectMatches(html, pattern, mapMatch) {
    const matches = [];
    pattern.lastIndex = 0;

    for (const match of html.matchAll(pattern)) {
        const value = mapMatch(match);
        if (value !== undefined) matches.push(value);
    }

    return matches;
}

function readAttribute(attributes, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedName}=["']([^"']+)["']`, "i");
    return pattern.exec(attributes)?.[1];
}
