import type {
    LessonHref,
    LessonMetadataIssue,
    LessonMetadataLookupResult,
    LessonMetadataRecord,
    LessonMetadataRepository,
} from "@ravenhill/content-core";
import {
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "@ravenhill/content-core";
import {
    getLessonMetadataDataset,
    type ReadonlyLessonMetadataDataset,
    type ReadonlyLessonMetadataEntry,
} from "~/utils/lesson-metadata";

/**
 * Infrastructure adapter that resolves lesson metadata from the generated JSON dataset.
 *
 * Validation, caching, and dataset ownership remain behind this boundary. Higher layers see only
 * the domain repository contract.
 */
export class LessonMetadataAdapter implements LessonMetadataRepository {
    constructor(private readonly source: ReadonlyLessonMetadataDataset = getLessonMetadataDataset()) {}

    async findByHref(href: LessonHref): Promise<LessonMetadataLookupResult> {
        const entry = this.source.entries[href.value];
        if (!entry) {
            return { kind: "missing", href };
        }

        const result = mapLessonMetadataEntry(entry);

        return result.kind === "valid"
            ? { kind: "found", metadata: result.metadata }
            : { kind: "invalid", href, issues: result.issues };
    }
}

type MetadataRecordParseResult =
    | Readonly<{ kind: "valid"; metadata: LessonMetadataRecord }>
    | Readonly<{ kind: "invalid"; issues: readonly LessonMetadataIssue[] }>;

const issue = (path: string, field: string, message: string): LessonMetadataIssue => ({
    path,
    field,
    message,
});

function mapLessonMetadataEntry(entry: ReadonlyLessonMetadataEntry): MetadataRecordParseResult {
    const issues: LessonMetadataIssue[] = [];
    const sourceFile = parseLessonSourceFile(entry.sourceFile);
    const lastModified = entry.lastModified
        ? parseIsoShortDateValue(entry.lastModified)
        : undefined;

    if (!sourceFile) {
        issues.push(issue("sourceFile", "sourceFile", "Expected a non-empty source file path."));
    }

    const authors = entry.authors.map((author, index) => {
        const name = parseNonEmptyText(author.name);
        const url = author.url ? parseAbsoluteUrl(author.url) : undefined;

        if (!name) {
            issues.push(issue(`authors[${index}].name`, "name", "Expected non-empty text."));
        }

        if (author.url && !url) {
            issues.push(issue(`authors[${index}].url`, "url", "Expected an http or https URL."));
        }

        return name ? { name, ...(url ? { url } : {}) } : undefined;
    });

    if (entry.lastModified && !lastModified) {
        issues.push(issue("lastModified", "lastModified", "Expected a real ISO short date."));
    }

    const changes = entry.changes.map((change, index) => {
        const hash = parseGitCommitHash(change.hash);
        const date = parseIsoShortDateValue(change.date);
        const author = parseNonEmptyText(change.author);
        const subject = parseNonEmptyText(change.subject);

        if (!hash) {
            issues.push(issue(`changes[${index}].hash`, "hash", "Expected a git commit hash."));
        }

        if (!date) {
            issues.push(issue(`changes[${index}].date`, "date", "Expected a real ISO short date."));
        }

        if (!author) {
            issues.push(issue(`changes[${index}].author`, "author", "Expected non-empty text."));
        }

        if (!subject) {
            issues.push(issue(`changes[${index}].subject`, "subject", "Expected non-empty text."));
        }

        return hash && date && author && subject ? { hash, date, author, subject } : undefined;
    });

    if (issues.length > 0 || !sourceFile) {
        return { kind: "invalid", issues };
    }

    return {
        kind: "valid",
        metadata: {
            sourceFile,
            authors: authors.filter((author) => author !== undefined),
            changes: changes.filter((change) => change !== undefined),
            ...(lastModified ? { lastModified } : {}),
        },
    };
}
