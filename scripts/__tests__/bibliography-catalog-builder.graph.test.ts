import { DataFactory } from "n3";
import { describe, expect, it } from "vitest";
import { DIBS, SCHEMA } from "../lib/bibliography-catalog-builder.constants.mjs";
import {
    buildCreativeWorkNode,
    buildLearningResourceNode,
    buildOrganizationNode,
    buildReferenceNode,
    buildUsageNode,
    sortGraphNodes,
} from "../lib/bibliography-catalog-builder.graph.mjs";
import {
    createRecord,
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    scalarInteger,
    scalarLiteral,
    scalarUrlLiteral,
} from "../lib/bibliography-catalog-builder.records.mjs";
import {
    abortValidation,
    ensureNodeCategory,
} from "../lib/bibliography-catalog-builder.validation.mjs";
import { createCatalogReader } from "../lib/bibliography/catalog-reader.mjs";

const { literal, namedNode } = DataFactory;

const sourceLabel = "graph.test.ttl";

const iriFor = (kind: string, id: string) => {
    if (kind === "lesson") return `https://dibs.ravenhill.cl/notes/${id}/`;
    return `https://dibs.ravenhill.cl/bibliography/${kind}/${id}`;
};

const recordWith = (
    kind: string,
    id: string,
    primaryType: string,
    entries: Array<[string, ReturnType<typeof literal> | ReturnType<typeof namedNode>]>,
) => {
    const record = createRecord(iriFor(kind, id));
    record.primaryType = primaryType;

    for (const [predicate, value] of entries) {
        const bucket = record.predicates.get(predicate) ?? [];
        bucket.push(value);
        record.predicates.set(predicate, bucket);
    }

    return record;
};

const createContext = (recordsById = new Map()) => ({
    recordsById,
    reader: createCatalogReader({ sourceLabel }),
    scalarLiteral,
    scalarUrlLiteral,
    scalarInteger,
    namedRefs,
    getUsageTagLiterals,
    getNodeTypes,
    ensureNodeCategory: (records, id, allowedTypes, label, relationLabel) =>
        ensureNodeCategory(records, getNodeTypes, id, allowedTypes, label, relationLabel),
    abort: abortValidation,
    skippedPendingNodeIds: new Set<string>(),
    sourceLabel,
});

