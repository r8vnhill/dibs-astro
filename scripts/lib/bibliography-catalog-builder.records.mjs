import { DIBS, RDF_TYPE } from "./bibliography-catalog-builder.constants.mjs";
import { compactId, compactType, compactUrl } from "./bibliography-catalog-builder.compact.mjs";
import { fail } from "./bibliography-catalog-builder.validation.mjs";

export const createRecord = (iri) => ({
    iri,
    id: compactId(iri),
    predicates: new Map(),
    order: Number.MAX_SAFE_INTEGER,
});

export const scalarLiteral = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    if (values.length === 0) return undefined;
    if (values.length > 1) {
        fail(sourceLabel, `node "${record.id}" has multiple values for "${predicate}".`);
    }
    const [value] = values;
    if (value.termType !== "Literal") {
        fail(sourceLabel, `node "${record.id}" expects a literal for "${predicate}".`);
    }
    return value.value;
};

export const scalarUrl = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    if (values.length === 0) return undefined;
    if (values.length > 1) {
        fail(sourceLabel, `node "${record.id}" has multiple values for "${predicate}".`);
    }
    const [value] = values;
    if (value.termType === "Literal") return value.value;
    if (value.termType === "NamedNode") return compactUrl(value.value);
    fail(sourceLabel, `node "${record.id}" has an unsupported URL value for "${predicate}".`);
};

export const scalarInteger = (record, predicate, sourceLabel) => {
    const value = scalarLiteral(record, predicate, sourceLabel);
    if (value == null) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        fail(sourceLabel, `node "${record.id}" has a non-integer value for "${predicate}".`);
    }
    return parsed;
};

export const namedRefs = (record, predicate, sourceLabel) => {
    const values = record.predicates.get(predicate) ?? [];
    return values.map((value) => {
        if (value.termType !== "NamedNode") {
            fail(sourceLabel, `node "${record.id}" expects a named node for "${predicate}".`);
        }
        return compactId(value.value);
    });
};

export const getNodeTypes = (record, sourceLabel) => {
    const rawTypes = record.predicates.get(RDF_TYPE) ?? [];
    if (rawTypes.length === 0) fail(sourceLabel, `node "${record.id}" is missing rdf:type.`);
    return rawTypes.map((value) => {
        if (value.termType !== "NamedNode") {
            fail(sourceLabel, `node "${record.id}" has a non-named rdf:type.`);
        }
        return compactType(value.value);
    });
};

export const getUsageTagLiterals = (record, sourceLabel) =>
    (record.predicates.get(`${DIBS}tag`) ?? []).map((value) => {
        if (value.termType !== "Literal") {
            fail(sourceLabel, `usage "${record.id}" has a non-literal dibs:tag.`);
        }
        return value.value;
    });
