# [PLAN] Verify Import-Specifier Delegation

Step 6 closes the helper-extraction cycle by verifying that `scripts/lib/layer-boundary-classification.mjs` delegates
import-specifier logic to `scripts/lib/layer-boundary-import-specifiers.mjs` without changing the public classifier
contract.

This is a behaviour-preserving step. It should not change layer predicates, path classification rules, package-name
compatibility behaviour, or rule evaluation semantics.

## Goals

- Confirm that `classifyImport()` delegates import-specifier concerns to the helper module.
- Preserve the public export surface of `layer-boundary-classification.mjs`.
- Prove that classifier and rule-evaluation behaviour remains unchanged.
- Close the Stage 3 traceability record with a focused completion note.

## Scope

### In scope

- Inspect and, only if necessary, adjust the delegation boundary in `scripts/lib/layer-boundary-classification.mjs`.
- Keep compatibility re-exports available for existing callers and tests.
- Add or refine narrow regression tests if current coverage does not explicitly protect the delegation boundary.
- Update traceability notes after tests pass.

### Out of scope

- Changing path-layer predicates.
- Changing source or target classification tables.
- Changing package import semantics.
- Migrating downstream callers to import directly from `layer-boundary-import-specifiers.mjs`.
- Refactoring rule evaluation.

## Steps

1. **Lock the current behaviour with tests first.**

   Review the existing tests and add only the missing assertions needed to document that:

   - `classifyImport()` preserves the same result shape as before extraction;
   - unresolved imports still use the helper-owned classification path;
   - package imports still classify through the compatibility API;
   - downstream rule evaluation receives unchanged classifier output.

2. **Verify the delegation boundary.**

   Confirm that `scripts/lib/layer-boundary-classification.mjs` keeps only the orchestration logic:

   - `classifyImport()` delegates to:
     - `extractImportPath()`;
     - `classifyImportKind()`;
     - `classifyUnresolvedImport()`.
   - `classifyResolvedTarget()` remains local to the classifier module.
   - `normalizeProjectPath()` remains local if it still belongs to resolved target/path handling.

3. **Preserve compatibility exports.**

   Confirm that existing consumers can still import the expected classifier API, especially:

   - `classifyPackageImport`;
   - import-kind helpers already re-exported by the classifier module;
   - any helper symbols covered by downstream tests.

   Do not force a caller migration in this step. Compatibility removal, if ever desired, should be a separate
   deprecation/migration phase.

4. **Run focused verification.**

   Run the smallest relevant tests first:

   ```bash
   pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
   ```

   Then run classifier and downstream regression tests:

   ```bash
   pnpm test:unit -- \
     scripts/__tests__/layer-boundary-classification.test.ts \
     scripts/__tests__/layer-boundary-rule-evaluation.test.ts
   ```

   Finish with the architecture gate:

   ```bash
   pnpm run check:architecture
   ```

5. **Close traceability only after verification passes.**

   Update:

   - `traceability-log/stage_3_extract_import_specifier_helpers.md`;
   - `traceability-log/closed/2026/05/13/step_6_wire_import_specifier_delegation.md`.

   The closed note should record:

   - what was verified;
   - which files define the delegation boundary;
   - which commands passed;
   - which behaviours were intentionally left unchanged.

## Acceptance Criteria

Step 6 is complete when:

- `classifyImport()` delegates import-specifier concerns to the helper module.
- The classifier module still exposes the compatibility API expected by current tests and callers.
- Helper, classifier, and rule-evaluation tests pass.
- `pnpm run check:architecture` passes.
- The traceability log records Step 6 as complete.
- No unrelated classification, path-resolution, or rule-evaluation behaviour changes were introduced.

## Failure Handling

If helper tests fail, fix the helper contract before touching the classifier.

If classifier tests fail, treat the issue as a delegation or compatibility regression.

If rule-evaluation tests fail, inspect the classifier output shape before changing rule-evaluation logic.

If traceability already marks Step 6 as complete, avoid duplicating status; only add a concise closed-step note if one
is missing.

## Key Decision

Keep this step small: it is the closure of a completed extraction, not the start of another refactor.
