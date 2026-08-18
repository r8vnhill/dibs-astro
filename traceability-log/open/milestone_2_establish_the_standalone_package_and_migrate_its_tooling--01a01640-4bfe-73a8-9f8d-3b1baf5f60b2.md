# Milestone 2 — Establish the standalone package and migrate its tooling

## Goal

Turn the history-preserving `site-core` extraction from Milestone 1 into an **independently installable, buildable,
testable, reproducible, and packageable library** while preserving the frozen public API and distribution semantics.

At completion:

```text
fresh site-core checkout
        ↓
bun install --frozen-lockfile
        ↓
format + static checks + tests
        ↓
tsdown build
        ↓
one canonical .tgz candidate
        ↓
package contract
        ↓
clean external consumer
```

The milestone stops at a validated release candidate.

It does **not**:

- create or mutate the canonical registry;
- publish `@ravenhill/site-core`;
- configure cross-project GitLab authorization;
- migrate DIBS away from `workspace:*`;
- change the public API.

The package remains `0.1.0` only if the behavior-preserving migration remains compatible with the frozen Milestone 1
contract and no prior `0.1.0` has been published.

---

# Architectural invariants

Preserve these contracts throughout the milestone:

- package name remains `@ravenhill/site-core`;
- root-only imports remain the supported public surface;
- ESM remains the distribution format;
- `sideEffects: false` remains valid;
- public runtime exports remain equivalent;
- public TypeScript exports remain usable from the same root import;
- blocked/deep subpaths remain inaccessible;
- target runtime semantics remain equivalent to the Milestone 1 baseline;
- declarations and source maps remain distributed;
- package construction occurs exactly once per candidate;
- every downstream check consumes the same `.tgz`;
- no build or test requires files outside the standalone repository.

Implementation details such as generated JavaScript text, source-map encoding, or bundler-specific metadata are not
compatibility requirements unless Milestone 1 identified them as observable contracts.

---

# Phase 1 — Make the extracted repository genuinely standalone [DONE]

## Goal

Remove implicit dependencies on `astro-website` without changing the package build implementation yet.

The key principle is:

> **First prove the old implementation works independently; only then replace `tsup`.**

This avoids conflating extraction defects with bundler-migration defects.

## Scope

Relevant areas include:

```text
package.json
tsconfig.json
tsup.config.ts
vitest configuration
src/
tests/
scripts/
README.md
AGENTS.md
LICENSE
CHANGELOG.md
.gitignore
dprint.json
bun.lock
```

## TDD cycle 1 — Clean-checkout environment contract

### Red

Define a clean-checkout test that runs with:

- no parent workspace;
- no root `node_modules`;
- no pnpm workspace metadata;
- no Astro installation inherited from DIBS;
- no monorepo-relative tool lookup.

The expected workflow is:

```text
bun install --frozen-lockfile
typecheck
test
current tsup build
current package checks
```

Bun documents `--frozen-lockfile` as installing exactly from the committed lockfile and failing if `package.json` and
`bun.lock` disagree. ([Bun][1])

### Green

Make all current dependencies explicit in the standalone repository.

Replace monorepo assumptions such as:

- extending a TypeScript configuration from an undeclared external package;
- resolving TypeScript or `tsup` from the former DIBS root;
- relying on workspace scripts or root environment variables.

Do **not** replace `tsup` yet.

### Refactor

Keep package-owned tooling configuration local and explicit.

Prefer a package-local TypeScript configuration that expresses the actual library contract rather than inheriting
web-framework settings the package does not conceptually own.

## TDD cycle 2 — Package metadata completeness

### Red

Add metadata-contract tests for required package metadata:

```text
name
version
description
license
repository
homepage
bugs
type
exports
types
files
sideEffects
publishConfig.registry
```

Validate the canonical registry value:

```text
https://gitlab.com/api/v4/projects/85449745/packages/npm/
```

Treat this URL as checked-in, non-secret package metadata. Authentication remains a later release concern.

### Green

Complete `package.json`.

Add the package-local `LICENSE` according to the licensing decision established in Milestone 1.

### Refactor

Avoid duplicating the registry endpoint in several configuration locations. Package metadata should be the canonical
checked-in publication destination unless a later release requirement proves that runtime configuration is necessary.

## TDD cycle 3 — Toolchain audit and pinning

Before introducing or updating dependencies, audit:

- Bun;
- dprint;
- TypeScript;
- Vitest;
- fast-check;
- publint;
- tsdown.

Use current stable releases that are mutually compatible, unless retaining an older version materially reduces migration
risk. Record any deliberate holdback.

