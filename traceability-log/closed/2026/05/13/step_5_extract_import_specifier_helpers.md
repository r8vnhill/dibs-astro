## [DONE] Step 5 — Extract Import-Specifier Helpers

### Status

Complete. The import-specifier helpers now live in `scripts/lib/layer-boundary-import-specifiers.mjs`, and `scripts/lib/layer-boundary-classification.mjs` delegates to that module while preserving the public classifier API.

### Summary

Implement the helper module introduced by Steps 3 and 4 by extracting only import-specifier classification logic from `scripts/lib/layer-boundary-classification.mjs` into `scripts/lib/layer-boundary-import-specifiers.mjs`.

This step should be a **narrow, behaviour-preserving refactor**. It should make the focused helper tests green without changing path normalization, source-layer classification, resolved-target classification, rule evaluation, or architecture-checker semantics.

### Scope

#### In scope

* Create `scripts/lib/layer-boundary-import-specifiers.mjs`.
* Move import-specifier helpers into the new module.
* Update `scripts/lib/layer-boundary-classification.mjs` to import/delegate to the helper module.
* Preserve the existing public classifier API.
* Keep existing compatibility quirks pinned by the tests.
* Update traceability notes to mark Step 5 complete after verification.

#### Out of scope

* Do not change layer-boundary rules.
* Do not refactor `SOURCE_LAYERS`, `TARGETS`, `normalizeProjectPath()`, `classifySourcePath()`, or `classifyResolvedTarget()`.
* Do not introduce declarative rule tables yet.
* Do not rename public result fields.
* Do not remove the empty-string compatibility behaviour.
* Do not fix unrelated Vitest timeouts or broad-suite failures unless they are caused by this extraction.

---

## Key Changes

### 1. Create the new helper module

Create:

```text
scripts/lib/layer-boundary-import-specifiers.mjs
```

Move only import-specifier-related logic into it:

```js
scopedPackagePattern
isRelativeImport
isProjectAliasImport
isBarePackageImport
extractImportPath
classifyImportKind
packageNameFromImportPath
classifyPackageImport
classifyUnresolvedImport
```

The new module should own:

* extracting an import path from an unresolved target object;
* distinguishing relative, alias-like, source-root-like, package-like, and unknown unresolved specifiers;
* extracting the package root from package import paths;
* producing `{ target: "external-package", packageName }` for package imports;
* producing `{ target: "unknown" }` for unresolved non-package specifiers.

### 2. Preserve the pinned semantics exactly

Keep these behaviours unchanged:

```js
extractImportPath(target)
```

must preserve the existing fallback:

```js
target.importPath ?? target.target
```

`classifyImportKind()` must continue to fail closed to:

```js
"value"
```

for unknown or unsupported import kinds.

`packageNameFromImportPath("")` must still return:

```js
""
```

`classifyUnresolvedImport("")` must still return:

```js
{ target: "external-package", packageName: "" }
```

This last case remains a compatibility pin, not a design endorsement.

### 3. Update the classifier module to delegate

Update:

```text
scripts/lib/layer-boundary-classification.mjs
```

so that it imports the extracted helpers from:

```text
scripts/lib/layer-boundary-import-specifiers.mjs
```

The classifier module should remain responsible for:

```js
normalizeProjectPath
SOURCE_LAYERS
TARGETS
classifySourcePath
classifyResolvedTarget
```

It should delegate unresolved/package import handling to the new helper module.

### 4. Preserve public API compatibility

If downstream code currently imports `classifyPackageImport()` or related helpers from `layer-boundary-classification.mjs`, preserve that path for now.

Prefer a re-export:

```js
export {
  classifyPackageImport,
  classifyUnresolvedImport,
  extractImportPath,
  classifyImportKind,
} from "./layer-boundary-import-specifiers.mjs";
```

Only use wrapper functions if the current module needs to adapt arguments or preserve legacy naming.

This keeps Step 5 as an internal modularization, not a migration step for callers.

### 5. Keep tests focused and staged

Use the helper tests as the first green target:

