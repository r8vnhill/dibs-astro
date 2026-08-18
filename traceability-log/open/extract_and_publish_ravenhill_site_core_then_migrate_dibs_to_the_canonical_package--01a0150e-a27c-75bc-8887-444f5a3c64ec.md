# Extract and publish `@ravenhill/site-core`, then migrate DIBS to the canonical package

## Goal

Extract `@ravenhill/site-core` from the DIBS monorepo into a standalone, independently releasable library while
preserving its current public API and observable behavior.

At completion, ownership should be:

```text
r8vnhill/site-core
    source
    tests
    build
    package contract
    version/changelog
    release pipeline
          │
          │ exact validated .tgz
          ▼
r8vnhill/npm-packages
    canonical @ravenhill registry
    ownership/lifecycle governance
          │
          ▼
astro-website
    exact published dependency
    no workspace implementation
```

The migration is intentionally behavior-preserving. Changes to the `site-core` API, domain model, or layer permissions
are out of scope unless an existing defect is discovered and separately approved. This follows the project's requirement
to preserve externally observable behavior during refactoring.

## Architectural invariants

The migration must preserve these contracts:

- `@ravenhill/site-core` remains the package name.
- Existing public root imports continue to work.
- Existing blocked/deep subpaths remain inaccessible.
- Existing runtime behavior and exported types remain compatible.
- The package remains ESM-only unless the existing contract says otherwise.
- The canonical npm registry is project `85449745`.
- The package is built exactly once for a release; validation, publication, and post-publication verification operate on
  the same `.tgz`.
- `npm-packages` never becomes a source/build repository.
- DIBS consumes an exact published version, never `workspace:`, `file:`, or `link:`.
- The `npm-packages/site-core` submodule is a maintainer/navigation convenience, not a runtime or verification
  dependency.

---

# Milestone 1 — Freeze the existing `site-core` contract and preserve its history [DONE]

## Goal

Produce a standalone source repository whose history and baseline contract can be traced back to
`astro-website/packages/site-core`, before changing its build or packaging implementation.

## Scope

In `astro-website`:

- `packages/site-core/**`;
- package-owned tests, scripts, fixtures, and configuration;
- all production imports of `@ravenhill/site-core`;
- layer-boundary rules;
- package build and consumer checks.

In the new repository:

- extracted Git history;
- root package metadata;
- licensing;
- baseline tests.

## TDD cycle 1 — Characterize the current package contract

### Red

Before extracting or replacing `tsup`, turn the existing contract into explicit BDD-style tests.

Inventory the complete package-owned surface with Git rather than manually selecting only `src/`, `README.md`, and a few
scripts.

Characterize at least:

```text
public package name
public root export
exported runtime symbols
exported TypeScript surface
ESM runtime import
blocked/deep subpaths
expected dist filenames
package tarball allowlist
package metadata
existing behavioral tests
```

Retain the existing runtime/type consumer fixtures as canonical consumers.

The current pack allowlist should be treated as a baseline, not blindly frozen forever. Adding a real standalone
`LICENSE`, for example, is an intentional package-metadata improvement and should be reflected explicitly in the new
artifact contract.

### Green

Make the current workspace package pass this characterization without changing production behavior.

Produce a local baseline tarball from the current `tsup` build and record a small temporary comparison manifest
containing:

```text
package name
version
export map
tarball file list
runtime export surface
types entry
SHA-256
```

The hash identifies the baseline artifact; byte identity with the later `tsdown` artifact is **not** required because
the build implementation is changing.

### Refactor

Share the same canonical consumer fixtures between the current and future package rather than duplicating nearly
identical tests.

## TDD cycle 2 — Preserve source history

### Green

Use a Git-aware extraction into a temporary standalone checkout rather than copying the directory into an empty
repository.

Preferred outcome:

```text
astro-website history
        ↓ filter packages/site-core/
new repository root
        ↓
historical site-core commits preserved
```

After extraction, verify representative historical changes are still visible through `git log`.

Do the history extraction outside `ravenhill-npm-packages/site-core`; after the remote exists, add it to the registry
repository through a real `git submodule add`. This avoids constructing an unmanaged nested repository and later
converting it into a submodule.

### Acceptance criteria

- existing package tests are green before extraction;
- a baseline package candidate can be built and consumed;
- the new repository contains meaningful `site-core` history;
- no production DIBS code has changed yet;
- no registry publication has occurred.

## License gate

Determine the license under which `packages/site-core` currently exists before publishing it independently.

