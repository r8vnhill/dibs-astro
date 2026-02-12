import fg from "fast-glob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const bibliographyGlob = "src/data/bibliography/**/*.jsonld";
const outputDir = path.join(projectRoot, "reports");
const outputJson = path.join(outputDir, "bibliography-report.json");
const outputCsv = path.join(outputDir, "bibliography-report.csv");

const asString = (value) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const asNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const toArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const parseAuthors = (value) => {
    return toArray(value)
        .map((entry) => {
            if (typeof entry === "string") return { name: entry };
            if (!entry || typeof entry !== "object") return null;
            const givenName = asString(entry.givenName);
            const familyName = asString(entry.familyName);
            const name = asString(entry.name) ?? [givenName, familyName].filter(Boolean).join(" ");
            if (!name) return null;
            return { name };
        })
        .filter(Boolean);
};

const parseItem = (item, sourcePath) => {
    const id = asString(item.identifier);
    const rawType = Array.isArray(item["@type"]) ? item["@type"][0] : item["@type"];
    const type = asString(rawType);
    const title = asString(item.name) ?? asString(item.headline);
    const datePublished = asString(item.datePublished);
    const keywords = toArray(item.keywords).map(asString).filter(Boolean);
    const publisherName =
        typeof item.publisher === "object" && item.publisher !== null
            ? asString(item.publisher.name)
            : asString(item.publisher);
    const authors = parseAuthors(item.author);
    const description = asString(item.description);

    if (!id || !type || !title) {
        return null;
    }

    if (type === "Book") {
        const isPartOf = item.isPartOf;
        const bookTitle =
            typeof isPartOf === "object" && isPartOf !== null
                ? asString(isPartOf.name)
                : asString(isPartOf);
        if (!bookTitle) return null;

        const pageStart = asNumber(item.pageStart);
        const pageEnd = asNumber(item.pageEnd);
        let pages;
        if (pageStart !== undefined || pageEnd !== undefined) {
            const start = pageStart ?? pageEnd;
            const end = pageEnd ?? pageStart;
            pages = start <= end ? [start, end] : [end, start];
        }

        return {
            id,
            type,
            title,
            chapter: title,
            bookTitle,
            pages,
            datePublished,
            keywords,
            publisherName,
            authors,
            description,
            sourcePath,
        };
    }

    if (type === "WebPage") {
        const url = asString(item.url);
        if (!url) return null;

        let domain;
        try {
            domain = new URL(url).hostname;
        } catch {
            domain = url;
        }

        return {
            id,
            type,
            title,
            url,
            domain,
            datePublished,
            keywords,
            publisherName,
            authors,
            description,
            sourcePath,
        };
    }

    return null;
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

const files = await fg(bibliographyGlob, {
    cwd: projectRoot,
    absolute: true,
});

const lessonSummaries = [];
const allItems = [];
const parseWarnings = [];

for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath).replaceAll("\\", "/");
    const raw = await readFile(filePath, "utf8");
    let json;
    try {
        json = JSON.parse(raw);
    } catch (error) {
        parseWarnings.push(`${relativePath}: invalid JSON (${error.message})`);
        continue;
    }

    const itemList = Array.isArray(json.itemListElement) ? json.itemListElement : [];
    const lessonItems = [];
    for (const item of itemList) {
        const parsed = parseItem(item, relativePath);
        if (!parsed) {
            const itemId = asString(item?.identifier) ?? "<missing-id>";
            parseWarnings.push(`${relativePath}: skipped invalid item ${itemId}`);
            continue;
        }
        lessonItems.push(parsed);
        allItems.push(parsed);
    }

    const byType = lessonItems.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
    }, {});

    lessonSummaries.push({
        sourcePath: relativePath,
        lessonName: asString(json.name),
        lessonAbout: asString(json.about),
        totalReferences: lessonItems.length,
        byType,
    });
}

const typeDistribution = allItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
}, {});

const domainCounts = {};
const authorCounts = {};
const missingDate = [];
const urls = new Map();

for (const item of allItems) {
    if (item.type === "WebPage" && item.domain) {
        domainCounts[item.domain] = (domainCounts[item.domain] ?? 0) + 1;
    }
    for (const author of item.authors ?? []) {
        const name = asString(author.name);
        if (!name) continue;
        authorCounts[name] = (authorCounts[name] ?? 0) + 1;
    }
    if (!item.datePublished) {
        missingDate.push({
            id: item.id,
            sourcePath: item.sourcePath,
            type: item.type,
            title: item.title,
        });
    }
    if (item.type === "WebPage" && item.url) {
        const existing = urls.get(item.url) ?? [];
        existing.push({
            id: item.id,
            sourcePath: item.sourcePath,
            title: item.title,
        });
        urls.set(item.url, existing);
    }
}

const duplicateUrls = Array.from(urls.entries())
    .filter(([, refs]) => refs.length > 1)
    .map(([url, refs]) => ({ url, count: refs.length, references: refs }));

const top = (entries, limit = 15) =>
    Object.entries(entries)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, limit);

const report = {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    lessons: lessonSummaries,
    totals: {
        references: allItems.length,
        byType: typeDistribution,
    },
    topDomains: top(domainCounts),
    topAuthors: top(authorCounts),
    missingDatePublished: missingDate,
    duplicateUrls,
    warnings: parseWarnings,
};

const csvRows = allItems.map((item) => ({
    sourcePath: item.sourcePath,
    id: item.id,
    type: item.type,
    title: item.title,
    url: item.type === "WebPage" ? item.url : "",
    domain: item.type === "WebPage" ? item.domain ?? "" : "",
    chapter: item.type === "Book" ? item.chapter : "",
    bookTitle: item.type === "Book" ? item.bookTitle : "",
    pageStart: item.type === "Book" && item.pages ? item.pages[0] : "",
    pageEnd: item.type === "Book" && item.pages ? item.pages[1] : "",
    publisher: item.publisherName ?? "",
    datePublished: item.datePublished ?? "",
    authors: (item.authors ?? []).map((author) => author.name).join("; "),
    keywords: (item.keywords ?? []).join("; "),
}));

await mkdir(outputDir, { recursive: true });
await writeFile(outputJson, JSON.stringify(report, null, 2), "utf8");
await writeFile(outputCsv, rowsToCsv(csvRows), "utf8");

console.log(`Bibliography report written to ${path.relative(projectRoot, outputJson)}`);
console.log(`Bibliography CSV written to ${path.relative(projectRoot, outputCsv)}`);
