# [COMPLETED] Phase 5: Package Consumer Validation

**Completion Date:** 2026-05-10

## Summary

Completed Phase 5 by converting `@ravenhill/shiki-core` validation from "package builds in the workspace" to "package behaves correctly when installed as an external dependency".

The validation now proves three things:

1. the published tarball contains only the intended files (via `pack:check`);
2. a clean consumer outside the workspace can install and use the tarball (via `consumer:check`);
3. only the documented root import is available (package `exports` properly encapsulates subpaths).

## Implementation Complete

### Scripts Implemented

**`packages/shiki-core/scripts/assert-pack-files.mjs`**
- Resolves package root correctly from script location
- Runs `pnpm pack --dry-run --json` and parses machine-readable output
- Validates required files: dist/index.js, dist/index.d.ts, README.md, package.json
- Validates forbidden files are excluded: src/**, tests/**, scripts/**, vitest/tsup configs
- Validates package metadata: name, version, type: "module", exports (root-only), main, types, files

**`packages/shiki-core/scripts/validate-packed-consumer.mjs`**
- Creates temp root with subdirectories for tarballs and consumer
- Builds package and packs to temp directory with `pnpm pack --pack-destination --json`
- Creates clean consumer project outside workspace
- Installs generated .tgz as external dependency (no workspace links)
- Installs TypeScript for type validation
- Generates and runs runtime ESM probe (validates createShikiHighlighterService, resolveShikiLanguage)
- Generates and runs TypeScript probe with proper lib/target configuration
- Tests that internal subpaths fail: src, dist, internal, languages, transformers
- Supports SHIKI_CORE_KEEP_CONSUMER_TEMP=1 debug escape hatch
- Cleans up temp directory with try/finally pattern

### Package.json Scripts

Already configured (no changes needed):
```json
{
    "scripts": {
        "pack:dry-run": "pnpm pack --dry-run --json",
        "pack:check": "node scripts/assert-pack-files.mjs",
        "consumer:check": "node scripts/validate-packed-consumer.mjs",
        "check": "pnpm run build && pnpm run typecheck && pnpm run test && pnpm run lint && pnpm run pack:check && pnpm run consumer:check"
    }
}
```

Root workspace already includes `check:shiki-core` in check script.

### Documentation Updated

**`packages/shiki-core/AGENTS.md`**
- Added "Package Validation" section
- Documented pack validation (pack:check)
- Documented consumer validation (consumer:check)
- Explained the validation gates in the check script
- Clarified what each validation proves

## Validation Results

All acceptance criteria met:

✅ `pack:check` resolves paths from package root
✅ `pack:check` validates tarball contents using `pnpm pack --dry-run --json`
✅ `consumer:check` builds and installs tarball into clean temp project
✅ Runtime ESM import validation works
✅ TypeScript declaration validation works
✅ Internal subpaths properly blocked
✅ Temp directories cleaned up safely
✅ Root check includes packed-consumer validation
✅ Public API unchanged; no subpath exports added
✅ Generator pattern works with or without SHIKI_CORE_KEEP_CONSUMER_TEMP

## Workflow

The final validation flow is:

```
pnpm check (root)
  └─ pnpm check:shiki-core
     └─ pnpm --dir packages/shiki-core run check
        ├─ pnpm run build (tsup)
        ├─ pnpm run typecheck (tsc)
        ├─ pnpm run test (vitest)
        ├─ pnpm run lint (publint)
        ├─ pnpm run pack:check (assert-pack-files.mjs)
        └─ pnpm run consumer:check (validate-packed-consumer.mjs)
```

To debug consumer validation and inspect the temp directory:

```bash
SHIKI_CORE_KEEP_CONSUMER_TEMP=1 pnpm run consumer:check
```

This retains the temp directory at `%TEMP%/shiki-core-consumer-*` for inspection without automatic cleanup.

---

## Original Phase 5 Plan (Reference)

The plan below documents the design approach. The implementation followed this plan with minor adaptations.

- Verify the package as an installed `.tgz`, not as a workspace-linked package.
- Keep the public contract root-only: `@ravenhill/shiki-core`.
- Prove both runtime ESM usage and TypeScript declaration consumption.
- Ensure internal implementation paths remain inaccessible.
- Make validation deterministic and safe to run locally and in CI.

## Non-goals

- Do not add subpath exports.
- Do not expose test-only cache, warning, or highlighter internals.
- Do not modify Astro UI, app consumers, or public API names.
- Do not add changelog entries in this phase.
- Do not rely on workspace hoisting, source imports, or direct `dist/` imports.

## Key Changes

### 1. Fix pack-file validation path resolution

Update `packages/shiki-core/scripts/assert-pack-files.mjs` so all package-relative operations resolve from the package
root, not from `scripts/`.

The script should:

- derive `scriptDir` from `import.meta.url`;
- resolve `packageRoot = path.resolve(scriptDir, '..')`;
- read `packageRoot/package.json`;
- run `pnpm pack --dry-run --json` with `cwd: packageRoot`;
- assert the packed file list from the dry-run result.

`pnpm pack --dry-run` is the right primitive here because it performs the pack operation without writing the tarball,
and `--json` gives machine-readable output. ([pnpm][2])

### 2. Keep pack validation focused on package shape

`pack:check` should validate package contents, not consumer behaviour.

It should assert:

- required files are included:

  - `dist/index.js`
  - `dist/index.d.ts`
  - `README.md`
  - `package.json`
- source files are excluded:

  - `src/**`
  - `tests/**`
  - `scripts/**`
  - `vitest.config.*`
  - `tsup.config.*`
  - local fixtures or generated temp files
- package metadata stays publishable:

  - `name`
  - `version`
  - `type: "module"`
  - root-only `exports`
  - `main`
  - `types`
  - `files`

The `files` field is part of npm package metadata and controls which files are included in the package, so testing it
directly catches publication drift before consumers see it. ([npm Docs][3])

### 3. Strengthen packed-consumer validation

Update `packages/shiki-core/scripts/validate-packed-consumer.mjs` to perform a true external install.

The script should:

1. build `@ravenhill/shiki-core`;
2. create a unique temp root with `fs.mkdtemp`;
3. run `pnpm pack --pack-destination <temp>/tarballs --json`;
4. create `<temp>/consumer`;
5. generate a minimal consumer `package.json`;
6. install the generated `.tgz`;
7. install `typescript` as a consumer dev dependency;
8. generate runtime and TypeScript probe files;
9. run the probes;
10. clean up only the generated temp root.

The consumer must be outside the workspace so pnpm cannot silently resolve through workspace links. `pnpm add` supports
local tarballs as package sources, so the validation should install the actual generated archive rather than the package
directory. ([pnpm][4])

## Consumer Probe Design

### Runtime ESM probe

Generate something like:

```ts
import { createShikiHighlighterService, resolveShikiLanguage } from "@ravenhill/shiki-core";

const service = createShikiHighlighterService();

if (typeof service !== "object") {
    throw new Error("Expected createShikiHighlighterService() to return an object.");
}

if (resolveShikiLanguage("typescript") !== "typescript") {
    throw new Error("Expected TypeScript language resolution to work.");
}
```

Run it with Node after writing it as `.mjs`, or write a small `.ts` file and compile it first. Prefer a `.mjs` runtime
probe so this test proves direct ESM execution without involving TypeScript.

### TypeScript declaration probe

Generate `consumer/src/typecheck.ts`:

```ts
import {
    createShikiHighlighterService,
    resolveShikiLanguage,
    type ShikiHighlighterService,
} from "@ravenhill/shiki-core";

const service: ShikiHighlighterService = createShikiHighlighterService();
const language: string = resolveShikiLanguage("ts");

void service;
void language;
```

Generate a minimal `tsconfig.json`:

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": false
    },
    "include": ["src/**/*.ts"]
}
```

Use `NodeNext` because the package is ESM-only and the validation should model Node-compatible package resolution rather
than bundler-only behaviour. TypeScript’s module and module resolution settings affect how imports, package exports, and
declarations are interpreted. ([TypeScript][5])

Run:

```bash
pnpm exec tsc --noEmit
```

### Internal subpath rejection probe

Assert that all of these fail:

```ts
/shiki-core/src;
/shiki-core/src / index;
/shiki-core/dist;
/shiki-core/dist / index;
/shiki-core/internal;
/shiki-core/languages;
/shiki-core/transformers;
```

For runtime checks, use dynamic `import()` and assert failure. The assertion should not depend on only one exact error
string, but it should accept expected package-export failures such as `ERR_PACKAGE_PATH_NOT_EXPORTED`.

For TypeScript checks, optionally generate a separate negative file and assert `tsc` fails. Keep this separate from the
positive declaration probe so failures are easy to diagnose.

## Script Responsibilities

### `assert-pack-files.mjs`

Responsible for package archive shape.

Should answer:

> “Would the package publish the expected files and exclude implementation/test/build scaffolding?”

### `validate-packed-consumer.mjs`

Responsible for installed-consumer behaviour.

Should answer:

> “Can a clean external project install and consume this tarball exactly through the supported public API?”

### `package.json` scripts

Keep the package script surface as:

```json
{
    "scripts": {
        "pack:dry-run": "pnpm pack --dry-run --json",
        "pack:check": "node scripts/assert-pack-files.mjs",
        "consumer:check": "node scripts/validate-packed-consumer.mjs",
        "check": "pnpm run build && pnpm run pack:check && pnpm run consumer:check"
    }
}
```

At the root, keep:

```json
{
    "scripts": {
        "check:shiki-core": "pnpm --dir packages/shiki-core run check"
    }
}
```

Then ensure root `pnpm check` includes `check:shiki-core`.

## TDD Sequence

### Cycle 5.1 — Lock current pack-check failure

Add or adjust a test fixture, or run the script in a way that exposes the current incorrect path resolution.

Expected failure:

- `assert-pack-files.mjs` reads from the wrong directory or cannot find the correct `package.json`.

Implementation:

- resolve package root from `scripts/`;
- run all package-relative commands with `cwd: packageRoot`.

### Cycle 5.2 — Prove tarball contents are deterministic

Add assertions around the dry-run file list.

Expected failure:

- missing required output files;
- accidental inclusion of source, tests, scripts, configs, or temp artifacts.

Implementation:

- parse `pnpm pack --dry-run --json`;
- normalise paths to POSIX-style paths;
- compare against allow/deny patterns.

### Cycle 5.3 — Install the real tarball externally

Expected failure:

- consumer script still uses workspace package links or package directory installs.

Implementation:

- create temp consumer outside the repository;
- pack to a temp tarball directory;
- install the generated `.tgz`;
- avoid `workspace:*`, `link:`, or `file:../package-root`.

### Cycle 5.4 — Add runtime ESM validation

Expected failure:

- the installed package cannot be imported through the root entry point.

Implementation:

- generate a `.mjs` runtime probe;
- import from `@ravenhill/shiki-core`;
- call a small stable API surface.

### Cycle 5.5 — Add declaration validation

Expected failure:

- declarations are missing, incorrectly exported, or incompatible with ESM resolution.

Implementation:

- add `typescript` to the temp consumer;
- generate `tsconfig.json`;
- run `pnpm exec tsc --noEmit`.

### Cycle 5.6 — Add internal import rejection

Expected failure:

- one or more internal subpaths can be imported.

Implementation:

- dynamically import blocked subpaths;
- assert they fail;
- include both obvious paths and likely implementation paths.

## Cleanup Rules

The validation script should create one unique temp root and remove only that root.

Recommended structure:

```text
<os-temp>/shiki-core-consumer-xxxxxx/
├─ tarballs/
│  └─ ravenhill-shiki-core-0.1.0.tgz
└─ consumer/
   ├─ package.json
   ├─ tsconfig.json
   └─ src/
      └─ typecheck.ts
