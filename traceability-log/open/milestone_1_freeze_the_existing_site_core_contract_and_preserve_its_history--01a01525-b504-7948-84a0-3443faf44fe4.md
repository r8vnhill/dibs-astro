# Milestone 1 — Freeze the existing `site-core` contract and preserve its history

## Goal

Freeze the observable contract of the current workspace implementation of `@ravenhill/site-core@0.1.0`, capture
reproducible baseline evidence from its existing `tsup` package artifact, and produce a **local history-preserving
extraction candidate** whose source history can be traced back to `astro-website/packages/site-core`.

At the end of this milestone:

```text
astro-website/packages/site-core
        │
        ├── executable consumer contract
        ├── baseline tsup artifact + evidence
        └── known monorepo dependencies
                    │
                    ▼
          history-preserving extraction
                    │
                    ▼
          local site-core Git repository
```

The extracted repository does **not** need to be independently buildable yet. Making it standalone with Bun, dprint,
tsdown, package-local dependencies, and CI belongs to Milestone 2.

No GitLab project, registry entry, release, or DIBS dependency migration occurs in this milestone.

---

# Contract taxonomy

Before adding tests, classify the current state so that later milestones do not accidentally preserve implementation
details or stale operational configuration.

## 1. Consumer API contract — preserve

The current public contract includes:

- package name `@ravenhill/site-core`;
- ESM-only consumption;
- one public root entry point;
- root-only imports;
- runtime exports;
- TypeScript exports;
- repository URL/link behavior;
- repository-platform normalization;
- passive root import / `sideEffects: false`;
- unsupported package subpaths remaining inaccessible.

The package README explicitly defines root-only consumption and host independence, and `src/index.ts` exposes the
package identity, repository constants/helpers, and public repository types through that root.

## 2. Distribution contract — preserve as the Milestone 2 oracle

Capture the current `tsup` shape:

```text
entry       src/index.ts
format      ESM
dts         yes
sourcemap   yes
target      ES2022
platform    neutral
outDir      dist
splitting   false
minify      false
```

The current configuration explicitly treats changes to several of these properties as distribution-contract changes.

The current packed artifact allowlist is:

```text
package/README.md
package/dist/index.d.ts
package/dist/index.js
package/dist/index.js.map
package/package.json
```

with source, tests, `AGENTS.md`, and build/test configuration excluded.

## 3. DIBS integration contract — record, do not change

Record:

- every current production import of `@ravenhill/site-core`;
- every architecture layer currently authorized to consume it;
- the root-only import policy;
- all root build/check scripts that currently depend on the workspace package.

The architecture rules currently model `site-core` as a host-agnostic workspace source layer and independently enforce
root-only package imports.

## 4. Extraction/tooling state — record, do not freeze

These are **not** public compatibility requirements:

- pnpm workspace membership;
- `tsup` itself;
- root-monorepo `node_modules`;
- extending `astro/tsconfigs/strictest`;
- current script implementation;
- current directory layout below the public entry point;
- the current registry URL in `publishConfig`.

In particular, the existing `publishConfig` still names a different GitLab project, so it must be recorded as current
operational state but must **not** become part of the preserved consumer contract.

---

# Phase 1 — Inventory the extraction boundary and freeze the source ref [DONE]

## Goal

Identify exactly what belongs to `site-core`, what DIBS currently consumes, and which source commit defines the
baseline.

## Scope

Inspect:

```text
packages/site-core/**
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
scripts/lib/layer-boundary/**
scripts/__tests__/layer-boundary/**
docs/architecture/layer-separation.md
production imports of @ravenhill/site-core
root scripts invoking site-core
```

Do not edit behavior yet.

## TDD cycle 1 — Complete ownership inventory

### Red

Create an explicit extraction inventory and make it fail if an expected category has not been classified.

At minimum classify each relevant file as one of:

