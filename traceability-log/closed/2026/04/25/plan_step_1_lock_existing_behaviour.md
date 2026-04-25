# [PLAN] Step 1: Lock Existing Behaviour

## Summary

Before introducing the Cycle 2 rule matrix, establish a narrow, reproducible baseline for the existing Cycle 1 checker.

This step must only verify current behaviour. It should not introduce classification helpers, change rule evaluation, modify CLI/reporting logic, update package scripts, or inspect real repository violations. Its purpose is to create a trusted compatibility boundary for the next implementation step.

Vitest supports running selected test files from the CLI, so the direct file-targeted invocation is appropriate for this focused gate. pnpm also forwards arguments after the script name, but because the current project script is known to broaden the executed suite, direct Vitest invocation should remain the authoritative Step 1 command until script wiring is handled later. ([Vitest][1])

## Completion Status

Completed on 2026-04-25.

Authoritative baseline command run:

```sh
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts scripts/__tests__/layer-boundary-checker.test.ts
```

Observed result:

```text
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing
scripts/__tests__/layer-boundary-checker.test.ts: 12 tests passing

Test files: 3 passed
Tests: 30 passed
```

No implementation files were edited for this step. The Cycle 1 checker baseline is locked for Cycle 2 refactoring.

---

## Scope

### In Scope

* Run the existing checker-focused test files.
* Confirm the current import extraction contract.
* Confirm the current path resolution contract.
* Confirm the current rule evaluation contract.
* Confirm the current formatting and exit-code contract.
* Record the observed baseline in Cycle 2 implementation notes.

### Out of Scope

* No implementation refactor.
* No rule matrix changes.
* No new classification helpers.
* No exception support.
* No package script changes.
* No real repository architecture audit.
* No allowlist expansion.
* No import cleanup.
* No changes motivated by unrelated full-suite failures.

---

## Authoritative Baseline Command

Use direct Vitest invocation:

```sh
node ./node_modules/vitest/vitest.mjs run \
  scripts/__tests__/layer-boundary-paths.test.ts \
  scripts/__tests__/layer-boundary-imports.test.ts \
  scripts/__tests__/layer-boundary-checker.test.ts
```

This is the Step 1 gate.

Do not replace it with:

```sh
pnpm test:unit -- ...
```

for this step, because the current project script forwards arguments in a way that runs more than the intended checker-focused files.

The direct command also avoids conflating Cycle 2 readiness with unrelated suite instability.

---

## Baseline To Record

Record the exact observed result in the Cycle 2 implementation notes.

Expected current baseline:

```text
layer-boundary-paths.test.ts: passes
layer-boundary-imports.test.ts: passes
layer-boundary-checker.test.ts: passes

Observed baseline:
3 files
30 tests passing
```

If the number of tests changes before Step 1 is executed, record the updated count rather than preserving the stale number.

---

## Behaviour To Preserve

### Import Extraction

The existing extraction logic must continue detecting:

* static imports
* type imports
* side-effect imports
* re-exports
* type re-exports
* string-literal dynamic imports
* Astro frontmatter imports only
* TSX fallback extraction

This matters because Cycle 2 will change rule semantics, not the importer’s coverage.

### Path Resolution

The existing path resolver must continue handling:

* aliases from `tsconfig.json`
* fallback aliases
* relative imports
* `src/...` imports
* package imports
* scoped package names
* normalized project paths

Cycle 2 may add target classification on top of this, but it should not weaken existing resolution behaviour.

### Checker Public Contract

The checker must continue preserving these public-facing contracts:

* `checkLayerBoundaries(...)` returns only violations.
* `formatViolations(...)` returns formatted reports.
* CLI exits with code `1` when violations exist.
* CLI exits with code `0` when no violations exist.
* Existing violation reports still include enough context to identify:

  * source file
  * import target
  * resolved target, when available
  * rule id
  * message
  * suggested fix

---

## Failure Protocol

If the focused baseline fails, do not continue to Cycle 2 rule implementation.

Handle failures as follows:

1. Identify whether the failure belongs to:

   * import extraction,
   * path resolution,
   * checker evaluation,
   * formatting,
   * exit-code handling,
   * or test-environment instability.

2. Fix only the broken Cycle 1 compatibility behaviour.

3. Re-run the authoritative baseline command.

4. Update the implementation notes with:

   * failing test file,
   * cause,
   * fix summary,
   * final passing baseline.

5. Only proceed to Cycle 2 once the focused checker baseline passes.

Do not use this step to improve design, rename APIs, or introduce the new architecture target model.

---

## Treatment of Known Full-Suite Instability

The unrelated full-suite Shiki timeout should be documented as outside Step 1.

Suggested note:

```text
The broader unit suite currently has an unrelated Shiki timeout. This does not block Step 1 because the Step 1 gate is the checker-specific Vitest invocation. The Shiki timeout remains a separate test-stability concern.
```

This keeps the boundary checker baseline actionable without hiding broader test debt.

---

## Acceptance Criteria

* The authoritative direct Vitest command passes.
* The baseline result is recorded in Cycle 2 implementation notes.
* All three checker-specific test files pass:

  * `layer-boundary-paths.test.ts`
  * `layer-boundary-imports.test.ts`
  * `layer-boundary-checker.test.ts`
* Current import extraction behaviour is preserved.
* Current path resolution behaviour is preserved.
* Current checker/reporting/exit-code contracts are preserved.
* Any focused checker failure is fixed before Cycle 2 implementation begins.
* No implementation files are edited unless required to restore a failing Cycle 1 baseline.
* No Cycle 2 rule matrix work is performed in this step.
* No real repository audit is performed.
* No package scripts are changed.
* The unrelated Shiki timeout is noted but does not block this focused gate.

---

## Assumptions

* Cycle 1 checker behaviour is the compatibility boundary for Cycle 2.
* Direct Vitest invocation is acceptable as a temporary focused gate.
* Package script wiring will be handled in a later cycle.
* The broader `pnpm test:unit -- ...` forwarding issue is a workflow concern, not part of the Cycle 2 rule implementation.
* Step 1 produces evidence for safe refactoring; it does not improve the architecture checker by itself.

[1]: https://vitest.dev/guide/filtering?utm_source=chatgpt.com "Test Filtering | Guide"
