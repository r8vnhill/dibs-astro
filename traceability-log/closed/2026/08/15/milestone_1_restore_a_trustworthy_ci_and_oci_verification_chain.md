# Milestone 1 — Restore a trustworthy CI and OCI verification chain

## Summary

Turn the existing Docker and GitLab CI implementation into an auditable artifact pipeline with one immutable
candidate-image identity:

```text
source + frozen dependencies
            │
            ▼
      static site build
            │
            ▼
      OCI candidate image
            │
            ▼
        manifest digest
       ┌────┼────────┐
       ▼    ▼        ▼
      HTTP browser  OCI/runtime
    contract contract  policy
       └────┼────────┘
            ▼
       promotion gate
            │
            ▼
 SHA / version / Git-tag aliases
```

The milestone must guarantee that:

- every CI job uses the declared repository toolchain and frozen dependency graph;
- the OCI candidate is built exactly once;
- verification jobs exercise that exact candidate rather than rebuilding equivalent source;
- durable aliases are created only after all required verification succeeds;
- package, registry, and runner credentials remain outside source control, image layers, image metadata, build
  arguments, and logs;
- existing Cloudflare deployment behavior and static-site semantics remain unchanged.

The repository already contains the Dockerfile, container-testing infrastructure, and initial CI jobs. This milestone is
therefore a **correctness and assurance refinement**, not a redesign of the website or deployment architecture.

---

## Phase 1 — Establish the canonical CI contract

### Goal

Make pipeline creation and clean-checkout execution deterministic before changing container publication behavior.

### Scope

Relevant boundaries:

- `.gitlab-ci.yml`;
- root toolchain declarations;
- package installation;
- generated-artifact checks;
- existing check/test/build jobs.

Preserve these as distinct assurance planes:

```text
static checks
unit behavior
Astro rendering
browser behavior
production build
container behavior
```

Do not collapse them into one large job merely to simplify the pipeline graph.

### TDD cycle 1.1 — Pipeline graph conformance

**Red**

Create or retain a reproducible CI configuration check demonstrating that every mandatory `needs` dependency exists in
each supported pipeline type.

Cover at least:

- merge request;
- ordinary branch;
- `main`;
- release tag.

**Green**

Make pipeline inclusion rules coherent across producers and consumers.

A mandatory verification dependency must remain mandatory; do not use optional dependencies merely to make invalid
graphs parse.

**Refactor**

Centralize repeated pipeline-presence rules where doing so reduces configuration drift without hiding job intent.

### TDD cycle 1.2 — Frozen clean-checkout baseline

**Red**

From a clean checkout, run using the canonical toolchain:

```text
Node 24.11.0
pnpm 11.8.0
pnpm install --frozen-lockfile
```

Characterize any discrepancies between local project metadata and CI declarations.

**Green**

Ensure the following succeed independently:

- `pnpm check`;
- unit Vitest suite;
- Astro-render Vitest suite;
- E2E suite;
- `pnpm build`.

**Refactor**

Add concise environment/version diagnostics at the job boundary.

Do not share mutable `node_modules` between jobs. Dependency caches may improve performance, but correctness must never
depend on cache state.

### TDD cycle 1.3 — Generated-state determinism

**Red**

Characterize whether checks or builds alter tracked generated artifacts.

**Green**

Require generation/check operations to produce the canonical committed state.

**Refactor**

Reuse existing generation entry points rather than reconstructing their dependency chain inside CI.

### Acceptance criteria

- All supported pipeline types can be instantiated successfully.
- Mandatory jobs and their dependencies coexist in every applicable pipeline.
- A clean checkout passes all existing non-container quality gates.
- A cold dependency/cache state produces the same result.
- Generator/build operations leave no unexplained tracked changes.
- No mutable dependency tree is passed between jobs.
- Cloudflare deployment rules are unchanged.

### Non-goals

- container publication;
- pipeline performance optimization;
- dependency upgrades;
- test-suite consolidation.

---

## Phase 2 — Build one immutable OCI candidate

### Goal

Produce one OCI candidate whose digest becomes the identity used by all downstream verification and publication.

### Scope

Relevant components:

- `Dockerfile`;
- `.dockerignore`;
- `container:build`;
- package-registry authentication;
- GitLab container registry;
- OCI metadata.

### TDD cycle 2.1 — Reproducible image construction

**Red**

From a clean checkout and empty BuildKit cache:

> given the frozen dependency graph and valid package-registry credentials when the OCI build executes then the
> canonical `pnpm build` produces a usable static runtime image

