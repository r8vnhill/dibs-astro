# Close the Brands Corpus Release Contract Before `0.2.0`

## Summary

Keep the current verdict: the branch is **not yet ready to merge for publication**, but the remaining work is narrowly
scoped to the release path rather than the brands corpus itself. The supplied plan correctly isolates GitLab CLI
authentication and durable release-asset verification as the remaining concerns.

I would strengthen the plan in four ways:

- distinguish **authentication evidence** from **write-authorization evidence**—a read-only `glab` call on a branch
  proves that CI authentication works, but cannot prove that a protected-tag job is authorized to upload Release assets
  without actually performing that write;
- promote verification of all three durable assets from “high-value” to **required**, because the documented release
  contract claims that the exact tarball, checksum file, and manifest are retained;
- model release assets and publication state explicitly, keeping comparison logic pure and GitLab/npm I/O at adapters;
- keep the `0.2.0` changelog focused on the final user-visible/project-relevant release state rather than narrating CI
  implementation details.

This remains a focused remediation and should therefore stay organized as short TDD cycles with objective acceptance
criteria and explicit non-goals, rather than introducing milestones or phases. That matches the project guidelines.

---

# TDD Cycle 1 — Make GitLab release authentication explicit and observable

## Goal

Ordinary branch CI proves that the shared `glab` runtime authenticates to the current GitLab project using
`CI_JOB_TOKEN`, while the configuration used by protected-tag release jobs inherits that same authentication contract.

Do **not** claim that the branch pipeline proves Release-asset upload authorization. The actual protected-tag execution
remains the final evidence for that write capability.

## Scope

Review and modify as needed:

```text
.gitlab/ci/release.yml
docs/release-process.md
```

Relevant jobs/contracts:

```text
.gitlab-cli-runtime
release-runtime-contract
gitlab-release
gitlab-release-assets
```

No library API, icon corpus, generated source, or package behavior should change.

### Red

Add the smallest integration check showing that the shared GitLab CLI environment is genuinely authenticated rather than
merely installed.

For example, from `release-runtime-contract`, execute one harmless authenticated read against the current project:

```sh
glab release list -R "$CI_PROJECT_PATH"
```

The desired BDD behavior is:

```text
given the shared GitLab CLI runtime in CI
when a read-only request is made against the current project
then glab authenticates using the CI job identity
```

Also characterize the configuration contract so the release jobs inherit the same runtime rather than introducing their
own authentication paths.

Keep this test clearly classified as **CI integration evidence**. It depends on GitLab's API and should not become a
requirement for local clean-checkout unit tests.

### Green

Configure CI auto-login centrally in the shared runtime:

```yaml
.gitlab-cli-runtime:
    variables:
        GLAB_ENABLE_CI_AUTOLOGIN: "true"
```

Make repository targeting explicit for release commands where practical:

```sh
glab release upload \
    -R "$CI_PROJECT_PATH" \
    "$CI_COMMIT_TAG" \
    ...
```

Do not introduce a separate personal, project, or bot credential if the existing project-scoped job identity is
sufficient.

Do not alias the job token into an unrelated token variable.

### Refactor

Keep authentication configuration in one place:

```text
.gitlab-cli-runtime
        ↓
release-runtime-contract
gitlab-release
gitlab-release-assets
```

Avoid duplicating environment variables or authentication setup in individual jobs.

If release CLI setup grows beyond a few cohesive lines, extract reusable CI configuration rather than a shell framework.

### Acceptance criteria

- branch CI performs at least one authenticated read through `glab`;
- missing or unusable CI authentication makes `release-runtime-contract` fail;
- `gitlab-release` and `gitlab-release-assets` inherit the exact same authentication configuration;
- no persistent release credential is added;
- no token is written to artifacts or logs;
- all existing branch jobs remain green;
- release documentation explicitly distinguishes:

  - **branch evidence:** CLI/runtime authentication works;
  - **protected-tag evidence:** publication write authorization actually works.

### Non-goals

Do not:

- create a temporary release merely to test permissions;
- upload sentinel packages from ordinary branches;
- introduce a release service account;
- change protected-tag policy;
- claim a read operation proves write authorization.

---

# TDD Cycle 2 — Turn durable Release assets into a verified typed contract

## Goal

