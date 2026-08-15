# [DONE] Package Contract Review: `site-core`

## Summary

Make `site-core`’s ESM-only package contract explicit, testable, and behavior-preserving. Keep the existing `tsup` build
unless local validation shows a concrete reason to change bundlers now.

This is a small package-contract hardening task, so organize it as short TDD cycles rather than milestones or broader
phases.

## Scope

In scope:

- Inspect the current `package.json`, `tsup.config.ts`, `src/index.ts`, and all modules re-exported from the public
  entry point.
- Make the ESM-only public package surface explicit.
- Add consumer-facing package smoke tests.
- Make the build configuration more intentional without changing runtime behavior.
- Add a deferred `tsdown` evaluation note.

Out of scope:

- Adding CommonJS output.
- Migrating from `tsup` to `tsdown` immediately.
- Expanding the public API.
- Reorganizing source modules unless required to make the public contract testable.
- Adding `sideEffects: false` before proving the package has no top-level side effects.

## Cycle 1: Lock the Current Distribution Contract [DONE]

Status: implemented.

### Goal

Capture the current expected consumer behavior before changing package metadata.

### Scope

Add tests around the built package entry point and TypeScript declaration resolution.

### Red

Add failing BDD-style tests or fixture checks for:

- `given the built package, when imported through the public ESM entry, then the import succeeds`.
- `given a TypeScript consumer, when importing from the package root, then declarations resolve without path aliases`.
- `given a consumer, when importing an internal path, then the package does not expose it unless it is already intentionally public`.

Use fake exported symbols or fixtures with non-repeated Hokuto no Ken references only if the tests need sample names,
for example `kenshiroRoute`, `yuriaManifest`, or `raohFinding`.

### Green

Implement the minimum test infrastructure needed to run the checks against `dist`.

Prefer a packed-tarball fixture if the repository already supports package-level integration tests:

1. Build `site-core`.
2. Run `pnpm pack`.
3. Install the tarball into a temporary consumer fixture.
4. Run `tsc --noEmit`.
5. Run a small Node ESM script.

If that is too heavy for the existing repo, start with direct `dist` smoke tests and leave packed-tarball testing as a
follow-up.

### Refactor

Extract small package-test helpers if setup exceeds a few lines:

- `buildPackage()`
- `packPackage()`
- `createConsumerFixture()`
- `runConsumerTypecheck()`
- `runConsumerScript()`

Keep helper functions short and single-purpose.

### Acceptance Criteria

- Implemented by `packages/site-core/scripts/validate-packed-consumer.mjs`, which builds `site-core`, packs it, installs
  the tarball into a temporary ESM consumer, runs a runtime import check, validates TypeScript declaration resolution,
  and confirms unsupported subpath imports stay blocked.
- Supported by `packages/site-core/scripts/assert-pack-files.mjs --pack`, which verifies the packed artifact contains
  the expected files and excludes source, tests, and build configuration files.
- Documented in `packages/site-core/README.md` under "Distribution Contract".

## Cycle 2: Make `package.json` Explicit [DONE]

Status: implemented.

### Goal

Declare the package’s public ESM-only contract directly in `package.json`.

### Scope

Update package metadata only.

### Red

The distribution tests from Cycle 1 should expose any missing or incorrect contract fields.

Expected public contract:

```json
{
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        },
        "./package.json": "./package.json"
    },
    "files": ["dist"]
}
```

### Green

Update `package.json` to match the intended ESM-only package surface.

Expose `./package.json` only if consumers or tooling have a realistic need for it. Otherwise, omit it for a narrower
public surface.

### Refactor

Remove redundant legacy fields only if they are not needed by current tooling. Keep `main` and `types` if the package
already relies on broad ecosystem compatibility.

### Acceptance Criteria

- Public root import works through the package root export.
- Type declarations resolve from the package root through the `types` export condition and top-level `types` field.
- Private implementation paths are not exposed by the export map.
- The package omits a `./package.json` export because current consumers use exported runtime constants instead of
  manifest subpath imports.
- `files` is narrowed to `["dist"]`; npm still includes `package.json` and `README.md` by default, and the pack check
  validates the final artifact list.

## Cycle 3: Decide Whether `sideEffects: false` Is Safe

Status: implemented.

### Goal

Improve downstream tree-shaking only if the package is genuinely side-effect-free.

### Scope

