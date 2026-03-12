import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(projectRoot, "src/data/bibliography/catalog.graph.jsonld");
const outputDir = path.join(projectRoot, "reports");
const outputJson = path.join(outputDir, "bibliography-report.json");
const outputCsv = path.join(outputDir, "bibliography-report.csv");

const asString = (value) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const toArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const resolveNodeId = (value) => {
    if (typeof value === "string") return asString(value);
    if (value && typeof value === "object") return asString(value["@id"]);
    return undefined;
};

const getType = (value) => {
    if (Array.isArray(value)) return value.map(asString).find(Boolean) ?? "";
    return asString(value) ?? "";
};

const getName = (node) => {
    if (!node || typeof node !== "object") return undefined;
    return asString(node.name) ?? asString(node.headline);
};

const csvEscape = (value) => {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
    return text;
};

const rowsToCsv = (rows) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((header) => csvEscape(row[header])).join(","));
    }
    return `${lines.join("\n")}\n`;
};

const raw = await readFile(catalogPath, "utf8");
const catalog = JSON.parse(raw);
const graph = Array.isArray(catalog["@graph"]) ? catalog["@graph"] : [];
const nodesById = new Map();

for (const node of graph) {
    const id = asString(node?.["@id"]);
    if (id) nodesById.set(id, node);
}

const references = new Map();
const lessons = new Map();
const usages = [];

for (const node of nodesById.values()) {
    const type = getType(node["@type"]);
    const id = asString(node["@id"]);
    if (!id) continue;

    if (["Book", "WebPage", "ScholarlyArticle", "Thesis"].includes(type)) {
        references.set(id, node);
        continue;
    }

    if (type === "LearningResource" || id.startsWith("/notes/")) {
        lessons.set(id, node);
        continue;
    }

    if (type === "dibs:ReferenceUsage") {
        usages.push({
            id,
            lessonId: resolveNodeId(node["dibs:lesson"] ?? node.lesson),
            referenceId: resolveNodeId(node["dibs:reference"] ?? node.reference),
            tags: toArray(node["dibs:tags"] ?? node.tags).map(asString).filter(Boolean),
        });
    }
}

const visibleUsages = usages.filter((usage) =>
    usage.tags.some((tag) => tag === "recommended" || tag === "additional")
    && !usage.tags.includes("pending-revision")
);

const referenceStats = new Map();
const bookStats = new Map();
const lessonTagCounts = new Map();

for (const usage of visibleUsages) {
    const reference = references.get(usage.referenceId);
    if (!reference) continue;

    const refTitle = getName(reference) ?? usage.referenceId;
    const refType = getType(reference["@type"]);
    const refKey = usage.referenceId;
    const refEntry = referenceStats.get(refKey) ?? {
        referenceId: refKey,
        type: refType,
        title: refTitle,
        citationCount: 0,
        lessons: new Set(),
        tags: new Set(),
    };
    refEntry.citationCount += 1;
    refEntry.lessons.add(usage.lessonId);
    usage.tags.forEach((tag) => refEntry.tags.add(tag));
    referenceStats.set(refKey, refEntry);

    if (refType === "Book") {
        const containerId = resolveNodeId(reference.isPartOf);
        const containerTitle = containerId
            ? getName(nodesById.get(containerId)) ?? containerId
            : getName(reference);
        const bookKey = containerId ?? `title:${containerTitle}`;
        const bookEntry = bookStats.get(bookKey) ?? {
            bookKey,
            bookId: containerId,
            bookTitle: containerTitle,
            citationCount: 0,
            lessons: new Set(),
            chapterIds: new Set(),
        };
        bookEntry.citationCount += 1;
        bookEntry.lessons.add(usage.lessonId);
        bookEntry.chapterIds.add(usage.referenceId);
        bookStats.set(bookKey, bookEntry);
    }

    for (const tag of usage.tags) {
        const lessonTagKey = `${usage.lessonId}::${tag}`;
        lessonTagCounts.set(lessonTagKey, (lessonTagCounts.get(lessonTagKey) ?? 0) + 1);
    }
}

const sortedReferences = Array.from(referenceStats.values())
    .map((entry) => ({
        referenceId: entry.referenceId,
        type: entry.type,
        title: entry.title,
        citationCount: entry.citationCount,
        lessonCount: entry.lessons.size,
        tags: Array.from(entry.tags).sort(),
    }))
    .sort((a, b) => b.citationCount - a.citationCount || a.title.localeCompare(b.title));

const sortedBooks = Array.from(bookStats.values())
    .map((entry) => ({
        bookKey: entry.bookKey,
        bookId: entry.bookId ?? "",
        bookTitle: entry.bookTitle,
        citationCount: entry.citationCount,
        lessonCount: entry.lessons.size,
        chapterIds: Array.from(entry.chapterIds).sort(),
    }))
    .sort((a, b) => b.citationCount - a.citationCount || a.bookTitle.localeCompare(b.bookTitle));

const lessonUsageSummary = Array.from(lessonTagCounts.entries())
    .map(([key, count]) => {
        const [lessonId, tag] = key.split("::");
        return {
            lessonId,
            lessonTitle: getName(lessons.get(lessonId)) ?? lessonId,
            tag,
            count,
        };
    })
    .sort((a, b) => a.lessonId.localeCompare(b.lessonId) || a.tag.localeCompare(b.tag));

const report = {
    generatedAt: new Date().toISOString(),
    catalogPath: path.relative(projectRoot, catalogPath).replaceAll("\\", "/"),
    totals: {
        references: references.size,
        lessons: lessons.size,
        usages: usages.length,
        visibleUsages: visibleUsages.length,
    },
    topReferences: sortedReferences,
    topBooks: sortedBooks,
    referencesByTagAndLesson: lessonUsageSummary,
};

const csvRows = sortedReferences.map((entry) => ({
    referenceId: entry.referenceId,
    type: entry.type,
    title: entry.title,
    citationCount: entry.citationCount,
    lessonCount: entry.lessonCount,
    tags: entry.tags.join("; "),
}));

await mkdir(outputDir, { recursive: true });
await writeFile(outputJson, JSON.stringify(report, null, 2), "utf8");
await writeFile(outputCsv, rowsToCsv(csvRows), "utf8");

console.log(`Bibliography report written to ${path.relative(projectRoot, outputJson)}`);
console.log(`Bibliography CSV written to ${path.relative(projectRoot, outputCsv)}`);