**Green**

Configure rootless BuildKit to:

- use the pinned build environment;
- install with `--frozen-lockfile`;
- use a BuildKit pnpm-store cache only as an optimization;
- inject package authentication through a secret-mounted temporary npm configuration;
- execute the existing `pnpm build`;
- publish only a pipeline-scoped candidate reference.

Do not introduce:

- Docker-in-Docker;
- privileged execution;
- `/var/run/docker.sock`;
- secret-valued `ARG`;
- secret-valued `ENV`;
- committed authenticated `.npmrc`.

### TDD cycle 2.2 — Establish immutable candidate identity

**Red**

Characterize the current ambiguity between a mutable registry tag and the artifact actually produced.

**Green**

After the build:

1. resolve the resulting manifest digest;
2. persist it as a small machine-readable CI artifact;
3. expose it to all verification jobs;
4. use the digest as the canonical candidate identity.

Prefer a structure such as:

```json
{
    "schemaVersion": 1,
    "image": "registry.example/project/ci:...",
    "digest": "sha256:...",
    "revision": "...",
    "platform": "linux/amd64"
}
```

Use a versioned schema rather than passing loosely related dotenv variables if the metadata is expected to grow.

**Refactor**

Keep candidate metadata generation in one focused script rather than duplicating registry parsing across CI jobs.

### TDD cycle 2.3 — Provenance metadata correctness

Validate OCI metadata such as:

- revision;
- source repository;
- project version when applicable;
- license identifier;
- supported platform.

OCI metadata must be derived from authoritative project/CI sources rather than duplicated manually.

### Acceptance criteria

- A cold-cache build succeeds.
- One candidate image is produced per pipeline.
- Its immutable digest is available machine-readably downstream.
- Verification jobs do not rebuild the application image.
- Package credentials exist only during the dependency-install operation.
- No credential value appears in image history, configuration, attestations, or logs.
- The Dockerfile remains platform-neutral.
- The initial CI target may be `linux/amd64`, but platform policy is owned by CI.
- Provenance and SBOM attestations describe the candidate image.

### Non-goals

- durable release aliases;
- multi-platform publication;
- signing;
- vulnerability scanning.

---

## Phase 3 — Separate HTTP, browser, and OCI runtime assurance

### Goal

Verify the candidate through independent contracts corresponding to what each execution environment can actually
observe.

Do **not** make `scripts/test-container.mjs` a single abstraction responsible for unrelated assurance concerns.

Prefer:

```text
container candidate
     │
     ├─ HTTP semantic contract
     ├─ browser hydration contract
     └─ OCI/runtime policy contract
```

Shared data may be reused, but each boundary should have one clear responsibility.

---

### TDD cycle 3.1 — HTTP delivery contract

#### Red

Define a data-driven route matrix derived from the actual static build.

Cover:

- `/`;
- representative lesson;
- representative page containing an Astro/React island;
- one generated `/_astro/...` asset;
- generated 404;
- trailing-slash behavior;
- representative legacy redirect.

For each relevant case, assert observable properties such as:

```text
request path
expected status
expected MIME family
expected content marker
optional location header
```

#### Green

Allow the HTTP contract runner to target either:

```text
local managed container
```

or:

```text
CONTAINER_BASE_URL
```

without changing the semantics of the assertions.

#### Refactor

Extract the route matrix from orchestration code so HTTP expectations are reusable without coupling them to Docker
lifecycle management.

### Acceptance criteria

- Local and CI HTTP tests execute the same semantic matrix.
- CI targets the candidate service image.
- Redirect expectations are based on current generated behavior.
- 404 assertions include both status and DIBS 404 content.
- MIME behavior is covered where meaningful.

---

### TDD cycle 3.2 — Browser hydration contract

#### Red

Demonstrate that an external base URL does not accidentally cause Playwright to target the local Astro development
server.

Add configuration tests for:

| Environment     | Base URL             | Local web server |
| --------------- | -------------------- | ---------------- |
| ordinary E2E    | local Astro URL      | enabled          |
| candidate image | `CONTAINER_BASE_URL` | disabled         |

#### Green

Parameterize the existing Playwright setup so container CI exercises the candidate image.

Reuse an existing meaningful interaction rather than creating a Docker-specific browser suite.

The test should prove actual client behavior, for example:

> given a lesson containing an interactive island when the production container page is opened then the island hydrates
> and its representative interaction succeeds

#### Refactor

