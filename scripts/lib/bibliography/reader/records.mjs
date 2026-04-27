/**
 * @fileoverview RDF record accessors and scalar mappers for the bibliography catalog.
 *
 * This module defines the normalization boundary between parsed RDF data and bibliography graph builders. The parser
 * groups RDF terms by subject and predicate into {@link BibliographyRecord} values; the helpers in this file then read
 * those grouped values as catalog-level primitives.
 *
 * ## Responsibilities
 *
 * This module is responsible for:
 *
 * - creating empty record containers for RDF subjects;
 * - reading grouped predicate values from records;
 * - enforcing scalar cardinality for predicates that must have at most one value;
 * - validating RDF term kinds before values reach graph builders;
 * - mapping RDF terms into catalog-friendly values such as strings, integers, compact IDs, compact URLs, and compact
 *   type names;
 * - deduplicating multi-valued outputs when the accessor contract requires first-seen uniqueness.
 *
 * ## Validation model
 *
 * These accessors are deliberately strict because they sit between untrusted RDF input and trusted catalog
 * construction code.
 *
 * They follow these rules:
 *
 * - missing optional scalar values return `undefined`;
 * - multi-valued scalar predicates fail fast;
 * - term-kind mismatches fail fast;
 * - integer parsing accepts only exact safe integers;
 * - deduplicated readers preserve first-seen order after mapping.
 *
 * Downstream builders can therefore treat successful reads as normalized values and leave low-level RDF shape
 * validation to this module.
 *
 * ## Integration
 *
 * A typical catalog build uses this flow:
 *
 * 1. The RDF parser emits quads from Turtle input.
 * 2. The catalog builder groups quads by subject IRI into records.
 * 3. {@link getNodeTypes} determines the RDF type set for each record.
 * 4. {@link createCatalogReader} binds these helpers to the current `sourceLabel` and exposes them to graph builders
 *    through a reader facade.
 *
 * The exported helpers remain the low-level normalization API. Builder-facing code should usually consume them through
 * the source-bound reader facade rather than passing `sourceLabel` manually.
 *
 * ## Typing strategy
 *
 * This file uses local structural JSDoc types instead of importing RDF library declarations. The helpers only depend
 * on the `termType` and `value` fields, and local typedefs keep editor support stable even when package-level
 * declarations are unavailable or too broad.
 */

import { compactId, compactType, compactUrl } from "./compact.mjs";
import { DIBS, RDF_TYPE } from "../shared/constants.mjs";
import { fail } from "./validation.mjs";

/**
 * Structural RDF term shape used by the record readers.
 *
 * The implementation only needs a small RDF/JS-compatible subset:
 *
 * - `termType` identifies the RDF term kind;
 * - `value` stores the lexical value for literals or the IRI for named nodes.
 *
 * @typedef {object} RdfTerm
 * @property {"NamedNode" | "Literal" | "BlankNode" | "Variable" | "Quad" | "DefaultGraph"} termType RDF term kind.
 * @property {string} value Serialized lexical value or IRI.
 */

/**
 * RDF literal term.
 *
 * Literals may carry language and datatype metadata. The current readers only inspect `value`, but the optional fields
 * are documented so editor tooling can expose the complete shape when needed.
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
 * Named nodes represent IRIs and are used for references, type declarations, and URL-like graph links.
 *
 * @typedef {RdfTerm & {
 *   termType: "NamedNode";
 * }} RdfNamedNode
 */

/**
 * RDF term kinds accepted by the normalization helpers.
 *
 * Other RDF term kinds may exist in parsed input, but they must be rejected before reaching catalog node builders
 * unless a future accessor explicitly supports them.
 *
 * @typedef {"Literal" | "NamedNode"} SupportedTermType
 */

/**
 * Concrete term shape associated with a supported RDF term kind.
 *
 * @template {SupportedTermType} TTermType
 * @typedef {(
 *   TTermType extends "Literal" ? RdfLiteral
 *     : TTermType extends "NamedNode" ? RdfNamedNode
 *     : never
 * )} NarrowedRdfTerm
 */

