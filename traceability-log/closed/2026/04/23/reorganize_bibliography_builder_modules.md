# Reorganize Bibliography Builder Modules

## Summary

Reduce root-level clutter under `scripts/lib/bibliography/` by moving implementation files into focused
subdirectories while preserving the existing public facade imports.

This is a layout-only refactor. It should improve discoverability, clarify architectural boundaries,
and make future bibliography-builder work easier without changing catalog behavior.

The orchestration entrypoint remains:

```text
scripts/lib/bibliography/catalog-builder.mjs
```

The stable public compatibility facades remain at the root script level:

```text
scripts/lib/bibliography-catalog-builder.mjs
scripts/lib/bibliography-catalog-builder.records.mjs
scripts/lib/bibliography-catalog-builder.graph.mjs
scripts/lib/bibliography-catalog-builder.constants.mjs
scripts/lib/bibliography-catalog-builder.validation.mjs
```

## Design Goals

- Separate orchestration, reader normalization, graph construction, and shared constants.
- Preserve the current public import surface.
- Keep the refactor mechanical and low-risk.
- Avoid behavior changes in validation, normalization, URL handling, integer parsing, duplicate handling, and pending-revision logic.
- Make internal module boundaries easier to understand.
- Keep tests focused on public facades unless they intentionally verify internal implementation details.
- Preserve Phase 4 reader-facade changes instead of reverting or rewriting them.

## Non-Goals

- Do not redesign the catalog builder API.
- Do not rename public facade files.
- Do not change RDF parsing or graph-building semantics.
- Do not introduce path aliases unless the project already has a clear script-side convention for them.
- Do not merge reader and graph concerns.
- Do not introduce new runtime dependencies.
- Do not rewrite tests beyond import-path updates and small layout-regression checks.

## Proposed Final Layout

```text
scripts/lib/
  bibliography-catalog-builder.mjs
  bibliography-catalog-builder.records.mjs
  bibliography-catalog-builder.graph.mjs
  bibliography-catalog-builder.constants.mjs
  bibliography-catalog-builder.validation.mjs

  bibliography/
    catalog-builder.mjs

    shared/
      constants.mjs

    reader/
      catalog-reader.mjs
      compact.mjs
      records.mjs
      validation.mjs

    graph/
      index.mjs
      nodes.mjs
      support.mjs
      usage.mjs
      pending-revision.mjs
```

## Module Responsibilities

### `bibliography/catalog-builder.mjs`

Owns catalog orchestration:

- parse input;
- create records;
- create the source-bound reader;
- dispatch records to graph builders;
- assemble the final catalog artifact;
- coordinate pending-revision handling.

It should not contain low-level record normalization or graph-node construction details.

### `bibliography/shared/constants.mjs`

Owns constants shared by multiple implementation layers:

- RDF constants;
- schema constants;
- DIBS namespace constants;
- reusable catalog constant values.

Keep this module dependency-light. It should not import from `reader/` or `graph/`.

### `bibliography/reader/*`

Owns RDF-record reading and normalization:

```text
reader/catalog-reader.mjs
reader/compact.mjs
reader/records.mjs
reader/validation.mjs
```

Responsibilities:

- compact IRIs and URLs;
- create and read bibliography records;
- validate low-level RDF term shapes;
- expose the source-bound reader facade;
- keep normalization policy centralised.

Reader modules may import from:

```text
../shared/constants.mjs
```

Reader modules should not import from:

```text
../graph/*
```

### `bibliography/graph/*`

Owns graph-node construction and graph-level validation:

```text
graph/index.mjs
graph/nodes.mjs
graph/support.mjs
graph/usage.mjs
graph/pending-revision.mjs
```

Responsibilities:

- build catalog nodes;
- validate graph relationships;
- enforce required graph-level fields;
- handle usage-node construction;
- handle pending-revision graph decisions.

Graph modules may import from:

```text
../shared/constants.mjs
../reader/catalog-reader.mjs // only if a type/helper is truly needed
```

Prefer receiving `context.reader` instead of importing low-level record accessors directly.

## Public Facade Contract

The root-level facade files remain the stable import surface.

### `bibliography-catalog-builder.mjs`

