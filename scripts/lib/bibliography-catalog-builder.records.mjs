/**
 * RDF record accessors and scalar mappers for the bibliography catalog.
 *
 * This module defines the small record abstraction used between RDF parsing and node construction.
 * After Turtle data is parsed into RDF terms, the catalog builder groups those terms by subject
 * and predicate into {@link BibliographyRecord} values. The helpers in this file then provide a
 * narrow, validated API for reading those grouped terms as application-level values.
 *
 * ## Responsibilities
 *
 * This module is responsible for:
 *
 * - creating empty record containers for RDF subjects;
 * - reading grouped predicate values from a record;
 * - validating scalar cardinality for predicates that should appear at most once;
 * - checking RDF term kinds such as `Literal` and `NamedNode`;
 * - mapping RDF values into catalog-friendly representations such as strings, integers, compact
 *   IDs, and compact type names.
 *
 * ## Validation model
 *
 * The functions in this module form part of the normalization boundary between untrusted parsed
 * RDF data and trusted catalog node builders.
 *
 * They follow these rules:
 *
 * - missing optional values return `undefined`;
 * - multi-valued scalar predicates fail fast;
 * - term-kind mismatches fail fast;
 * - integer parsing is strict and accepts only exact safe integers.
 *
 * This keeps downstream builders simple: they can assume these accessors either return valid
 * normalized values or stop processing with a contextual error.
 *
 * ## Integration
 *
 * A typical flow looks like this:
 *
 * 1. The RDF parser emits quads from Turtle input.
 * 2. The catalog builder groups quads by subject IRI into records.
 * 3. {@link getNodeTypes} determines the RDF type set for each record.
 * 4. Node builders call helpers such as {@link scalarLiteral}, {@link scalarInteger}, and
 *    {@link namedRefs} to extract validated fields.
 *
 * ## Typing strategy
 *
 * This file declares local structural JSDoc types instead of importing them from the RDF library.
 * That keeps editor support stable in environments where package declaration resolution is
 * incomplete or falls back to `any`.
 */

import { DIBS, RDF_TYPE } from "./bibliography-catalog-builder.constants.mjs";
import {
    compactId,
    compactType,
    compactUrl,
} from "./bibliography-catalog-builder.compact.mjs";
import { fail } from "./bibliography-catalog-builder.validation.mjs";

/**
 * Structural RDF term shape used locally for JSDoc typing.
 *
 * The module only relies on a small subset of RDF/JS-like term data:
 *
 * - `termType` identifies the RDF term kind;
 * - `value` contains the serialized lexical value or IRI.
 *
 * @typedef {{
 *   termType:
 *     | "NamedNode"
 *     | "Literal"
 *     | "BlankNode"
 *     | "Variable"
 *     | "Quad"
 *     | "DefaultGraph";
 *   value: string;
 * }} RdfTerm
 */

/**
 * RDF literal term.
 *
 * Language and datatype are optional because not every caller needs them, but they are included
 * here so editors can expose the shape when needed.
 *
 * @typedef {RdfTerm & {
 *   termType: "Literal";
 *   language?: string;
 *   datatype?: RdfNamedNode;
 * }} RdfLiteral
 */

/**
 * RDF named-node term.
 *
 * Named nodes represent IRIs and are used for references, type declarations, and other graph links.
 *
 * @typedef {RdfTerm & {
 *   termType: "NamedNode";
 * }} RdfNamedNode
 */

/**
 * Grouped RDF data for a single subject.
 *
 * A bibliography record is the intermediate representation used after parsing and before building
 * domain nodes. All predicate objects associated with the same subject IRI are collected into the
 * `predicates` map.
 *
 * ## Invariants
 *
 * - `iri` is the full subject IRI from the RDF source.
 * - `id` is the compact catalog-facing identifier derived from `iri`.
 * - `predicates` stores all encountered values keyed by predicate IRI.
 * - `order` preserves source-relative ordering for stable output.
 * - `primaryType`, when set later, is the preferred type used by downstream builders.
 *
 * @typedef {{
 *   iri: string;
 *   id: string;
 *   predicates: Map<string, RdfTerm[]>;
 *   order: number;
 *   primaryType?: string;
 * }} BibliographyRecord
 */

/**
 * Creates an empty grouped record for a subject IRI.
 *
 * The returned record has no predicate values yet. The catalog builder is expected to populate
 * `predicates` incrementally while processing parsed quads.
 *
 * `order` is initialized to `Number.MAX_SAFE_INTEGER` so records can later be assigned a concrete
 * first-seen index while still sorting predictably when that assignment has not happened yet.
 *
 * @param {string} iri
 *   Subject IRI for the record.
 * @returns {BibliographyRecord}
 *   Empty grouped record for that subject.
 */
