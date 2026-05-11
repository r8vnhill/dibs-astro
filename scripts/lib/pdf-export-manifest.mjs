import metadataDataset from "../../src/data/lesson-metadata.generated.json" with { type: "json" };

import {
    deriveExportRoute,
    derivePdfOutputPath,
    normalizeLessonRoute,
    validateManifest,
} from "@ravenhill/lesson-export-core";

export function buildLessonPdfExportManifest({ outDir = "dist/exports/pdf" } = {}) {
    assertLessonMetadataDataset(metadataDataset);

    const entries = Object.entries(metadataDataset.entries).map(([route, metadata]) => {
        const normalizedRoute = normalizeLessonRoute(route);
        const sourceFile = typeof metadata.sourceFile === "string" ? metadata.sourceFile : "";
        const lastModified = normalizeLastModified(metadata.lastModified);
        const authors = Array.isArray(metadata.authors)
            ? metadata.authors
                .map((author) => (typeof author?.name === "string" ? author.name.trim() : ""))
                .filter((author) => author.length > 0)
            : undefined;

        return {
            route: normalizedRoute,
            exportRoute: deriveExportRoute(normalizedRoute),
            title: deriveLessonTitle(normalizedRoute),
            sourceFile,
            outputPath: derivePdfOutputPath(normalizedRoute, { rootDir: outDir }),
            ...(lastModified ? { lastModified } : {}),
            ...(authors && authors.length > 0 ? { authors } : {}),
        };
    });

    const manifest = {
        generatedAt: typeof metadataDataset.generatedAt === "string" ? metadataDataset.generatedAt : "",
        entries,
    };

    return {
        manifest,
        validation: validateManifest(manifest),
    };
}

function assertLessonMetadataDataset(dataset) {
    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
        throw new Error("lesson-metadata.generated.json must contain an object dataset.");
    }

    if (!dataset.entries || typeof dataset.entries !== "object" || Array.isArray(dataset.entries)) {
        throw new Error("lesson-metadata.generated.json must contain an entries object.");
    }
}

function deriveLessonTitle(route) {
    const routeWithoutPrefix = route.replace(/^\/notes\//u, "").replace(/\/$/u, "");

    if (routeWithoutPrefix.length === 0) {
        return "Notes";
    }

    const segments = routeWithoutPrefix.split("/").filter(Boolean);
    const lastSegment = segments.at(-1) ?? "Notes";

    return lastSegment
        .split("-")
        .map((part) => part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
        .join(" ");
}

function normalizeLastModified(value) {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) {
        return `${trimmed}T00:00:00.000Z`;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
        return trimmed;
    }

    return parsed.toISOString();
}