Do not copy sibling package versions automatically.

Bun's text `bun.lock` is intended to be committed and provides reproducible dependency resolution. ([Bun][2]) Vitest
remains appropriate for non-browser library code and supports Node-style test environments without requiring a web
application. ([Vitest][3])

If Milestone 1's frozen versions are already current and compatible, prefer retaining them during the build migration
rather than combining unrelated dependency upgrades with the bundler change.

## Acceptance criteria

- a fresh clone succeeds with `bun install --frozen-lockfile`;
- tests and the existing `tsup` build run without the DIBS monorepo;
- no tool resolves from a parent directory;
- package metadata and licensing are explicit;
- exact selected tool versions are recorded in `package.json`/`bun.lock`;
- the Milestone 1 behavioral baseline remains green.

## Non-goals

Do not change bundlers yet.

---

# Phase 2 — Migrate `tsup` to `tsdown` using the Milestone 1 baseline as the oracle [DONE]

## Goal

Replace `tsup` with `tsdown` while preserving the semantic distribution contract.

tsdown provides an explicit migration path from `tsup`; its documentation recommends using its migration tooling to
inspect and convert configuration rather than manually guessing option mappings. ([Tsdown][4])

## Scope

```text
tsup.config.ts
tsdown configuration
package.json scripts/dependencies
Milestone 1 baseline manifest
build-output comparison tests
```

## TDD cycle 1 — Capture pre-migration output in the standalone repository

### Red

Re-run the Milestone 1 baseline contract after Phase 1.

Require:

```text
entry                 src/index.ts
module semantics      ESM
types                 available
source maps           available
target semantics      ES2022-equivalent
root export           usable
required filenames    stable
blocked subpaths      blocked
```

Generate one final standalone-`tsup` candidate for differential comparison.

### Green

No implementation change yet.

Record its normalized distribution observations.

### Refactor

Keep comparison data semantic:

```text
PackageObservation
    package metadata
    export map
    runtime exports
    type usability
    file set
    consumer behavior
```

Do not snapshot generated JavaScript.

---

## TDD cycle 2 — Preview the migration

### Red

Run the tsdown migration tool in preview mode.

Review each suggested mapping against the frozen contract.

Do not let migration tooling silently choose dependency versions or broaden the package surface.

### Green

Create the smallest explicit tsdown configuration needed to preserve:

```text
src/index.ts
ESM output
declarations
source maps
ES2022-compatible output
dist/index.js
dist/index.d.ts
```

Use tsdown's supported current options rather than mechanically reproducing obsolete `tsup` flags. tsdown explicitly
aims to support the main tsup migration path, but behavioral equivalence is still the stronger compatibility criterion.
([Tsdown][4])

### Refactor

Remove compatibility configuration that has no observable effect.

Prefer defaults when they satisfy the frozen contract.

---

## TDD cycle 3 — Differential build contract

### Red

Run both candidates through the same test matrix:

| Contract             | `tsup` baseline | `tsdown` candidate |
| -------------------- | --------------- | ------------------ |
| package name/version | same            | same               |
| public subpaths      | same            | same               |
| root runtime imports | pass            | pass               |
| runtime behavior     | equivalent      | equivalent         |
| exported types       | usable          | usable             |
| blocked subpaths     | rejected        | rejected           |
| ESM loading          | pass            | pass               |
| required outputs     | present         | present            |
| declarations         | present         | present            |
| source maps          | present         | present            |

Use the Milestone 1 artifact as an **independent oracle** rather than deriving both sides from the new tsdown
implementation.

### Green

Adjust tsdown configuration until all semantic comparisons pass.

### Refactor

Once green:

- remove `tsup`;
- remove `tsup.config.ts`;
- remove obsolete Astro/React/JSX configuration that has no package-level purpose;
- remove migration-only compatibility options;
- retain the differential fixture/evidence needed for traceability, not permanent duplicate build infrastructure.

## Acceptance criteria

- no public import changes;
- runtime and type consumers are equivalent;
- root-only exports remain enforced;
- required output filenames remain stable;
- `tsup` is removed only after the differential suite is green;
- the new build no longer relies on DIBS or Astro configuration.

---

# Phase 3 — Establish the artifact-first package pipeline [DONE]

## Goal

Make one `.tgz` the canonical candidate for every package-level verification.

## Architecture

Prefer:

```text
build source
    ↓
package:prepare
    ↓
release/ravenhill-site-core-0.1.0.tgz
        │
        ├── package:check
        ├── publint
        └── consumer:check
```

Do not rebuild for each check.