export const createRecord = (iri) => ({
    iri,
    id: compactId(iri),
    predicates: new Map(),
    order: Number.MAX_SAFE_INTEGER,
});

/**
 * Returns all values currently stored for a predicate.
 *
 * This is the low-level lookup helper used by the rest of the module. It always returns an array
 * so callers do not need to repeatedly handle missing-map entries.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate map will be queried.
 * @param {string} predicate
 *   Full predicate IRI.
 * @returns {RdfTerm[]}
 *   Stored values for that predicate, or an empty array when absent.
 */
const getPredicateValues = (record, predicate) =>
    record.predicates.get(predicate) ?? [];

/**
 * Reads a scalar predicate that may appear zero or one time.
 *
 * This helper centralizes scalar-cardinality validation for accessors that expect at most one RDF
 * value.
 *
 * ## Behavior:
 *
 * - returns `undefined` when the predicate is absent;
 * - returns the single value when exactly one is present;
 * - fails when more than one value is present.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {RdfTerm | undefined}
 *   The single RDF term, or `undefined` when absent.
 */
function getOptionalSingleValue(record, predicate, sourceLabel) {
    const values = getPredicateValues(record, predicate);

    if (values.length === 0) return undefined;

    if (values.length > 1) {
        fail(
            sourceLabel,
            `node "${record.id}" has multiple values for "${predicate}".`,
        );
    }

    return values[0];
}

/**
 * Asserts that an RDF term has the expected `termType`.
 *
 * This helper performs the runtime check and preserves a narrower static type for editor tooling
 * through JSDoc generics.
 *
 * @template {RdfTerm["termType"]} TExpected
 * @param {BibliographyRecord} record
 *   Record being validated.
 * @param {string} predicate
 *   Predicate currently being read.
 * @param {RdfTerm} value
 *   RDF term to validate.
 * @param {TExpected} expectedTermType
 *   Required RDF term kind.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {Extract<RdfTerm, { termType: TExpected }>}
 *   The same term narrowed to the expected kind.
 */
const expectTermType = (
    record,
    predicate,
    value,
    expectedTermType,
    sourceLabel,
) => {
    if (value.termType !== expectedTermType) {
        fail(
            sourceLabel,
            `node "${record.id}" expects a ${expectedTermType} for "${predicate}".`,
        );
    }

    return /** @type {Extract<RdfTerm, { termType: TExpected }>} */ (value);
};

/**
 * Reads an optional scalar predicate and requires it to be a literal.
 *
 * This is the literal-specific version of {@link getOptionalSingleValue}.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {RdfLiteral | undefined}
 *   The literal term, or `undefined` when the predicate is absent.
 */