Re-export the main catalog builder API from:

```text
./bibliography/catalog-builder.mjs
```

### `bibliography-catalog-builder.records.mjs`

Re-export record/reader low-level APIs from:

```text
./bibliography/reader/records.mjs
```

If existing tests or scripts import compacting helpers through this facade, keep those exports too.
Otherwise, do not widen the public surface.

### `bibliography-catalog-builder.graph.mjs`

Re-export graph builder APIs from:

```text
./bibliography/graph/index.mjs
```

### `bibliography-catalog-builder.constants.mjs`

Re-export constants from:

```text
./bibliography/shared/constants.mjs
```

### `bibliography-catalog-builder.validation.mjs`

Re-export validation helpers from:

```text
./bibliography/reader/validation.mjs
```

If graph-level validation later deserves its own module, split that in a future phase. For this
phase, preserve the current public behavior.

## Implementation Plan

### 1. Create the New Directories

Create:

```text
scripts/lib/bibliography/shared/
scripts/lib/bibliography/reader/
scripts/lib/bibliography/graph/
```

Do not delete old files until imports are updated and tests pass.

### 2. Move Shared Constants First

Move:

```text
scripts/lib/bibliography/constants.mjs
```

to:

```text
scripts/lib/bibliography/shared/constants.mjs
```

Update internal imports to use:

```js
import { ... } from "../shared/constants.mjs";
```

or from `./shared/constants.mjs` in `catalog-builder.mjs`.

Update the root facade:

```js
export * from "./bibliography/shared/constants.mjs";
```

### 3. Move Reader Modules

Move:

```text
scripts/lib/bibliography/catalog-reader.mjs
scripts/lib/bibliography/compact.mjs
scripts/lib/bibliography/records.mjs
scripts/lib/bibliography/validation.mjs
```

to:

```text
scripts/lib/bibliography/reader/catalog-reader.mjs
scripts/lib/bibliography/reader/compact.mjs
scripts/lib/bibliography/reader/records.mjs
scripts/lib/bibliography/reader/validation.mjs
```

Update imports inside reader modules:

```js
import { DIBS, RDF_TYPE } from "../shared/constants.mjs";
import { compactId } from "./compact.mjs";
import { fail } from "./validation.mjs";
```

Update imports from `catalog-builder.mjs`:

```js
import { createCatalogReader } from "./reader/catalog-reader.mjs";
import { createRecord, getNodeTypes } from "./reader/records.mjs";
```

Adjust exact imports to match the current code.

### 4. Move Graph Modules

Move:

```text
scripts/lib/bibliography/graph.mjs
scripts/lib/bibliography/graph.nodes.mjs
scripts/lib/bibliography/graph.support.mjs
scripts/lib/bibliography/graph.usage.mjs
scripts/lib/bibliography/pending-revision.mjs
```

to:

```text
scripts/lib/bibliography/graph/index.mjs
scripts/lib/bibliography/graph/nodes.mjs
scripts/lib/bibliography/graph/support.mjs
scripts/lib/bibliography/graph/usage.mjs
scripts/lib/bibliography/graph/pending-revision.mjs
```

Recommended mapping:

```text
graph.mjs              -> graph/index.mjs
graph.nodes.mjs        -> graph/nodes.mjs
graph.support.mjs      -> graph/support.mjs
graph.usage.mjs        -> graph/usage.mjs
pending-revision.mjs   -> graph/pending-revision.mjs
```

Update graph imports to use local sibling paths:

```js
import { ... } from "./support.mjs";
import { ... } from "./nodes.mjs";
import { ... } from "./usage.mjs";
import { ... } from "./pending-revision.mjs";
import { ... } from "../shared/constants.mjs";
```

Avoid importing from root-level public facades inside implementation modules. Internal modules should
depend on nearby implementation paths, not compatibility facades.

### 5. Update `catalog-builder.mjs`

Update orchestration imports to the new layout:

```js
import { createCatalogReader } from "./reader/catalog-reader.mjs";
import { createRecord } from "./reader/records.mjs";
import { buildGraphNodes } from "./graph/index.mjs";
import { collectPendingRevisionState } from "./graph/pending-revision.mjs";
import { ... } from "./shared/constants.mjs";
```