If it inherits the top-level DIBS license, preserve those terms in the standalone repository. Do **not** switch to
BSD-2-Clause merely because sibling repositories use it unless the existing code's licensing permits and the change is
intentional.

The published package must contain its applicable license.

## Non-goals

Do not yet:

- switch DIBS to a registry dependency;
- publish a version;
- change public APIs;
- add registry governance;
- delete the workspace package.

---

# Milestone 2 — Establish the standalone package and migrate its tooling [DONE]

## Goal

Make `r8vnhill/site-core` independently buildable, testable, reproducible, and packageable with the chosen
Bun/dprint/tsdown toolchain while preserving the contract frozen in Milestone 1.

## Phase 2.1 — Bootstrap repository metadata and reproducible tooling

### Scope

Create or normalize:

```text
README.md
CHANGELOG.md
LICENSE
AGENTS.md
package.json
bun.lock
dprint.json
tsconfig.json
vitest configuration
tsdown configuration
src/
tests/
scripts/
docs/
.gitlab-ci.yml
```

Add complete public package metadata where applicable:

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
publishConfig
```

Use one canonical publication registry definition:

```json
{
    "publishConfig": {
        "registry": "https://gitlab.com/api/v4/projects/85449745/packages/npm/"
    }
}
```

Do not duplicate the canonical destination in another CI variable unless a real deployment requirement demands
configurability. Package metadata, authentication generation, pre-publication checks, and `npm publish` should all
derive from the same registry URL.

For CI reproducibility, commit the Bun lockfile and run frozen installs; Bun documents `--frozen-lockfile` specifically
for exact lockfile-based installation. ([Bun][3])

### Version policy

Resolve and pin supported stable tool versions during implementation rather than copying sibling versions blindly.

Alignment with `astro-icons` and `astro-semantics` is valuable for maintainability, but compatibility and current stable
releases remain the deciding factors, consistent with the project guidelines.

### Acceptance criteria

- clean `bun install --frozen-lockfile` succeeds;
- formatting, type checking, and existing tests pass;
- package metadata is complete;
- the canonical registry has one source of truth.

---

## Phase 2.2 — Migrate `tsup` to `tsdown` without changing the package contract

This should be treated as a real migration, not incidental cleanup.

tsdown's current migration documentation explicitly describes a two-stage process: first migrate through its
compatibility release and resolve all deprecated tsup-compatible behavior, then move to the current tsdown
configuration. It also provides `--dry-run` and `--no-install`, which are useful here because dependency installation
should remain under Bun's control. ([Tsdown][1])

## TDD cycle 1 — Preview the build migration

### Red

Run the migration tool in dry-run mode and identify every changed default relevant to `site-core`.

The current tsup baseline remains the oracle.

### Green

Apply the migration without allowing the helper to silently own dependency installation, then configure tsdown
deliberately.

Preserve explicitly:

```text
single public entry point
ESM output
dist/index.js
dist/index.d.ts
dist/index.js.map
source-map behavior
external dependency behavior
package exports
```

### Refactor

Remove tsup configuration/dependencies only after tsdown satisfies the baseline.

Do not retain compatibility options merely to suppress warnings.

## TDD cycle 2 — Differential package contract

Compare the old `tsup` candidate and new `tsdown` candidate at the **semantic package boundary**, not byte-for-byte.

Require equivalence for:

| Contract                        | Comparison    |
| ------------------------------- | ------------- |
| package name/version            | exact         |
| exported subpaths               | exact         |
| root runtime exports            | equivalent    |
| type consumer                   | both compile  |
| blocked subpaths                | both rejected |
| required dist filenames         | exact         |
| representative runtime behavior | equivalent    |
| ESM loading                     | equivalent    |

Allow implementation differences in:

- generated JavaScript text;
- source-map encoding;
- bundler-specific comments;
- archive hash.

This is a strong application of differential testing because two independent build implementations are expected to
expose equivalent consumer semantics.

### Acceptance criteria

- no public import needs modification;
- runtime fixtures behave equivalently;
- type fixtures compile;
- blocked subpaths remain blocked;
- expected output filenames remain stable;
- tsup is removed only after the differential contract is green.

---

## Phase 2.3 — Make the tarball the canonical release candidate

### Goal

Ensure CI validates and publishes the exact artifact consumers receive.

### `package:prepare`

Produce:

```text
release/
├── ravenhill-site-core-<version>.tgz
├── SHA256SUMS
└── package-manifest.json
```

The manifest should record at least:

```text
package
version
archive
sha256
commit
```

### `package:check`

Inspect the actual `.tgz`, not only source files.

Require the intended file set, including the package license.

Preserve the existing negative package contract for:

```text
AGENTS.md
src/
tests/
tool configuration
internal scripts
```

unless a file is intentionally made public.

Run `publint` or the established package-contract checker against the candidate.

### `consumer:check`

Install the exact `.tgz` into a clean temporary consumer and run:

- runtime import checks;
- TypeScript consumer compilation;
- root export checks;
- blocked-subpath checks.

Use the actual consumer runtime supported by `site-core`, rather than relying solely on Bun just because Bun is the
repository toolchain.

### Acceptance criteria

- one `.tgz` is created per candidate;
- all subsequent checks use that same file;
- candidate SHA-256 is recorded;
- internal repository files do not enter the package;
- a clean external fixture consumes the candidate successfully.

## Completion evidence — 2026-08-18

The standalone implementation and its documentation are recorded in the dedicated Milestone 2 traceability entry and
in `site-core/docs/evidence/milestone-2-completion.md`. The final candidate is
`ravenhill-site-core-0.1.0.tgz` with SHA-256
`e41e8240f67b8e9d22d8cb0fef3c6eaffaf239419855c7ca3914356cfda78718`, generated at standalone commit
`5ac2f393d988a6d39de3d4d1522a3abf504bc739`.

The standalone CI definition at `site-core/.gitlab-ci.yml` verifies, packages, and hands the exact `release/` artifact
to a clean consumer. Local reproduction passed `bun run check`, the tsup/tsdown differential check, the packed-file
contract check, strict `publint`, and exact-tarball consumer validation. Publication credentials, registry writes, and
DIBS dependency cutover remain deferred to later milestones; no remote GitLab runner was invoked from this checkout.

---

# Milestone 3 — Create the GitLab source project and register it as `planned`

## Goal

Create the source/registry topology and security configuration **before** the first publication.

This ordering is important. GitLab documents dedicated package-registry projects as a supported architecture and
recommends `CI_JOB_TOKEN` for CI publication, with the source project added to the target registry project's allowlist.
([GitLab Docs][2])

## Phase 3.1 — Create and publish the source repository

The local contract/extraction work can proceed while `glab` authentication is unavailable. Authentication is a blocker
only for remote operations.

Before the first remote operation:

```powershell
glab auth login --hostname gitlab.com
glab auth status
```

Then:

- create `r8vnhill/site-core` without generated starter content;
- use the same intended public visibility as the sibling open-source packages;
- push the history-preserving repository;
- configure project description/topics;
- protect `main`.

Do not create a release tag yet.

## Phase 3.2 — Add the source as registry governance

In `r8vnhill/npm-packages`:

1. Add the remote repository as the established submodule:

   ```text
   site-core/
   ```

2. Treat that submodule as a maintainer-navigation convenience only. Registry verification must not depend on
   recursively initializing it.

3. Add:

   ```json
   {
       "name": "@ravenhill/site-core",
       "sourceProject": "r8vnhill/site-core",
       "status": "planned"
   }
   ```

   using the actual schema currently required by `registry-policy.json`.

4. If the registry policy now uses stable numeric source IDs as well as paths, use that newer schema rather than
   reproducing an obsolete sibling entry format.

5. Optionally list the package under a consumer-facing **Planned packages** section, but not under **Available
   packages**.

6. Run all deterministic `npm-packages` policy tests.

Do **not** create:

```text
provenance/migrations/site-core.json
```

`site-core` has no prior published registry artifact to migrate; this is a first publication.

## Phase 3.3 — Configure publication authorization

On `npm-packages`:

- enable/enforce inbound job-token allowlisting;
- add `r8vnhill/site-core`;
- ensure package-protection rules apply to the intended namespace.

On `site-core`:

- protect the release-tag namespace:

  ```text
  site-core-v*
  ```

- restrict tag creation to the intended release role;

- ensure the publication job runs only for protected release tags.

GitLab supports wildcard protected-tag rules and uses their permissions to control who can create those tags and run
their associated pipelines. ([GitLab Docs][4])

### Acceptance criteria

- source repository exists and has preserved history;
- `npm-packages` declares the package as `planned`;
- the source project is allowlisted for cross-project publication;
- `site-core-v*` is protected;
- no package has yet been published;
- all governance checks remain green.

---

# Milestone 4 — Publish the first canonical `site-core` release

## Goal

Publish the exact candidate already validated in Milestone 2 and prove that the canonical registry serves those same
bytes.

## CI topology

Use the simpler sibling topology:

```text
verify
    ↓
