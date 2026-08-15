# Milestone 3 — Establish the canonical `@ravenhill` GitLab npm registry

## Goal

Establish `r8vnhill/npm-packages` as the single GitLab npm publication and consumption endpoint for `@ravenhill/*`
packages while preserving:

- independent source repositories;
- source-repository ownership of versions, tags, changelogs, and release authorization;
- exact validated package artifacts;
- existing published `astro-icons` versions and their provenance;
- anonymous installation of public packages;
- retry-safe publication;
- reproducible clean-consumer verification.

At completion:

```text
astro-icons ─────────┐
                     │ publication
astro-semantics ─────┼──────────▶ r8vnhill/npm-packages
                     │
future packages ─────┘
                                 │
                                 │ @ravenhill scope
                                 ▼
                         DIBS / other consumers
```

The registry project owns **artifact storage and registry policy**. Source repositories continue to own **source,
package identity, release decisions, tags, and release evidence**.

This separation should be documented explicitly because GitLab permits package storage to be independent of the
repository containing the package source. ([GitLab Docs][3])

---

# Architectural decisions

## 1. Use the dedicated project endpoint as the canonical npm endpoint

Canonical endpoint:

```text
https://gitlab.com/api/v4/projects/<npm-packages-project-id>/packages/npm/
```

Use this endpoint for both:

- publication;
- `@ravenhill` consumption.

GitLab requires project-level endpoints for npm publication, while npm consumers may use project, group, or instance
endpoints. Using the same project endpoint for this scope therefore minimizes topology differences between producer and
consumer paths. ([GitLab Docs][1])

Do not infer this project ID from:

```text
CI_PROJECT_ID
```

because in source pipelines that value identifies `astro-icons` or `astro-semantics`, not the registry project.

Define an explicit, non-secret registry contract such as:

```text
RAVENHILL_NPM_REGISTRY_PROJECT_ID
```

or an equivalent checked-in configuration value.

The pipeline should derive URLs from:

```text
CI_API_V4_URL
+
RAVENHILL_NPM_REGISTRY_PROJECT_ID
```

rather than duplicating full URLs in several scripts.

---

## 2. Keep the ordinary npm registry independent