Preserve the orchestration role of this file. Do not use the layout refactor as an opportunity to
change builder behavior.

### 6. Update Public Facades

Update the root-level facade files so existing imports continue to work.

Example:

```js
export * from "./bibliography/reader/records.mjs";
```

and:

```js
export * from "./bibliography/graph/index.mjs";
```

Run facade-focused tests or import smoke tests after this step.

### 7. Update Tests

Prefer existing public facades in tests unless the test intentionally targets an internal module.

Update internal implementation tests as follows:

```text
catalog-reader tests -> ../lib/bibliography/reader/catalog-reader.mjs
compact tests        -> ../lib/bibliography/reader/compact.mjs
records tests        -> ../lib/bibliography/reader/records.mjs, only if they are low-level tests
graph internals      -> ../lib/bibliography/graph/*.mjs, only when intentionally testing internals
```

Keep tests that already import from these facades unchanged:

```text
bibliography-catalog-builder*.mjs
```

This protects the public import surface from accidental breakage.

### 8. Add Import-Surface Regression Coverage

Add a small import smoke test if one does not already exist.

Suggested test:

```js
describe("bibliography public facades", () => {
  it("exports the catalog builder facade", async () => {
    const module = await import("../lib/bibliography-catalog-builder.mjs");
    expect(module).toHaveProperty("buildCatalogArtifactFromTurtle");
  });

  it("exports the records facade", async () => {
    const module = await import("../lib/bibliography-catalog-builder.records.mjs");
    expect(module).toHaveProperty("createRecord");
  });

  it("exports the graph facade", async () => {
    const module = await import("../lib/bibliography-catalog-builder.graph.mjs");
    expect(module).toHaveProperty("buildReferenceNode");
  });
});
```

Adjust export names to match the real public API.

This test is cheap and prevents future layout changes from silently breaking compatibility imports.

### 9. Update Documentation

Update `src/data/bibliography/README.md` and any architecture notes that mention the old flat layout.

Document the new grouping:

```text
reader/  - RDF record normalization and source-bound reader facade
graph/   - catalog graph-node construction and relation validation
shared/  - constants shared by reader, graph, and orchestration
```

Also document that root-level `bibliography-catalog-builder*.mjs` files are compatibility/public
facades and should remain the preferred import path for most script consumers.

## Import Rules After the Refactor

Use these rules to keep the layout clean.

### Allowed

Implementation modules may import nearby implementation modules:

```js
import { compactId } from "./compact.mjs";
import { DIBS } from "../shared/constants.mjs";
import { buildReferenceNode } from "./nodes.mjs";
```

Public scripts and most tests may import public facades:

```js
import { buildCatalogArtifactFromTurtle } from "../lib/bibliography-catalog-builder.mjs";
```

### Avoid

Avoid implementation modules importing from root public facades:

```js
import { createRecord } from "../bibliography-catalog-builder.records.mjs";
```

This creates indirect dependencies and makes the implementation graph harder to reason about.

### Forbidden After Completion

No internal code should import old root-level implementation paths such as:

```js
./records.mjs
./compact.mjs
./validation.mjs
./constants.mjs
./graph.mjs
./graph.nodes.mjs
./graph.support.mjs
./graph.usage.mjs
./pending-revision.mjs
```

## Test Plan

Run the focused bibliography script suite:

```sh
pnpm vitest run scripts/__tests__
```

Run import/layout searches:

```sh
rg 'from "\./(records|compact|validation|constants|catalog-reader|graph|graph\.nodes|graph\.support|graph\.usage|pending-revision)\.mjs"' scripts/lib/bibliography
```

```sh
rg 'scripts/lib/bibliography/(records|compact|validation|constants|catalog-reader|graph\.nodes|graph\.support|graph\.usage|pending-revision)\.mjs' .
```

Also search for relative parent imports that may now be stale:

```sh
rg 'from "\.\./(records|compact|validation|constants|catalog-reader|graph|graph\.nodes|graph\.support|graph\.usage|pending-revision)\.mjs"' scripts/lib/bibliography
```

Run an import smoke check through the public facades:

```sh
node -e "import('./scripts/lib/bibliography-catalog-builder.mjs').then(() => console.log('catalog facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.records.mjs').then(() => console.log('records facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.graph.mjs').then(() => console.log('graph facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.constants.mjs').then(() => console.log('constants facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.validation.mjs').then(() => console.log('validation facade ok'))"
```

If the project has a lint/check command for scripts, run it too:

```sh
pnpm exec eslint scripts
```

or the project-specific equivalent.

## Acceptance Criteria

This phase is complete when:

- implementation files live under `reader/`, `graph/`, and `shared/`;
- `catalog-builder.mjs` remains the orchestration entrypoint;
- all internal imports point to the new paths;
- public root-level facades continue to work;
- tests prefer public facades unless they intentionally test internals;
- documentation describes the new layout;
- old root-level implementation imports are gone;
- bibliography tests pass;
- import smoke checks pass;
- no behavior, validation, normalization, URL, integer, duplicate, or pending-revision policy changes are introduced.

## Implementation Notes

- Moved implementation modules into `reader/`, `graph/`, and `shared/`, leaving
  `catalog-builder.mjs` as the only root-level implementation file under `scripts/lib/bibliography/`.
- Updated public facades so existing `bibliography-catalog-builder*.mjs` imports continue to work.
- Updated internal implementation imports to use the new nearby paths instead of compatibility
  facades.
- Updated implementation-focused tests that import internals, while preserving existing facade
  imports in behavior-oriented tests.
- Added `scripts/__tests__/bibliography-public-facades.test.ts` to lock the public facade import
  surface.
- Updated `src/data/bibliography/README.md` with the new `reader/`, `graph/`, and `shared/`
  responsibilities.

## Verification

Passed:

```sh
pnpm vitest run scripts/__tests__
node -e "import('./scripts/lib/bibliography-catalog-builder.mjs').then(() => console.log('catalog facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.records.mjs').then(() => console.log('records facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.graph.mjs').then(() => console.log('graph facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.constants.mjs').then(() => console.log('constants facade ok'))"
node -e "import('./scripts/lib/bibliography-catalog-builder.validation.mjs').then(() => console.log('validation facade ok'))"
```

Layout checks passed:

```sh
rg 'from "\./(constants|catalog-reader|graph|graph\.nodes|graph\.support|graph\.usage|pending-revision)\.mjs"' scripts/lib/bibliography
rg 'from "\.\./(records|compact|validation|constants|catalog-reader|graph|graph\.nodes|graph\.support|graph\.usage|pending-revision)\.mjs"' scripts/lib/bibliography
```

Both searches returned no matches. `Get-ChildItem scripts/lib/bibliography -File` shows only
`catalog-builder.mjs` at the implementation root.

## Risks and Mitigations

### Risk: Public import compatibility breaks

Mitigation: keep root-level facade files and add import smoke tests for each facade.

### Risk: Internal modules accidentally import public facades

Mitigation: use `rg` checks and document import rules. Implementation modules should import nearby
implementation files directly.

### Risk: The refactor mixes layout changes with behavior changes

Mitigation: keep commits small and mechanical. Move files, update imports, run tests. Avoid changing
logic unless required by the move.

### Risk: Test imports become inconsistent

Mitigation: use public facades for behaviour-oriented tests and internal paths only for
implementation-focused tests.

### Risk: Relative paths become hard to maintain

Mitigation: keep the directory depth shallow. Do not introduce additional nested folders unless a
clear new boundary appears.

## Suggested Commit Breakdown

1. Move constants into `shared/` and update imports.
2. Move reader modules into `reader/` and update imports/facades.
3. Move graph modules into `graph/` and update imports/facades.
4. Update tests and add facade import smoke coverage.
5. Update documentation and run layout searches.

This sequence keeps each commit reviewable and makes failures easier to isolate.

## Assumptions

- This is a layout refactor only.
- Existing Phase 4 reader-facade changes are preserved.
- Root-level compatibility facades remain the stable import surface.
- No public export names are removed.
- No new runtime dependency is needed.
- Current tests are sufficient to detect accidental behavior changes once import paths are fixed.
