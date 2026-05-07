# [DONE] Phase 4: Validate `@ravenhill/content-core` as a Packaged Consumer Dependency

## Summary

Add an external packaged-consumer validation step for `@ravenhill/content-core`.

Phase 3 proves that the package can be built and packed. Phase 4 proves that the resulting tarball works when consumed
like a normal dependency from outside the workspace.

The validation script should:

1. build the package;
2. create a tarball with `npm pack`;
3. create a temporary consumer project outside the pnpm workspace;
4. install the tarball as a normal dependency;
5. run runtime ESM checks;
6. run TypeScript declaration checks;
7. verify unsupported subpaths are blocked.

This catches problems that workspace linking, path aliases, and source-level tests can hide.

## Goals

- Validate the packed tarball in an external temporary project.
- Prove runtime root imports work from installed package artifacts.
- Prove TypeScript declarations work from installed package artifacts.
- Prove package `exports` preserves the root-only public API.
- Avoid workspace leakage during validation.
- Keep validation local and registry-free.
- Wire the consumer check into `check:content-core`.

## Non-Goals

- Do not publish to a registry.
- Do not add Changesets, semantic-release, Nx, Turbo, or release automation.
- Do not add a permanent example application.
- Do not change the package’s `private: true` policy.
- Do not use the root Astro app as the consumer fixture.
- Do not validate every package feature; validate package-consumption boundaries.
- Do not require network access beyond what is already needed to install TypeScript in the temp project, unless the
  script uses the repository’s existing TypeScript binary.

## Rationale

Workspace imports can pass even when a packed package is broken. A tarball consumer catches issues in:

- `package.json` `exports`;
- generated declaration files;
- missing packed files;
- incorrect ESM output;
- accidental reliance on workspace path aliases;
- accidental subpath access.

Node’s package `exports` field explicitly defines supported entry points and encapsulates undeclared subpaths, so a real
installed-package check is the right place to verify the root-only contract. :contentReference[oaicite:0]{index=0}

TypeScript follows package `exports` for bare package lookups when using modern module resolution modes such as
`node16`, `nodenext`, or `bundler`, so the temporary consumer should use one of those modes rather than legacy `node`
resolution. :contentReference[oaicite:1]{index=1}

## Script Additions

Add:

```text
packages/content-core/scripts/validate-packed-consumer.mjs
```

Add package scripts:

```json
{
    "scripts": {
        "consumer:check": "node scripts/validate-packed-consumer.mjs",
        "check": "pnpm run build && pnpm run lint:package && pnpm run pack:check && pnpm run consumer:check"
    }
}
```

Adjust the exact `check` sequence to match Phase 3 script names. The policy is:

```text
build -> package lint -> pack-file assertion -> consumer validation
```

Then ensure the root script still delegates to the package check:

```json
{
    "scripts": {
        "check:content-core": "pnpm --dir packages/content-core run check"
    }
}
```

## Validation Script Design

The script should be deterministic and fail with clear diagnostics.

### Responsibilities

`validate-packed-consumer.mjs` should:

1. resolve the repository root and package root;
2. run the package build;
3. run `npm pack --json` in `packages/content-core`;
4. parse the generated tarball path;
5. create a temporary directory with `fs.mkdtemp`;
6. write a minimal consumer `package.json`;
7. install the tarball into the temp consumer;
8. write runtime and TypeScript consumer files;
9. execute runtime checks with Node;
10. execute TypeScript checks;
11. execute subpath-boundary checks;
12. remove the temp directory unless a debug flag is enabled.

### Suggested temporary project layout

```text
<os-temp>/content-core-consumer-*/
  package.json
  tsconfig.json
  runtime-consumer.mjs
  type-consumer.ts
  subpath-runtime-consumer.mjs
  subpath-type-consumer.ts
  node_modules/
```

### Temporary consumer `package.json`

Use a minimal ESM project:

```json
{
    "private": true,
    "type": "module",
    "dependencies": {
        "@ravenhill/content-core": "file:/absolute/path/to/ravenhill-content-core-0.0.0.tgz"
    },
    "devDependencies": {}
}
```

Install with a package manager that will not discover the parent pnpm workspace.

Simplest option:

```sh
npm install --ignore-scripts
```

Using `npm` in the temp consumer is intentional: it simulates normal package consumption and avoids pnpm workspace
protocol behaviour. npm supports installing dependencies from local tarball paths. :contentReference[oaicite:2]{index=2}

If the repository strongly prefers pnpm everywhere, use:

```sh
pnpm install --ignore-workspace --ignore-scripts
```

but `npm install` is the cleaner isolation choice for this phase.

## Runtime Consumer Check

Write:

```text
runtime-consumer.mjs
```

Validate root value imports:

```js
import {
    CONTENT_CORE_PACKAGE_NAME,
    CONTENT_CORE_VERSION,
    LessonHref,
    LessonMetadataService,
    NavigationService,
    normalizeLessonMetadataPathname,
    parseGitCommitHash,
    parseNonEmptyText,
} from "@ravenhill/content-core";

if (CONTENT_CORE_PACKAGE_NAME !== "@ravenhill/content-core") {
    throw new Error("Unexpected package name.");
}

if (!/^\d+\.\d+\.\d+/.test(CONTENT_CORE_VERSION)) {
    throw new Error(`Unexpected package version: ${CONTENT_CORE_VERSION}`);
}

if (typeof parseNonEmptyText !== "function") {
    throw new Error("parseNonEmptyText is not a function.");
}

if (parseNonEmptyText(" Ada ") !== "Ada") {
    throw new Error("parseNonEmptyText did not normalize text.");
}

if (parseGitCommitHash("abc1234") !== "abc1234") {
    throw new Error("parseGitCommitHash did not accept a valid hash.");
}

if (normalizeLessonMetadataPathname("/notes/example/?x=1#top") !== "/notes/example/") {
    throw new Error("normalizeLessonMetadataPathname did not normalize the pathname.");
}

if (typeof LessonHref !== "function") {
    throw new Error("LessonHref is not available at runtime.");
}

if (typeof NavigationService !== "function") {
    throw new Error("NavigationService is not available at runtime.");
}

if (typeof LessonMetadataService !== "function") {
    throw new Error("LessonMetadataService is not available at runtime.");
}
```

Run:

```sh
node runtime-consumer.mjs
```

## TypeScript Consumer Check

Write:

```text
type-consumer.ts
```

Validate public declarations from the installed package:

```ts
import {
    type AbsoluteUrl,
    type GitCommitHash,
    type IsoShortDate,
    type LessonMetadataDto,
    type LessonMetadataIssue,
    type LessonMetadataLookupResult,
    type LessonMetadataResolutionResult,
    type LessonSourceFile,
    type NavigationResult,
    type NonEmptyText,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
    type TrailNode,
} from "@ravenhill/content-core";

const navigationResult: NavigationResult = {
    next: {
        title: "Next",
        href: "/notes/next/",
    },
};

const trailNode: TrailNode = {
    title: "Trail",
    href: "/notes/",
};

const metadata: LessonMetadataDto = {
    authors: [],
    changes: [],
};

const issue: LessonMetadataIssue = {
    path: "authors[0].name",
    field: "name",
    message: "Expected non-empty text.",
};

const lookup: LessonMetadataLookupResult = {
    kind: "missing",
    href: "/notes/missing/",
};

const resolution: LessonMetadataResolutionResult = {
    kind: "invalid",
    href: "/notes/broken/",
    issues: [issue],
};

const text = parseNonEmptyText("Ada Lovelace");
const url = parseAbsoluteUrl("https://example.com");
const hash = parseGitCommitHash("abc1234");
const date = parseIsoShortDateValue("2026-05-07");
const sourceFile = parseLessonSourceFile("notes/example.astro");

if (text !== undefined) {
    const brandedText: NonEmptyText = text;
}

if (url !== undefined) {
    const brandedUrl: AbsoluteUrl = url;
}

if (hash !== undefined) {
    const brandedHash: GitCommitHash = hash;
}

if (date !== undefined) {
    const brandedDate: IsoShortDate = date;
}

if (sourceFile !== undefined) {
    const brandedSourceFile: LessonSourceFile = sourceFile;
}

void navigationResult;
void trailNode;
void metadata;
void lookup;
void resolution;
```

### Temporary `tsconfig.json`

Use modern package resolution:

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "skipLibCheck": false,
        "noEmit": true
    },
    "include": [
        "*.ts"
    ]
}
```

Using `NodeNext` is appropriate here because this is a Node ESM package-consumer fixture and TypeScript should honour
package `exports` during bare package resolution. :contentReference[oaicite:3]{index=3}

### Running TypeScript

Prefer the repository’s existing TypeScript binary to avoid installing TypeScript in the temporary consumer:

```sh
node <repo-root>/node_modules/typescript/bin/tsc -p tsconfig.json
```

Run it with `cwd` set to the temp consumer directory so module resolution reads the temp consumer’s `node_modules`.

If the repository TypeScript binary is unavailable, fail with a clear message rather than silently installing from the
network.

## Subpath Boundary Checks

### Runtime subpath check

Write:

```text
subpath-runtime-consumer.mjs
```

```js
const blockedSubpaths = [
    "@ravenhill/content-core/navigation",
    "@ravenhill/content-core/lesson-metadata",
];