describe("bibliography-catalog-builder.graph", () => {
    it("sortGraphNodes returns a sorted copy without mutating the input", () => {
        const original = [
            { "@id": "usage:b", "@type": "dibs:ReferenceUsage" },
            { "@id": "person:a", "@type": "Person" },
            { "@id": "/notes/lesson-a/", "@type": "LearningResource" },
        ];

        const sorted = sortGraphNodes(original);

        expect(sorted).toEqual([
            { "@id": "person:a", "@type": "Person" },
            { "@id": "/notes/lesson-a/", "@type": "LearningResource" },
            { "@id": "usage:b", "@type": "dibs:ReferenceUsage" },
        ]);
        expect(original).toEqual([
            { "@id": "usage:b", "@type": "dibs:ReferenceUsage" },
            { "@id": "person:a", "@type": "Person" },
            { "@id": "/notes/lesson-a/", "@type": "LearningResource" },
        ]);
        expect(sortGraphNodes(sorted)).toEqual(sorted);
    });

    it.each([
        [
            "organization",
            () =>
                buildOrganizationNode(
                    recordWith("org", "acme", "Organization", []),
                    createContext(),
                ),
            /organization "org:acme" is missing schema:name/,
        ],
        [
            "reference",
            () => buildReferenceNode(recordWith("ref", "chapter", "Book", []), createContext()),
            /reference "ref:chapter" is missing schema:name/,
        ],
        [
            "lesson",
            () =>
                buildLearningResourceNode(
                    recordWith("lesson", "lesson-a", "LearningResource", []),
                    createContext(),
                ),
            /lesson "\/notes\/lesson-a\/" is missing schema:name/,
        ],
    ])(
        "fails when required schema:name is missing for %s nodes",
        (_label, buildNode, errorPattern) => {
            expect(buildNode).toThrow(errorPattern);
        },
    );

    it("omits optional creative-work fields when authors and publisher are absent", () => {
        const record = recordWith("work", "book", "CreativeWork", [
            [`${SCHEMA}name`, literal("Foundations")],
        ]);

        expect(buildCreativeWorkNode(record, createContext())).toEqual({
            "@id": "work:book",
            "@type": "CreativeWork",
            name: "Foundations",
        });
    });

    it("validates author, publisher, and isPartOf relation categories for references", () => {
        const author = recordWith("person", "ada", "Person", [
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", namedNode(`${SCHEMA}Person`)],
        ]);
        const publisher = recordWith("org", "acme", "Organization", [
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", namedNode(`${SCHEMA}Organization`)],
        ]);
        const work = recordWith("work", "book", "CreativeWork", [
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", namedNode(`${SCHEMA}CreativeWork`)],
        ]);
        const reference = recordWith("ref", "chapter", "Book", [
            [`${SCHEMA}name`, literal("Chapter One")],
            [`${SCHEMA}author`, namedNode("https://dibs.ravenhill.cl/bibliography/person/ada")],
            [`${SCHEMA}publisher`, namedNode("https://dibs.ravenhill.cl/bibliography/org/acme")],
            [`${SCHEMA}isPartOf`, namedNode("https://dibs.ravenhill.cl/bibliography/work/book")],
        ]);
        const recordsById = new Map([
            [author.id, author],
            [publisher.id, publisher],
            [work.id, work],
            [reference.id, reference],
        ]);

        expect(buildReferenceNode(reference, createContext(recordsById))).toEqual({
            "@id": "ref:chapter",
            "@type": "Book",
            name: "Chapter One",
            author: [{ "@id": "person:ada" }],
            publisher: { "@id": "org:acme" },
            isPartOf: { "@id": "work:book" },
        });
    });

    it("fails when a reference relation points to a disallowed category", () => {
        const invalidPublisher = recordWith("person", "ada", "Person", [
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", namedNode(`${SCHEMA}Person`)],
        ]);
        const reference = recordWith("ref", "chapter", "Book", [
            [`${SCHEMA}name`, literal("Chapter One")],
            [`${SCHEMA}publisher`, namedNode("https://dibs.ravenhill.cl/bibliography/person/ada")],
        ]);
        const recordsById = new Map([
            [invalidPublisher.id, invalidPublisher],
            [reference.id, reference],
        ]);

        expect(() => buildReferenceNode(reference, createContext(recordsById))).toThrow(
            /reference "ref:chapter" publisher.*invalid type "Person"/,
        );
    });

    it("deduplicates usage tags while preserving first-occurrence order", () => {
        const lesson = recordWith("lesson", "lesson-a", "LearningResource", [
            [
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                namedNode(`${SCHEMA}LearningResource`),
            ],
        ]);
        const reference = recordWith("ref", "a", "Book", [
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", namedNode(`${SCHEMA}Book`)],
        ]);
        const usage = recordWith("usage", "a", "dibs:ReferenceUsage", [
            [`${DIBS}lesson`, namedNode("https://dibs.ravenhill.cl/notes/lesson-a/")],
            [`${DIBS}reference`, namedNode("https://dibs.ravenhill.cl/bibliography/ref/a")],
            [`${DIBS}tag`, literal("recommended")],
            [`${DIBS}tag`, literal("recommended")],
            [`${DIBS}tag`, literal("additional")],
        ]);
        const recordsById = new Map([
            [lesson.id, lesson],
            [reference.id, reference],
            [usage.id, usage],
        ]);

        expect(buildUsageNode(usage, createContext(recordsById))).toEqual({
            "@id": "usage:a",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:a" },
            "dibs:tags": ["recommended", "additional"],
        });
    });

    it.each([
        [
            "missing referenced node",
            new Map(),
            new Set<string>(),
        ],
        [
            "skipped referenced node",
            new Map([
                [
                    "/notes/lesson-a/",
                    recordWith("lesson", "lesson-a", "LearningResource", [
                        [
                            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            namedNode(`${SCHEMA}LearningResource`),
                        ],
                    ]),
                ],
                [
                    "ref:a",
                    recordWith("ref", "a", "MediaObject", [
                        [
                            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            namedNode(`${SCHEMA}MediaObject`),
                        ],
                    ]),
                ],
            ]),
            new Set(["ref:a"]),
        ],
        [
            "unsupported referenced type",
            new Map([
                [
                    "/notes/lesson-a/",
                    recordWith("lesson", "lesson-a", "LearningResource", [
                        [
                            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            namedNode(`${SCHEMA}LearningResource`),
                        ],
                    ]),
                ],
                [
                    "ref:a",
                    recordWith("ref", "a", "MediaObject", [
                        [
                            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            namedNode(`${SCHEMA}MediaObject`),
                        ],
                    ]),
                ],
            ]),
            new Set<string>(),
        ],
    ])(
        "returns null for pending-revision usages when %s",
        (_label, recordsById, skippedPendingNodeIds) => {
            const usage = recordWith("usage", "pending", "dibs:ReferenceUsage", [
                [`${DIBS}lesson`, namedNode("https://dibs.ravenhill.cl/notes/lesson-a/")],
                [`${DIBS}reference`, namedNode("https://dibs.ravenhill.cl/bibliography/ref/a")],
                [`${DIBS}tag`, literal("pending-revision")],
            ]);

            expect(buildUsageNode(usage, {
                ...createContext(recordsById),
                skippedPendingNodeIds,
            })).toBeNull();
        },
    );
});
