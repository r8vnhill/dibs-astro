## Refactor `coursePaths` into a Nested Internal Path API

### Summary

Refactor `src/data/course-structure/paths.ts` from a flat map of string constants into a nested path tree that mirrors the course hierarchy. Introduce a small local `joinPath(base, segment)` helper for canonical path construction, and update the current internal consumers to use the new structure directly.

Treat this as a deliberate internal API break and perform it in a single pass, without transitional aliases or backward-compatibility shims.

### Goals

* Improve structural alignment between route definitions and course hierarchy.
* Reduce repetition in path construction.
* Make the exported path API easier to read, extend, and validate.
* Standardize naming before the structure grows further.
* Strengthen confidence in the refactor with focused invariant and mapping tests.

### Non-Goals

* Do not change public URLs unless a route rename is explicitly intended.
* Do not mix lesson metadata into `paths.ts`.
* Do not introduce a route DSL, class hierarchy, or unnecessary abstractions.
* Do not preserve the current flat API shape.

### Key Changes

* Replace repeated template literals with a local `joinPath(base, segment)` helper used only for canonical path composition.
* Reshape `coursePaths` into a nested object that reflects the actual course structure:

  * top-level roots such as `notes`
  * section objects with a `root` field
  * nested subsections such as `softwareLibraries.apiDesign` and `scripting.pipelines`
* Standardize naming during the refactor:

  * use `root` consistently for section roots
  * prefer descriptive, lesson-oriented leaf names
  * remove mixed naming conventions unless they are intentional and documented
* Export `type CoursePaths = typeof coursePaths` so internal consumers can depend on the new structure safely.
* Update the current internal callers in `index.ts` and `unit-1.ts` to use nested accessors.
* Keep raw path definitions separate from lesson titles, ordering, breadcrumbs, redirects, or navigation metadata.

### Proposed Shape

The new structure should favour locality and readability. For example:

```ts
export const coursePaths = {
  notes: "/notes",
  installation: "/notes/installation",
  softwareLibraries: {
    root: "/notes/software-libraries",
    artifactsTaxonomy: "/notes/software-libraries/artifacts-taxonomy",
    whatIsSoftwareLibraries: "/notes/software-libraries/what-is",
    taskAutomation: "/notes/software-libraries/task-automation",
    businessVsApp: "/notes/software-libraries/business-vs-app",
    domainModels: "/notes/software-libraries/domain-models",
    apiDesign: {
      root: "/notes/software-libraries/api-design",
      fundamentals: "/notes/software-libraries/api-design/fundamentals",
      evolution: "/notes/software-libraries/api-design/evolution",
    },
    buildSystems: {
      root: "/notes/software-libraries/build-systems",
      veritasIntro: "/notes/software-libraries/build-systems/veritas-1",
    },
  },
  scripting: {
    root: "/notes/scripting",
    help: "/notes/scripting/help",
    firstScript: "/notes/scripting/first-script",
    structuredOutput: "/notes/scripting/structured-output",
    shouldProcess: "/notes/scripting/should-process",
    errors: "/notes/scripting/errors",
    gitlabLab: "/notes/scripting/gitlab",
    pipelines: {
      root: "/notes/scripting/pipelines",
      pipelineAwareness: "/notes/scripting/pipelines/pipeline-aware",
      errors: "/notes/scripting/pipelines/errors",
      gitSubmodules: "/notes/scripting/pipelines/git-submodules",
    },
  },
} as const;
```

The exact leaf names can vary, but the structure should make grouping obvious and naming consistent.

### Implementation Details

* Use a small `joinPath(base, segment)` helper for construction consistency.
* Keep the implementation object-first and straightforward.
* Introduce a secondary helper such as `makeSection(...)` only if it clearly reduces duplication after the nested rewrite.
* Preserve all existing concrete URL strings unless a route rename is explicitly planned and coordinated.
* Keep grouping in `coursePaths` aligned with the grouping used by the course tree builder so structural locality stays consistent across modules.
* Keep `joinPath` local unless another module has a genuine need for the same abstraction.

### Migration Steps

1. Add `joinPath(base, segment)` and rewrite `paths.ts` into the nested structure.
2. Rename ambiguous keys as part of the same change, keeping URL values stable.
3. Export `CoursePaths` from the new object shape.
4. Update `index.ts` to consume the nested structure directly.
5. Update `unit-1.ts` to consume the nested structure directly.
6. Search for additional internal imports of flat keys and migrate them in the same pass.
7. Add or update tests only after the new structure is in place, so test expectations match the intended API.

### Test Plan

Add a Vitest suite that validates both concrete mappings and structural invariants.

#### Behavioural checks

* exposes canonical roots for major sections
* exposes nested subsection roots where expected
* resolves each current lesson path to the same URL string as before
* allows current internal consumers to read the expected nested paths

#### Table-driven checks

Use table-driven tests to verify expected nested key-to-path mappings for representative entries, especially:

* top-level roots
* one leaf per major section
* one nested subsection root
* one nested subsection leaf

#### Invariant checks

Flatten the tree and verify:

* every exported path starts with `/`
* no path contains `//`
* no duplicate path values exist
* every section object with children exposes a `root`
* every non-object leaf is a string

#### Helper tests

* Test `joinPath` only if it is exported or moved to a separately testable utility.
* Skip PBT unless the repository already uses a property-based testing library and there is existing testing infrastructure for it.

### Risks and Mitigations

* **Risk:** Hidden internal consumers may still rely on the flat shape.
  **Mitigation:** Run a repository-wide search for `coursePaths.` usages before and after the refactor.

* **Risk:** Renaming keys and restructuring in the same change may increase review difficulty.
  **Mitigation:** Keep URL values unchanged and make the PR description explicit about shape-only versus value changes.

* **Risk:** Over-abstracting a small config module.
  **Mitigation:** Prefer plain objects first; add helpers only when they clearly reduce repetition without obscuring the structure.

### Assumptions

* This is an internal-only refactor and may break the current flat object shape.
* Current consumers are limited to the `course-structure` area unless repository search reveals additional imports.
* URL strings are stable; the intended change is the structure of the API, naming consistency, and improved test coverage.

### Definition of Done

* `paths.ts` exports a nested `coursePaths` object and `CoursePaths` type.
* Current internal consumers compile against the new nested accessors.
* Existing URL strings remain unchanged unless explicitly intended otherwise.
* Vitest coverage exists for both mapping correctness and path invariants.
* No compatibility aliases remain from the old flat API.
