/**
 * @fileoverview Shared support for bibliography graph-node builders.
 *
 * This module contains the internal helper surface used by the public graph
 * builders:
 *
 * - structural JSDoc contracts for the builder context;
 * - allowed-type policy constants;
 * - small serialization helpers for optional values and `@id` references;
 * - required-field readers with explicit aborting semantics;
 * - relation-category validation helpers;
 * - tag deduplication utilities.
 *
 * The helpers here are intentionally generic across person, organization,
 * reference, lesson, and usage builders. Usage-specific pending-revision
 * pruning remains in the usage module so support stays decoupled from that
 * exceptional control flow.
 */

/**
 * Bibliography record consumed by the graph builders.
 *
 * @typedef {import("./records.mjs").BibliographyRecord} BibliographyRecord
 */

/**
 * Strategy object used by graph builders to read and validate bibliography
 * records without depending on their concrete in-memory representation.
 *
 * Builders use this context to:
 *
 * - read scalar literals and URLs;
 * - resolve referenced record IDs;
 * - inspect record types when pruning pending-revision usages;
 * - validate that referenced records belong to allowed categories;
 * - abort construction with a source-aware validation error.
 *
 * Some capabilities are required only by specific builders. For example,
 * relation validation depends on `recordsById` and `ensureNodeCategory`, while
 * pending-revision filtering additionally depends on `getNodeTypes` and
 * `skippedPendingNodeIds`.
 *
 * The source-bound `reader` facade is the stable record-reading boundary for
 * migrated builders. The flat reader helpers remain temporarily available for
 * non-pilot builders and should be removed after Phase 4 migrates the rest of
 * the builder surface.
 *
 * The `abort` function is expected to throw. Builders rely on that
 * control-flow contract when a required field or invalid relation is
 * encountered.
 *
 * @typedef {object} GraphBuilderContext
 * @property {Map<string, BibliographyRecord>} [recordsById]
 *   Record lookup table used by relation validation and pending-revision checks.
 * @property {object} [reader]
 *   Source-bound record reader facade used by migrated builders.
 * @property {(record: BibliographyRecord, predicate: string) => string | undefined} [reader.scalarLiteral]
 *   Extracts a single literal string value using the bound source label.
 * @property {(record: BibliographyRecord, predicate: string) => string | undefined} [reader.scalarUrlLiteral]
 *   Extracts a single URL literal value using the bound source label.
 * @property {(record: BibliographyRecord, predicate: string) => number | undefined} [reader.scalarInteger]
 *   Extracts a single integer literal value using the bound source label.
 * @property {(record: BibliographyRecord, predicate: string) => string[]} [reader.namedRefs]
 *   Extracts referenced node IDs using the bound source label.
 * @property {(record: BibliographyRecord) => string[]} [reader.getUsageTagLiterals]
 *   Extracts usage-tag literals using the bound source label.
 * @property {(record: BibliographyRecord) => string[]} [reader.getNodeTypes]
 *   Returns node types using the bound source label.
 *
 * Temporary compatibility accessors used by non-pilot builders. Phase 4 should
 * migrate remaining builders to `reader` and remove these fields.
 *
 * @property {(record: BibliographyRecord, predicate: string, sourceLabel: string) => string | undefined} scalarLiteral
 *   Extracts a single literal string value.
 * @property {(record: BibliographyRecord, predicate: string, sourceLabel: string) => string | undefined} scalarUrlLiteral
 *   Extracts a single URL literal value.
 * @property {(record: BibliographyRecord, predicate: string, sourceLabel: string) => number | undefined} [scalarInteger]
 *   Extracts a single integer literal value.
 * @property {(record: BibliographyRecord, predicate: string, sourceLabel: string) => string[]} namedRefs
 *   Extracts the referenced node IDs for a predicate.
 * @property {(record: BibliographyRecord, sourceLabel: string) => string[]} [getUsageTagLiterals]
 *   Extracts dibs usage-tag literals from a usage record.
 * @property {(record: BibliographyRecord, sourceLabel: string) => string[]} [getNodeTypes]
 *   Returns the RDF or logical node types associated with a record.
 * @property {(recordsById: Map<string, BibliographyRecord>, id: string, allowedTypes: Set<string>, sourceLabel: string, relationLabel: string) => void} [ensureNodeCategory]
 *   Validates that a referenced record belongs to an allowed category.
 * @property {(sourceLabel: string, message: string) => never} abort
 *   Aborts graph construction by throwing a validation error.
 * @property {Set<string>} [skippedPendingNodeIds]
 *   Tracks nodes excluded from the pending-revision flow.
 * @property {string} sourceLabel
 *   Human-readable source identifier used in error messages.
 */

export const AUTHOR_TYPES = new Set(["Person", "Organization", "CollegeOrUniversity"]);
export const PUBLISHER_TYPES = new Set(["Organization", "CollegeOrUniversity"]);
export const CREATIVE_WORK_TYPES = new Set(["CreativeWork"]);
export const LESSON_TYPES = new Set(["LearningResource"]);

export function withOptional(key, value) {
    if (value == null || value === "") {
        return {};
    }
    return { [key]: value };
}

export const asIdRef = (id) => ({ "@id": id });

export const asIdRefs = (ids) => ids.map((id) => asIdRef(id));

export const dedupePreservingOrder = (values) => Array.from(new Set(values));

export const requireField = (record, value, message, abort, sourceLabel) => {
    if (value == null || value === "") {
        abort(sourceLabel, message(record));
    }

    return value;
};

const readScalarLiteral = (record, predicate, context) => {
    if (context.reader) return context.reader.scalarLiteral(record, predicate);
    return context.scalarLiteral(record, predicate, context.sourceLabel);
};

export const getRequiredScalar = (record, predicate, message, context) =>
    requireField(
        record,
        readScalarLiteral(record, predicate, context),
        message,
        context.abort,
        context.sourceLabel,
    );

export const getRequiredFirstRef = (record, predicate, message, context) =>
    requireField(
        record,
        context.namedRefs(record, predicate, context.sourceLabel)[0],
        message,
        context.abort,
        context.sourceLabel,
    );

export const getRequiredTags = (record, context) => {
    const tags = context.getUsageTagLiterals(record, context.sourceLabel);
    if (tags.length === 0) {
        context.abort(
            context.sourceLabel,
            `usage "${record.id}" is missing dibs:tag.`,
        );
    }

    return tags;
};

export const validateRelationRefs = (ids, allowedTypes, relationLabel, context) => {
    if (ids.length === 0) return;
    if (!context.recordsById || !context.ensureNodeCategory) {
        throw new Error(
            "Graph builder context is missing relation validation dependencies.",
        );
    }

    ids.forEach((id) =>
        context.ensureNodeCategory(
            context.recordsById,
            id,
            allowedTypes,
            context.sourceLabel,
            relationLabel(id),
        )
    );
};

export const validateRelationRef = (id, allowedTypes, relationLabel, context) => {
    if (!id) return;
    validateRelationRefs([id], allowedTypes, () => relationLabel, context);
};
