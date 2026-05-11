import type { PdfOutputPath } from "./manifest";
import { normalizeLessonRoute } from "./routes";

export interface DerivePdfOutputPathOptions {
    readonly rootDir?: string;
    readonly extension?: ".pdf";
}

const DEFAULT_PDF_EXTENSION = ".pdf";

export function derivePdfOutputPath(route: string, options: DerivePdfOutputPathOptions = {}): PdfOutputPath {
    const extension = options.extension ?? DEFAULT_PDF_EXTENSION;
    if (extension !== DEFAULT_PDF_EXTENSION) {
        throw new Error("PDF output paths must use the .pdf extension.");
    }

    const rootDir = normalizeRootDir(options.rootDir);
    const routePath = normalizeLessonRoute(route).slice(1, -1);
    const outputPath = routePath.endsWith("/index") || routePath === "notes"
        ? `${routePath}.pdf`
        : `${routePath}.pdf`;
    const withIndexPolicy = routePath === "notes" || routePath.split("/").length === 2
        ? `${routePath}/index.pdf`
        : outputPath;
    const fullPath = rootDir.length > 0 ? `${rootDir}/${withIndexPolicy}` : withIndexPolicy;

    assertSafePdfOutputPath(fullPath);
    return fullPath as PdfOutputPath;
}

export function isSafePdfOutputPath(outputPath: string): boolean {
    if (typeof outputPath !== "string") {
        return false;
    }

    if (outputPath.trim() !== outputPath || outputPath.length === 0) {
        return false;
    }

    if (!outputPath.endsWith(DEFAULT_PDF_EXTENSION)) {
        return false;
    }

    if (
        outputPath.startsWith("/")
        || outputPath.startsWith("\\")
        || /^[A-Za-z]:/u.test(outputPath)
        || outputPath.includes("\\")
        || outputPath.includes("//")
    ) {
        return false;
    }

    const segments = outputPath.split("/");
    return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function assertSafePdfOutputPath(outputPath: string): void {
    if (!isSafePdfOutputPath(outputPath)) {
        throw new Error(`Unsafe PDF output path: ${outputPath}`);
    }
}

function normalizeRootDir(rootDir: string | undefined): string {
    if (rootDir === undefined || rootDir.trim().length === 0) {
        return "";
    }

    const normalized = rootDir.trim().replace(/\/+/gu, "/").replace(/^\/+|\/+$/gu, "");
    if (!isSafeRootDir(normalized)) {
        throw new Error(`Unsafe PDF output root directory: ${rootDir}`);
    }

    return normalized;
}

function isSafeRootDir(rootDir: string): boolean {
    if (
        rootDir.startsWith("/")
        || rootDir.startsWith("\\")
        || /^[A-Za-z]:/u.test(rootDir)
        || rootDir.includes("\\")
        || rootDir.includes("//")
    ) {
        return false;
    }

    const segments = rootDir.split("/");
    return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
