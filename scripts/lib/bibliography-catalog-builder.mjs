import { Parser } from "n3";
import { SITE_ORIGIN, REFERENCE_TYPES } from "./bibliography-catalog-builder.constants.mjs";
import {
    buildCreativeWorkNode,
    buildLearningResourceNode,
    buildOrganizationNode,
    buildPersonNode,
    buildReferenceNode,
    buildUsageNode,
    sortGraphNodes,
} from "./bibliography-catalog-builder.graph.mjs";
import { collectPendingRevisionState } from "./bibliography-catalog-builder.pending-revision.mjs";
import {
    createRecord,
    getNodeTypes,
    getUsageTagLiterals,
    namedRefs,
    scalarInteger,
    scalarLiteral,
    scalarUrlLiteral,
} from "./bibliography-catalog-builder.records.mjs";
import { ensureNodeCategory, fail } from "./bibliography-catalog-builder.validation.mjs";

export const buildCatalogArtifactFromTurtle = (
    ttl,
    options = {},
) => {
    const sourceLabel = options.sourceLabel ?? "catalog.graph.ttl";
    const parser = new Parser({ baseIRI: SITE_ORIGIN });
    const recordsByIri = new Map();
    let quadIndex = 0;

    for (const quad of parser.parse(ttl)) {
        if (quad.graph.termType !== "DefaultGraph") {
            fail(sourceLabel, "named graphs are not supported in the bibliography catalog.");
        }
        if (quad.subject.termType !== "NamedNode") {
            fail(sourceLabel, "blank node subjects are not supported in the bibliography catalog.");
        }
        if (quad.object.termType === "BlankNode") {
            fail(sourceLabel, `blank node object found on "${quad.subject.value}".`);
        }

        const record = recordsByIri.get(quad.subject.value) ?? createRecord(quad.subject.value);
        if (record.order === Number.MAX_SAFE_INTEGER) record.order = quadIndex;
        const bucket = record.predicates.get(quad.predicate.value) ?? [];
        bucket.push(quad.object);
        record.predicates.set(quad.predicate.value, bucket);
        recordsByIri.set(quad.subject.value, record);
        quadIndex += 1;
    }

    const recordsById = new Map(
        Array.from(recordsByIri.values(), (record) => [record.id, record]),
    );
    const { pendingOnlyLessonIds, pendingOnlyReferenceIds } = collectPendingRevisionState(
        recordsByIri,
        getNodeTypes,
        getUsageTagLiterals,
        namedRefs,
        sourceLabel,
    );
    const skippedPendingNodeIds = new Set();

    const guardNodeCategory = (records, id, allowedTypes, label, relationLabel) =>
        ensureNodeCategory(records, getNodeTypes, id, allowedTypes, label, relationLabel);

    const graph = [];

    for (const record of Array.from(recordsByIri.values()).sort((a, b) => a.order - b.order)) {
        const types = getNodeTypes(record, sourceLabel);
        const primaryType = types[0];
        record.primaryType = primaryType;

        if (primaryType === "Person") {
            graph.push(buildPersonNode(record, scalarLiteral, scalarUrlLiteral, sourceLabel));
            continue;
        }

        if (primaryType === "Organization" || primaryType === "CollegeOrUniversity") {
            graph.push(
                buildOrganizationNode(record, scalarLiteral, scalarUrlLiteral, fail, sourceLabel),
            );
            continue;
        }

        if (primaryType === "CreativeWork") {
            graph.push(
                buildCreativeWorkNode(
                    record,
                    recordsById,
                    scalarLiteral,
                    namedRefs,
                    guardNodeCategory,
                    fail,
                    sourceLabel,
                ),
            );
            continue;
        }

        if (REFERENCE_TYPES.has(primaryType)) {
            try {
                graph.push(
                    buildReferenceNode(
                        record,
                        recordsById,
                        scalarLiteral,
                        scalarUrlLiteral,
                        scalarInteger,
                        namedRefs,
                        guardNodeCategory,
                        fail,
                        sourceLabel,
                    ),
                );
            } catch (error) {
                if (pendingOnlyReferenceIds.has(record.id)) {
                    skippedPendingNodeIds.add(record.id);
                    continue;
                }
                throw error;
            }
            continue;
        }

        if (primaryType === "LearningResource") {
            graph.push(
                buildLearningResourceNode(record, scalarLiteral, scalarUrlLiteral, fail, sourceLabel),
            );
            continue;
        }

        if (primaryType === "dibs:ReferenceUsage") {
            const usageNode = buildUsageNode(
                record,
                recordsById,
                namedRefs,
                getUsageTagLiterals,
                getNodeTypes,
                guardNodeCategory,
                fail,
                skippedPendingNodeIds,
                sourceLabel,
            );
            if (usageNode) graph.push(usageNode);
            continue;
        }

        if (pendingOnlyReferenceIds.has(record.id) || pendingOnlyLessonIds.has(record.id)) {
            skippedPendingNodeIds.add(record.id);
            continue;
        }

        fail(sourceLabel, `node "${record.id}" has unsupported type "${primaryType}".`);
    }

    return {
        "@context": [
            "https://schema.org",
            {
                dibs: "https://dibs.ravenhill.cl/vocab#",
            },
        ],
        "@graph": sortGraphNodes(graph),
    };
};
