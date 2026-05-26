# [DONE] Phase 3: Harden `@ravenhill/content-core` as a Built Package

Implemented on 2026-05-06.

## Outcome

- Added `tsup` and `publint` as workspace dev dependencies.
- Built `@ravenhill/content-core` from `src/index.ts` to `dist/index.js` and `dist/index.d.ts`.
- Updated package metadata to point `main`, `types`, and root-only `exports` at built files.
- Added `files`, `sideEffects`, package-local build/check scripts, and a GitLab registry placeholder in `publishConfig`
  while keeping `private: true`.
- Added a dry-run pack-file assertion that permits only `package.json`, `README.md`, and built `dist` files.
- Updated root scripts so app checks/builds generate the package before consuming it.
- Updated package docs and roadmap language for the built-package phase.

## Summary

Prepare `@ravenhill/content-core` to behave like a real ESM package without publishing it yet.

Phase 3 moves the package from source-only workspace consumption to a built package with:

- generated ESM output in `dist`;
- generated TypeScript declarations;
- explicit root-only `exports`;
- explicit package artifact contents;
- local pack validation;
- package-shape checks that verify the declared entry points match the generated files.

This phase should make the package installable and inspectable as an artifact, while keeping publishing, release
automation, and external consumer fixtures for later phases.

## Goals

- Build `packages/content-core/src/index.ts` into `packages/content-core/dist`.
- Emit declarations from the same public root entry point.
- Make `package.json` describe the built package, not the source package.
- Keep the package root as the only supported public entry point.
- Ensure packed artifacts include only intentional files.
- Make `pnpm check:content-core` validate the built-package path.
- Keep app consumption through the workspace dependency.

## Non-Goals

- Do not publish the package.
- Do not add Changesets, semantic-release, Nx, Turbo, or publication automation.
- Do not add subpath exports.
- Do not add runtime dependencies.
- Do not add a true external consumer fixture yet.
- Do not move app-local Zod validation or generated JSON loading into the package.
- Do not commit broad packaging policy changes for other packages.
- Do not require the root app to consume the packed tarball in this phase.

## Package Boundary Policy

The package remains **root-only**.

Supported:

```ts
import { LessonHref } from "@ravenhill/content-core";
```

Unsupported:

```ts
import { LessonMetadataService } from "@ravenhill/content-core/lesson-metadata";
import { LessonHref } from "@ravenhill/content-core/navigation";
```

Node’s package entry-point model supports both `main` and `exports`, but `exports` provides a more explicit public
entry-point surface; once `exports` is present, consumers should only rely on declared paths. This phase should use that
to enforce root-only consumption.

## Package Metadata Changes

Update `packages/content-core/package.json` to describe the built artifact.

Recommended shape:

```json
{
    "name": "@ravenhill/content-core",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "files": [
        "dist",
        "README.md"
    ],
    "sideEffects": false,
    "scripts": {
        "clean": "rimraf dist",
        "build": "tsup",
        "check": "pnpm run build && publint --strict",
        "pack:dry-run": "npm pack --dry-run --json"
    },
    "publishConfig": {
        "registry": "https://gitlab.com/api/v4/projects/<project-id>/packages/npm/"
    }
}
```

### Notes

Keep `"private": true` even with `publishConfig`. The registry placeholder is useful for future traceability, but it
must not imply that Phase 3 publishes anything.

Keep `"sideEffects": false` only if the package root and exported modules are pure. Given this package currently exposes
value objects, services, contracts, and helpers, that should be valid, but it is still a package-level promise. If any
top-level module later performs observable work, revisit it.

The npm `files` field controls which files are included when packing a package, so this phase should assert the tarball
file list rather than relying on convention.

## Build Tooling

Add `tsup` as a root dev dependency and configure it for the package.

`tsup` writes build output to `dist` by default and supports TypeScript entry points and declaration output, so it is a
good fit for a small ESM-only package build.

Add:

```text
packages/content-core/tsup.config.ts
```