Keep target selection separate from general Playwright configuration if that improves clarity.

### Acceptance criteria

- Container browser CI cannot silently fall back to localhost.
- No Astro development server starts in candidate-image mode.
- At least one meaningful island interaction executes successfully.
- Existing ordinary Playwright tests retain their current local-development behavior.

---

### TDD cycle 3.3 — OCI image policy

#### Red

Define the expected production-image policy independently from HTTP behavior.

Required observable conditions include:

- configured runtime user is non-root;
- expected port is exposed/configured;
- project source is absent;
- `node_modules` is absent;
- Node and pnpm are absent;
- Git metadata is absent;
- authenticated npm configuration is absent;
- development/build-only artifacts are absent.

#### Green

Implement inspection using an OCI-capable mechanism that does not require host Docker-daemon access.

Keep this separate from the service-image HTTP test because a service endpoint cannot prove filesystem contents.

#### Refactor

Represent the expectations as data where practical rather than a long series of bespoke shell commands.

### TDD cycle 3.4 — Executable read-only runtime policy

Keep the existing stronger local/runtime test:

```text
non-root
read-only root filesystem
/tmp explicitly writable
```

Run it automatically where the available runtime can provide that isolation safely.

Do **not** weaken the security model by binding a host Docker socket just to execute this assertion in every CI
environment.

### Acceptance criteria

- HTTP correctness, browser hydration, image contents, and execution hardening are distinct contracts.
- Each uses the strongest evidence available in its environment.
- CI never claims a property it did not actually observe.
- Local `pnpm test:container` continues to exercise the complete runtime where supported.

### Non-goals

- Cloudflare edge-header parity;
- CDN caching verification;
- browser testing of every lesson;
- introducing a privileged container runtime.

---

## Phase 4 — Promote only verified OCI digests

### Goal

Make durable image publication an explicit consequence of successful verification rather than part of the build job.

### Scope

Add a dedicated promotion boundary:

```text
container:build
       │
       ▼
 candidate digest
       │
   verification
       │
       ▼
container:publish
```

### TDD cycle 4.1 — Verification gate

**Red**

Characterize the undesirable state:

> a candidate receives a durable release alias even though a downstream verification job fails

**Green**

Make `container:publish` depend on all required candidate checks:

- HTTP;
- browser;
- OCI image policy;
- any mandatory existing project quality gates.

A failed required check must prevent promotion.

### TDD cycle 4.2 — Digest promotion

Promote the **same digest** already verified.

Do not execute another Dockerfile build.

For `main`, publish the project's chosen immutable revision alias, typically:

```text
:<full-commit-sha>
```

For releases, derive aliases from:

- authoritative project version;
- Git release tag;
- commit SHA.

Before publication, validate that the release tag and authoritative version are consistent with the project's release
convention.

Avoid redundant aliases if the Git tag and version are intentionally identical.

Do not introduce `latest` without explicitly defining what it means.

### TDD cycle 4.3 — Attestation association

Ensure provenance and SBOM metadata remain associated with the promoted artifact rather than describing a later rebuild.

### Acceptance criteria

- A failing verification prevents durable publication.
- Promotion does not rebuild the application.
- Published aliases resolve to the candidate's verified digest.
- Release version comes from the authoritative project version source.
- Tag/version inconsistencies fail with a structured actionable diagnostic.
- SHA, version, and Git-tag aliases point to one manifest digest.
- Attestations correspond to that artifact.

### Non-goals

- Cosign;
- additional registries;
- `latest`;
- release automation unrelated to OCI publication.

---

## Phase 5 — Harden credential and runner configuration boundaries

### Goal

Ensure local and CI infrastructure configuration can be reproduced without storing active credentials in the repository.

### Scope

Cover separately:

```text
package-registry authentication
container-registry authentication
private service-image pulls
runner authentication
```

Do not treat them as one generic "GitLab token" because their capabilities and lifetimes differ.

### TDD cycle 5.1 — Credential preflight

Add a small preflight at the narrow boundary that requires private package access.

Its diagnostic should identify the missing capability without outputting:

- token contents;
- complete authenticated `.npmrc`;
- encoded registry credentials.

Prefer:

> package-registry authentication is unavailable for `@ravenhill`

over printing the environment variable or configuration used to supply it.

### TDD cycle 5.2 — Repository exclusion contract

Verify that active runner configuration and credential-bearing files are:

- absent from tracked content;
- excluded from Docker build context;
- covered by ignore rules.

