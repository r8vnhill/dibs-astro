import { init, parse } from "es-module-lexer";

function extractAstroFrontmatter(sourceText) {
    if (!sourceText.startsWith("---")) {
        return "";
    }

    const end = sourceText.indexOf("\n---", 3);
    return end === -1 ? "" : sourceText.slice(3, end);
}

function moduleTextFor(sourceText, filePath) {
    return filePath.endsWith(".astro") ? extractAstroFrontmatter(sourceText) : sourceText;
}

function lineColumnFor(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split("\n");
    return {
        line: lines.length,
        column: lines.at(-1).length + 1,
    };
}

function classifyImport(statement) {
    const trimmed = statement.trimStart();

    if (/^import\s*\(/.test(trimmed) || /\bimport\s*\(/.test(trimmed)) {
        return "dynamic-import";
    }

    if (/^import\s+type\b/.test(trimmed)) {
        return "type-import";
    }

    if (isInlineTypeOnlyImport(trimmed)) {
        return "type-import";
    }

    if (/^import\s*["']/.test(trimmed)) {
        return "side-effect-import";
    }

    if (/^export\s+type\b/.test(trimmed)) {
        return "type-re-export";
    }

    if (/^export\b/.test(trimmed)) {
        return "re-export";
    }

    return "static-import";
}

function isInlineTypeOnlyImport(statement) {
    const specifiers = statement.match(/^import\s*\{(?<specifiers>[\s\S]*?)\}\s*from\s*["']/)
        ?.groups?.specifiers;

    if (!specifiers) {
        return false;
    }

    return specifiers
        .split(",")
        .map((specifier) => specifier.trim())
        .filter(Boolean)
        .every((specifier) => specifier.startsWith("type "));
}

function extractTypeReExports(moduleText, filePath, existingRecords) {
    const typeReExportPattern = /export\s+type\s+[^;]*?\s+from\s+["']([^"']+)["']/g;
    const records = [];

    for (const match of moduleText.matchAll(typeReExportPattern)) {
        const target = match[1];
        const alreadyExtracted = existingRecords.some(
            (record) =>
                record.target === target
                && record.location.line === lineColumnFor(moduleText, match.index).line,
        );

        if (!alreadyExtracted) {
            records.push({
                sourceFile: filePath.replaceAll("\\", "/"),
                target,
                kind: "type-re-export",
                location: lineColumnFor(moduleText, match.index),
            });
        }
    }

    return records;
}

function extractWithRegex(moduleText, filePath) {
    const patterns = [
        /\bimport\s+type\s+[^;]*?\s+from\s+["']([^"']+)["']/g,
        /\bimport\s+(?!type\b)[^;]*?\s+from\s+["']([^"']+)["']/g,
        /\bimport\s*["']([^"']+)["']/g,
        /\bexport\s+type\s+[^;]*?\s+from\s+["']([^"']+)["']/g,
        /\bexport\s+(?!type\b)[^;]*?\s+from\s+["']([^"']+)["']/g,
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    ];

    const records = patterns.flatMap((pattern) =>
        [...moduleText.matchAll(pattern)].map((match) => {
            const statement = match[0];
            return {
                sourceFile: filePath.replaceAll("\\", "/"),
                target: match[1],
                kind: classifyImport(statement),
                location: lineColumnFor(moduleText, match.index),
            };
        })
    );

    return records.sort((left, right) =>
        left.location.line - right.location.line || left.location.column - right.location.column
    );
}

export async function extractImports(sourceText, filePath) {
    await init;

    const moduleText = moduleTextFor(sourceText, filePath);
    let imports;
    try {
        [imports] = parse(moduleText, filePath);
    } catch (error) {
        return extractWithRegex(moduleText, filePath);
    }

    const records = imports
        .filter((record) => typeof record.n === "string" && record.n.length > 0)
        .map((record) => {
            const statement = moduleText.slice(record.ss, record.se);
            return {
                sourceFile: filePath.replaceAll("\\", "/"),
                target: record.n,
                kind: classifyImport(statement),
                location: lineColumnFor(moduleText, record.ss),
            };
        });

    return [
        ...records,
        ...extractTypeReExports(moduleText, filePath, records),
    ];
}