/**
 * Configuration for the shared record-reader pipeline.
 *
 * The pipeline performs value selection, RDF term-kind validation, optional mapping, and optional deduplication.
 * Public accessors provide small configurations instead of duplicating that logic.
 *
 * @typedef {object} ReaderConfig
 * @property {SupportedTermType} termType Expected RDF term kind.
 * @property {(term: RdfLiteral | RdfNamedNode) => unknown} [map] Optional mapper from RDF term to catalog-level value.
 * @property {boolean} [dedupe] Whether mapped many-valued results should be deduplicated while preserving first-seen
 *   order.
 * @property {(record: BibliographyRecord, predicate: string) => string} [invalidTermMessage] Optional custom
 *   diagnostic for term-kind mismatches.
 */

/**
 * Grouped RDF data for a single subject.
 *
 * A bibliography record is the intermediate representation between RDF parsing and graph-node construction. All
 * objects associated with the same subject IRI are collected into `predicates`.
 *
 * ## Invariants
 *
 * - `iri` is the full subject IRI from the RDF source.
 * - `id` is the compact catalog-facing identifier derived from `iri`.
 * - `predicates` stores all encountered object terms keyed by predicate IRI.
 * - `order` preserves source-relative ordering for stable catalog output.
 * - `primaryType`, when assigned later, stores the selected graph-building type.
 *
 * Reader helpers assume this shape and do not mutate records.
 *
 * @typedef {object} BibliographyRecord
 * @property {string} iri Full subject IRI.
 * @property {string} id Compact catalog-facing identifier.
 * @property {Map<string, RdfTerm[]>} predicates Predicate-to-object-term index.
 * @property {number} order Source-relative order used for stable output.
 * @property {string} [primaryType] Preferred compact RDF type selected by the catalog builder.
 */

/**
 * Creates the grouped-record container used while accumulating RDF objects for one subject IRI.
 *
 * The parser-facing catalog builder fills `predicates` and updates `order`. The returned record is intentionally
 * minimal so normalization remains centralized in the reader helpers.
 *
 * @param {string} iri Full subject IRI.
 * @returns {BibliographyRecord} Empty grouped record for the given subject.
 */
export const createRecord = (iri) => ({
    iri,
    id: compactId(iri),
    predicates: new Map(),
    order: Number.MAX_SAFE_INTEGER,
});

/**
 * Returns all RDF object terms associated with a predicate.
 *
 * Missing predicates are represented as an empty array instead of `undefined`, which keeps the rest of the reader
 * pipeline simple and iterable.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @returns {RdfTerm[]} Predicate values in source order.
 */
const getPredicateValues = (record, predicate) =>
    record.predicates.get(predicate) ?? [];

/**
 * Selects an optional scalar value from a predicate that may appear at most once.
 *
 * This helper enforces scalar cardinality but does not validate the RDF term kind. Callers must pass the selected term
 * through {@link expectTermType} before reading its value.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {RdfTerm | undefined} The only predicate value, or `undefined` when absent.
 */