Suggested config:

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
    outDir: "dist",
    treeshake: true,
});
```

### Build policy

- ESM only.
- One public entry point.
- Declaration output enabled.
- Clean `dist` before build.
- No bundled runtime dependencies.
- No subpath entries.
- No minification; this is a library artifact, not an application bundle.
- Keep source maps if they are useful for debugging packed artifacts.

If `clean: true` is not sufficient for stale artifact removal in this package, add an explicit `clean` script before
`build`.

## Root Script Changes

Update root scripts so the content-core check validates the package as it will be consumed.

Recommended root script:

```json
{
    "scripts": {
        "check:content-core": "pnpm --dir packages/content-core run check"
    }
}
```

If the package-local `check` becomes too broad, split it:

```json
{
    "scripts": {
        "typecheck": "tsc --noEmit",
        "build": "tsup",
        "lint:package": "publint --strict",
        "pack:dry-run": "npm pack --dry-run --json",
        "check": "pnpm run typecheck && pnpm run build && pnpm run lint:package && pnpm run pack:dry-run"
    }
}
```

The important policy is that `check:content-core` should fail if `dist/index.js`, `dist/index.d.ts`, or the declared
package entry points are broken.

## Additional Useful Tooling

### Add `publint`

Add `publint` as a dev dependency unless the project already has an equivalent package-shape check.

`publint` is designed to lint npm packages for compatibility across environments and catch packaging errors such as
invalid entry points or export-shape problems.

Recommended command:

```sh
publint --strict
```

This is small, targeted, and directly aligned with Phase 3. It gives more value here than a custom script that only
checks file existence.

### Optional: add `@arethetypeswrong/cli`

Keep this optional for Phase 3, or defer it to Phase 4 with the consumer fixture.

`@arethetypeswrong/cli` analyzes npm package contents for TypeScript type-resolution issues, especially ESM-related
module-resolution problems.

Good Phase 4 candidate:

```sh
npx @arethetypeswrong/cli --pack
```

For Phase 3, `publint` plus compile-time root API tests may be enough.

## Implementation Plan

### Step 1: Add build dependency and config

Add root dev dependencies:

```sh
pnpm add -D tsup publint
```

Add:

```text
packages/content-core/tsup.config.ts
```

Configure it as ESM-only, root-entry-only, declaration-emitting, and non-minified.

### Step 2: Update package metadata

Update:

```text
packages/content-core/package.json
```

Add or verify:

- `"private": true`
- `"type": "module"`
- `"main": "./dist/index.js"`
- `"types": "./dist/index.d.ts"`
- root-only `"exports"`
- `"files": ["dist", "README.md"]`
- `"sideEffects": false`
- package-local `build`, `check`, and `pack:dry-run` scripts
- placeholder `publishConfig`

Do not add subpath exports.

### Step 3: Keep workspace consumption stable

Keep the app dependency as workspace-based.

`pnpm` supports the `workspace:` protocol and refuses to resolve it to anything other than a local workspace package,
which is useful for keeping this dependency local during internal hardening.

The app should continue to import only from:

```ts
@ravenhill/content-core
```

### Step 4: Update TypeScript/package checks

Make sure package checks validate both source and built output.

Minimum:

```sh
tsc --noEmit
tsup
publint --strict
npm pack --dry-run --json
```

If `tsc --noEmit` is already covered by an existing package check, keep it there; otherwise add it explicitly.

### Step 5: Add pack-file assertion

Add a focused test or script that parses `npm pack --dry-run --json` output and asserts the packed file list.

Expected included files:

```text
package/package.json
package/README.md
package/dist/index.js
package/dist/index.d.ts
package/dist/index.js.map
```

Allow source maps only if the tsup config keeps them.

Expected excluded paths:

```text
package/src/
package/__tests__/
package/tsup.config.ts
package/*.test.*
package/vitest.config.*
package/AGENTS.md
```

Do not rely only on human inspection of `npm pack --dry-run`. Add an assertion script if practical.

Suggested script:

```text
packages/content-core/scripts/assert-pack-files.mjs
```

Then:

```json
{
    "scripts": {
        "pack:check": "npm pack --dry-run --json | node scripts/assert-pack-files.mjs"
    }
}
```

### Step 6: Update API contract tests

Keep existing root API contract tests, but ensure they still pass against the package root after metadata changes.

Runtime contract tests should import value exports:

```ts
import { LessonHref, LessonMetadataService, NavigationService } from "@ravenhill/content-core";
```

Type contract tests should import type-only contracts:

```ts
import type {
    LessonMetadataRepository,
    LessonMetadataServiceContract,
    LessonNavigationRepository,
    NavigationServiceContract,
} from "@ravenhill/content-core";
```

Do not import from `src/index.ts` in public API tests. The goal is to test package consumption, not source layout.

### Step 7: Preserve subpath boundary tests

Keep the architecture rule that rejects:

```text
@ravenhill/content-core/navigation
@ravenhill/content-core/lesson-metadata
@ravenhill/content-core/*
```

Also consider adding a small package-level negative fixture that attempts a subpath import and expects TypeScript or
Node resolution to fail. This is useful because `exports` is a runtime/package-resolution boundary, while the
architecture test is a source-code policy boundary.

### Step 8: Update generated-output policy

Decide whether `dist` is committed.

Recommended policy:

- If the repo does not publish yet, do **not** commit `dist`.
- Add `packages/content-core/dist/` to `.gitignore`.
- Treat `dist` as generated output.
- Validate it in checks.

Only commit `dist` if the repository has a strong reason to review built artifacts directly or if a later publishing
workflow requires it.

### Step 9: Update traceability and package docs

Update:

```text
docs/plans/refined_plan_for_extracting_and_preparing_an_astro_library_from_this_repository.md
packages/content-core/README.md
packages/content-core/AGENTS.md
traceability-log/...
```

Keep documentation changes focused on package behaviour:

- build command;
- root-only exports;
- artifact contents;
- `dist` as generated output;
- no publication in Phase 3;
- Phase 4 owns true consumer-fixture validation.

## Test Plan

### Package checks

```sh
pnpm --dir packages/content-core run build
pnpm --dir packages/content-core run check
pnpm --dir packages/content-core run pack:dry-run
```

### Package artifact checks

```sh
npm pack --dry-run --json
publint --strict
```

Run these from:

```text
packages/content-core
```

### Contract checks

- Root API runtime/type tests import from `@ravenhill/content-core`.
- Subpath boundary tests remain green.
- Pack-file assertion confirms `src/**`, tests, config, and repo noise are excluded.
- `dist/index.js` and `dist/index.d.ts` exist after build.
- `package.json` export paths point to existing files.

### Repo checks

```sh
pnpm test:unit -- packages/content-core scripts/__tests__/layer-boundary-rules.test.ts
pnpm check:architecture
pnpm check
```

## Acceptance Criteria

- `pnpm --dir packages/content-core run build` creates `dist/index.js` and `dist/index.d.ts`.
- `packages/content-core/package.json` points `main`, `types`, and `exports["."]` at built files.
- No subpath exports are declared.
- `publint --strict` passes for `packages/content-core`.
- `npm pack --dry-run --json` shows only intended package files.
- Packed artifacts exclude source files, tests, tool configs, and repo-local guidance files.
- Root API tests import from `@ravenhill/content-core`, not internal source paths.
- Architecture tests still reject package subpath imports outside `packages/content-core`.
- Root app remains on the workspace dependency.
- No publish command is added or run.
- No runtime dependency is added to `@ravenhill/content-core`.
- Phase 4 remains responsible for installing the packed tarball in a true consumer fixture.

## Risks and Mitigations

| Risk                                                              | Mitigation                                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Package metadata points to files that are not generated.          | Run `build`, `publint`, and a file-existence assertion in `check:content-core`.                           |
| `files` accidentally includes source or tests.                    | Parse `npm pack --dry-run --json` and assert the tarball file list.                                       |
| Subpath imports work accidentally in source but fail when packed. | Keep architecture checks and add a negative subpath import fixture.                                       |
| Type declarations compile from source but break in package form.  | Validate built declarations and optionally defer `@arethetypeswrong/cli --pack` to Phase 4.               |
| `dist` becomes stale if committed.                                | Treat `dist` as generated output and ignore it unless a later release phase requires committed artifacts. |
| Registry placeholder is mistaken for publication readiness.       | Keep `"private": true` and document that publishing is out of scope.                                      |
| Build config becomes too broad.                                   | Use a single entry point and no subpath exports.                                                          |
| Phase 3 expands into release engineering.                         | Keep Changesets, semantic-release, and consumer fixtures out of scope.                                    |

## Suggested Sequencing

1. Add `tsup` and `publint`.
2. Add `tsup.config.ts`.
3. Update `packages/content-core/package.json`.
4. Add or update package-local scripts.
5. Update root `check:content-core`.
6. Add pack-file assertion.
7. Run package build and package lint.
8. Update root API contract tests if needed.
9. Run architecture checks.
10. Update focused docs and traceability notes.
11. Run full `pnpm check`.