for (const specifier of blockedSubpaths) {
    try {
        await import(specifier);
    } catch (error) {
        if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" || error?.code === "ERR_MODULE_NOT_FOUND") {
            continue;
        }

        throw new Error(
            `Subpath ${specifier} failed with an unexpected error: ${error?.message ?? error}`,
        );
    }

    throw new Error(`Subpath ${specifier} unexpectedly resolved.`);
}
```

Run:

```sh
node subpath-runtime-consumer.mjs
```

Node should reject undeclared subpaths when `exports` is present. :contentReference[oaicite:4]{index=4}

### TypeScript subpath check

Write:

```text
subpath-type-consumer.ts
```

```ts
// @ts-expect-error Subpath imports are intentionally unsupported.
import("@ravenhill/content-core/navigation");

// @ts-expect-error Subpath imports are intentionally unsupported.
import("@ravenhill/content-core/lesson-metadata");
```

Then run `tsc -p tsconfig.json`.

Keep this in a separate fixture or include it in the same TypeScript check only if the `@ts-expect-error` assertions
behave reliably. If they become noisy, the runtime subpath check plus package `exports` validation may be sufficient for
Phase 4.

## Pack Artifact Shape

Keep the Phase 3 pack-file assertion as the source of truth for artifact contents.

Phase 4 should not duplicate the full file-list policy, but it should fail early if the tarball path cannot be found or
installed.

Expected package contents remain:

```text
package/package.json
package/README.md
package/dist/index.js
package/dist/index.d.ts
package/dist/index.js.map
```

Excluded:

```text
package/src/**
package/**/__tests__/**
package/AGENTS.md
package/tsup.config.ts
package/scripts/**
package/*.test.*
package/local fixture files
```

If `scripts/**` appears in the packed tarball, update the `files` field or pack assertion. The consumer validation
script belongs in the repository, not in the published artifact.

## Implementation Plan

### Step 1: Add the validation script

Create:

```text
packages/content-core/scripts/validate-packed-consumer.mjs
```

Use Node standard library only:

```text
node:child_process
node:fs/promises
node:os
node:path
node:url
```

Useful helpers:

```text
run(command, args, options)
writeJson(path, value)
writeText(path, value)
makeTempConsumer()
packPackage()
installTarball()
runRuntimeChecks()
runTypeChecks()
cleanupTempDir()
```

Keep helpers small and directly readable.

### Step 2: Add script flags

Support:

```text
--keep-temp
--verbose
```

`--keep-temp` is valuable when declaration resolution fails and the temporary consumer needs inspection.

`--verbose` should print commands, cwd values, and temp paths.

Default behaviour should clean up temporary directories.

### Step 3: Build and pack

Inside the script:

1. run `pnpm --dir packages/content-core run build`;
2. run `npm pack --json` from `packages/content-core`;
3. parse the first JSON result;
4. resolve the `.tgz` path from the package root.

Fail if:

- no pack result exists;
- more than one pack result exists;
- `filename` is missing;
- the `.tgz` file does not exist.

### Step 4: Create isolated consumer

Create the temp directory under `os.tmpdir()`.

Before writing files, assert the temp consumer is outside the repository root. This prevents accidental workspace
resolution.

Write:

```text
package.json
tsconfig.json
runtime-consumer.mjs
type-consumer.ts
subpath-runtime-consumer.mjs
subpath-type-consumer.ts
```

### Step 5: Install tarball

Run:

```sh
npm install --ignore-scripts <absolute-tarball-path>
```

with `cwd` set to the temp consumer.

`--ignore-scripts` avoids executing lifecycle scripts from dependencies during validation.

### Step 6: Run runtime checks

Run:

```sh
node runtime-consumer.mjs
node subpath-runtime-consumer.mjs
```

with `cwd` set to the temp consumer.

### Step 7: Run TypeScript checks

Run the repository TypeScript binary:

```sh
node <repo-root>/node_modules/typescript/bin/tsc -p tsconfig.json
```

with `cwd` set to the temp consumer.

This avoids a network dependency and validates the installed package from the temp consumer’s `node_modules`.

### Step 8: Wire package scripts

Update:

```text
packages/content-core/package.json
```

Add:

```json
{
    "scripts": {
        "consumer:check": "node scripts/validate-packed-consumer.mjs"
    }
}
```

Update `check` so the consumer check runs after build/package validation.

Recommended order:

```text
typecheck -> build -> publint -> pack:check -> consumer:check
```

Running consumer validation after `pack:check` gives cleaner failure messages: first verify artifact shape, then verify
consumption.

### Step 9: Update root wiring

Ensure:

```sh
pnpm check:content-core
```

covers:

- source typecheck;
- runtime tests;
- Vitest type fixtures;
- package build;
- package lint;
- pack-file assertion;
- packaged-consumer validation.

### Step 10: Update traceability

Update the roadmap and traceability note with:

- command run;
- Node/TypeScript versions used;
- tarball filename;
- temp consumer strategy;
- known limitations.

## Consumer Validation Scenarios

### Runtime root import

Validate:

- `CONTENT_CORE_PACKAGE_NAME`;
- `CONTENT_CORE_VERSION`;
- representative navigation value exports;
- representative metadata value exports;
- parser/helper behaviour.

### Type declarations

Validate:

- public types import from root;
- minimal value assignment for:
  - `NavigationResult`;
  - `TrailNode`;
  - `LessonMetadataDto`;
  - `LessonMetadataIssue`;
  - `LessonMetadataLookupResult`;
  - `LessonMetadataResolutionResult`;
- branded parser return values narrow to exported branded types.

### Package boundaries

Validate:

- root import succeeds;
- `@ravenhill/content-core/navigation` fails at runtime;
- `@ravenhill/content-core/lesson-metadata` fails at runtime;
- subpath imports fail at type-check time when reliable under the selected TypeScript settings.

### Artifact cleanliness

Keep Phase 3 pack-file assertion as the authoritative check for:

- included files;
- excluded source;
- excluded tests;
- excluded scripts;
- excluded local configs;
- excluded agent/project guidance.

## Test Plan

### Focused commands

```sh
pnpm --dir packages/content-core run consumer:check
pnpm check:content-core
pnpm test:typecheck:content-core
```

### Runtime consumer checks

Run inside the temporary consumer:

```sh
node runtime-consumer.mjs
node subpath-runtime-consumer.mjs
```

### Type consumer checks

Run from the repository TypeScript binary with temp consumer as cwd:

```sh
node <repo-root>/node_modules/typescript/bin/tsc -p tsconfig.json
```

### Final verification

```sh
pnpm check
```

Record results in the Phase 4 traceability note.

## Acceptance Criteria

- Done: `consumer:check` builds and packs `@ravenhill/content-core`.
- Done: `consumer:check` creates a temporary consumer outside the workspace.
- Done: The temporary consumer installs the generated tarball as a normal dependency.
- Done: Runtime root imports work from the installed tarball.
- Done: Representative parser/helper functions work from the installed tarball.
- Done: TypeScript resolves declarations from the installed tarball.
- Done: Branded parser return values narrow to exported branded types in the consumer.
- Done: Runtime imports of unsupported subpaths fail.
- Done: TypeScript subpath checks fail as expected through adjacent `@ts-expect-error` assertions.
- Done: The validation script uses no new runtime dependency.
- Done: The validation script supports `--keep-temp` for debugging and `--verbose` for command tracing.
- Done: `pnpm check:content-core` includes the packaged-consumer check.
- Done: `private: true` remains unchanged.
- Done: No registry publish occurred.

## Implementation Notes

- Added `packages/content-core/scripts/validate-packed-consumer.mjs`.
- Added `consumer:check` to `packages/content-core/package.json`.
- Updated package `check` so the packaged-consumer validation runs after build, declaration checking, `publint`, and the
  pack-file assertion.
- The temporary consumer is created under the OS temp directory, outside the repository, and installed with
  `npm install --ignore-scripts <tarball>`.
- The script uses the repository TypeScript binary for the temporary consumer check, avoiding a network dependency for
  TypeScript.
- On Windows, the script invokes Node directly and calls `npm.cmd` for npm operations so command resolution does not
  accidentally pick extensionless shims.

## Verification Results

```sh
pnpm --dir packages/content-core run consumer:check
```

Status: passed. The generated tarball was `ravenhill-content-core-0.0.0.tgz`; the script removed it after validation.

```sh
pnpm check:content-core
```

Status: passed. This ran the package build, source typecheck, `publint --strict`, pack-file assertion, packaged-consumer
validation, and root API type fixtures.

## Risks and Mitigations

| Risk                                                       | Mitigation                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| The temp consumer accidentally resolves workspace sources. | Create it under `os.tmpdir()`, outside the repo, and install the `.tgz` with `npm install`. |
| TypeScript check uses the wrong module resolution mode.    | Use `module` and `moduleResolution` set to `NodeNext`.                                      |
| The script requires network access to install TypeScript.  | Use the repository TypeScript binary and fail clearly if missing.                           |
| Subpath type checks pass or fail inconsistently.           | Keep runtime subpath checks authoritative; include type subpath checks only if stable.      |
| Package scripts run during dependency install.             | Install with `npm install --ignore-scripts`.                                                |
| The tarball includes validation scripts or fixtures.       | Keep pack-file assertion authoritative and exclude `scripts/**` from package files.         |
| Failure output is hard to debug.                           | Add `--verbose` and `--keep-temp`.                                                          |
| Consumer validation slows every full check.                | Run it in `check:content-core`; keep broader `pnpm check` policy explicit.                  |
| Phase 4 drifts into release automation.                    | Keep publishing, registry auth, Changesets, and release workflows out of scope.             |