```bash
pnpm exec vitest run scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Then run the classifier and rule-evaluation safety nets:

```bash
pnpm exec vitest run \
  scripts/__tests__/layer-boundary-classification.test.ts \
  scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Finally run the architecture checker:

```bash
pnpm run check:architecture
```

Use direct Vitest targeting here to avoid accidental broad-suite spillover from `pnpm test:unit -- ...`.

---

## Relevant Files

| File                                                           | Role                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `scripts/lib/layer-boundary-classification.mjs`                | Current classifier module; should shrink to path/layer classification plus orchestration. |
| `scripts/lib/layer-boundary-import-specifiers.mjs`             | New internal helper module for unresolved import specifier logic.                         |
| `scripts/__tests__/layer-boundary-import-specifiers.test.ts`   | Primary Step 5 contract suite.                                                            |
| `scripts/__tests__/layer-boundary-classification.test.ts`      | Regression suite for public classifier behaviour.                                         |
| `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`     | Downstream safety net for rule evaluation.                                                |
| `traceability-log/stage_3_extract_import_specifier_helpers.md` | Stage checklist to update after Step 5 passes.                                            |
| `traceability-log/step_5_extract_import_specifier_helpers.md`  | Suggested Step 5 traceability note.                                                       |

---

## Suggested Implementation Sequence

1. **Copy first, then delete.**
   Copy the specifier helpers into the new module before removing them from `layer-boundary-classification.mjs`. This makes failures easier to isolate.

2. **Export all helper functions required by the focused tests.**
   Make sure the new module exports the exact functions already referenced by `layer-boundary-import-specifiers.test.ts`.

3. **Replace local definitions with imports/re-exports.**
   Update `layer-boundary-classification.mjs` to import the helpers and optionally re-export compatibility symbols.

4. **Run the focused helper suite.**
   The previous red state should turn green. Any failure here should be treated as a Step 5 issue.

5. **Run classifier and evaluator regression tests.**
   These confirm that the extraction did not alter public classifier behaviour.

6. **Update traceability.**
   Mark Step 5 complete only after the focused helper suite and regression suites pass.

---

## Verification

### Focused helper suite

```bash
pnpm exec vitest run scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Expected result after implementation:

```text
PASS scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

### Regression suites

```bash
pnpm exec vitest run \
  scripts/__tests__/layer-boundary-classification.test.ts \
  scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Expected result:

```text
PASS scripts/__tests__/layer-boundary-classification.test.ts
PASS scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

### Final architecture safety check

```bash
pnpm run check:architecture
```

Expected result:

```text
architecture check passes with no new boundary violations
```

---

## Definition of Done

Step 5 is complete when:

* `scripts/lib/layer-boundary-import-specifiers.mjs` exists.
* The specifier helper functions are exported from the new module.
* `scripts/lib/layer-boundary-classification.mjs` delegates specifier handling to the new module.
* Existing public imports from `layer-boundary-classification.mjs` remain compatible.
* The focused import-specifier test suite passes.
* The classifier and rule-evaluation regression suites pass.
* `pnpm run check:architecture` passes.
* Traceability notes record Step 5 as complete.
* No classifier semantics, path semantics, or layer-boundary rules changed.

---

## Decisions

* Treat this as an **internal extraction**, not a behaviour change.
* Keep unresolved import-specifier classification separate from resolved path/layer classification.
* Preserve compatibility quirks until a later corrective step explicitly changes them.
* Prefer direct re-exports over wrappers unless wrappers are required for compatibility.
* Use the focused helper suite as the first implementation target, then confirm downstream behaviour with regression tests.

## References

* `traceability-log/stage_3_extract_import_specifier_helpers.md` — stage context and Step 5 boundary.
* `scripts/lib/layer-boundary-classification.mjs` — current source of the helpers to extract.
* `scripts/__tests__/layer-boundary-import-specifiers.test.ts` — Step 3 and Step 4 pinned helper contracts.
* `scripts/__tests__/layer-boundary-classification.test.ts` — public classifier regression coverage.
* `scripts/__tests__/layer-boundary-rule-evaluation.test.ts` — downstream evaluator regression coverage.
