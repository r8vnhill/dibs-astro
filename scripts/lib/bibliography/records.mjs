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

import { compactId, compactType, compactUrl } from "./compact.mjs";
import { DIBS, RDF_TYPE } from "./constants.mjs";
import { fail } from "./validation.mjs";

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

export const createRecord = (iri) => ({
    iri,
    id: compactId(iri),
    predicates: new Map(),
    order: Number.MAX_SAFE_INTEGER,
});

const getPredicateValues = (record, predicate) => record.predicates.get(predicate) ?? [];

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

function getOptionalLiteral(record, predicate, sourceLabel) {
    const value = getOptionalSingleValue(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return expectTermType(record, predicate, value, "Literal", sourceLabel);
}

function getOptionalNamedNode(record, predicate, sourceLabel) {
    const value = getOptionalSingleValue(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return expectTermType(record, predicate, value, "NamedNode", sourceLabel);
}

const getNamedNodeValues = (record, predicate, sourceLabel) =>
    getPredicateValues(record, predicate).map((value) =>
        expectTermType(record, predicate, value, "NamedNode", sourceLabel)
    );

export const scalarLiteral = (record, predicate, sourceLabel) =>
    getOptionalLiteral(record, predicate, sourceLabel)?.value;

export const scalarUrlLiteral = (record, predicate, sourceLabel) =>
    getOptionalLiteral(record, predicate, sourceLabel)?.value;

export function scalarUrlRef(record, predicate, sourceLabel) {
    const value = getOptionalNamedNode(record, predicate, sourceLabel);
    if (value == null) return undefined;
    return compactUrl(value.value);
}

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

export const namedRefs = (record, predicate, sourceLabel) =>
    getNamedNodeValues(record, predicate, sourceLabel).map((value) => compactId(value.value));

export function getNodeTypes(record, sourceLabel) {
    const rawTypes = getNamedNodeValues(record, RDF_TYPE, sourceLabel);

    if (rawTypes.length === 0) {
        fail(sourceLabel, `node "${record.id}" is missing rdf:type.`);
    }

    return rawTypes.map((value) => compactType(value.value));
}

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
