import {
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    scalarInteger,
    scalarLiteral,
    scalarUrlLiteral,
} from "./records.mjs";

export function createCatalogReader({ sourceLabel }) {
    return Object.freeze({
        scalarLiteral(record, predicate) {
            return scalarLiteral(record, predicate, sourceLabel);
        },

        scalarUrlLiteral(record, predicate) {
            return scalarUrlLiteral(record, predicate, sourceLabel);
        },

        scalarInteger(record, predicate) {
            return scalarInteger(record, predicate, sourceLabel);
        },

        namedRefs(record, predicate) {
            return namedRefs(record, predicate, sourceLabel);
        },

        getNodeTypes(record) {
            return getNodeTypes(record, sourceLabel);
        },

        getUsageTagLiterals(record) {
            return getUsageTagLiterals(record, sourceLabel);
        },
    });
}
