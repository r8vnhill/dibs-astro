/**
 * @fileoverview Public API barrel for graph building functions.
 *
 * This module re-exports the graph node builders and utilities from the `./bibliography/graph.mjs` internal module, 
 * providing a stable public API boundary for the bibliography catalog builder. The barrel export allows consumers to 
 * import from a simpler path (`bibliography-catalog-builder.graph`) while keeping the actual implementation organized 
 * in sub-modules.
 *
 * Exported functions build schema.org JSON-LD nodes from RDF bibliography records, with validation and filtering logic 
 * abstracted via GraphBuilderContext strategy objects.
 */

export * from "./bibliography/graph.mjs";