DIBS should configure only the scoped override:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/projects/<registry-id>/packages/npm/
```

The ordinary npm registry remains the source for unscoped and unrelated packages.

Do not make the GitLab project registry the global npm registry.

This produces an explicit routing contract:

```text
@ravenhill/*    → GitLab canonical registry
everything else → normal configured npm registry
```

---

## 3. Disable npm forwarding for the controlled internal scope if operationally possible

GitLab can forward unresolved npm requests to npmjs.com. GitLab itself calls out the dependency-confusion implications
of forwarding and specifically recommends disabling forwarding before deleting packages. ([GitLab Docs][4])

For a namespace intended to be authoritative for `@ravenhill/*`, I would prefer:

```text
@ravenhill package found      → serve it
@ravenhill package not found  → fail explicitly
```

rather than:

```text
@ravenhill package not found
        ↓
try npmjs.com
```

This becomes particularly important during the `astro-icons` cutover, when an existing package must temporarily be
removed from its old project registry.

This is a **required cutover safeguard** if package deletion occurs.

---

## 4. Treat versions as immutable publication identities

Do not model:

```text
existing version → always fail
```

as the complete release behavior.

That makes a tag pipeline non-retryable after this sequence:

```text
publish succeeds
        ↓
network/job interruption
        ↓
post-publication verification never runs
        ↓
retry sees existing version and stops
```

Instead use an explicit reconciliation model:

```text
target version absent
    → publish candidate

target version present + published bytes match candidate
    → treat publication as already complete
    → continue post-publication verification

target version present + bytes differ
    → stop with an artifact inconsistency
```

GitLab does not allow duplicate npm versions, so this state model should sit above the immutable registry behavior
rather than depending on another upload succeeding. ([GitLab Docs][4])

This is a natural application of the project's explicit-state and state-machine testing guidance.

---

# Phase 1 — Establish and verify registry governance

## Goal

Create the registry project and prove its read/write policy before changing any source repository.

## Scope

Configure:

```text
r8vnhill/npm-packages
```

with:

- public project/package visibility;
- Package Registry enabled;
- npm package protection;
- CI job-token allowlist;
- explicit source-project authorization;
- appropriate member permissions for release initiators;
- npm request forwarding policy.

GitLab public projects can expose packages for anonymous pulling, while publication still requires authorization.
([GitLab Docs][1])

### Package protection

Create an npm protection rule matching:

```text
@ravenhill/*
```

and choose the minimum push/delete roles deliberately.

GitLab package-protection rules support wildcards and independently configure minimum roles for push and delete.
([GitLab Docs][5])

Prefer stricter deletion permission than publication permission.

Deletion is an administrative recovery operation, not part of ordinary source-repository release automation.

### Cross-project CI authorization

Allow:

```text
r8vnhill/astro-icons
r8vnhill/astro-semantics
```

in the registry project's CI/CD job-token allowlist.

Also verify the **identity/permission side** of the contract:

```text
allowlisted source project
+
release-triggering user with sufficient target-project role
=
authorized publication
```

The allowlist alone is insufficient. ([GitLab Docs][2])

## Configuration contract

Record the expected governance in maintainable documentation, including:

- canonical project path;
- canonical project ID;
- package scope;
- package visibility;
- forwarding policy;
- allowlisted publishers;
- protection rule;
- required release-triggering role.

Do not commit credentials.

## Acceptance criteria

- anonymous `npm view`/installation can read packages from the public project once packages exist;
- ordinary unscoped package resolution does not depend on the GitLab project registry;
- only intended source projects are allowlisted for CI job-token access;
- an allowlisted job without the necessary triggering-user permission cannot publish;
- deletion requires stronger authorization than ordinary publication;
- package forwarding is disabled before any existing package is removed;
- no registry token exists in source control.

## Non-goals

- no `astro-icons` package movement yet;
- no `astro-semantics` release yet;
- no DIBS dependency migration yet.

---

# Phase 2 — Introduce a reusable publication contract in source repositories

## Goal

Make registry targeting and publication decisions deterministic and independently testable before performing a real
registry write.

## Scope

Apply first to `astro-semantics`, then reuse the model in `astro-icons`.

Separate the release flow into:

```text
validated candidate
        ↓
registry observation
        ↓
pure publication decision
        ↓
optional write
        ↓
independent verification
```

The core decision logic should not perform HTTP requests itself.

## TDD cycle 1 — Registry endpoint contract

### Red

Add tests such as:

```text
given a source repository whose CI_PROJECT_ID is not the registry project ID
when the publication endpoint is derived
then it targets the configured canonical registry project
```

and:

```text
given the canonical scope configuration
when an unscoped package is resolved
then it is not routed through the @ravenhill override
```

### Green

Introduce the explicit registry project configuration and remove publication assumptions based on `CI_PROJECT_ID`.

### Refactor

Use one URL constructor/shared helper within each repository rather than assembling endpoints independently in multiple
CI jobs.

## TDD cycle 2 — Publication decision state machine

Model, at minimum:

```text
ABSENT
PRESENT_MATCHING
PRESENT_DIFFERENT
```

BDD examples:

```text
given the target version is absent
when publication is planned
then the validated candidate is eligible for upload
```

```text
given the target version already exists with the same digest
when a release job is retried
then no upload is attempted and verification continues
```

```text
given the target version exists with different bytes
when publication is planned
then publication stops with an artifact inconsistency
```

### DDT

Represent the state table directly:

| Registry state | Candidate relation | Decision     |
| -------------- | ------------------ | ------------ |
| absent         | n/a                | publish      |
| present        | matching           | reuse/verify |
| present        | different          | stop         |

## Acceptance criteria

- publication does not infer the destination from the source project;
- exact candidate `.tgz` is reused without repacking;
- retrying after successful upload is convergent;
- an existing different artifact cannot be silently replaced;
- branch/MR pipelines cannot execute write operations.

---

# Phase 3 — Publish `astro-semantics` as the minimum vertical slice

## Goal

Prove the new topology with a package that has **no existing GitLab namespace-location conflict** before migrating
`astro-icons`.

This should be the first end-to-end validation of the canonical project.

## Scope

`astro-semantics` protected-tag release pipeline.

### Publication sequence

```text
protected version tag
        ↓
validate tag ↔ package version
        ↓
retrieve validated candidate from prior pipeline stage
        ↓
verify manifest + SHA-256
        ↓
observe canonical registry
        ↓
publication state decision
        ↓
publish exact .tgz if absent
        ↓
download from canonical registry
        ↓
compare digest
        ↓
install published version in clean consumer
        ↓
astro check + build
```

Do not repack after candidate validation.

## Authentication

Generate transient npm authentication configuration inside the publication job using:

```text
CI_JOB_TOKEN
```

and delete/leave it inside the ephemeral job environment.

GitLab explicitly supports `CI_JOB_TOKEN` for CI npm publication. ([GitLab Docs][1])

## Post-publication consumer test

The clean consumer must install:

```text
@ravenhill/astro-semantics@<released-version>
```

from the canonical GitLab endpoint, not from:

- the source tree;
- the CI artifact directly;
- a workspace;
- the package `.tgz`.

This test answers a different question from Milestone 2:

```text
Milestone 2:
Can consumers use the candidate tarball?

Milestone 3:
Can consumers retrieve and use the bytes actually stored in GitLab?
```

## Acceptance criteria

- the canonical project contains `@ravenhill/astro-semantics`;
- downloaded bytes match the validated release candidate;
- anonymous consumption succeeds;
- clean Astro consumer succeeds;
- retrying the release pipeline converges without another upload;
- branch and MR pipelines remain read-only.

This is the **minimum useful vertical slice** for the whole milestone.

---

# Phase 4 — Preserve and migrate the existing `astro-icons` package history

## Goal

Move `@ravenhill/astro-icons` without losing published versions or provenance.

This phase is required because GitLab does not permit the same npm package name to be published into another project
under the same root namespace while it remains registered in its original project. ([GitLab Docs][1])

## Step 1 — Inventory the current registry

Before changing anything, enumerate every published `astro-icons` version from its current registry.

For each version record:

```text
package
version
source project
tarball URL
downloaded SHA-256
package.json metadata
publication timestamp if useful
```

Store the inventory as a machine-readable migration manifest.

Example conceptual structure:

```json
{
    "package": "@ravenhill/astro-icons",
    "sourceRegistryProject": 85350050,
    "versions": [
        {
            "version": "...",
            "sha256": "...",
            "archive": "..."
        }
    ]
}
```

Do not assume only the latest release matters.

## Step 2 — Archive exact existing tarballs

Download every current published version before deletion.

Verify that:

- each archive can be unpacked;
- its internal package name/version matches registry metadata;
- its digest is recorded;
- the archived bytes are retained until migration is complete.

This is where **differential testing** is appropriate:

```text
old-registry artifact
        =
archived migration artifact
```

byte for byte.

## Step 3 — Freeze publication temporarily

Before cutover:

- prevent new `astro-icons` publication;
- disable npm forwarding;
- record the exact migration window;
- verify no unreconciled release is in progress.

This avoids having the source registry change underneath the inventory.

## Step 4 — Remove the source-project npm package

Only after:

- all versions are inventoried;
- all archives are preserved;
- digests are verified;
- forwarding is disabled.

GitLab specifically recommends disabling forwarding before package deletion because an unresolved package request can
otherwise be redirected to a public registry. ([GitLab Docs][4])

## Step 5 — Republish the preserved history

Publish the archived tarballs to:

```text
r8vnhill/npm-packages
```

in version order or another deterministic order.

Do **not** rebuild historical versions from Git commits when exact published tarballs are available.

The desired invariant is:

```text
old registry tarball SHA-256
=
migration archive SHA-256
=
new registry downloaded tarball SHA-256
```

## Step 6 — Verify complete history

For every migrated version:

- registry metadata names the expected package/version;
- archive digest matches;
- public anonymous download succeeds;
- representative old and current versions install successfully.

Use DDT across all migrated versions rather than duplicating tests.

## Step 7 — Switch future publication

Only after the complete history is present in the canonical project should `astro-icons` publication configuration
change permanently.

## Acceptance criteria

- every previously published `astro-icons` version exists in the canonical project;
- each migrated version preserves its archived digest;
- no historical version is silently rebuilt;
- old project contains no competing npm package registration;
- future versions publish only to `npm-packages`;
- the existing artifact-first/post-publication verification semantics remain intact.

---

# Phase 5 — Strengthen `astro-icons` publication for the shared registry

## Goal

Preserve its existing release assurance while removing source-project registry assumptions.

## Scope

Change only registry-specific behavior.

Preserve:

- package-once semantics;
- candidate manifest;
- SHA-256 evidence;
- GitLab Release assets;
- post-publication verification;
- existing release state-machine tests.

## Required changes

Replace usages where:

```text
CI_PROJECT_ID == package registry project
```

is assumed.

Publication should instead use:

```text
source project ID    → releases / source metadata
registry project ID  → npm publication / npm queries
```

These two identities must remain explicit and separately named.

For example:

```text
SOURCE_PROJECT_ID
NPM_REGISTRY_PROJECT_ID
```

rather than a generic `PROJECT_ID`.

This follows the project guideline to maintain clear taxonomy and explicit interfaces.

## Tests

Add regression cases ensuring:

```text
SOURCE_PROJECT_ID != NPM_REGISTRY_PROJECT_ID
```

still permits:

- package lookup;
- publication planning;
- post-publication download;
- digest verification;
- GitLab Release creation in the **source** project.

This distinction is particularly important because GitLab Releases and npm package storage now intentionally belong to
different projects.

---

# Phase 6 — Migrate DIBS consumption

## Goal

Make the website consume all `@ravenhill/*` dependencies through one scope endpoint.

## Scope

Update:

```text
.npmrc
lockfile
dependency-installation checks
focused package-consumer tests
```

Configure:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/projects/<npm-packages-id>/packages/npm/
```

with no committed auth token.

Because the target project is public, public packages can be pulled anonymously. ([GitLab Docs][1])

## TDD cycle — Resolution contract

### Red

Add a dependency-resolution test proving that:

```text
@ravenhill/astro-icons
@ravenhill/astro-semantics
```

resolve through the canonical endpoint while an ordinary package such as:

```text
astro
```

continues to resolve through the normal npm registry.

### Green

Change the scope endpoint and regenerate the lockfile.

### Refactor

Remove stale project-specific registry configuration.

Do not add package-specific npm scopes or multiple `@ravenhill` project endpoints.

## Acceptance criteria

- one `@ravenhill` registry endpoint serves both packages;
- lockfile references contain no old `astro-icons` project endpoint;
- ordinary dependencies remain unaffected;
- clean checkout installation succeeds without GitLab credentials.

---

# Phase 7 — End-to-end governance and recovery verification

## Goal

Prove that the topology remains correct under expected retry and configuration-failure scenarios.

## State-machine testing

Required for publication logic.

Model:

```text
candidate
    ×
registry version state
    ×
authorization state
```

At minimum:

| Version state | Authorization | Expected result                 |
| ------------- | ------------- | ------------------------------- |
| absent        | authorized    | publish                         |
| matching      | authorized    | reuse + verify                  |
| different     | authorized    | stop                            |
| absent        | unauthorized  | no write                        |
| matching      | unauthorized  | read behavior only as permitted |

Do not test GitLab by mocking HTTP call sequences as the primary assurance technique.

Use:

1. pure state-decision tests;
2. HTTP adapters with focused contract tests;
3. actual protected-tag publication as the production integration evidence.

---

# Testing-style disposition

All styles from the project guidelines are considered here.

| Technique                   | Decision                    | Application                                                                                                                        |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Example-based / BDD         | **Required**                | Publication decisions, auth boundaries, consumer behavior                                                                          |
| DDT                         | **Required**                | Registry-state matrices, migrated-version matrices, endpoint combinations                                                          |
| PBT                         | **Useful, targeted**        | Generate valid package/version metadata for pure URL/manifest/reconciliation invariants                                            |
| Differential testing        | **Required**                | Old vs new `astro-icons` artifacts and digests                                                                                     |
| Metamorphic testing         | **Required, lightweight**   | Changing source-project ID must not alter canonical registry endpoint; retrying matching publication must not create a new package |
| Mutation testing            | **High-value, targeted**    | Publication-decision/state logic and digest comparisons                                                                            |
| Fuzz testing                | **Optional / low value**    | Only useful for manifest/registry-response parsers if nontrivial parsing is introduced                                             |
| Mock testing                | **Use sparingly**           | Only adapter error cases; do not make mock call sequences the primary release evidence                                             |
| Model-based testing         | **Useful**                  | Registry publication model if reconciliation logic grows beyond the three core states                                              |
| State-machine testing       | **Required**                | Absent/matching/different publication and retry behavior                                                                           |
| Contract testing            | **Required**                | GitLab endpoint construction, package metadata, tarball contract, consumer installation                                            |
| Snapshot/golden             | **Selective**               | Migration manifests and normalized package metadata only                                                                           |
| Concurrency testing         | **Useful**                  | Same-source concurrent release attempts; verify serialization/idempotent publication behavior                                      |
| Deterministic simulation    | **Useful**                  | Pure publication planner with synthetic registry observations                                                                      |
| Static analysis             | **Required**                | CI config validation, TypeScript checks, shell/static checks as applicable                                                         |
| Symbolic execution          | **Not justified**           | Small finite publication state space is better tested explicitly                                                                   |
| Formal specification        | **Optional**                | State table is sufficient unless the release system grows materially                                                               |
| Runtime assertions          | **Required at boundaries**  | package name/version/digest/registry target before writes                                                                          |
| Sanitizer-style tooling     | **Not applicable**          | No native-memory boundary                                                                                                          |
| Cross-version compatibility | **Required where relevant** | Published `astro-semantics` consumer matrix; historical `astro-icons` install checks                                               |
| Security/permission tests   | **Required**                | Cross-project token allowlist + target permission behavior                                                                         |
| Clean-consumer tests        | **Required**                | Actual public registry installation after publication                                                                              |

### Mutation testing is more justified here than in Milestone 2

Unlike `Paragraph`, this milestone introduces meaningful decision logic where small condition changes can cause unsafe
release behavior:

```text
matching → different
absent   → present
source ID → registry ID
```

Targeted mutation testing of the pure publication planner and digest reconciliation can therefore provide real value. Do
not mutation-test GitLab CI YAML or HTTP plumbing merely to increase a score.

---

# Global acceptance criteria

Milestone 3 is complete when:

### Registry governance

- `r8vnhill/npm-packages` is the canonical npm project;
- Package Registry is public for reads;
- `@ravenhill/*` has explicit package-protection policy;
- only authorized source projects are on the job-token allowlist;
- the required triggering-user permissions are documented and verified;
- no publication credential is committed;
- npm forwarding is disabled for the controlled namespace/cutover.

### `astro-semantics`

- publishes its exact Milestone 2 candidate tarball;
- publication occurs only from an authorized protected release tag;
- downloaded registry bytes match the candidate digest;
- a clean consumer installs the registry version successfully;
- release retry after a completed upload converges safely.

### `astro-icons`

- every historical published version is inventoried and preserved;
- migrated versions in the canonical project match their original archived digests;
- no package-name ownership remains in the old project registry;
- future publication targets the canonical project;
- GitLab Releases remain attached to the source repository;
- npm publication evidence remains artifact-first and digest-verified.

### DIBS

- has one `@ravenhill` registry configuration;
- can install both libraries through it;
- uses no registry credentials for public consumption;
- has no stale old-project npm URLs in its lockfile;
- ordinary npm dependencies continue resolving normally.

### CI/reproducibility

- branches and MRs cannot publish;
- registry write logic is protected-tag-only;
- absent/matching/different registry states have executable tests;
- production boundary checks validate package name, version, digest, and destination before writes;
- full package and consumer checks remain green.

---

# Non-goals / deferred work

This milestone intentionally does **not**:

- change the `@ravenhill` npm scope;
- move source repositories into a new GitLab group;
- migrate `Paragraph` usage in the DIBS website;
- migrate every unrelated historical `@ravenhill/*` package immediately;
- centralize GitLab Releases in `npm-packages`;
- rebuild historical package versions from source when their published tarballs can be preserved;
- introduce a custom registry service;
- introduce long-lived PATs or deploy tokens for routine CI publication;
- broaden package publishing rights beyond the explicitly authorized repositories.

A future move to a common GitLab group plus a group-level consumption endpoint could be evaluated if the number of
source repositories grows substantially. GitLab recommends group endpoints when many packages live in different projects
under the same group, but that architectural change would require repository-namespace work that is not necessary for
this milestone. ([GitLab Docs][1])

# Suggested execution order

```text
create/configure npm-packages
        ↓
verify protection + allowlist + permissions
        ↓
disable/decide forwarding policy
        ↓
implement registry-target contract
        ↓
implement retry-safe publication planner
        ↓
publish astro-semantics as first vertical slice
        ↓
verify public clean consumer
        ↓
inventory every existing astro-icons version
        ↓
archive + hash old artifacts
        ↓
freeze old astro-icons publication
        ↓
disable forwarding before cutover
        ↓
remove old package registration
        ↓
republish exact historical tarballs
        ↓
differential digest verification
        ↓
switch future astro-icons publication
        ↓
switch DIBS @ravenhill endpoint
        ↓
full end-to-end verification
```

The key improvement is that **`astro-semantics` becomes the low-risk proof of the new topology, while `astro-icons` is
treated as a controlled artifact migration with provenance preservation**. That avoids discovering GitLab's package-name
ownership constraint in the middle of a production release and gives the milestone a much cleaner evidence chain.

[1]: https://docs.gitlab.com/user/packages/npm_registry/ "npm packages in the package registry | GitLab Docs"
[2]: https://docs.gitlab.com/ci/jobs/ci_job_token/ "CI/CD job token | GitLab Docs"
[3]: https://docs.gitlab.com/user/packages/workflows/working_with_monorepos/ "Monorepo package management workflows | GitLab Docs"
[4]: https://docs.gitlab.com/user/packages/package_registry/supported_functionality/ "Supported package managers and functionality | GitLab Docs"
[5]: https://docs.gitlab.com/user/packages/package_registry/package_protection_rules/ "Protected packages | GitLab Docs"