function selectOptionalOne(record, predicate, sourceLabel) {
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
 * Selects all values for a many-valued predicate.
 *
 * This helper performs no validation by itself. Term-kind validation and mapping happen in {@link many}.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @returns {RdfTerm[]} Predicate values in source order.
 */
const selectMany = (record, predicate) => getPredicateValues(record, predicate);

/**
 * Validates that an RDF term has the expected supported term kind.
 *
 * On success, the returned value is narrowed to the concrete term shape associated with `expectedTermType`. On 
 * failure, catalog construction stops with a source-labelled diagnostic.
 *
 * @template {SupportedTermType} TTermType
 * @param {BibliographyRecord} record Record that owns the term.
 * @param {string} predicate Predicate being read.
 * @param {RdfTerm} value RDF term to validate.
 * @param {TTermType} expectedTermType Expected RDF term kind.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @param {(record: BibliographyRecord, predicate: string) => string} [invalidTermMessage] Optional custom diagnostic 
 *   used when `value.termType` does not match `expectedTermType`.
 * @returns {NarrowedRdfTerm<TTermType>} The same term narrowed to the expected shape.
 */
function expectTermType(
    record,
    predicate,
    value,
    expectedTermType,
    sourceLabel,
    invalidTermMessage,
) {
    if (value.termType !== expectedTermType) {
        fail(
            sourceLabel,
            invalidTermMessage
                ? invalidTermMessage(record, predicate)
                : `node "${record.id}" expects a ${expectedTermType} for "${predicate}".`,
        );
    }

    return /** @type {NarrowedRdfTerm<TTermType>} */ (value);
}

/**
 * Applies a term mapper to already-validated terms.
 *
 * @template TValue
 * @template TMapped
 * @param {TValue[]} values Validated values.
 * @param {(value: TValue) => TMapped} map Mapper to apply.
 * @returns {TMapped[]} Mapped values in the same order.
 */
const applyMap = (values, map) => values.map((value) => map(value));

/**
 * Deduplicates values while preserving first-seen order.
 *
 * This is suitable for primitive mapped outputs such as compact IDs, tags, and compact type names.
 *
 * @template TValue
 * @param {TValue[]} values Values to deduplicate.
 * @returns {TValue[]} First occurrence of each value.
 */
const applyDedupe = (values) => Array.from(new Set(values));

/**
 * Reads an optional single RDF term and optionally maps it.
 *
 * This is the shared implementation behind scalar readers. It enforces optional scalar cardinality, validates the 
 * selected term kind, and then applies the configured mapper when present.
 *
 * @template {SupportedTermType} TTermType
 * @template TMapped
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {ReaderConfig & {
 *   termType: TTermType;
 *   map?: (term: NarrowedRdfTerm<TTermType>) => TMapped;
 * }} config Reader pipeline configuration.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {TMapped | NarrowedRdfTerm<TTermType> | undefined} Mapped value, narrowed term, or `undefined` when the 
 *   predicate is absent.
 */
function optionalOne(record, predicate, config, sourceLabel) {
    const value = selectOptionalOne(record, predicate, sourceLabel);
    if (value == null) return undefined;

    const term = expectTermType(
        record,
        predicate,
        value,
        config.termType,
        sourceLabel,
        config.invalidTermMessage,
    );
    return config.map ? config.map(term) : term;
}

/**
 * Reads zero or more RDF terms and optionally maps/deduplicates them.
 *
 * This is the shared implementation behind many-valued readers. It preserves source order before mapping and, when 
 * requested, preserves first-seen order after deduplication.
 *
 * @template {SupportedTermType} TTermType
 * @template TMapped
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {ReaderConfig & {
 *   termType: TTermType;
 *   map?: (term: NarrowedRdfTerm<TTermType>) => TMapped;
 * }} config Reader pipeline configuration.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {Array<TMapped | NarrowedRdfTerm<TTermType>>} Validated, optionally mapped values.
 */
function many(record, predicate, config, sourceLabel) {
    const terms = selectMany(record, predicate).map((value) =>
        expectTermType(
            record,
            predicate,
            value,
            config.termType,
            sourceLabel,
            config.invalidTermMessage,
        ),
    );
    const mapped = config.map ? applyMap(terms, config.map) : terms;
    return config.dedupe ? applyDedupe(mapped) : mapped;
}

/**
 * Reads an optional single literal as a string.
 *
 * Missing predicates return `undefined`. Multi-valued predicates and non-literal terms fail with a source-labelled 
 * validation error.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string | undefined} Literal lexical value, or `undefined` when absent.
 */
export const scalarLiteral = (record, predicate, sourceLabel) =>
    optionalOne(
        record,
        predicate,
        {
            termType: "Literal",
            map: (term) => term.value,
        },
        sourceLabel,
    );

/**
 * Reads an optional URL-valued literal as a string.
 *
 * This accessor intentionally does not validate or normalize URL syntax. It exists to make URL-like scalar reads 
 * explicit while preserving the current catalog policy.
 *
 * Missing predicates return `undefined`. Multi-valued predicates and non-literal terms fail with a source-labelled 
 * validation error.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string | undefined} URL literal value, or `undefined` when absent.
 */
export const scalarUrlLiteral = (record, predicate, sourceLabel) =>
    optionalOne(
        record,
        predicate,
        {
            termType: "Literal",
            map: (term) => term.value,
        },
        sourceLabel,
    );

/**
 * Reads an optional named-node URL reference and compacts it for catalog output.
 *
 * Use this for URL-like values represented as RDF named nodes rather than literals. Missing predicates return 
 * `undefined`. Multi-valued predicates and non-named-node terms fail with a source-labelled validation error.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string | undefined} Compact URL value, or `undefined` when absent.
 */
export const scalarUrlRef = (record, predicate, sourceLabel) =>
    optionalOne(
        record,
        predicate,
        {
            termType: "NamedNode",
            map: (term) => compactUrl(term.value),
        },
        sourceLabel,
    );

/**
 * Reads an optional single literal and parses it as an exact safe integer.
 *
 * The accepted lexical form is an optional leading minus sign followed by decimal digits. Values such as floats, 
 * scientific notation, empty strings, unsafe integers, multi-valued predicates, and non-literal terms fail at the 
 * normalization boundary.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {number | undefined} Parsed safe integer, or `undefined` when absent.
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
 * Reads zero or more named-node references as compact IDs.
 *
 * Duplicate compact IDs are removed after mapping while preserving first occurrence order. Missing predicates return 
 * an empty array. Non-named-node terms fail with a source-labelled validation error.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} predicate Predicate IRI.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string[]} Compact referenced node IDs in first-seen order.
 */
export const namedRefs = (record, predicate, sourceLabel) =>
    many(
        record,
        predicate,
        {
            termType: "NamedNode",
            map: (term) => compactId(term.value),
            dedupe: true,
        },
        sourceLabel,
    );

/**
 * Reads required RDF types as compact type names.
 *
 * Missing `rdf:type` is invalid for catalog records because top-level dispatch and relation validation depend on this 
 * normalized type set. Duplicate compact type names are removed while preserving first occurrence order.
 *
 * @param {BibliographyRecord} record Record to read from.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string[]} Compact RDF type names in first-seen order.
 */
export function getNodeTypes(record, sourceLabel) {
    const rawTypes = many(
        record,
        RDF_TYPE,
        {
            termType: "NamedNode",
            map: (term) => compactType(term.value),
            dedupe: true,
        },
        sourceLabel,
    );

    if (rawTypes.length === 0) {
        fail(sourceLabel, `node "${record.id}" is missing rdf:type.`);
    }

    return rawTypes;
}

/**
 * Reads usage tags as literal strings.
 *
 * Tags are read from `dibs:tag`, deduplicated in first-seen order, and returned as plain strings. Missing tags return 
 * an empty array; requiredness is enforced by the usage builder, not by this low-level reader.
 *
 * @param {BibliographyRecord} record Usage record to read from.
 * @param {string} sourceLabel Human-readable source label for diagnostics.
 * @returns {string[]} Usage tag literals in first-seen order.
 */
export const getUsageTagLiterals = (record, sourceLabel) =>
    many(
        record,
        `${DIBS}tag`,
        {
            termType: "Literal",
            map: (term) => term.value,
            dedupe: true,
            invalidTermMessage: (usageRecord) =>
                `usage "${usageRecord.id}" has a non-literal dibs:tag.`,
        },
        sourceLabel,
    );