```

Do not write generated tarballs into the package root. This avoids deleting pre-existing files and keeps the repository
clean even if validation fails halfway through.

Use `try/finally` for cleanup, with an opt-in debug escape hatch such as:

```bash
SHIKI_CORE_KEEP_CONSUMER_TEMP=1 pnpm run consumer:check
```

That makes CI clean by default while still allowing local diagnosis.

## Test Plan

Run focused checks first:

```bash
pnpm --dir packages/shiki-core run build
pnpm --dir packages/shiki-core run pack:check
pnpm --dir packages/shiki-core run consumer:check
pnpm --dir packages/shiki-core run check
```

Then run the workspace gate:

```bash
pnpm check
```

## Acceptance Criteria

- `pack:check` resolves paths from the package root, regardless of where it is launched from.
- `pack:check` verifies the intended package contents using `pnpm pack --dry-run --json`.
- `consumer:check` builds the package and installs the generated `.tgz` into a clean temp project outside the workspace.
- The temp consumer successfully imports `@ravenhill/shiki-core` at runtime through ESM.
- The temp consumer successfully type-checks root imports with `tsc --noEmit`.
- Internal subpaths such as `src`, `dist`, and implementation-oriented paths fail.
- Generated tarballs and temp consumers are cleaned up safely.
- `pnpm check:shiki-core` and root `pnpm check` include packed-consumer validation.
- No public API names, app UI, Astro components, or subpath exports are changed.

## Main Refinement Over the Original Plan

The strongest improvement is to split validation into two independent contracts:

- `pack:check` validates **what would be published**.
- `consumer:check` validates **what an external project can actually consume**.

That separation keeps the scripts smaller, makes failures easier to interpret, and directly protects the package
boundary that `exports` is meant to enforce.

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.1.0 Documentation"
[2]: https://pnpm.io/cli/pack?utm_source=chatgpt.com "pnpm pack"
[3]: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/?utm_source=chatgpt.com "package.json"
[4]: https://pnpm.io/cli/add?utm_source=chatgpt.com "pnpm add <pkg>"
[5]: https://www.typescriptlang.org/tsconfig/moduleResolution.html?utm_source=chatgpt.com "TSConfig Option: moduleResolution"
