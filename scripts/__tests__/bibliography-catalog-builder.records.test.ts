import fc from "fast-check";
import { DataFactory } from "n3";
import { describe, expect, it } from "vitest";
import { compactId, compactType } from "../lib/bibliography/compact.mjs";
import { DIBS, RDF_TYPE, SCHEMA } from "../lib/bibliography-catalog-builder.constants.mjs";
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
const referenceIri = "https://dibs.ravenhill.cl/bibliography/ref/example";
const usageTagPredicate = `${DIBS}tag`;

const recordWith = (predicate, ...values) => {
    const record = createRecord(referenceIri);
    if (values.length > 0) {
        record.predicates.set(predicate, values);
    }
    return record;
};

const firstSeen = (values) => Array.from(new Set(values));

const namedNodeTerm = (value) => namedNode(value);
const literalTerm = (value) => literal(value);

const namedRefIriArbitrary = fc.array(
    fc.constantFrom(
        "https://dibs.ravenhill.cl/bibliography/person/ada",
        "https://dibs.ravenhill.cl/bibliography/person/grace",
        "https://dibs.ravenhill.cl/bibliography/org/acme",
        "https://dibs.ravenhill.cl/bibliography/org/omega",
    ),
    { minLength: 1, maxLength: 8 },
);

const nodeTypeIriArbitrary = fc.array(
    fc.constantFrom(
        `${SCHEMA}Book`,
        `${SCHEMA}CreativeWork`,
        `${SCHEMA}LearningResource`,
        "https://dibs.ravenhill.cl/vocab#ReferenceUsage",
    ),
    { minLength: 1, maxLength: 8 },
);