The Release page must retain the **exact validated bytes** of every artifact the project promises for manual download:

```text
package .tgz
SHA256SUMS
release-manifest.json
```

The current plan notes that only the tarball is independently downloaded and hashed while the other two artifacts are
checked primarily by name. Because the release documentation claims exact artifact preservation, close this gap before
`0.2.0`.

## Scope

Review the existing post-publication domain contract and its GitLab/npm adapters.

Prefer a small typed model along these lines:

```ts
interface DurableReleaseAsset {
    readonly name: string;
    readonly localPath: string;
}
```

or, if the existing domain already has an appropriate release-artifact type, generalize that instead of introducing a
parallel taxonomy.

Do not encode HTTP URLs, GitLab JSON structures, or filesystem APIs in the domain model.

### Red

Use BDD + DDT over the complete durable-asset set.

Required cases:

```text
given an uploaded tarball whose bytes differ from the candidate
when post-publication verification runs
then verification reports a digest mismatch
```

```text
given SHA256SUMS with the expected Release asset name but different bytes
when post-publication verification runs
then verification reports a digest mismatch
```

```text
given release-manifest.json with the expected asset name but different bytes
when post-publication verification runs
then verification reports a digest mismatch
```

Also retain cases for:

- missing asset;
- duplicated/unexpected matching names if the API can expose such a state;
- correct artifact names and bytes;
- npm package digest differing from the candidate;
- GitLab tarball differing from the npm tarball.

Use one data-driven matrix for common asset behavior instead of repeating three nearly identical test suites.

### Green

Generalize the post-publish I/O boundary so each expected GitLab Release asset can be downloaded and compared against
the corresponding local package-job artifact.

The integrity relationships should be:

```text
                       ┌─ npm registry tarball
candidate .tgz SHA-256 ┼─ GitLab Release tarball
                       └─ local release artifact
```

and independently:

```text
local SHA256SUMS
    =
downloaded GitLab SHA256SUMS
```

```text
local release-manifest.json
    =
downloaded GitLab release-manifest.json
```

There is no need for `release-manifest.json` to contain its own digest. Compare its downloaded bytes with the original
artifact retained from packaging.

Keep post-publication verification strictly observation-only.

### Refactor

Separate:

```text
imperative shell
────────────────────────────────
download npm artifact
query GitLab Release
download GitLab assets
read local candidate artifacts

                ↓

functional core
────────────────────────────────
match expected assets
compute/compare digests
classify publication state
produce structured diagnostics
```

Prefer small fakes for network/file ports in domain tests. Do not mock private function-call sequences.

If publication recovery is already modeled, extend the existing state model rather than creating a separate
asset-specific retry mechanism.

### Acceptance criteria

- every promised Release asset is independently downloaded after publication;
- correct name + incorrect content is detected for all three assets;
- npm and GitLab `.tgz` bytes match the single pre-publish candidate;
- checksum and manifest bytes match their pre-publish originals;
- verification performs no publication mutation;
- diagnostics identify which distribution plane and which asset does not conform;
- retry/recovery classification remains exhaustive.

### Testing strategy

Use:

- **BDD/example tests** for observable release states;
- **DDT** across the three durable assets;
- **differential testing** for the tarball distributed through npm and GitLab;
- **state-machine testing** if the existing recovery classifier already represents publication states.

Do not add PBT, fuzzing, or mutation tooling solely for this boundary unless implementation complexity grows enough to
expose meaningful new invariants. The project guidelines specifically favor selecting testing styles according to
expected assurance value rather than using every technique indiscriminately.

### Non-goals

Do not:

- rebuild or repack after publication;
- make post-publish verification repair state automatically;
- add cryptographic signing in this release;
- introduce a second manifest format;
- change the brands corpus.

---

# TDD Cycle 3 — Define safe publication and recovery semantics

## Goal

A partially completed release can be resumed without republishing a package version, rebuilding the candidate, or
replacing artifacts whose bytes differ unexpectedly.

This should be explicit before the first release that publishes to two persistent distribution planes.

## Scope

Update the existing release state/recovery contract and:

```text
docs/release-process.md
```

Reuse current release scripts and state classification wherever possible.

### Red

Add BDD cases for the meaningful publication states:

```text
nothing published
```

```text
npm package published, GitLab Release absent
```