```text
package source
package test
package build configuration
package verification
package documentation
package-owned but intentionally deferred tooling
DIBS consumer
DIBS architecture contract
monorepo-only infrastructure
```

Use Git rather than manually assuming the current directory tree is complete.

For example, inspect:

```sh
git ls-files packages/site-core
git log -- packages/site-core
```

and search the repository for both root and subpath imports of `@ravenhill/site-core`.

### Green

Record the inventory in the milestone evidence.

Do not move files.

### Refactor

Keep the inventory machine-readable or mechanically checkable where practical rather than maintaining a prose-only
checklist.

## TDD cycle 2 — Freeze the source identity

Record:

```text
source repository
source branch
exact source commit
package path
package version
root pnpm-lock identity
Node/pnpm toolchain identity
```

This gives later baseline evidence an unambiguous origin.

### Acceptance criteria

- every tracked file under `packages/site-core` is classified;
- all DIBS imports are enumerated;
- subpath imports are separately searched for and none are silently accepted;
- the exact baseline commit is recorded;
- no production behavior or package metadata has changed.

## Phase 1 evidence — completed 2026-08-18

No production behavior or package metadata was changed while gathering this evidence.

### Ownership inventory

All 19 files tracked under `packages/site-core` (`git ls-files packages/site-core`), classified:

| Category                        | Files                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| package source                   | `src/index.ts`, `src/repositories/index.ts`, `src/repositories/repo-links.ts`, `src/repositories/repo-platform.ts`, `src/repositories/repo-platform-normalization.ts`, `src/repositories/repo-ref.ts`         |
| package test                     | `src/__tests__/root-api.test.ts`, `src/__tests__/root-api.subpaths.test-d.ts`, `src/__tests__/root-api-side-effects.test.ts`, `src/repositories/__tests__/repo-links.test.ts`, `src/repositories/__tests__/repo-platform-normalization.test.ts` |
| package build configuration      | `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`                                                                                                                                        |
| package verification             | `scripts/assert-pack-files.mjs`, `scripts/validate-packed-consumer.mjs`                                                                                                                                      |
| package documentation             | `README.md`, `AGENTS.md`                                                                                                                                                                                     |
| package-owned but deferred tooling | none tracked (generated `dist/` and package-local `node_modules/` exist on disk but are untracked/gitignored)                                                                                               |

No files were found under `packages/site-core` that fall outside these six categories. `6 + 5 + 4 + 2 + 2 = 19` accounts for every tracked file.

### DIBS consumer inventory

Repo-wide search for `@ravenhill/site-core` (case-insensitive, excluding `node_modules`) found these production consumers, all importing **root-only**:

| File                                              | Import                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/components/git/RepoLink.astro`                | `buildRepoLinkText, buildRepoUrl, REPO_PLATFORM_LABEL, type RepoPlatform, type RepoRef`                     |
| `src/components/notes/LessonRepoPanel.astro`       | `normalizePlatforms, type RepoRef`                                                                          |
| `src/components/notes/LessonMetaPanel.astro`       | `type RepoPlatform, type RepoRef`                                                                           |
| `src/infrastructure/adapters/site-data-adapter.ts` | `type RepoPlatform, type RepoRef`                                                                           |
| `src/layouts/NotesLayout.astro`                    | `type RepoRef`                                                                                              |
| `src/layouts/NotesLayout.props.ts`                 | `type RepoRef`                                                                                              |
| `src/layouts/LessonDocumentLayout.props.ts`        | `type RepoRef`                                                                                              |
| `src/presentation/adapters/lesson-metadata-panel.ts` | `buildCommitUrl, normalizePlatforms, REPO_PLATFORM_LABEL, type RepoPlatform, type RepoRef`                 |
| `src/data/site.ts`                                 | `type RepoPlatform, type RepoRef`                                                                           |

**Subpath search** (`@ravenhill/site-core/`) found no production import anywhere in `src/`. The only hits are, as expected, the two places that assert the subpath stays blocked (`packages/site-core/src/__tests__/root-api.subpaths.test-d.ts`, `packages/site-core/scripts/validate-packed-consumer.mjs`), one negative-example line each in `packages/site-core/src/index.ts` and `src/repositories/index.ts`'s doc comments, and prose mentions in `docs/architecture/layer-separation.md` and closed traceability logs. No silent subpath consumer exists.

Note: `src/presentation/adapters/site-data.ts` does **not** import `@ravenhill/site-core` directly — it re-exports query functions from `site-data-adapter.ts`, which is the actual typed boundary. It is an indirect consumer only.

### DIBS architecture contract inventory

- `scripts/lib/layer-boundary/rules.mjs` — declares `siteCoreBoundaryRule` (source `site-core`, `allowedTargets: ["site-core"]`, `forbiddenTargets` covering every app-local layer plus `content-core`, `forbiddenPackages: ["astro", "react", "react-dom", "zod", "@ravenhill/content-core"]`, `allowedPackages: ["@ravenhill/site-core", "vitest", "fast-check"]`); registers `@ravenhill/site-core` in `rootOnlyWorkspacePackages` (id `site-core-root-import`); and lists `"site-core"` in `allowedTargets` for `domainBoundaryRule`, `applicationBoundaryRule`, `infrastructureBoundaryRule`, `presentationAdapterBoundaryRule`, and `uiBoundaryRule`.
- `scripts/__tests__/layer-boundary/layer-boundary-rules.test.ts` — exercises the rule matrix above.
- `docs/architecture/layer-separation.md` — documents `packages/site-core/src/**` as the `site-core` layer, the root-only import rule (`@ravenhill/site-core` valid, `@ravenhill/site-core/*` not allowed), and records under "Site-core extraction" that this layer/rule pair was added by the original extraction.
- `astro-website/AGENTS.md:38` — states `packages/site-core` is "a private, host-agnostic package consumed as `@ravenhill/site-core`."

### Monorepo-only infrastructure (not part of the preserved consumer contract)

- `pnpm-workspace.yaml` — lists `packages/site-core` as a workspace member.
- root `package.json` — `"@ravenhill/site-core": "workspace:*"` dependency; scripts `build:site-core` (`node scripts/run-workspace-script.mjs packages/site-core build`) and `check:site-core` (`pnpm --dir=packages/site-core run check`); invoked from `predev`, `prebuild`, `check`, and `predeploy`.
- `pnpm-lock.yaml` — resolves the workspace link.
- `.gitlab-ci.yml` — `build:site-core` runs as a prerequisite step inside `test:unit`, `test:astro-render`, and `test:e2e` jobs (no job builds/checks site-core in isolation).

### Source identity freeze

```text
source repository       origin — git@gitlab.com:r8vnhill/dibs-astro-website.git
                         (mirrored: github — git@github.com:r8vnhill/dibs-astro.git)
source branch            dev/qa (up to date with origin/dev/qa)
exact source commit      67e80789e7117479a32301961f56267d946c4205
package path              packages/site-core
package version           0.1.0
root pnpm-lock SHA-256    b468035970b40b5df1a72472bbff9277d4f03b8762e34dc82cd222c5b61c5040
declared Node engine      >=24 <27  (root package.json "engines")
actual local toolchain    node v26.7.0, pnpm 11.8.0
```

Package-touching commit history (`git log --oneline -- packages/site-core`, oldest first): `76228da` (💥 rm(lessons): Simplify project by removing unused lesson artefacts) is the earliest commit touching this path in current history, followed by `f7f593f`, `3d34963`, `685b55f`, `f441621`, `ade81e9`, `837f9de` — 7 commits total. Consistent with the plan's note that the current path was introduced by the May 8 extraction; the historical-path/rename audit for pre-`packages/site-core` names is deferred to Phase 5 as scoped.

---

# Phase 2 — Strengthen the executable consumer contract [DONE]

## Goal

Ensure the existing workspace package has enough executable characterization to serve as the oracle for extraction and
the later `tsup → tsdown` migration.

The current suite already has a strong base: Vitest examples, DDT and `fast-check` properties cover repository URLs and
normalization; separate tests cover root exports and side-effect-free importing.

## TDD cycle 1 — Complete the root API contract

### Red

Add the smallest missing type-surface characterization for **every public type** exported from the root:

```text
RepoRef
RepoPlatform
BuildRepoUrlOptions
BuildCommitUrlOptions
BuildRepoLinkTextOptions
```

The current runtime root test covers values/functions, while the packed type consumer currently exercises only part of
the exported type surface.

Also explicitly characterize:

```text
SITE_CORE_PACKAGE_NAME
SITE_CORE_VERSION
DEFAULT_REPO_PLATFORMS
REPO_PLATFORM_HOST
REPO_PLATFORM_LABEL
isRepoPlatform
normalizePlatforms
buildRepoUrl
buildCommitUrl
buildRepoLinkText
```

### Green

Extend the existing root/type suites rather than creating an overlapping second suite.

### Refactor

Keep compile-time contracts separate from runtime behavior, but use the same public root import.

Do not test internal `repositories/*` modules directly when the requirement is public compatibility.

---

## TDD cycle 2 — Lock root-only imports

### Red

Use DDT for blocked consumer paths, including the ones already exercised by the packed-consumer contract:

```text
@ravenhill/site-core/repositories
@ravenhill/site-core/src/index.js
@ravenhill/site-core/dist/index.js
```

Require both:

```text
runtime resolution rejected
type-level resolution rejected
```

The existing packed-consumer script already performs these checks; preserve them as first-class baseline behavior.

### Green

Make the current package pass without expanding `exports`.

### Refactor

Do not generalize the package to multiple public entry points.

---

## TDD cycle 3 — Retain the existing property-based contracts

Do not replace the existing `fast-check` tests with example-only coverage.

They already express useful invariants such as:

- repository URLs retain the selected host and `user/repo`;
- commit URLs preserve commit identifiers and platform-specific routes;
- normalization returns only valid, unique platforms;
- whitespace-only labels fall back consistently.

Add new PBT only if the inventory reveals an uncharacterized invariant. Do not expand PBT merely for test count.

### Acceptance criteria

- the complete public runtime surface is characterized;
- the complete exported type surface is compile-checked;
- root-only consumption is enforced at runtime and type level;
- existing PBT remains green;
- no internal module path has been promoted to public API.

---

# Phase 3 — Capture the pre-extraction package baseline [DONE]

## Goal

Produce one baseline `tsup` candidate and a machine-readable semantic manifest that Milestone 2 can use as its
independent oracle.

## TDD cycle 1 — Package artifact contract

### Red

Run the existing package verification against the current workspace state:

```text
build
typecheck
Vitest
publint --strict
pack contract
clean packed consumer
```

The current package's `check` script already composes these checks.

### Green

Build exactly one baseline `.tgz` from the frozen source commit.

Do not repeatedly build separate tarballs for individual assertions.

Record:

```text
package name
package version
source commit
archive filename
archive SHA-256
sorted packed-file list
main
types
exports
files
sideEffects
```

Also record the build contract:

```text
entry
format
target
platform
declarations
source maps
```

### Refactor

Use a small generated baseline manifest rather than copying these values manually into prose.

A suitable temporary shape is:

```json
{
    "schemaVersion": 1,
    "sourceCommit": "<commit>",
    "package": {
        "name": "@ravenhill/site-core",
        "version": "0.1.0"
    },
    "distribution": {
        "moduleKind": "esm",
        "publicSubpaths": ["."],
        "sideEffects": false
    },
    "artifact": {
        "archive": "ravenhill-site-core-0.1.0.tgz",
        "sha256": "<sha256>",
        "files": []
    }
}
```

Keep this as **migration evidence**, not package API.

## TDD cycle 2 — Packed-consumer baseline

Run the current clean consumer against the same baseline contract and record success for:

```text
ESM root import
representative runtime behavior
package identity/version
TypeScript declaration resolution
blocked runtime subpaths
blocked type subpaths
```

The current consumer already installs the packed archive into a temporary ESM project outside the repository, which is
exactly the appropriate boundary for this milestone.

Do not rewrite that 251-line script during Milestone 1. Its Bun-native decomposition is part of the later
standalone-tooling work.

### Acceptance criteria

- one identifiable baseline tarball exists for the milestone;
- its SHA-256 and file list are recorded;
- `publint` passes;
- a clean temporary project consumes the tarball successfully;
- the evidence distinguishes consumer/distribution contracts from operational metadata;
- no registry publication occurs.

## Phase 3 evidence — completed 2026-08-18

No production behavior or package metadata was changed while gathering this evidence. Only one baseline `.tgz` was
built (via a single `npm pack --json` invocation against one `tsup` build); it was hashed and then discarded — it is
not committed to the repository. The full verification pipeline (`pnpm --dir packages/site-core run check`) was also
run once end-to-end as the Red/Green gate; that script performs its own separate, ephemeral packs for
`pack:check`/`consumer:check` as pre-existing behavior and was not modified.

A machine-readable baseline manifest recording all of the values below lives at
`packages/site-core/migration/baseline-manifest.json`.

### Source identity for this baseline

```text
sourceCommit (baseline build)   fc75f126ee229dc75169cf689effe5d8870d1949
extractionFreezeCommit (Phase 1) 67e80789e7117479a32301961f56267d946c4205
```

These are recorded separately on purpose: `fc75f12` is the workspace `HEAD` used to build this baseline, one commit
after the Phase 2 root-API contract tests landed. `67e8078` remains the Phase 1 source-identity freeze that Phase 5's
history-preserving extraction will originate from. The two differ only by test additions (package test category, not
production behavior or package metadata), so this does not change what Phase 1 froze.

### TDD cycle 1 — Package artifact contract

`pnpm --dir packages/site-core run check` passed in full:

```text
build       tsup emitted dist/index.js (3.12 KB), dist/index.js.map (11.21 KB), dist/index.d.ts (4.53 KB)
typecheck   tsc --noEmit passed
Vitest      4 test files, 37 tests, all passed
publint     publint --strict → "All good!"
pack        pack:check (scripts/assert-pack-files.mjs --pack) → packed set matches the allowlist exactly
consumer    consumer:check (scripts/validate-packed-consumer.mjs) → passed (see TDD cycle 2)
```

Baseline tarball (built once, `npm pack --json`, then hashed and discarded):

```text
archive               ravenhill-site-core-0.1.0.tgz
sha256                1c2503bf57af9c2ffdddcdc61814c400e383806bb9527ecf09e36e125ca5c642
npm shasum (sha1)     74c6c2942309c6226ba2d3c443d74c6a181837ba
size / unpackedSize   6424 bytes / 23844 bytes
```

Sorted packed-file list (identical to the Milestone 1 allowlist):

```text
README.md
dist/index.d.ts
dist/index.js
dist/index.js.map
package.json
```

Package metadata recorded from `package.json`:

```text
main          ./dist/index.js
types         ./dist/index.d.ts
exports       { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }
files         ["dist"]
sideEffects   false
```

Build contract recorded from `tsup.config.ts` (unchanged from the Contract taxonomy section above):

```text
entry       src/index.ts
format      esm
dts         true
sourcemap   true
target      es2022
platform    neutral
outDir      dist
splitting   false
minify      false
```

### TDD cycle 2 — Packed-consumer baseline

`scripts/validate-packed-consumer.mjs` (run as part of `pnpm run check`, and independently confirmed) built a fresh
tarball, installed it into a temporary ESM project outside the repository (`os.tmpdir()`, not under the repo root),
and verified:

```text
ESM root import                  passed — named runtime exports import successfully
representative runtime behavior  passed — buildRepoUrl / buildCommitUrl / buildRepoLinkText / normalizePlatforms /
                                  isRepoPlatform checks against expected values
package identity/version         passed — SITE_CORE_PACKAGE_NAME and SITE_CORE_VERSION match package.json
TypeScript declaration resolution passed — tsc -p tsconfig.json against a type-consumer fixture using every
                                  exported type (RepoRef, RepoPlatform, BuildRepoUrlOptions, BuildCommitUrlOptions,
                                  BuildRepoLinkTextOptions)
blocked runtime subpaths         passed — @ravenhill/site-core/repositories, /src/index.js, /dist/index.js all
                                  reject at runtime (ERR_PACKAGE_PATH_NOT_EXPORTED / ERR_MODULE_NOT_FOUND)
blocked type subpaths            passed — same three subpaths rejected at the type level (@ts-expect-error fixture)
```

Toolchain used for this baseline: `node v26.7.0`, `pnpm 11.8.0` (consistent with the Phase 1 freeze).

---

# Phase 4 — Record standalone-environment gaps and licensing

## Goal

Make hidden monorepo dependencies explicit so that Milestone 2 knows exactly what must change without mistaking those
changes for behavioral regressions.

## TDD cycle 1 — Standalone dependency audit

### Red

Attempt to describe the package's build/test prerequisites using only files and dependencies owned by
`packages/site-core`.

Record each dependency that comes from outside the package.

Known current examples include:

- `tsconfig.json` extending `astro/tsconfigs/strictest`;
- no package-local Astro development dependency;
- `validate-packed-consumer.mjs` resolving `tsup` and `typescript` from the monorepo root;
- package scripts assuming pnpm/root workspace installation.

### Green

Classify each as:

```text
must become package-local in Milestone 2
should be replaced during Bun/tsdown migration
can be removed entirely
```

Do not fix them yet.

### Refactor

Use the term **standalone dependency** consistently rather than mixing build dependency, workspace dependency, and
public dependency.

---

## TDD cycle 2 — License decision

The current `site-core` directory contains no package-local `LICENSE`, and its manifest has no `license` field, while
the enclosing DIBS repository carries the BSD two-clause license text.

Record the licensing decision before extraction:

```text
current source licensing context
        ↓
intended standalone repository license
        ↓
intended published package license
```

If the standalone repository is intended to retain the current DIBS terms, record that explicitly and schedule the root
`LICENSE` plus SPDX package metadata for Milestone 2.

Do not add a different license merely to imitate sibling repositories.

### Acceptance criteria

- every monorepo-only build/test dependency is documented;
- none is accidentally frozen as public API;
- the source licensing context is recorded;
- the standalone-license decision is resolved before any publication milestone.

---

# Phase 5 — Perform the history-preserving extraction

## Goal

Create a local Git repository rooted at the current `packages/site-core` content while preserving the meaningful history
of that package.

The current GitLab path history shows a small package-specific history, with the current path introduced in the May 8
extraction commit and subsequent changes through August. The extraction should nevertheless audit earlier names/renames
rather than assuming the current path captures every historical origin.

## TDD cycle 1 — Audit historical paths

### Red

Before filtering, inspect representative long-lived files with rename-aware Git history:

```text
package.json
src/index.ts
src/repositories/repo-links.ts
```

Determine whether any part of today's package existed under a different historical path.

If prior paths are found, add them explicitly to the extraction path set.

### Green

Produce a reviewed list of all paths that must participate in the history extraction.

### Refactor

Keep the extraction command declarative: explicit input paths and one path-to-root transformation.

---

## TDD cycle 2 — Extract from a fresh clone

Use `git-filter-repo`, not `filter-branch`. Its upstream project notes that Git recommends `filter-repo` over
`filter-branch`, and it deliberately encourages history rewriting from a fresh clone for safer recovery. ([GitHub][1])

Use a dedicated fresh, single-branch clone at the **exact freeze commit**.

Conceptually:

```powershell
git clone --single-branch --branch dev/qa --no-tags <dibs-repository> site-core-extraction
cd site-core-extraction

git filter-repo `
    --path packages/site-core/ `
    --path-rename packages/site-core/:
```

If the preceding path audit finds earlier names, include those paths and any required renames explicitly.

Do not run this transformation inside the ordinary DIBS working copy.

Do not use `--force` to bypass the fresh-clone protection as the normal workflow.

---

## TDD cycle 3 — Differential history verification

### Red

Treat history preservation as an observable contract, not as “`git log` looks plausible.”

Use the `git-filter-repo` commit mapping to compare source and extracted history.

For every mapped commit that contains `site-core` state:

```text
original commit
    packages/site-core/**
            ↓ normalize path
extracted commit
    /**
```

Require equivalent package trees.

At minimum compare:

- tracked paths;
- file contents;
- executable modes where applicable.

Commit hashes are expected to differ because history has been rewritten.

Also verify preservation of:

- author;
- author date;
- commit message;
- chronological order of package-affecting commits.

This is a strong and appropriately scoped use of **differential testing** because the explicit milestone requirement is
historical fidelity.

### Green

Correct path-selection/rename rules until every relevant mapped package tree agrees.

### Refactor

Keep the verification logic outside production package code. It is migration assurance, not a library feature.

---

## TDD cycle 4 — Verify final-tree identity

As a final independent check:

```text
frozen source commit: packages/site-core/
        =
extracted repository HEAD: /
```

Compare the tracked trees after normalizing the prefix.

The only acceptable differences are files explicitly introduced **after** the historical extraction, which should not
exist yet in Milestone 1.

### Acceptance criteria

- extraction originates from the exact recorded DIBS commit;
- the source path has been moved to repository root;
- unrelated DIBS history/content is absent;
- every relevant mapped package tree is equivalent;
- author/date/message information remains meaningful;
- final extracted tree equals the frozen source tree;
- the extracted repository has no remote GitLab project yet.

---

# Testing-style disposition for Milestone 1

The guidelines require considering the available testing styles and selecting them according to assurance value.

| Technique                   | Decision                            | Application                                                                                                           |
| --------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Example-based / BDD         | **Required**                        | Public functions, package identity, root API, extraction expectations                                                 |
| DDT                         | **Required**                        | Runtime exports, blocked subpaths, mapped history commits                                                             |
| PBT                         | **Retain**                          | Existing URL and normalization invariants already justify `fast-check`                                                |
| Differential testing        | **Required**                        | Original Git history/tree vs extracted history/tree                                                                   |
| Metamorphic testing         | **High value**                      | Removing the `packages/site-core/` prefix must not alter file contents; extraction must not change consumer semantics |
| Mutation testing            | **Deferred**                        | No new domain/state logic is introduced                                                                               |
| Fuzz testing                | **Not justified**                   | No new parser/protocol boundary                                                                                       |
| Mock testing                | **Minimize**                        | Real package build, real tarball, real Git repository                                                                 |
| Model/state-machine testing | **Not needed**                      | No lifecycle/stateful protocol is introduced here                                                                     |
| Contract testing            | **Required**                        | Root API, tarball shape, packed consumer, history extraction                                                          |
| Snapshot/golden             | **Selective**                       | Machine-readable baseline manifest/file list; avoid bundled-JS snapshots                                              |
| Concurrency testing         | **Not applicable**                  | No concurrent write behavior                                                                                          |
| Deterministic simulation    | **Not needed**                      | Direct package/Git evidence is available                                                                              |
| Static analysis             | **Required**                        | Existing TypeScript checks                                                                                            |
| Symbolic/formal techniques  | **Not justified**                   | Contracts are small and directly executable                                                                           |
| Runtime assertions          | **Required at package boundary**    | Name/version/imports/subpaths                                                                                         |
| Cross-version testing       | **Deferred**                        | Standalone compatibility matrix belongs to later milestones                                                           |
| Browser/E2E                 | **Not applicable at package level** | `site-core` has no DOM/Astro runtime surface                                                                          |
| Clean-consumer integration  | **Required**                        | Existing packed consumer is part of the baseline                                                                      |

---

# Milestone acceptance criteria

Milestone 1 is complete only when:

### Consumer contract

- all current public runtime exports are characterized;
- all current public TypeScript exports are compile-checked;
- root-only imports remain enforced;
- existing BDD, DDT, and PBT behavior remains green;
- root import remains passive and `sideEffects: false`.

### Distribution baseline

- the current `tsup` build produces a verified baseline candidate;
- package file contents/allowlist are recorded;
- candidate SHA-256 is recorded;
- `publint --strict` passes;
- a clean external consumer passes runtime, types, and blocked-subpath checks.

### Extraction readiness

- DIBS consumers and architecture rules are inventoried;
- monorepo-only build/test dependencies are explicitly classified;
- licensing intent is recorded;
- the exact source commit and toolchain are recorded.

### History

- historical-path audit is complete;
- a fresh-clone `git-filter-repo` extraction succeeds;
- each relevant mapped commit preserves the package tree after path normalization;
- author/date/message history remains meaningful;
- extracted `HEAD` is source-equivalent to `packages/site-core` at the freeze commit.

### Scope protection

- `tsup` is still the build oracle;
- no Bun/tsdown migration has started;
- no GitLab `site-core` project exists yet;
- no package has been registered or published;
- DIBS still consumes `workspace:*`;
- `packages/site-core` has not been removed.

---

# Evidence to record

Keep the milestone evidence small but reproducible:

```text
freeze commit
package version
root lockfile identity
Node/pnpm versions

baseline tarball filename
baseline tarball SHA-256
baseline packed-file list
consumer verification commands

package-touching source commits
historical paths considered
git-filter-repo command
old → rewritten commit mapping
history differential result

license decision
known standalone-environment gaps
```

Do not record generated `dist/` source dumps or large textual command logs when a digest plus reproducible command is
sufficient.

---

# Suggested execution order

```text
inventory package + consumers
        ↓
classify consumer / distribution / operational contracts
        ↓
freeze exact source commit
        ↓
complete root runtime/type characterization
        ↓
retain existing PBT + root-only checks
        ↓
build one tsup baseline candidate
        ↓
verify packed consumer
        ↓
record baseline manifest + digest
        ↓
audit monorepo-only dependencies
        ↓
resolve license intent
        ↓
        CONTRACT FREEZE GATE
        ↓
audit historical paths/renames
        ↓
fresh single-branch clone
        ↓
git-filter-repo extraction
        ↓
differential history/tree verification
        ↓
        HISTORY PRESERVATION GATE
        ↓
record Milestone 1 evidence
```

The **minimum useful vertical slice** is:

> At one exact DIBS commit, the current `site-core` workspace package has an executable root/API/package-consumer
> contract and one identified `tsup` tarball; a fresh Git extraction moves `packages/site-core` to repository root while
> preserving every relevant package-tree state in its mapped history.

That gives Milestone 2 a trustworthy pair of oracles: **what consumers currently observe** and **where the source came
from**. It can then modernize tooling aggressively without conflating a build-system change with an API change or losing
provenance.

[1]: https://github.com/newren/git-filter-repo?utm_source=chatgpt.com "GitHub - newren/git-filter-repo: Quickly rewrite git repository ..."