## TDD cycle 1 — Candidate preparation

### Red

Define the release-candidate contract:

```text
release/
├── ravenhill-site-core-0.1.0.tgz
├── SHA256SUMS
└── package-manifest.json
```

The manifest should contain at least:

```json
{
    "schemaVersion": 1,
    "package": "@ravenhill/site-core",
    "version": "0.1.0",
    "archive": "ravenhill-site-core-0.1.0.tgz",
    "sha256": "...",
    "commit": "..."
}
```

Validate:

- package/version consistency;
- archive existence;
- SHA-256 syntax;
- manifest/archive consistency.

### Green

Implement `package:prepare`.

Use platform APIs and established package-manager facilities where possible rather than custom archive construction.

### Refactor

Separate pure manifest generation/validation from filesystem and process execution:

```text
functional core
    candidate metadata
    digest comparison
    file-contract comparison

imperative shell
    filesystem
    subprocesses
    npm/bun pack
```

This follows the guidelines' recommended functional-core/imperative-shell structure.

---

## TDD cycle 2 — Packed-file contract

### Red

Validate the actual tarball.

Require at least:

```text
README.md
LICENSE
package.json
dist/index.js
dist/index.d.ts
dist/index.js.map
```

Reject internal implementation material such as:

```text
AGENTS.md
src/**
tests/**
scripts/**
dprint.json
tsconfig*.json
tsdown configuration
Vitest configuration
```

Treat the allowlist as the public distribution contract.

### Green

Configure `files`/packaging until the candidate conforms.

### Refactor

Use one canonical file-contract definition rather than duplicating lists in:

- `package.json`;
- package-check scripts;
- tests;
- documentation.

If exact allowlist generation from package metadata is practical, prefer that. Otherwise keep one typed/shared constant.

---

## TDD cycle 3 — Candidate identity and `publint`

### Red

Inspect `package/package.json` from the exact `.tgz` and assert:

```text
name
version
type
exports
types
sideEffects
license
publishConfig.registry
```

match the expected contract.

### Green

Correct source/package metadata until the packed artifact agrees.

Run `publint --strict` against the candidate/package.

### Refactor

Keep errors structured and package-oriented:

```text
expected
observed
field
candidate
```

rather than leaking internal command failures where possible.

---

# Phase 4 — Rebuild the clean-consumer validation around the exact candidate [DONE]

## Goal

Demonstrate that the standalone artifact works outside its own repository.

## TDD cycle 1 — Runtime consumer

### Red

Create an isolated temporary ESM project containing only:

- package manager metadata;
- the exact `.tgz`;
- the minimal runtime fixture.

Verify root import and representative public behavior.

### Green

Install and execute the exact candidate.

Do not import source files directly.

---

## TDD cycle 2 — Type consumer

### Red

Compile a consumer using all relevant exported public types from the root package.

Require no repository-relative paths or project references.

### Green

Make declaration generation and package metadata satisfy the external consumer.

---

## TDD cycle 3 — Blocked subpaths

Use DDT across:

```text
@ravenhill/site-core/repositories
@ravenhill/site-core/src/index.js
@ravenhill/site-core/dist/index.js
```

Check both runtime and TypeScript resolution.

### Green

Preserve the root-only export map.

### Refactor

Reuse the same blocked-subpath matrix between runtime and type consumers.

## Acceptance criteria

- runtime consumer succeeds;
- type consumer succeeds;
- root-only imports remain enforced;
- consumer uses the exact candidate from Phase 3;
- no package-local source path is reachable accidentally.

---

# Phase 5 — Add standalone CI with artifact handoff [DONE]

## Goal

Make a clean GitLab runner reproduce the standalone verification chain without registry writes.

## CI topology

Use three stages:

```text
verify
    ↓
package
    ↓
consumer
```

### `verify`

Run:

```text
bun install --frozen-lockfile
format:check
typecheck
test
```

dprint is appropriate here as a single configurable formatter and supports TypeScript/JavaScript through its official
plugin system. ([DPrint][5])

### `package`

Depend on `verify`, then run:

```text
build
package:prepare
package:check
publint
```

Persist only the release candidate/evidence needed by downstream jobs.

### `consumer`

Download the package job's candidate and run:

```text
consumer:check
```

Do not run a new build.

## CI reproducibility

Pin:

- Bun image/runtime;
- package dependencies through `bun.lock`;
- dprint plugins;
- build/test tooling.

Use `bun install --frozen-lockfile` in CI. ([Bun][1])

Avoid installing global mutable tooling during jobs if it can be declared as a dev dependency and invoked from the
locked dependency graph.

