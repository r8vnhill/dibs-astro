import fc from "fast-check";
import { DataFactory } from "n3";
import { describe, expect, it } from "vitest";
import { createCatalogReader } from "../../lib/bibliography/reader/catalog-reader.mjs";
import { SCHEMA } from "../../lib/bibliography/shared/constants.mjs";
import {
    createRecord,
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    scalarInteger,
    scalarLiteral,
    scalarUrlLiteral,
} from "../../lib/bibliography/reader/records.mjs";

const { literal, namedNode } = DataFactory;

const recordWith = (
    entries: Array<[string, ReturnType<typeof literal> | ReturnType<typeof namedNode>]>,
) => {
    const record = createRecord("https://dibs.ravenhill.cl/bibliography/ref/reader-test");

    for (const [predicate, value] of entries) {
        const bucket = record.predicates.get(predicate) ?? [];
        bucket.push(value);
        record.predicates.set(predicate, bucket);
    }

    return record;
};

describe("createCatalogReader", () => {
    describe("source binding", () => {
        it.each([
            [
                "scalarLiteral",
                (sourceLabel: string) => {
                    const record = recordWith([[`${SCHEMA}name`, literal("Reader Test")]]);
                    return [
                        createCatalogReader({ sourceLabel }).scalarLiteral(record, `${SCHEMA}name`),
                        scalarLiteral(record, `${SCHEMA}name`, sourceLabel),
                    ];
                },
            ],
            [
                "scalarUrlLiteral",
                (sourceLabel: string) => {
                    const record = recordWith([[
                        `${SCHEMA}url`,
                        literal("https://example.test/ref"),
                    ]]);
                    return [
                        createCatalogReader({ sourceLabel }).scalarUrlLiteral(
                            record,
                            `${SCHEMA}url`,
                        ),
                        scalarUrlLiteral(record, `${SCHEMA}url`, sourceLabel),
                    ];
                },
            ],
            [
                "scalarInteger",
                (sourceLabel: string) => {
                    const record = recordWith([[`${SCHEMA}pageStart`, literal("42")]]);
                    return [
                        createCatalogReader({ sourceLabel }).scalarInteger(
                            record,
                            `${SCHEMA}pageStart`,
                        ),
                        scalarInteger(record, `${SCHEMA}pageStart`, sourceLabel),
                    ];
                },
            ],
            [
                "namedRefs",
                (sourceLabel: string) => {
                    const record = recordWith([[
                        `${SCHEMA}author`,
                        namedNode("https://dibs.ravenhill.cl/bibliography/person/ada"),
                    ]]);
                    return [
                        createCatalogReader({ sourceLabel }).namedRefs(record, `${SCHEMA}author`),
                        namedRefs(record, `${SCHEMA}author`, sourceLabel),
                    ];
                },
            ],
        ])("%s delegates using the bound source label", (_methodName, readValues) => {
            const [actual, expected] = readValues("reader.test.ttl");

            expect(actual).toEqual(expected);
        });

        it("delegates node-type reads with the bound source label", () => {
            const sourceLabel = "reader-types.test.ttl";
            const record = recordWith([[
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                namedNode(`${SCHEMA}Book`),
            ]]);
            const reader = createCatalogReader({ sourceLabel });

            expect(reader.getNodeTypes(record)).toEqual(getNodeTypes(record, sourceLabel));
        });

        it("delegates usage-tag reads with the bound source label", () => {
            const sourceLabel = "reader-tags.test.ttl";
            const record = recordWith([[
                "https://dibs.ravenhill.cl/vocab#tag",
                literal("recommended"),
            ]]);
            const reader = createCatalogReader({ sourceLabel });

            expect(reader.getUsageTagLiterals(record)).toEqual(
                getUsageTagLiterals(record, sourceLabel),
            );
        });

        it("property: preserves arbitrary non-empty source labels in validation errors", () => {
            fc.assert(
                fc.property(fc.string({ minLength: 1 }), (sourceLabel) => {
                    const reader = createCatalogReader({ sourceLabel });
                    const record = createRecord(
                        "https://dibs.ravenhill.cl/bibliography/ref/missing-type",
                    );

                    try {
                        reader.getNodeTypes(record);
                    } catch (error) {
                        expect(error).toBeInstanceOf(Error);
                        expect((error as Error).message).toContain(`[${sourceLabel}]`);
                        return;
                    }

                    throw new Error("Expected missing rdf:type to fail.");
                }),
            );
        });

        it("returns a frozen facade", () => {
            expect(Object.isFrozen(createCatalogReader({ sourceLabel: "frozen.test.ttl" }))).toBe(
                true,
            );
        });
    });
});