```text
npm package published, Release exists, one or more assets absent
```

```text
all expected destinations contain matching artifacts
```

```text
an existing destination contains the same version but different bytes
```

The final case is especially important: the safe response is to **stop**, not silently replace the release artifact or
republish the package.

### Green

Define recovery behavior approximately as:

| Observed state                           | Allowed action                                      |
| ---------------------------------------- | --------------------------------------------------- |
| Nothing published                        | perform normal publication                          |
| npm published, GitLab publication absent | resume only GitLab publication                      |
| Release exists, asset missing            | upload only the missing expected asset, then verify |
| All assets present and matching          | verification only                                   |
| Same version exists with different bytes | stop and require investigation                      |

The exact implementation should use the project's existing state taxonomy rather than introducing these strings verbatim
if equivalent states already exist.

Ensure that retries always consume the **original release candidate artifacts**.

### Refactor

Centralize publication-state decisions in the existing pure release contract.

CI scripts should ask the contract what action is permissible rather than reproduce state logic through scattered shell
conditionals.

This is an appropriate use of an explicit state machine because publication is a stateful protocol whose safe next
action depends on previously observed external state. The project guidelines specifically list state machines and
model-based/state-machine testing where they provide meaningful assurance.

### Acceptance criteria

- publishing the npm package twice is never an allowed recovery action;
- recovery never repacks the candidate;
- missing GitLab assets can be completed independently after npm publication;
- mismatching existing bytes stop the workflow;
- retry behavior is documented and covered by tests;
- the same release candidate remains the source of truth throughout retries.

### Non-goals

Do not:

- implement automatic rollback of an immutable package publication;
- automatically delete mismatching GitLab artifacts;
- introduce distributed transaction infrastructure;
- broaden recovery logic beyond this repository's release process.

---

# TDD Cycle 4 — Close the `0.2.0` release candidate

## Goal

Once the publication contract is green, create one internally consistent `0.2.0` candidate whose version, changelog,
package metadata, documentation, and packed artifact all describe the same final release.

`0.2.0` remains the correct release direction because this work adds the public `./brands` surface without intentionally
changing the existing root or `/phosphor` contracts. The supplied plan already identifies this as the intended version.

## Scope

Update only the authoritative version source and derived files required by the repository, including as applicable:

```text
package.json
bun.lock
CHANGELOG.md
```

Do not assume another file requires a version edit merely because it mentions a previous release; follow the existing
release/version contract.

### Red

Before editing, confirm that existing release-contract tests cover the relationships:

```text
authoritative version
        =
packed package version
        =
release version intent
```

and that the changelog contains exactly one entry for the new release.

If those relationships are already tested, do **not** add redundant tests merely to manufacture a Red step. Instead, use
the existing release checks as the pre-change failing contract after setting the intended release context.

If they are missing, add the smallest contract test needed.

### Green

Bump:

```text
0.1.0 → 0.2.0
```

Generate/update derived version metadata through existing tooling.

Add one Keep a Changelog entry describing the **final state**, not the development sequence.

The release entry should prioritize:

**Added**

- the public `@ravenhill/astro-icons/brands` entry point;
- the selected programming-language/developer-tool brand icons;
- durable GitLab Release downloads if that is considered part of the project's public distribution contract.

**Changed / project-relevant**, only if consistent with existing changelog practice:

- strengthened provenance and policy evidence associated with the new corpus.

Do **not** fill the changelog with implementation details such as:

- new verifier class/module names;
- `GLAB_ENABLE_CI_AUTOLOGIN`;
- CI job restructuring;
- test refactors.

Those belong in the MR and release-process documentation, not the consumer-facing release history.

### Refactor

Review:

- `CHANGELOG.md`;
- release-process documentation;
- README/package examples;

for taxonomy consistency.

Use the same terms everywhere:

```text
brands corpus
./brands
Simple Icons
release candidate
GitLab Release assets
```

Avoid alternate names for the same release artifacts or publication planes.

### Verification

From a clean checkout:

```sh
bun install --frozen-lockfile
bun run check
bun run release:prepare
bun run release:check
bun run consumer:check-release
```

Then require a fresh successful branch pipeline.

Critically, the branch pipeline must still **not publish** anything.

### Acceptance criteria