## Acceptance criteria

- all three stages run from a clean runner;
- package and consumer jobs operate on the same artifact;
- no publish credentials are present;
- no registry write occurs;
- CI does not need the DIBS repository;
- CI does not need Astro.

---

# Phase 6 — Update standalone documentation and evidence [DONE]

## Goal

Document only the workflows now owned by `site-core` and retain enough migration evidence to audit the toolchain change.

## README

Keep consumer-facing material focused on:

- purpose;
- installation placeholder/status before first publication;
- public API;
- supported import surface;
- compatibility.

Because the package is not published yet, do not present the canonical registry package as installable.

## `AGENTS.md`

Update development instructions for:

```text
Bun
dprint
tsdown
Vitest
package candidate workflow
```

## `docs/maintenance.md`

Cover:

- clean setup;
- formatting;
- type checking;
- tests;
- build;
- candidate generation;
- artifact inspection.

## `docs/release-process.md`

Document the intended future sequence:

```text
verified candidate
    ↓
protected release authorization
    ↓
canonical registry publication
    ↓
post-publication digest verification
```

Clearly label publication as **deferred to the next milestone**.

Do not copy registry-governance material that belongs to `npm-packages`.

## Migration evidence

Record:

```text
Milestone 1 tsup baseline identity
tsdown candidate identity
differential result
selected tool versions
configuration decisions
final package file contract
final candidate SHA-256
verification commands
final commit/pipeline
```

Do not preserve generated build output merely for documentation if a digest and reproducible command are sufficient.

Update the parent DIBS traceability entry with Milestone 2 completion evidence, but do not change DIBS architecture or
consumer documentation yet.

## Completion evidence — 2026-08-18

- `site-core/README.md` identifies the package as unpublished and documents the supported root-only ESM and TypeScript
  surface without presenting the canonical registry package as installable.
- `site-core/AGENTS.md`, `docs/maintenance.md`, and `docs/release-process.md` describe the owned Bun, dprint, tsdown,
  Vitest, candidate, artifact-handoff, and deferred-publication workflows.
- `site-core/docs/evidence/milestone-2-completion.md` records the tsup baseline identity, tsdown differential result,
  selected tool versions, configuration decisions, package file contract, candidate digest, commands, commit, and CI
  definition.
- Final implementation commit: `5ac2f393d988a6d39de3d4d1522a3abf504bc739`.
- Final candidate SHA-256: `e41e8240f67b8e9d22d8cb0fef3c6eaffaf239419855c7ca3914356cfda78718`.
- Pipeline definition: `site-core/.gitlab-ci.yml`, with `verify → package → consumer` artifact handoff. No registry
  publication or credentials were added; remote runner execution remains a CI follow-up.

---

# Testing-style disposition

The guidelines require considering the full assurance toolbox, but only techniques with meaningful value should be
added.

| Technique                  | Decision                            | Application                                                                 |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Example-based / BDD        | **Required**                        | Package metadata, root exports, consumer behavior                           |
| DDT                        | **Required**                        | File allowlist, blocked subpaths, exported types                            |
| PBT                        | **Retain**                          | Existing repository URL/normalization invariants                            |
| Differential testing       | **Required**                        | `tsup` baseline vs `tsdown` candidate                                       |
| Metamorphic testing        | **High value**                      | Bundler replacement must not change root API or blocked-subpath semantics   |
| Mutation testing           | **Deferred**                        | Consider only for new pure package-contract logic if it becomes non-trivial |
| Fuzz testing               | **Not justified**                   | No custom parser/protocol boundary is introduced                            |
| Mock testing               | **Minimize**                        | Real tarball and real clean consumer are stronger evidence                  |
| Model-based testing        | **Not needed**                      | No significant stateful domain model                                        |
| State-machine testing      | **Deferred**                        | Publication state machine belongs to the publication milestone              |
| Contract testing           | **Required**                        | Build output, tarball, metadata, root API, external consumer                |
| Snapshot/golden            | **Selective**                       | Normalized export/file manifests only; no generated JS snapshots            |
| Concurrency testing        | **Not applicable**                  | No concurrent publication or shared mutable state                           |
| Deterministic simulation   | **Optional**                        | Useful only for pure candidate/manifest helpers                             |
| Static analysis            | **Required**                        | TypeScript, formatter, package metadata                                     |
| Symbolic/formal techniques | **Not justified**                   | Small explicit contract surface                                             |
| Runtime assertions         | **Required at artifact boundaries** | name/version/digest/exports/registry                                        |
| Sanitizer tooling          | **Not applicable**                  | No native-memory boundary                                                   |
| Cross-version testing      | **Selective**                       | Only runtimes/TypeScript versions explicitly claimed by the package         |
| Browser/E2E                | **Not applicable**                  | `site-core` is host-agnostic and has no DOM surface                         |
| Clean-consumer integration | **Required**                        | Exact `.tgz` from candidate stage                                           |