package
    ↓
consumer
    ↓
publish
```

### `verify`

Run:

```text
bun install --frozen-lockfile
format:check
typecheck
test
```

### `package`

Run:

```text
package:prepare
package:check
```

Persist the exact `release/*.tgz` and package manifest as job artifacts.

### `consumer`

Consume the package-job artifact.

Do not rebuild.

Run the runtime/type/blocked-subpath consumer contract.

No package-specific browser job is needed unless `site-core` actually exposes browser/DOM behavior.

### `publish`

Require:

```text
CI_COMMIT_TAG
CI_COMMIT_REF_PROTECTED == "true"
```

and serialize publication with:

```text
resource_group: release-site-core
```

Authenticate with the ephemeral `CI_JOB_TOKEN`; GitLab job tokens exist only for the lifetime of the job and can access
an allowlisted target project subject to the triggering user's permissions. ([GitLab Docs][5])

Publish:

```text
release/ravenhill-site-core-<version>.tgz
```

rather than the working directory.

## Publication state machine

Reuse the proven publication semantics rather than implementing “blind publish”:

```text
ABSENT
    → publish candidate

PRESENT_MATCHING
    → treat retry as successful and continue verification

PRESENT_DIFFERENT
    → stop with a structured diagnostic
```

The comparison should include at least package/version and candidate artifact identity.

This decision logic should remain pure and covered by state-machine/DDT tests.

## First release version

Use the current package version if:

- that version has never been published under `@ravenhill/site-core`; and
- the extraction/tool migration has preserved the intended public contract.

Do not create an artificial version bump merely because source ownership changed.

If an intentional API or behavioral change becomes necessary during extraction, apply normal SemVer instead.

## Post-publication contract

After publication:

```text
validated candidate
        ↓ SHA-256 A

canonical registry
        ↓ download same version
published artifact
        ↓ SHA-256 B

A == B
```

Also verify anonymously:

- package metadata is retrievable;
- tarball is retrievable;
- package name/version are correct.

## Governance transition

Only after post-publication verification succeeds:

```text
planned → active
```

in `npm-packages`.

Then:

- move `site-core` into README **Available packages**;
- update the submodule pointer to the release commit if needed;
- run the full registry-governance suite.

### Acceptance criteria

- protected-tag pipeline is green through `publish`;
- candidate and published tarball SHA-256 are identical;
- public metadata/tarball retrieval succeeds;
- `site-core` is marked `active` only afterward;
- `npm-packages` remains read-only with respect to package construction.

---

# Milestone 5 — Migrate DIBS from workspace resolution to the published package

## Goal

Make `astro-website` consume the exact canonical release without changing existing application behavior or import
syntax.

## TDD cycle 1 — Characterize the DIBS consumer boundary

### Red

Before changing dependency resolution, inventory all current `@ravenhill/site-core` imports and preserve the tests
covering the affected consumers, including:

```text
RepoLink.astro
LessonRepoPanel.astro
site-data-adapter.ts
layer-boundary rules
root-only/subpath import rule
```

Add only the smallest missing regression tests necessary to establish the behavior relied upon by DIBS.

No full duplicate `site-core` test suite belongs in the website.

### Acceptance criteria

- current workspace consumer behavior is green;
- all currently used exports are known;
- layer-boundary expectations are characterized.

---

## TDD cycle 2 — Force registry resolution while retaining the old source temporarily

This is safer than deleting `packages/site-core` and changing the dependency in one operation.

### Red

Add a dependency-resolution contract requiring:

```text
@ravenhill/site-core = exact published version
not workspace:
not link:
not file:
```

### Green

Change:

```json
"@ravenhill/site-core": "workspace:*"
```

to:

```json
"@ravenhill/site-core": "<exact-published-version>"
```

Remove `packages/site-core` from `pnpm-workspace.yaml`, but **temporarily leave the directory on disk**.

This ensures pnpm cannot satisfy the dependency as a workspace while preserving the old source until the consumer
migration is demonstrated.

Update `pnpm-lock.yaml`.

### Clean-resolution contract

Verify with:

- no `node_modules`;
- isolated/empty pnpm store;
- no user-level npm configuration influencing `@ravenhill`;
- repository `.npmrc` only;
- frozen lockfile.

Check the lockfile structurally for absence of local dependency protocols rather than relying only on `grep`.

Also inspect the installed package's:

```text
name
version
```

and confirm the configured `@ravenhill` registry is project `85449745`.

### Acceptance criteria

- DIBS installs the exact published package;
- the local directory cannot satisfy dependency resolution;
- no `workspace:`, `link:`, or `file:` resolution remains;
- ordinary non-`@ravenhill` packages remain unaffected.

---

## TDD cycle 3 — Adapt the architecture boundary to an external package

### Red

Update the architecture tests to express the new topology:

```text
site-core is no longer a monorepo source layer
but @ravenhill/site-core remains an allowed external dependency
```

Retain the existing root-only import contract.

The migration must **not** weaken the rule into unrestricted deep imports merely because the package moved outside the
workspace.

### Green

Update:

```text
scripts/lib/layer-boundary/rules.mjs
docs/architecture/layer-separation.md
```

Remove:

```text
packages/site-core/src/**
```

as a local source layer.

Retain `@ravenhill/site-core` only in the layers already authorized to consume it.

### Refactor

If the architecture checker currently conflates internal source roots and external package dependencies, separate those
concepts explicitly rather than adding package-specific conditionals.

That is a worthwhile generalization because source-layer topology and package dependency policy are different
architectural concerns. It aligns with the project's preference for explicit module boundaries and general abstractions
over special cases.

---

## TDD cycle 4 — Prove behavior with the published dependency

Run targeted checks first:

```text
site-core-dependent unit tests
layer-boundary tests
Astro/type checks
```

Then run the full existing DIBS assurance chain:

```text
pnpm run check
pnpm test
pnpm run build
existing Playwright/E2E checks
existing deployment/container contracts
```

No new browser-specific `site-core` suite is required merely because the package moved repositories; the existing
website E2E suite is the correct place to detect integration regressions in real consumers.

### Acceptance criteria

- current production consumers compile and behave unchanged;
- layer separation remains enforced;
- the published artifact passes all relevant site tests;
- full production build succeeds.

---

## TDD cycle 5 — Remove the obsolete workspace implementation

Only after Cycle 4 is green:

Delete:

```text
astro-website/packages/site-core/
```

Remove obsolete root scripts such as:

```text
build:site-core
check:site-core
```

and remove their invocations from:

```text
predev
prebuild
check
predeploy
```

Search for stale references to:

```text
packages/site-core
workspace:*
tsup
old package scripts
```

Do not remove scripts merely by name; first establish that no other workflow relies on them.

### Refactor

Simplify workspace configuration and architecture documentation now that the local source layer is gone.

### Acceptance criteria

- `packages/site-core/` no longer exists;
- no build/check/dev workflow references the old workspace;
- no production import changed unnecessarily;
- exact registry dependency remains installed;
- all website tests and CI remain green.

---

# Milestone 6 — Record completion evidence

## Goal

Make the extraction and consumer cutover reproducible without creating an oversized traceability document.

Add a focused DIBS traceability record containing:

```text
original workspace path
new source repository
source extraction commit
published package/version
canonical registry project
candidate SHA-256
published SHA-256
DIBS migration commit
verification commands
final pipeline IDs
explicitly deferred work
```

Do not create a `npm-packages/provenance/migrations` entry: that directory is for registry-to-registry artifact
migrations, while `site-core` is being published for the first time.

A lightweight traceability record is appropriate here; the guidelines require evidence for acceptance criteria but do
not require ceremonial planning hierarchy when the evidence is already captured by executable contracts.

---

# Testing-style disposition

The project guidelines require considering the available assurance styles while using only those that add distinct
value.

| Technique                     | Decision                     | Application                                                                                                            |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Example-based / BDD           | **Required**                 | Existing library behavior, package contract, DIBS consumer boundary                                                    |
| DDT                           | **Required**                 | Pack allowlist, blocked subpaths, publication states                                                                   |
| PBT                           | **Not initially justified**  | Public package surface is small and explicit                                                                           |
| Differential testing          | **Required**                 | `tsup` candidate vs `tsdown` candidate                                                                                 |
| Metamorphic testing           | **High value**               | Build-tool change must not alter export/subpath contract; local workspace presence must not affect registry resolution |
| Mutation testing              | **Targeted**                 | Publication decision/state logic; not build scripts generally                                                          |
| Fuzz testing                  | **Not justified**            | No new parser/protocol implementation                                                                                  |
| Mock testing                  | **Minimize**                 | Prefer real `.tgz`, real package managers, pure publication planner                                                    |
| Model-based testing           | **Not needed**               | Small explicit release state space                                                                                     |
| State-machine testing         | **Required for publication** | absent / matching / different / retry                                                                                  |
| Contract testing              | **Required**                 | package metadata, tarball contents, registry, public consumers                                                         |
| Snapshot/golden               | **Selective**                | Normalized export/file manifests only; avoid bundled-JS snapshots                                                      |
| Concurrency testing           | **Operationally covered**    | `resource_group` serializes same-package release publication                                                           |
| Deterministic simulation      | **Useful**                   | Publication state planner without registry I/O                                                                         |
| Static analysis               | **Required**                 | TypeScript, dprint, package metadata, CI                                                                               |
| Symbolic/formal techniques    | **Not justified**            | Contracts/state table are small and explicit                                                                           |
| Runtime assertions            | **Required**                 | package name/version/digest/registry destination                                                                       |
| Sanitizer tooling             | **Not applicable**           | No native-memory boundary                                                                                              |
| Cross-version testing         | **Selective**                | Declared runtime/TypeScript compatibility only                                                                         |
| Browser/E2E                   | **Website regression only**  | No package-level browser suite for a host-agnostic library                                                             |
| Security configuration checks | **Required operationally**   | protected tags, job-token allowlist, package protection                                                                |
| Clean-consumer integration    | **Required**                 | Exact tarball in `site-core`; exact canonical dependency in DIBS                                                       |

---

# Non-goals / deferred work

Keep these out of this migration unless a separate decision authorizes them:

- redesigning the `site-core` public API;
- adding new domain features;
- changing layer permissions beyond adapting local-source → external-package topology;
- adding CJS output;
- migrating unrelated DIBS workspaces;
- converting other workspace packages to standalone repositories;
- redesigning `npm-packages`;
- introducing browser-specific functionality into `site-core`;
- broad dependency upgrades unrelated to the package extraction;
- changing unrelated DIBS content or CI behavior.

---

# Suggested execution order

```text
characterize current workspace package
        ↓
build old tsup baseline candidate
        ↓
extract Git history
        ↓
audit license
        ↓
        EXTRACTION GATE
        ↓
bootstrap standalone Bun/dprint repo
        ↓
migrate tsup → tsdown
        ↓
differential package/consumer checks
        ↓
build exact release candidate
        ↓
        PACKAGE CONTRACT GATE
        ↓
authenticate glab + create/push GitLab project
        ↓
add site-core submodule to npm-packages
        ↓
register site-core as planned
        ↓
configure allowlist + protected tags
        ↓
        RELEASE AUTHORIZATION GATE
        ↓
create protected version tag
        ↓
publish exact .tgz
        ↓
candidate SHA == published SHA
        ↓
anonymous clean consumer
        ↓
mark registry entry active
        ↓
        PUBLICATION GATE
        ↓
remove site-core from pnpm workspace
        ↓
switch DIBS to exact published version
        ↓
prove clean registry resolution
        ↓
update architecture boundary
        ↓
run targeted + full DIBS tests
        ↓
        CONSUMER GATE
        ↓
delete packages/site-core
        ↓
remove workspace-only scripts
        ↓
fresh full pipelines
        ↓
record traceability evidence
```

The **minimum useful vertical slice** is:

> A history-preserving standalone `site-core` repository produces a `.tgz` whose runtime, type, export, and
> blocked-subpath contracts match the current workspace package; that exact artifact is published to project `85449745`,
> downloaded again with the same SHA-256, and consumed successfully by one clean external fixture.

Only after that slice is green should DIBS stop treating `site-core` as workspace source. This gives the extraction,
publication, and consumer migration independent evidence boundaries and prevents the build-tool migration, registry
migration, and monorepo cleanup from obscuring one another.

[1]: https://tsdown.dev/guide/migrate-from-tsup "Migrate from tsup - The Elegant Bundler for Libraries"
[2]: https://docs.gitlab.com/user/packages/workflows/project_registry/ "Manage packages with dedicated, type-specific registries | GitLab Docs"
[3]: https://bun.sh/docs/pm/cli/install "bun install | Bun Docs"
[4]: https://docs.gitlab.com/user/project/protected_tags/ "Protected tags | GitLab Docs"
[5]: https://docs.gitlab.com/ci/jobs/ci_job_token/ "CI/CD job token | GitLab Docs"