- `0.2.0` comes from the repository's authoritative version source;
- every required derived version agrees;
- the packed archive reports `0.2.0`;
- the changelog has exactly one new `0.2.0` entry;
- historical changelog entries remain untouched;
- `/brands` remains covered by packed-artifact consumer tests;
- corpus/provenance verification remains green;
- GitLab CLI authentication preflight is green;
- durable-asset contract/recovery tests are green;
- a clean checkout reproduces the candidate;
- the final branch pipeline is green and publication-free.

### Non-goals

Do not:

- rewrite historical changelog entries;
- add another versioning mechanism;
- publish from the feature branch;
- create the final release tag before merge.

---

# Merge gate

The branch becomes **ready to merge** only when this complete evidence chain is green:

```text
pinned provider inputs
        ↓
corpus + provenance + policy verification
        ↓
generated public /brands API
        ↓
single reproducible 0.2.0 tarball
        ↓
packed-artifact + Astro consumer validation
        ↓
authenticated GitLab release runtime
        ↓
typed durable-asset verification contract
        ↓
safe publication/recovery state model
```

At that point, perform one final code review of the resulting delta, then draft the MR.

The MR should separate:

- **user-visible capability:** `/brands`;
- **release assurance:** provenance, packed-consumer validation, durable downloads;
- **testing evidence:** clean checkout, full check, release contract, Astro matrix;
- **deployment:** protected-tag-only publication.

The current plan is right not to draft the final MR while the publication claim remains incomplete.

---

# Deployment and release plan after merge

## 1. Merge the validated candidate

Merge only the reviewed candidate whose version/changelog is already `0.2.0`.

Do not version again on `main`.

## 2. Create the protected release tag

Create:

```text
astro-icons-v0.2.0
```

on the exact intended `main` commit.

The tag-to-version contract must reject disagreement between:

```text
tag
package version
changelog
packed artifact
```

## 3. Produce the candidate exactly once

The tag pipeline should build/package once:

```text
source
  ↓
validated candidate .tgz
  ├── release-manifest.json
  └── SHA256SUMS
```

Every later job consumes those artifacts.

**No publication job may rebuild or repack the library.**

## 4. Validate before publication

Run:

```text
artifact contract
release contract
Astro consumer matrix
provenance/policy verification
```

against the exact tarball that will be published.

## 5. Publish the registry artifact

Publish that exact `.tgz` to the project's npm registry.

Record/observe its resulting digest.

## 6. Publish durable manual-download artifacts

Upload the same:

```text
*.tgz
SHA256SUMS
release-manifest.json
```

to the Generic Package Registry and expose them through the GitLab Release.

Do not create a second archive specifically for GitLab.

## 7. Verify both distribution planes

Post-publication verification should establish:

```text
                   npm registry
                       │
                       │ same SHA-256
                       ▼
local candidate ───── .tgz ───── GitLab Release
```

plus exact local/remote equality for:

```text
SHA256SUMS
release-manifest.json
```

## 8. Finalize the GitLab Release

Use the `0.2.0` changelog entry as the basis for release notes.

Expose the durable manual-download assets directly from the Release.

## 9. Treat verification as the final release state

A successful upload is not by itself “release complete.”

The terminal state is:

```text
published
+
independently observed
+
all expected bytes agree
```

This provides the strongest alignment with the project's emphasis on reproducibility, persistent artifacts, provenance,
and explicit contracts.

---

## Prioritization

**Required before merge**

- explicit CI authentication configuration;
- authenticated branch preflight;
- exact verification of every promised durable Release asset;
- safe retry/publication-state behavior;
- `0.2.0` candidate coherence;
- clean-checkout and full pipeline success.

**High-value but already largely satisfied**

- shared provider-independent provenance model;
- README-derived `/brands` consumer coverage;
- packed-artifact Astro compatibility matrix;
- functional-core separation for release decisions.

**Deferred**

- artifact signing/attestations;
- external transparency-log integration;
- additional registries;
- automated rollback;
- release bot credentials;
- broader release orchestration framework.

The main improvement over the supplied plan is that it now treats **release publication as a small stateful protocol
with explicit evidence**, rather than merely a sequence of CI commands. That better matches the project's
correctness-first and reproducibility-first guidelines while keeping the implementation scope contained.