There is no meaningful DDD opportunity in this milestone: the domain is small build/package governance rather than a
non-trivial business domain. Introducing entities, repositories, aggregates, or domain services would be ceremonial and
would conflict with the guidelines. The useful domain vocabulary here is simply explicit value-like concepts such as
**package candidate**, **package contract**, **consumer contract**, and **artifact identity**.

# Global acceptance criteria

Milestone 2 is complete only when all of the following are true.

## Standalone repository

- `bun install --frozen-lockfile` succeeds from a clean clone;
- no package tool resolves from a parent directory;
- no Astro or DIBS workspace dependency is required;
- package metadata and licensing are explicit;
- exact tool versions are reproducibly locked.

## Behavior preservation

- Milestone 1 runtime and type characterization remains green;
- existing PBT remains green;
- `tsup` and `tsdown` candidates are semantically equivalent;
- root-only imports remain enforced;
- no public API or runtime behavior changes unintentionally.

## Build and distribution

- `tsup` has been removed;
- tsdown produces the required ESM/types/source-map outputs;
- one `.tgz` candidate is created;
- its SHA-256 and manifest are recorded;
- package contents satisfy the allowlist;
- `publint --strict` passes.

## Consumer assurance

- the exact candidate installs in a clean external project;
- runtime imports work;
- TypeScript declarations work;
- blocked subpaths remain blocked;
- no source/workspace path participates in consumption.

## CI

- `verify → package → consumer` is green;
- artifact handoff is used;
- consumer validation does not rebuild;
- no publication credentials or registry writes exist.

## Documentation/evidence

- README and `AGENTS.md` describe the standalone repository accurately;
- maintenance/release documentation does not claim publication has happened;
- tsup/tsdown differential evidence is recorded;
- the parent traceability record identifies the final commit and pipeline.

# Non-goals / deferred work

Explicitly defer:

- GitLab package publication;
- protected release-tag setup;
- `CI_JOB_TOKEN` allowlisting;
- registration as `active` in `npm-packages`;
- post-publication digest verification;
- DIBS dependency cutover;
- removal of `astro-website/packages/site-core`;
- broader API redesign;
- CJS output;
- additional package entry points;
- unrelated dependency modernization;
- browser-specific features.

# Suggested execution order

```text
audit standalone dependencies + tool versions
        ↓
make existing tsup package run from clean standalone checkout
        ↓
        STANDALONE BASELINE GATE
        ↓
complete package metadata + license
        ↓
capture final standalone tsup candidate
        ↓
preview tsdown migration
        ↓
configure tsdown
        ↓
run differential contract
        ↓
remove tsup
        ↓
        BUILD MIGRATION GATE
        ↓
implement one-candidate package:prepare
        ↓
validate packed file/metadata contract
        ↓
run publint
        ↓
run clean runtime/type/subpath consumer
        ↓
        PACKAGE CANDIDATE GATE
        ↓
add verify → package → consumer CI
        ↓
prove artifact handoff without rebuild
        ↓
update README + AGENTS + maintenance/release docs
        ↓
record Milestone 2 evidence
        ↓
fresh clean-checkout + final CI
```

The **minimum useful vertical slice** is:

> A fresh standalone checkout can install its locked dependencies, build `site-core` with tsdown, produce one `.tgz`,
> and install that exact archive into a separate consumer whose runtime, type, root-export, and blocked-subpath behavior
> matches the Milestone 1 tsup baseline.

That gives Milestone 3 a clean handoff: a standalone repository with **one reproducible, already validated package
candidate**, while publication and registry governance remain separate concerns.

[1]: https://bun.com/docs/pm/cli/install?utm_source=chatgpt.com "bun install"
[2]: https://bun.com/docs/pm/lockfile?utm_source=chatgpt.com "Lockfile"
[3]: https://vitest.dev/?utm_source=chatgpt.com "Vitest | Next Generation testing framework"
[4]: https://tsdown.dev/guide/migrate-from-tsup?utm_source=chatgpt.com "Migrate from tsup - The Elegant Bundler for Libraries"
[5]: https://dprint.dev/plugins/typescript/?utm_source=chatgpt.com "TypeScript / JavaScript Code Formatter"