Inspect public entry modules and all re-exported modules.

### Red

Add or document a checklist-style test/review gate for top-level effects:

- No CSS or style imports.
- No global object mutation.
- No prototype mutation.
- No process/environment mutation during import.
- No runtime registration during import.
- No filesystem, network, DOM, or host interaction during import.

### Green

If the package is pure, add:

```json
{
    "sideEffects": false
}
```

If any top-level effect exists, do not add the field. Instead, document the blocker and consider isolating the
side-effectful module behind an explicit opt-in entry point in a later behavior-changing refactor.

### Refactor

If inspection reveals accidental top-level work, prefer extracting it into explicit functions. Do not change behavior in
this cycle unless the existing behavior is clearly unintended and covered by tests.

### Acceptance Criteria

- `sideEffects: false` remains in `packages/site-core/package.json` after inspecting the public root and all re-exported
  repository modules.
- The root import has no CSS or style imports, global object mutation, prototype mutation, process/environment mutation,
  runtime registration, or filesystem, network, DOM, or other host interaction during import.
- The `SITE_CORE_VERSION` export uses package metadata as module data; it does not read host state at import time.
- `packages/site-core/src/__tests__/root-api-side-effects.test.ts` records the decision by checking the manifest flag
  and guarding common host state during root import.
- `packages/site-core/README.md` documents the passive import contract.

## Cycle 4: Make `tsup.config.ts` Intentional [DONE]

Status: implemented.

### Goal

Keep the build small while making host-agnostic intent explicit.

### Scope

Update only the build config.

### Red

Add or rely on existing package smoke tests to detect build output regressions.

Expected config direction:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    platform: "neutral",
    outDir: "dist",
});
```

### Green

Add `platform: "neutral"` if `site-core` is truly host-agnostic.

Remove `treeshake: true` unless measurement shows it provides meaningful output improvement. The default ESM build
should already be suitable for downstream tree-shaking.

### Refactor

If output size matters, add a separate analysis script rather than making the normal build more complex:

```bash
pnpm --filter site-core build
```

Optionally compare artifact size before and after removing `treeshake`.

### Acceptance Criteria

- Build output remains ESM-only.
- Declaration generation still succeeds.
- Source maps are still emitted.
- No Node-specific assumptions are introduced.
- Existing consumers are unaffected.

## Cycle 5: Add a Deferred Bundler Migration Note [DONE]

Status: implemented.

### Goal

Track `tsup` maintenance risk without expanding this change.

### Scope

Add a backlog item, issue, or traceability-log note.

### Red

No production test is needed. This is a planning artifact.

### Green

Record a follow-up task:

> Evaluate `tsdown` as a future replacement for `tsup`. Run the official migration dry-run, compare generated artifacts,
> and keep the migration behavior-preserving unless the package intentionally changes its distribution contract.

Suggested first command for the future task:

```bash
pnpm dlx tsdown-migrate --dry-run
```

### Refactor

Do not introduce `tsdown` configuration in this package-contract change.

### Acceptance Criteria

- The migration risk is visible in `packages/site-core/README.md` under "Maintenance Notes".
- The deferred task starts with `pnpm dlx tsdown-migrate --dry-run`, then compares generated artifacts.
- Any future migration must remain behavior-preserving unless a later package-contract review intentionally changes the
  ESM-only distribution contract.
- No `tsdown` dependency, script, configuration, or generated artifact is introduced in this branch.
- The current change remains focused on package contract correctness.

## Suggested Execution Order

1. Add package distribution smoke tests.
2. Update `package.json` export metadata.
3. Inspect side effects and decide whether `sideEffects: false` is safe.
4. Update `tsup.config.ts` with explicit `platform: "neutral"` and remove unproven extra tree-shaking.
5. Add the deferred `tsdown` evaluation note.
6. Run the narrowest available validation command for `site-core`.
7. If package-level infrastructure exists, run the packed-tarball consumer fixture test.

## Final Acceptance Criteria

- `site-core` remains ESM-only.
- The public package root import works in Node ESM.
- TypeScript consumers resolve declarations through the package root.
- Internal modules are not accidentally exposed through the package export map.
- Published files are limited to intended distribution artifacts.
- `sideEffects: false` is present only if import-time purity is verified.
- `tsup.config.ts` communicates host-agnostic intent.
- No CommonJS build is added.
- No `tsdown` migration is performed in this change.