describe("bibliography-catalog-builder.records", () => {
    describe("scalarLiteral", () => {
        it.each([
            {
                name: "returns undefined when the predicate is missing",
                values: [],
                expected: undefined,
            },
            {
                name: "returns the single literal value",
                values: [literalTerm("Ada Lovelace")],
                expected: "Ada Lovelace",
            },
        ])("$name", ({ values, expected }) => {
            const record = recordWith(`${SCHEMA}name`, ...values);

            expect(scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toBe(expected);
        });

        it("fails when a scalar predicate has multiple values", () => {
            const record = recordWith(`${SCHEMA}name`, literalTerm("one"), literalTerm("two"));

            expect(() => scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*multiple values/,
            );
        });

        it("fails when the value is not a literal", () => {
            const record = recordWith(`${SCHEMA}name`, namedNodeTerm("https://dibs.ravenhill.cl/example"));

            expect(() => scalarLiteral(record, `${SCHEMA}name`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a Literal/,
            );
        });
    });

    describe("scalarInteger", () => {
        it("returns undefined when the predicate is missing", () => {
            const record = createRecord(referenceIri);

            expect(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toBeUndefined();
        });

        it.each([
            ["0", 0],
            ["-1", -1],
            ["01", 1],
        ])("accepts safe integer lexemes like %s", (input, expected) => {
            const record = recordWith(`${SCHEMA}pageStart`, literalTerm(input));

            expect(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toBe(expected);
        });

        it.each([
            "",
            "12abc",
            "1.2",
            "1e3",
        ])("rejects malformed integer lexemes like %s", (input) => {
            const record = recordWith(`${SCHEMA}pageStart`, literalTerm(input));

            expect(() => scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*non-integer value/,
            );
        });

        it("rejects unsafe integers", () => {
            const record = recordWith(
                `${SCHEMA}pageStart`,
                literalTerm(String(Number.MAX_SAFE_INTEGER + 1)),
            );

            expect(() => scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*unsafe integer/,
            );
        });

        it("fails when the scalar value has the wrong RDF term type", () => {
            const record = recordWith(
                `${SCHEMA}pageStart`,
                namedNodeTerm("https://dibs.ravenhill.cl/page/10"),
            );

            expect(() => scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a Literal/,
            );
        });

        it("accepts any generated safe integer string and round-trips it to a number", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
                    (value) => {
                        const record = recordWith(
                            `${SCHEMA}pageStart`,
                            literalTerm(String(value)),
                        );

                        expect(scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel)).toBe(value);
                    },
                ),
            );
        });
    });

    describe("scalarUrlLiteral", () => {
        it.each([
            {
                name: "returns undefined when the predicate is missing",
                values: [],
                expected: undefined,
            },
            {
                name: "returns a literal URL string unchanged",
                values: [literalTerm("https://example.com/resource")],
                expected: "https://example.com/resource",
            },
        ])("$name", ({ values, expected }) => {
            const record = recordWith(`${SCHEMA}url`, ...values);

            expect(scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel)).toBe(expected);
        });

        it("fails when a scalar predicate has multiple values", () => {
            const record = recordWith(
                `${SCHEMA}url`,
                literalTerm("https://example.com/a"),
                literalTerm("https://example.com/b"),
            );

            expect(() => scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*multiple values/,
            );
        });

        it("fails when the value is not a literal", () => {
            const record = recordWith(`${SCHEMA}url`, namedNodeTerm("https://example.com/resource"));

            expect(() => scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a Literal/,
            );
        });
    });

    describe("scalarUrlRef", () => {
        it("returns undefined when the predicate is missing", () => {
            const record = createRecord(referenceIri);

            expect(scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toBeUndefined();
        });

        it("maps named-node URLs through compactUrl", () => {
            const record = recordWith(
                `${SCHEMA}url`,
                namedNodeTerm("https://dibs.ravenhill.cl/notes/lesson-a/"),
            );

            expect(scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toBe("/notes/lesson-a/");
        });

        it("fails when a scalar predicate has multiple values", () => {
            const record = recordWith(
                `${SCHEMA}url`,
                namedNodeTerm("https://example.com/a"),
                namedNodeTerm("https://example.com/b"),
            );

            expect(() => scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*multiple values/,
            );
        });

        it("fails when the value is not a named node", () => {
            const record = recordWith(`${SCHEMA}url`, literalTerm("https://example.com/resource"));

            expect(() => scalarUrlRef(record, `${SCHEMA}url`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a NamedNode/,
            );
        });
    });

    describe("namedRefs", () => {
        it("returns an empty list when the predicate is missing", () => {
            const record = createRecord(referenceIri);

            expect(namedRefs(record, `${SCHEMA}author`, sourceLabel)).toEqual([]);
        });

        it("maps named-node references through compactId preserving insertion order", () => {
            const record = recordWith(
                `${SCHEMA}author`,
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/person/ada"),
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/org/acme"),
            );

            expect(namedRefs(record, `${SCHEMA}author`, sourceLabel)).toEqual([
                "person:ada",
                "org:acme",
            ]);
        });

        it("deduplicates repeated named references while preserving first-seen order", () => {
            const record = recordWith(
                `${SCHEMA}author`,
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/person/ada"),
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/person/ada"),
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/org/acme"),
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/person/ada"),
            );

            expect(namedRefs(record, `${SCHEMA}author`, sourceLabel)).toEqual([
                "person:ada",
                "org:acme",
            ]);
        });

        it("fails when any value is not a named node", () => {
            const record = recordWith(
                `${SCHEMA}author`,
                namedNodeTerm("https://dibs.ravenhill.cl/bibliography/person/ada"),
                literalTerm("Ada"),
            );

            expect(() => namedRefs(record, `${SCHEMA}author`, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a NamedNode/,
            );
        });

        it("preserves first-seen order after deduplication when mapping compact IDs", () => {
            fc.assert(
                fc.property(namedRefIriArbitrary, (iris) => {
                    const record = recordWith(
                        `${SCHEMA}author`,
                        ...iris.map((iri) => namedNodeTerm(iri)),
                    );

                    expect(namedRefs(record, `${SCHEMA}author`, sourceLabel)).toEqual(
                        firstSeen(iris).map((iri) => compactId(iri)),
                    );
                }),
                { examples: [[[
                    "https://dibs.ravenhill.cl/bibliography/person/ada",
                    "https://dibs.ravenhill.cl/bibliography/person/ada",
                    "https://dibs.ravenhill.cl/bibliography/org/acme",
                ]]] },
            );
        });

        it("fails when a generated sequence includes a non-named-node value", () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom(
                        "https://dibs.ravenhill.cl/bibliography/person/ada",
                        "https://dibs.ravenhill.cl/bibliography/org/acme",
                    ), { minLength: 0, maxLength: 4 }),
                    fc.string({ minLength: 1, maxLength: 12 }),
                    fc.array(fc.constantFrom(
                        "https://dibs.ravenhill.cl/bibliography/person/grace",
                        "https://dibs.ravenhill.cl/bibliography/org/omega",
                    ), { minLength: 0, maxLength: 4 }),
                    (prefix, invalidLiteral, suffix) => {
                        const record = recordWith(
                            `${SCHEMA}author`,
                            ...prefix.map((iri) => namedNodeTerm(iri)),
                            literalTerm(invalidLiteral),
                            ...suffix.map((iri) => namedNodeTerm(iri)),
                        );

                        expect(() => namedRefs(record, `${SCHEMA}author`, sourceLabel)).toThrow(
                            /\[records\.test\.ttl\].*expects a NamedNode/,
                        );
                    },
                ),
            );
        });
    });

    describe("getNodeTypes", () => {
        it("fails when rdf:type is missing", () => {
            const record = createRecord(referenceIri);

            expect(() => getNodeTypes(record, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*missing rdf:type/,
            );
        });

        it("maps rdf:type values through compactType preserving insertion order", () => {
            const record = recordWith(
                RDF_TYPE,
                namedNodeTerm(`${SCHEMA}Book`),
                namedNodeTerm("https://dibs.ravenhill.cl/vocab#ReferenceUsage"),
            );

            expect(getNodeTypes(record, sourceLabel)).toEqual([
                "Book",
                "dibs:ReferenceUsage",
            ]);
        });

        it("deduplicates repeated rdf:type values while preserving first-seen order", () => {
            const record = recordWith(
                RDF_TYPE,
                namedNodeTerm(`${SCHEMA}Book`),
                namedNodeTerm(`${SCHEMA}Book`),
                namedNodeTerm("https://dibs.ravenhill.cl/vocab#ReferenceUsage"),
                namedNodeTerm(`${SCHEMA}Book`),
            );

            expect(getNodeTypes(record, sourceLabel)).toEqual([
                "Book",
                "dibs:ReferenceUsage",
            ]);
        });

        it("fails when any rdf:type value is not a named node", () => {
            const record = recordWith(RDF_TYPE, literalTerm("Book"));

            expect(() => getNodeTypes(record, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*expects a NamedNode/,
            );
        });

        it("preserves first-seen order after deduplication when mapping compact types", () => {
            fc.assert(
                fc.property(nodeTypeIriArbitrary, (iris) => {
                    const record = recordWith(
                        RDF_TYPE,
                        ...iris.map((iri) => namedNodeTerm(iri)),
                    );

                    expect(getNodeTypes(record, sourceLabel)).toEqual(
                        firstSeen(iris).map((iri) => compactType(iri)),
                    );
                }),
                { examples: [[[
                    `${SCHEMA}Book`,
                    `${SCHEMA}Book`,
                    "https://dibs.ravenhill.cl/vocab#ReferenceUsage",
                ]]] },
            );
        });
    });

    describe("getUsageTagLiterals", () => {
        it("returns an empty list when no dibs:tag values are present", () => {
            const record = createRecord(referenceIri);

            expect(getUsageTagLiterals(record, sourceLabel)).toEqual([]);
        });

        it("returns literal tags in insertion order", () => {
            const record = recordWith(
                usageTagPredicate,
                literalTerm("recommended"),
                literalTerm("additional"),
            );

            expect(getUsageTagLiterals(record, sourceLabel)).toEqual([
                "recommended",
                "additional",
            ]);
        });

        it("deduplicates repeated dibs:tag values while preserving first-seen order", () => {
            const record = recordWith(
                usageTagPredicate,
                literalTerm("recommended"),
                literalTerm("recommended"),
                literalTerm("additional"),
                literalTerm("recommended"),
            );

            expect(getUsageTagLiterals(record, sourceLabel)).toEqual([
                "recommended",
                "additional",
            ]);
        });

        it("fails when any usage tag is not a literal", () => {
            const record = recordWith(
                usageTagPredicate,
                namedNodeTerm("https://dibs.ravenhill.cl/tags/recommended"),
            );

            expect(() => getUsageTagLiterals(record, sourceLabel)).toThrow(
                /\[records\.test\.ttl\].*non-literal dibs:tag/,
            );
        });

        it("fails when a generated tag sequence includes a non-literal value", () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom("recommended", "additional"), {
                        minLength: 0,
                        maxLength: 4,
                    }),
                    fc.string({ minLength: 1, maxLength: 12 }),
                    fc.array(fc.constantFrom("recommended", "pending-revision"), {
                        minLength: 0,
                        maxLength: 4,
                    }),
                    (prefix, invalidIriSuffix, suffix) => {
                        const record = recordWith(
                            usageTagPredicate,
                            ...prefix.map((tag) => literalTerm(tag)),
                            namedNodeTerm(`https://dibs.ravenhill.cl/tags/${invalidIriSuffix}`),
                            ...suffix.map((tag) => literalTerm(tag)),
                        );

                        expect(() => getUsageTagLiterals(record, sourceLabel)).toThrow(
                            /\[records\.test\.ttl\].*non-literal dibs:tag/,
                        );
                    },
                ),
            );
        });
    });
});
