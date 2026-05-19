import {
    getMostCitedBooks,
    getReferenceStats,
    loadBibliographyCatalog,
    usageMatchesTagFilters,
} from "../../../src/lib/bibliography/catalog-core.mjs";

const csvEscape = (value) => {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
    return text;
};

export const rowsToCsv = (rows) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((header) => csvEscape(row[header])).join(","));
    }
    return `${lines.join("\n")}\n`;
};

const visibleUsagesFor = (catalog) => catalog.usages.filter((usage) => usageMatchesTagFilters(usage));

const buildReportTotals = (catalog) => ({
    references: catalog.references.length,
    lessons: catalog.lessons.length,
    usages: catalog.usages.length,
    visibleUsages: visibleUsagesFor(catalog).length,
});

const summarizeLessonTagCounts = (catalog) => {
    const counts = new Map();

    for (const usage of visibleUsagesFor(catalog)) {
        for (const tag of usage.tags) {
            const key = `${usage.lessonId}::${tag}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    return Array.from(counts.entries())
        .map(([key, count]) => {
            const [lessonId, tag] = key.split("::");
            return {
                lessonId,
                lessonTitle: catalog.lessonsById.get(lessonId)?.title ?? lessonId,
                tag,
                count,
            };
        })
        .sort((left, right) =>
            left.lessonTitle.localeCompare(right.lessonTitle)
            || left.lessonId.localeCompare(right.lessonId)
            || left.tag.localeCompare(right.tag)
        );
};

export const buildBibliographyReport = (
    catalogJsonLd,
    {
        generatedAt = new Date().toISOString(),
        catalogPath,
        sourceLabel = "bibliography-report",
    } = {},
) => {
    const catalog = loadBibliographyCatalog(JSON.parse(catalogJsonLd), { sourceLabel });

    return {
        generatedAt,
        catalogPath,
        totals: buildReportTotals(catalog),
        topReferences: getReferenceStats(catalog),
        topBooks: getMostCitedBooks(catalog),
        referencesByTagAndLesson: summarizeLessonTagCounts(catalog),
    };
};

export const bibliographyReportCsvRows = (report) =>
    report.topReferences.map((entry) => ({
        referenceId: entry.referenceId,
        type: entry.type,
        title: entry.title,
        citationCount: entry.citationCount,
        lessonCount: entry.lessonCount,
        tags: entry.tags.join("; "),
    }));

export const formatBibliographyReportCsv = (report) => rowsToCsv(bibliographyReportCsvRows(report));
