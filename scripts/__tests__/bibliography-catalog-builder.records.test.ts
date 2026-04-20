import { DataFactory } from "n3";
import { describe, expect, it } from "vitest";
import { RDF_TYPE, SCHEMA } from "../lib/bibliography-catalog-builder.constants.mjs";
import {
    createRecord,
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    scalarInteger,
    scalarLiteral,
    scalarUrlLiteral,
    scalarUrlRef,
} from "../lib/bibliography-catalog-builder.records.mjs";

const { literal, namedNode } = DataFactory;

const sourceLabel = "records.test.ttl";

const recordWith = (predicate, ...values) => {
    const record = createRecord("https://dibs.ravenhill.cl/bibliography/ref/example");
    if (values.length > 0) {
        record.predicates.set(predicate, values);
    }
    return record;
};

describe("bibliography-catalog-builder.records", () => {
    it("returns undefined for missing scalar predicates", () => {
        const record = createRecord("https://dibs.ravenhill.cl/bibliography/ref/example");

        expect(scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toBeUndefined();
        expect(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toBeUndefined();
        expect(scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel)).toBeUndefined();
        expect(scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toBeUndefined();
    });

    it("fails when a scalar predicate has multiple values", () => {
        const record = recordWith(`${SCHEMA}name`, literal("one"), literal("two"));

        expect(() => scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*multiple values/,
        );
    });

    it("fails when scalarLiteral receives a named node", () => {
        const record = recordWith(`${SCHEMA}name`, namedNode("https://dibs.ravenhill.cl/example"));

        expect(() => scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*expects a Literal/,
        );
    });

    it.each([
        ["0", 0],
        ["-1", -1],
        ["01", 1],
    ])("accepts exact integer lexemes like %s", (input, expected) => {
        const record = recordWith(`${SCHEMA}pageStart`, literal(input));

        expect(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toBe(expected);
    });

    it.each([
        "",
        "12abc",
        "1.2",
        "1e3",
    ])("rejects malformed integer lexemes like %s", (input) => {
        const record = recordWith(`${SCHEMA}pageStart`, literal(input));

        expect(() => scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*non-integer value/,
        );
    });

    it("rejects unsafe integers", () => {
        const record = recordWith(
            `${SCHEMA}pageStart`,
            literal(String(Number.MAX_SAFE_INTEGER + 1)),
        );

        expect(() => scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*unsafe integer/,
        );
    });

    it("compacts named references preserving insertion order", () => {
        const record = recordWith(
            `${SCHEMA}author`,
            namedNode("https://dibs.ravenhill.cl/bibliography/person/ada"),
            namedNode("https://dibs.ravenhill.cl/bibliography/org/acme"),
        );

        expect(namedRefs(record, `${SCHEMA}author`, sourceLabel)).toEqual([
            "person:ada",
            "org:acme",
        ]);
    });

    it("fails when namedRefs receives a literal", () => {
        const record = recordWith(`${SCHEMA}author`, literal("Ada"));

        expect(() => namedRefs(record, `${SCHEMA}author`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*expects a NamedNode/,
        );
    });

    it("fails when rdf:type is missing", () => {
        const record = createRecord("https://dibs.ravenhill.cl/bibliography/ref/example");

        expect(() => getNodeTypes(record, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*missing rdf:type/,
        );
    });

    it("compacts rdf:type values preserving insertion order", () => {
        const record = recordWith(
            RDF_TYPE,
            namedNode(`${SCHEMA}Book`),
            namedNode("https://dibs.ravenhill.cl/vocab#ReferenceUsage"),
        );

        expect(getNodeTypes(record, sourceLabel)).toEqual([
            "Book",
            "dibs:ReferenceUsage",
        ]);
    });

    it("reads usage tags as literals", () => {
        const record = recordWith(
            "https://dibs.ravenhill.cl/vocab#tag",
            literal("recommended"),
            literal("additional"),
        );

        expect(getUsageTagLiterals(record, sourceLabel)).toEqual([
            "recommended",
            "additional",
        ]);
    });

    it("fails when a usage tag is not a literal", () => {
        const record = recordWith(
            "https://dibs.ravenhill.cl/vocab#tag",
            namedNode("https://dibs.ravenhill.cl/tags/recommended"),
        );

        expect(() => getUsageTagLiterals(record, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*non-literal dibs:tag/,
        );
    });

    it("accepts literal URLs without compaction", () => {
        const record = recordWith(
            `${SCHEMA}url`,
            literal("https://example.com/resource"),
        );

        expect(scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel)).toBe(
            "https://example.com/resource",
        );
    });

    it("accepts named-node URLs and compacts site-local lesson URLs", () => {
        const record = recordWith(
            `${SCHEMA}url`,
            namedNode("https://dibs.ravenhill.cl/notes/lesson-a/"),
        );

        expect(scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toBe("/notes/lesson-a/");
    });

    it("fails when URL helpers receive the wrong RDF term type", () => {
        const literalRecord = recordWith(`${SCHEMA}url`, literal("https://example.com"));
        const nodeRecord = recordWith(`${SCHEMA}url`, namedNode("https://example.com"));

        expect(() => scalarUrlRef(literalRecord, `${SCHEMA}url`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*expects a NamedNode/,
        );
        expect(() => scalarUrlLiteral(nodeRecord, `${SCHEMA}url`, sourceLabel)).toThrow(
            /\[records\.test\.ttl\].*expects a Literal/,
        );
    });
});
