# [DONE] Step 6: Wire Import-Specifier Delegation

## Status

Complete. `scripts/lib/layer-boundary-classification.mjs` delegates import-specifier handling to
`scripts/lib/layer-boundary-import-specifiers.mjs`, while keeping resolved-target classification and the public API
stable.

## Verified Boundary

- `classifyImport()` calls `extractImportPath()`, `classifyImportKind()`, and `classifyUnresolvedImport()` from the helper module.
- `classifyResolvedTarget()` remains local to the classifier module.
- `normalizeProjectPath()` remains local to the classifier module for resolved paths.
- `classifyPackageImport()` is still available through the classifier module compatibility export.

## Verification

- `pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts`
- `pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts`

## Intentionally Unchanged

- Path-layer predicates and target classification tables.
- Package-name compatibility behavior, including the empty-string quirk.
- Rule evaluation semantics.