Keep a sanitized example containing placeholders only.

### TDD cycle 5.3 — External credential remediation

Document as an operational prerequisite:

- previously exposed credentials must be revoked/rotated externally;
- replacement credentials are configured through GitLab/runtime facilities;
- no actual values are committed or copied into project documentation.

Do not make repository history rewriting part of this milestone.

### Acceptance criteria

- `config.toml` containing active credentials is not tracked.
- Docker build context cannot include it.
- Package authentication uses BuildKit secrets.
- Registry/service authentication uses CI facilities appropriate to that boundary.
- Preflight failures are actionable without exposing sensitive values.
- Sanitized runner setup is sufficient to reconstruct configuration.
- Any previously exposed active credentials have been externally replaced before the milestone is considered
  operationally complete.

### Non-goals

- new secrets-management infrastructure;
- automatic rotation;
- repository-history rewriting.

---

# CI dependency structure

The intended dependency graph should remain explicit:

```text
prepare / dependency contract
          │
    ┌─────┼───────────────┐
    ▼     ▼               ▼
 check   unit        Astro render
    │     │               │
    └─────┼───────────────┘
          ▼
         E2E
          │
          ├─────────────► production static build
          │
          ▼
    container candidate
          │
    ┌─────┼──────────────┐
    ▼     ▼              ▼
 HTTP   browser      OCI policy
    └─────┼──────────────┘
          ▼
       promotion
```

The exact GitLab graph may allow safe parallelism, but dependency edges should encode **semantic prerequisites**, not
merely execution ordering.

For example, HTTP and browser verification can run in parallel once the candidate exists.

---

# Priority classification

### Required for this milestone

- valid pipeline graph;
- canonical toolchain/frozen install;
- deterministic generated state;
- one candidate build;
- immutable digest handoff;
- HTTP candidate verification;
- browser candidate verification;
- image-policy verification;
- verification-gated promotion;
- secret-mounted package authentication;
- credential hygiene;
- unchanged Cloudflare semantics.

### High-value within the milestone

- versioned candidate metadata artifact;
- provenance/SBOM attestations;
- reusable DDT HTTP contract;
- CI check for OCI metadata consistency.

### Deferred research/engineering opportunities

- cross-target differential tests between Cloudflare and OCI;
- multi-platform `amd64`/`arm64` publication;
- container signing;
- vulnerability scanning;
- reproducible-build comparison across independent runners.

The first deferred item is particularly relevant to DIBS eventually: once both deployment targets are stable, a small
**differential semantic contract** could verify that Cloudflare and OCI expose equivalent canonical routes and static
content without demanding byte-for-byte equality. That aligns naturally with the testing guidance for independent
implementations of the same observable contract.

# Final acceptance criteria

Milestone 1 is complete only when all of the following hold:

- supported GitLab pipeline types are structurally valid before jobs start;
- Node `24.11.0`, pnpm `11.8.0`, and the frozen lockfile define the CI dependency contract;
- `pnpm check`, unit tests, Astro-render tests, ordinary E2E tests, and `pnpm build` succeed from a clean checkout;
- generated artifacts remain canonical after validation;
- a cold-cache OCI build succeeds;
- `docker build --check .` succeeds where supported by the selected builder;
- exactly one candidate application image is built;
- its immutable digest is recorded machine-readably;
- all container verification jobs reference that candidate;
- HTTP tests exercise the candidate;
- Playwright exercises the candidate rather than an Astro development server;
- OCI policy checks prove the production image excludes source, Node, pnpm, development dependencies, Git metadata, and
  package credentials;
- executable runtime testing confirms non-root/read-only operation wherever the approved runtime supports that evidence;
- `pnpm test:container` cleans only resources it owns, including after failure;
- durable aliases are created only after all mandatory verification succeeds;
- every published alias resolves to the verified candidate digest;
- promotion performs no application rebuild;
- package, registry, service-pull, and runner credentials remain outside tracked source and OCI metadata;
- no CI job requires privileged execution, Docker-in-Docker, or host Docker-socket access;
- Cloudflare continues deploying the same static `dist/` contract;
- unrelated working-tree modifications and `CHANGELOG.md` remain untouched.

The main improvement over the original plan is that **artifact identity becomes the organizing abstraction**. The
pipeline no longer merely says “we built, tested, and published an image”; it can demonstrate that the _same digest_ was
built once, inspected through several independent assurance planes, and only afterward made durable. That is both a
stronger software-engineering contract and a much better research-software provenance story.