function getOptionalLiteral(record, predicate, sourceLabel) {
    const value = getOptionalSingleValue(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return expectTermType(record, predicate, value, "Literal", sourceLabel);
}

/**
 * Reads an optional scalar predicate and requires it to be a named node.
 *
 * This is the named-node-specific version of {@link getOptionalSingleValue}.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {RdfNamedNode | undefined}
 *   The named-node term, or `undefined` when the predicate is absent.
 */
function getOptionalNamedNode(record, predicate, sourceLabel) {
    const value = getOptionalSingleValue(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return expectTermType(record, predicate, value, "NamedNode", sourceLabel);
}

/**
 * Reads all values for a predicate and requires every one of them to be named nodes.
 *
 * This is used for multi-valued graph relationships such as authorship, related entities, and RDF
 * type declarations.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {RdfNamedNode[]}
 *   All values for the predicate, validated as named nodes.
 */
const getNamedNodeValues = (record, predicate, sourceLabel) =>
    getPredicateValues(record, predicate).map((value) =>
        expectTermType(record, predicate, value, "NamedNode", sourceLabel),
    );

/**
 * Extracts a scalar literal as a plain string.
 *
 * This is the general-purpose accessor for optional textual fields such as titles, subtitles,
 * descriptions, labels, or notes.
 *
 * The predicate must appear at most once. If absent, the function returns `undefined`.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string | undefined}
 *   Literal string value, or `undefined` when absent.
 */
export const scalarLiteral = (record, predicate, sourceLabel) =>
    getOptionalLiteral(record, predicate, sourceLabel)?.value;

/**
 * Extracts a scalar URL literal as a string.
 *
 * This helper is semantically more specific than {@link scalarLiteral}: it exists for predicates
 * whose literal value is expected to represent a URL or URI. The runtime behavior is the same, but
 * the name makes caller intent clearer.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string | undefined}
 *   URL-like literal value, or `undefined` when absent.
 */
export const scalarUrlLiteral = (record, predicate, sourceLabel) =>
    getOptionalLiteral(record, predicate, sourceLabel)?.value;

/**
 * Extracts a scalar named-node reference and compacts it to a catalog URL/ID form.
 *
 * Use this when the RDF object is a graph reference rather than a literal.
 *
 * Example use cases include:
 *
 * - an author reference from a work to a person node;
 * - a publisher reference from an edition to an organization node;
 * - any other single object-property link represented as a named node.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string | undefined}
 *   Compacted reference value, or `undefined` when absent.
 */
export function scalarUrlRef(record, predicate, sourceLabel) {
    const value = getOptionalNamedNode(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return compactUrl(value.value);
}

/**
 * Extracts a scalar integer from a literal predicate.
 *
 * Integer validation is intentionally strict:
 *
 * - the literal must match an exact base-10 integer lexeme;
 * - the resulting number must be a safe JavaScript integer.
 *
 * This avoids permissive parsing behavior such as accepting `"12abc"` or silently rounding values
 * outside the safe integer range.
 *
 * Typical uses include years, issue numbers, volumes, and page counts when the catalog model
 * expects exact integers.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {number | undefined}
 *   Parsed safe integer, or `undefined` when absent.
 */
export function scalarInteger(record, predicate, sourceLabel) {
    const value = scalarLiteral(record, predicate, sourceLabel);
    if (value == null) return undefined;

    if (!/^-?\d+$/.test(value)) {
        fail(
            sourceLabel,
            `node "${record.id}" has a non-integer value for "${predicate}".`,
        );
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
        fail(
            sourceLabel,
            `node "${record.id}" has an unsafe integer for "${predicate}".`,
        );
    }

    return parsed;
}

/**
 * Extracts all named-node references for a predicate and compacts each one to an ID.
 *
 * This helper is appropriate for multi-valued object-property relationships.
 *
 * The result preserves source order because it maps the grouped RDF values in the same order they
 * were stored on the record.
 *
 * @param {BibliographyRecord} record
 *   Record whose predicate will be read.
 * @param {string} predicate
 *   Full predicate IRI.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string[]}
 *   Compacted reference IDs. Returns an empty array when the predicate is absent.
 */
export const namedRefs = (record, predicate, sourceLabel) =>
    getNamedNodeValues(record, predicate, sourceLabel).map((value) =>
        compactId(value.value),
    );

/**
 * Reads and compacts all RDF types declared on a record.
 *
 * Every catalog node is expected to declare at least one `rdf:type`. The returned array can then
 * be used by higher-level builder logic to decide which specialized node factory should run.
 *
 * This function preserves source order, which allows downstream code to treat the first type as
 * the preferred or primary type when that convention is useful.
 *
 * @param {BibliographyRecord} record
 *   Record whose RDF types will be read.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string[]}
 *   Compacted RDF type names.
 */
export function getNodeTypes(record, sourceLabel) {
    const rawTypes = getNamedNodeValues(record, RDF_TYPE, sourceLabel);

    if (rawTypes.length === 0) {
        fail(sourceLabel, `node "${record.id}" is missing rdf:type.`);
    }

    return rawTypes.map((value) => compactType(value.value));
}

/**
 * Extracts all `dibs:tag` literal values from a usage record.
 *
 * Tags are used as lightweight classification metadata for references and usage entries, such as
 * lesson scope, topic grouping, or pedagogical context.
 *
 * Unlike scalar helpers, this function accepts zero or more values and validates that every value
 * is a literal.
 *
 * @param {BibliographyRecord} record
 *   Record whose `dibs:tag` values will be read.
 * @param {string} sourceLabel
 *   Human-readable source label used in validation errors.
 * @returns {string[]}
 *   Tag literal values in source order. Returns an empty array when no tags are present.
 */
export const getUsageTagLiterals = (record, sourceLabel) =>
    getPredicateValues(record, `${DIBS}tag`).map((value) => {
        if (value.termType !== "Literal") {
            fail(
                sourceLabel,
                `usage "${record.id}" has a non-literal dibs:tag.`,
            );
        }

        return value.value;
    });
