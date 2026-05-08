/**
 * @file graph/index.mjs --- Internal graph-package entrypoint for bibliography node builders.
 *
 * This module is the internal barrel for graph-construction code. Catalog orchestration imports graph builders from
 * here so the graph package exposes one cohesive entrypoint while keeping implementation details split across smaller
 * sibling modules.
 *
 * The root-level `bibliography-catalog-builder.graph.mjs` file re-exports this module as the stable compatibility
 * facade for tests and external script imports.
 *
 * The graph package is organized as follows:
 *
 * - `support.mjs` defines shared helper logic and builder-context contracts.
 * - `nodes.mjs` builds person, organization, website, creative-work, learning-resource, and reference nodes.
 * - `usage.mjs` builds usage nodes.
 * - `pending-revision.mjs` handles pending-revision state and pruning.
 *
 * Graph modules should receive normalized record data through `context.reader` instead of importing low-level record
 * accessors directly.
 */

import { CATEGORY_ORDER } from "../shared/constants.mjs";

export {
    buildCreativeWorkNode,
    buildLearningResourceNode,
    buildOrganizationNode,
    buildPersonNode,
    buildReferenceNode,
} from "./nodes.mjs";
export { buildUsageNode } from "./usage.mjs";

/**
 * Returns a deterministically sorted copy of graph nodes.
 *
 * Nodes are ordered first by the configured catalog category order and then by `@id`. Unknown categories are placed 
 * after known categories while still being sorted deterministically by identifier.
 *
 * The input array is never mutated. This keeps the helper safe for tests, snapshot comparisons, and callers that need 
 * to preserve pre-sort state.
 *
 * @param {Array<Record<string, unknown> & {
 *   "@id": string;
 *   "@type": string;
 * }>} graph Graph nodes to sort.
 * @returns {Array<Record<string, unknown> & {
 *   "@id": string;
 *   "@type": string;
 * }>} Sorted graph-node copy.
 */
export const sortGraphNodes = (graph) =>
    [...graph].sort((a, b) => {
        const categoryA = CATEGORY_ORDER[a["@type"]] ?? 99;
        const categoryB = CATEGORY_ORDER[b["@type"]] ?? 99;
        return categoryA - categoryB || a["@id"].localeCompare(b["@id"]);
    });
