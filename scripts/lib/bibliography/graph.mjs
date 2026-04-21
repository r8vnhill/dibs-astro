/**
 * @fileoverview Public facade for bibliography graph-node builders.
 *
 * The graph-building subsystem is implemented across focused sibling modules:
 *
 * - `graph.support.mjs` for shared helper logic and builder-context contracts
 * - `graph.nodes.mjs` for non-usage node builders
 * - `graph.usage.mjs` for usage-node assembly and pending-revision pruning
 *
 * This facade preserves the stable import surface used by the catalog builder
 * and tests.
 */

import { CATEGORY_ORDER } from "./constants.mjs";

export {
    buildCreativeWorkNode,
    buildLearningResourceNode,
    buildOrganizationNode,
    buildPersonNode,
    buildReferenceNode,
} from "./graph.nodes.mjs";
export { buildUsageNode } from "./graph.usage.mjs";

export const sortGraphNodes = (graph) =>
    [...graph].sort((a, b) => {
        const categoryA = CATEGORY_ORDER[a["@type"]] ?? 99;
        const categoryB = CATEGORY_ORDER[b["@type"]] ?? 99;
        return categoryA - categoryB || a["@id"].localeCompare(b["@id"]);
    });
