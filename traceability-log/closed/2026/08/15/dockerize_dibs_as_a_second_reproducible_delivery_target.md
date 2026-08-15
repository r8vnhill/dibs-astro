# Dockerize DIBS as a second reproducible delivery target

## Summary

Add an OCI image as a second packaging and delivery target for the static site produced by the existing `pnpm build`
contract.

Preserve the existing architecture:

```text
                         ┌─► Cloudflare Workers Static Assets
source ─► pnpm build ─► dist/
                         └─► unprivileged OCI static-site image
```

Dockerization must **not** introduce:

- SSR;
- `@astrojs/node`;
- server endpoints;
- a Node.js production runtime;
- Docker Compose;
- application-specific server state.

Astro supports fully static container delivery through an ordinary static web server; server adapters are required for
on-demand rendering, not for a static output. ([Astro Docs][2])

Use a multi-stage image with:

- Node `24.11.0` and pnpm `11.8.0` in the build stage;
- `pnpm install --frozen-lockfile`;
- BuildKit pnpm-store caching;
- private npm authentication exclusively through BuildKit secret mounts;
- `pnpm build` as the canonical site-build operation;
- `nginx-unprivileged` as the runtime;
- only `dist/` plus project-owned web-server configuration copied into the runtime stage.

The initial published platform may be `linux/amd64` if that is the currently supported production environment, but
**platform selection belongs in CI/build invocation rather than being encoded into the Dockerfile**. Keep the Dockerfile
platform-neutral so ARM64 development and future multi-platform publication remain possible.

---

# Phase 0 — Remediate versioned runner credentials

**Priority: required security prerequisite**

## Goal

Ensure Docker and CI work do not proceed while reusable runner credentials remain represented as repository content.

## Scope

If the currently tracked `config.toml` contains live runner authentication credentials:

1. rotate or revoke those credentials immediately;
2. verify that the previous credentials no longer authenticate;
3. remove the real `config.toml` from version control;
4. add the local runner configuration to `.gitignore`;
5. add a sanitized example such as:

```text
docs/examples/gitlab-runner.config.toml
```

or an equivalent existing project convention; 6. ensure `.dockerignore` also excludes `config.toml`; 7. review
repository history to determine the exposure window.

GitLab documents that runner authentication tokens live in `config.toml` and can be rotated or revoked. GitLab also
explicitly recommends rotating an exposed secret immediately because merely removing it from the current tree does not
remove it from repository history or existing clones. ([GitLab Docs][3])

Do not rewrite repository history automatically. Credential rotation is the immediate remediation; history rewriting is
a separate repository-governance decision because existing clones and forks cannot be retroactively changed.
([GitLab Docs][4])

## Acceptance criteria

- No active runner credential is tracked.
- Previous exposed runner credentials have been revoked or rotated.
- Local runner configuration is ignored by Git and Docker.
- A sanitized configuration example contains no functional credentials.
- Runner recreation is documented.
- CI still operates using the replacement credentials.

## Non-goals

- changing runner topology;
- introducing a secrets-management platform;
- rewriting Git history without a separate explicit decision.

## Suggested order

Complete this phase before any new container-registry publication jobs are enabled.

---

# Phase 1 — Characterize the static HTTP contract

**Priority: required**

## Goal

Define the observable behavior the OCI image must preserve before implementing NGINX-specific configuration.

Do not use NGINX itself as the specification.

## Scope

Create a data-driven HTTP contract covering representative behavior from the generated `dist/`.

The fixture matrix should include at least:

| Case                                 | Expected contract                           |
| ------------------------------------ | ------------------------------------------- |
| `/`                                  | homepage HTML                               |
| `/notes/software-libraries/what-is/` | representative lesson                       |
| representative island page           | HTML references the generated client assets |
| `/_astro/...`                        | generated asset with appropriate MIME type  |
| nonexistent route                    | HTTP `404` using generated `404.html`       |
| canonical trailing-slash route       | current Astro behavior                      |
| legacy scripting route               | exact redirect behavior generated today     |

Do not prescribe the redirect status before inspecting the actual generated artifact.

### TDD cycle 1 — HTTP contract

**Red**

Express the cases as BDD-style, data-driven tests, for example:

> given the production static artifact when a generated lesson URL is requested then its HTML is returned with the
> expected status and content type

and:

> given a URL with no generated page when it is requested then the generated DIBS not-found page is returned with status
> 404

**Green**

Capture the behavior produced by the current build without changing production semantics.

**Refactor**

Extract the route expectations into a small reusable contract model that can later run against:

- a local static fixture;
- the OCI container;
- optionally the existing Cloudflare target.

## Important distinction: React islands

An HTTP request can prove that:

- the HTML exists;
- island scripts are referenced;
- generated JS assets are retrievable.

It **cannot prove that hydration succeeds in a browser**.

Keep hydration as a Playwright-level contract in Phase 4 instead of pretending an HTTP assertion exercises React
execution.

## Acceptance criteria

- Routing expectations come from the generated site.
- 404 behavior is explicit.
- Redirect behavior is explicit.
- Trailing-slash behavior is explicit.
- HTTP delivery and browser hydration are modeled as separate contracts.

## Non-goals

- Cloudflare-header equivalence;
- CDN caching equivalence;
- NGINX-specific tests;
- SSR semantics.

---

# Phase 2 — Introduce the reproducible build stage

**Priority: required**

## Goal

Make a clean checkout produce the site inside BuildKit using the repository's canonical toolchain and dependency graph.

## Scope

Add:

```text
Dockerfile
.dockerignore
docker/
    default.conf
```

Prefer `default.conf` or another server-block-level name rather than replacing NGINX's complete global configuration
unless the project genuinely needs global settings.

### Builder

Use an exact Node 24.11.0 image variant and pin the selected base-image reference to a digest.

Do the same for the runtime base.

Docker recommends multi-stage builds for separating build-time dependencies from the final runtime and supports digest
pinning when exact image identity is required. ([Docker Documentation][5])

Do **not** encode:

```dockerfile
FROM --platform=linux/amd64 ...
```

unless a build-stage tool specifically requires it.

Instead, establish platform policy at the invocation boundary:

```text
local development → native platform
initial CI release → linux/amd64
future option      → linux/amd64 + linux/arm64
```

This preserves portability without committing immediately to multi-architecture testing.

### Dependency installation

Structure layers so dependency download is invalidated primarily when manifests change.

Use:

- frozen lockfile;
- a BuildKit cache mount for the pnpm store;
- the repository's existing build scripts rather than reproducing `prebuild` steps manually.

Docker-specific orchestration must **not duplicate** the project's content-generation pipeline.

### Private npm authentication

Improve the proposed design slightly: prefer mounting an **ephemeral complete npm authentication configuration** as a
BuildKit secret rather than teaching the Dockerfile how to construct credentials.

Conceptually:

```text
CI/local authentication
        │
        ▼
temporary npm configuration
        │ BuildKit secret mount
        ▼
pnpm install
        │
        └─ secret absent from resulting layer
```

Never transport package credentials through:

```text
ARG
ENV
COPY
committed .npmrc
```

Docker specifically recommends secret mounts for build credentials; provenance metadata is another reason not to misuse
build arguments for secrets. ([Docker Documentation][6])

In CI, `CI_JOB_TOKEN` can authenticate to GitLab's package registry. If the package is hosted by another GitLab project,
explicitly verify that its job-token access policy permits this project rather than assuming cross-project access.
([GitLab Docs][7])

### `.dockerignore`

Exclude at least:

```text
.git
node_modules
dist
.astro
coverage
playwright-report
test-results
.pnpm-store
config.toml
IDE state
temporary files
local caches
```

Do not blindly exclude all Markdown, documentation, or generated-input directories: course content may be part of the
Astro build graph.

## TDD cycle 2 — Clean container build

**Red**

From a clean checkout, establish a build test requiring:

> given the frozen lockfile and required package-registry credentials when the OCI build stage executes then it produces
> the complete static site using the canonical project build command

**Green**

Implement the minimum multi-stage Dockerfile.

**Refactor**

Optimize layer boundaries and cache mounts without changing the resulting application behavior.

## Acceptance criteria

- A clean checkout builds successfully.
- Dependency installation uses a frozen lockfile.
- `pnpm build` remains the only site-build entry point in the Dockerfile.
- Package authentication exists only for the installation operation.
- Host `node_modules`, `dist`, `.astro`, and runner state cannot influence the build.
- Dockerfile platform selection remains portable.
- A cold build succeeds without pre-existing BuildKit cache.

## Non-goals

- multi-platform publication;
- package-manager changes;
- dependency upgrades unrelated to Dockerization.

---

# Phase 3 — Package `dist/` into the minimal runtime boundary

**Priority: required**

## Goal

Serve the static artifact without retaining any application build tooling in the production image.

## Scope

Use the maintained unprivileged NGINX image.

Its unprivileged variant already defaults to port `8080`, places its PID under `/tmp`, and redirects NGINX temporary
paths into `/tmp`. Do not duplicate those global implementation details in project configuration unless testing
demonstrates a need. ([GitHub][8])

Project-owned runtime content should therefore be limited to:

```text
dist/
docker/default.conf
```

This means **project-owned content**, not literally the entire image filesystem; the base image necessarily also
contains NGINX and its runtime libraries.

### Routing

Configure the server boundary around:

```nginx
try_files $uri $uri/index.html =404;
```

with the generated `404.html` used for error handling.

Astro's documented NGINX recipe uses this static-site routing model. ([Astro Docs][2])

Do not introduce a SPA fallback such as:

```text
unknown path → /index.html
```

because that would change the semantics of a generated multipage site.

### Read-only execution

The runtime contract should support:

```text
read-only root filesystem
+
writable tmpfs mounted at /tmp
```

Do not add Linux capabilities unless a demonstrated requirement appears.

Do not add utilities such as `curl` to the runtime solely to implement a baked-in `HEALTHCHECK`; external orchestration
can perform health/readiness probes without increasing the runtime surface.

## TDD cycle 3 — Runtime semantics

**Red**

Run the Phase 1 HTTP matrix against the OCI runtime.

**Green**

Implement the minimum NGINX configuration needed to satisfy it.

**Refactor**

Remove configuration already supplied correctly by the unprivileged upstream image.

## Acceptance criteria

- NGINX listens on 8080.
- The runtime process is non-root.
- The root filesystem can be read-only with `/tmp` explicitly writable.
- Homepage, lessons, assets, redirects, trailing slashes, and 404 semantics conform to Phase 1.
- Runtime execution has no dependency on Node or pnpm.
- Project source, package credentials, build caches, and Git metadata are absent.

## Non-goals

- CDN-level caching policy;
- Cloudflare-specific headers;
- introducing a runtime API;
- adding operating-system packages without demonstrated need.

---

# Phase 4 — Add portable container verification

**Priority: required**

## Goal

Make the OCI artifact an observable, regression-tested project contract.

## Scope

Add:

```text
pnpm test:container
```

implemented in Node.js rather than Bash or PowerShell so the same workflow is usable from Windows/WSL, Linux, and
CI-capable development environments.

Organize the script into small responsibilities, for example:

```text
container/
    build
    lifecycle
    http-contract
    runtime-policy
```

The exact file split should follow cohesion rather than creating one file per function.

### Cycle 4A — HTTP behavior

Run the complete Phase 1 data-driven matrix.

### Cycle 4B — Runtime policy

Verify observable image/runtime properties:

- non-root configured user;
- expected exposed/listening port;
- read-only filesystem compatibility;
- no project `.npmrc`;
- no `node_modules`;
- no `src`;
- no `packages`;
- no Git metadata.

Do not test for a secret by printing or searching for the actual credential value in CI logs.

Instead, assure credential handling structurally:

- no secret-valued build argument;
- no secret-valued environment variable;
- BuildKit secret mount used;
- no authentication configuration in the final filesystem.

### Cycle 4C — Browser hydration

Parameterize an existing Playwright scenario, where practical, so it can use the container as its `baseURL`.

Verify one meaningful interactive island behavior:

> given the production OCI site when a browser opens a page containing an interactive island then the island hydrates
> and performs its observable interaction

Reuse an existing E2E contract where possible rather than creating a parallel Docker-only browser suite.

### Resource ownership

Give every temporary test resource a unique name/tag.

The test harness may remove:

- containers it created;
- networks it created;
- its own explicitly ephemeral image tag.

It must never perform broad cleanup such as pruning unrelated Docker state.

Use `finally`-style cleanup so owned resources are removed after both success and failure.

## Acceptance criteria

- `pnpm test:container` is deterministic.
- Explicit invocation fails clearly if its required container runtime is unavailable.
- Temporary resources are uniquely identified.
- Cleanup never touches unrelated user resources.
- HTTP and runtime-policy checks pass.
- Browser hydration is tested at the browser boundary, not approximated by an HTML check.

## Non-goals

Keep `test:container` outside the ordinary `pnpm test` contract because a local container runtime remains an optional
infrastructure dependency.

---

# Phase 5 — Build, verify, and publish through GitLab CI without Docker socket access

**Priority: required**

## Goal

Make every merge request produce a verifiable candidate OCI artifact and make trusted refs publish durable image
identifiers, without granting CI jobs host-Docker control.

## Architecture

Replace the proposed Docker-socket job with:

```text
                 rootless BuildKit
source ─────────────────────────────► candidate OCI image
                                         │
                                         ▼
                                  GitLab Registry
                                         │
                          ┌──────────────┴──────────────┐
                          ▼                             ▼
                  HTTP contract job             release aliases
                  image as service
```

GitLab documents rootless standalone BuildKit specifically as a daemonless build mode that avoids privileged containers.
([GitLab Docs][1])

GitLab services can run an additional application image alongside a test job, making the candidate NGINX image directly
reachable from an HTTP client container without mounting `/var/run/docker.sock`. ([GitLab Docs][9])

### `container:build`

Use rootless BuildKit to:

1. authenticate to the GitLab container registry;
2. inject package-registry authentication as a BuildKit secret;
3. build from a cold-cache-capable Dockerfile;
4. push a pipeline-scoped image;
5. capture the resulting manifest digest as a CI artifact.

Prefer a temporary namespace/tag such as:

```text
$CI_REGISTRY_IMAGE/ci:$CI_PIPELINE_ID-$CI_COMMIT_SHORT_SHA
```

with a registry cleanup policy for transient CI images.

The **digest**, not the temporary tag, is the identity passed between jobs.

### `container:http-contract`

Use the candidate image as a GitLab `service` with a stable alias such as:

```text
dibs
```

and execute the HTTP contract from a minimal client image against:

```text
http://dibs:8080
```

Because the service is in a private registry, configure runner/private-registry authentication through GitLab's
supported runner authentication mechanism, such as `DOCKER_AUTH_CONFIG`, rather than attempting to authenticate after
the service has already been pulled. GitLab documents `DOCKER_AUTH_CONFIG` for private job/service images.
([GitLab Docs][10])

### Runtime-policy verification

Inspect OCI metadata and filesystem assertions separately where possible.

If the runner later gains an approved rootless runtime capable of exercising `--read-only`, run the complete
runtime-policy contract there.

Do **not** introduce Docker-socket binding merely to obtain that one assertion.

GitLab documents socket binding as a Docker-daemon access mechanism; avoiding it is consistent with the rootless
architecture chosen here. ([GitLab Docs][11])

### Main publication

For `main`, publish an immutable SHA alias:

```text
$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

Prefer promoting/tagging the **already verified manifest digest** rather than rebuilding the image.

This ensures:

```text
image tested in MR/main pipeline
        ==
image identified by publication alias
```

rather than merely rebuilding equivalent source and hoping to obtain equivalent output.

### Release publication

Read the release version from the project's authoritative version source.

Validate the relationship between:

```text
package version
Git release tag
```

according to the project's tag convention.

Then make all release aliases reference **the same already-verified OCI manifest digest**:

```text
:<git-tag>
:<project-version>
:<git-sha>
```

If the Git tag and version alias are textually identical under the project's convention, do not manufacture redundant
tagging work.

Do not introduce `latest` unless the project explicitly defines its semantics.

## Acceptance criteria

- Merge requests build an OCI candidate.
- Candidate images are HTTP-contract-tested without Docker socket access.
- BuildKit runs rootless and without `privileged = true`.
- A manifest digest is carried between build, verification, and publication.
- `main` publishes a SHA-addressable image.
- Release aliases reference the same verified digest.
- CI image publication remains correct with an empty cache.
- Cloudflare rules are unchanged.
- Temporary CI images have an explicit retention/cleanup policy.

## Non-goals

- Docker-in-Docker;
- socket binding;
- replacing Cloudflare;
- publishing unverified rebuilds.

---

# Phase 6 — Add provenance and research-software metadata

**Priority: high-value recommendation**

## Goal

Make the OCI image traceable as a reproducible software artifact.

## Scope

Add OCI annotations for at least:

```text
org.opencontainers.image.title
org.opencontainers.image.version
org.opencontainers.image.revision
org.opencontainers.image.source
org.opencontainers.image.licenses
```

Populate revision/version from the build/release context rather than duplicating them manually in the Dockerfile.

For trusted publications, enable BuildKit:

- provenance attestations;
- SBOM attestations.

Docker supports both forms of build attestation directly. ([Docker Documentation][12])

This is particularly valuable for DIBS because the project guidelines prioritize explicit provenance, reproducibility,
stable artifact identity, environment capture, and FAIR-aligned research artifacts.

### Acceptance criteria

- Published artifacts expose their source revision.
- Release aliases resolve to the same digest.
- Trusted images include provenance.
- Trusted images include an SBOM.
- Attestations contain no credentials or secret-valued build arguments.

### Deferred

Container signing can be evaluated separately. GitLab documents Cosign-based signing and provenance workflows, but
adding another signing dependency should be an explicit supply-chain decision rather than incidental Docker scope.
([GitLab Docs][13])

---

# Phase 7 — Update operational and architectural documentation

**Priority: required**

## Goal

Document Docker as an alternate packaging/runtime target without presenting it as a replacement for Cloudflare.

## Scope

Update `README.md` with:

- local image construction;
- local execution;
- package-registry authentication;
- `pnpm test:container`;
- supported platform policy;
- registry image naming;
- SHA and release aliases;
- Cloudflare versus OCI delivery.

Update `DESIGN.md` to make `dist/` the shared static-site contract:

```text
Astro/content build
        │
        ▼
      dist/
       ├─► Cloudflare
       └─► OCI / NGINX
```

Also correct obsolete framework-version references encountered in the affected documentation, but do not turn this work
into a general documentation rewrite.

Update `docs/gitlab-runner-setup.md` with:

- Node 24 / pnpm 11 contract;
- rootless BuildKit requirements;
- registry authentication;
- replacement runner-token setup;
- no requirement for Docker socket binding;
- any runner security options specifically required by rootless BuildKit.

GitLab notes that rootless BuildKit may require runner-specific security configuration depending on the executor;
document the actual configuration validated for this project's runner rather than copying generic settings
unnecessarily. ([GitLab Docs][14])

Do not modify `CHANGELOG.md`.

---

# Platform policy

I would explicitly change this part of the original plan.

**Required now:** `linux/amd64` may be the initially supported publication platform if that matches the current
hosting/runtime environment.

**Required design constraint:** the Dockerfile itself remains platform-neutral.

**High-value follow-up:** publish a multi-platform OCI index for:

```text
linux/amd64
linux/arm64
```

only after both architectures can be built and meaningfully verified.

The unprivileged NGINX upstream already publishes multiple architectures, so the runtime base does not inherently
constrain DIBS to AMD64. ([GitHub][15])

This gives better long-term portability than embedding `linux/amd64` into every `FROM` line while avoiding untested
claims of ARM64 support today.

# Final acceptance criteria

The initiative is complete when:

- any previously versioned runner credential has been rotated/revoked and removed from tracked configuration;
- a clean checkout builds the OCI artifact with Node `24.11.0`, pnpm `11.8.0`, and the frozen lockfile;
- the Dockerfile remains platform-neutral while CI publishes the explicitly supported platform;
- build credentials exist only as BuildKit secrets;
- the runtime is unprivileged and listens on `8080`;
- it operates with a read-only root filesystem plus declared temporary storage;
- project-owned runtime content consists only of the generated static artifact and minimal server configuration;
- routing, MIME types, redirects, trailing slashes, and 404 behavior are data-driven regression contracts;
- at least one browser-level test verifies actual interactive-island hydration against the container;
- `pnpm test:container` cleans only resources it owns;
- CI uses rootless BuildKit and does **not** require privileged mode or `/var/run/docker.sock`;
- CI tests the candidate image itself rather than rebuilding it for verification;
- trusted publication aliases all resolve to the tested manifest digest;
- `main` produces a SHA-addressable image;
- release aliases are checked against the project's authoritative version;
- published release images include OCI provenance metadata, with SBOM/provenance attestations enabled for trusted
  publications;
- Cloudflare continues serving the existing static-site contract;
- runner documentation allows the environment to be recreated without versioned credentials;
- `CHANGELOG.md` remains untouched.

## Deliberately deferred work

I would keep vulnerability scanning, Cosign signing, multi-platform publication, CDN-cache parity, generalized container
orchestration, and replacement of Cloudflare outside this change. They are potentially valuable, but none is needed to
establish the core architectural result: **one static-site contract, two delivery targets, one verified OCI digest, and
no additional application runtime.**

This structure is closer to the project guidelines because it makes security and correctness prerequisites explicit,
decomposes implementation into observable vertical increments, uses TDD/DDT at the appropriate boundaries, avoids
unnecessary privileged infrastructure, preserves existing behavior, and cleanly separates required work from
supply-chain and portability extensions.

[1]: https://docs.gitlab.com/ci/docker/using_buildkit/?utm_source=chatgpt.com "Build Docker images with BuildKit"
[2]: https://docs.astro.build/en/recipes/docker/?utm_source=chatgpt.com "Build your Astro site with Docker | Docs"
[3]: https://docs.gitlab.com/security/tokens/?utm_source=chatgpt.com "GitLab token overview"
[4]: https://docs.gitlab.com/user/application_security/secret_detection/pipeline/?utm_source=chatgpt.com "Pipeline secret detection"
[5]: https://docs.docker.com/build/building/multi-stage/?utm_source=chatgpt.com "Multi-stage builds"
[6]: https://docs.docker.com/build/ci/github-actions/attestations/?utm_source=chatgpt.com "Add SBOM and provenance attestations with GitHub Actions"
[7]: https://docs.gitlab.com/ci/jobs/ci_job_token/?utm_source=chatgpt.com "CI/CD job token"
[8]: https://github.com/nginx/docker-nginx-unprivileged?utm_source=chatgpt.com "NGINX Unprivileged Docker Image"
[9]: https://docs.gitlab.com/ci/services/?utm_source=chatgpt.com "Services"
[10]: https://docs.gitlab.com/ci/docker/using_docker_images/?utm_source=chatgpt.com "Run your CI/CD jobs in Docker containers"
[11]: https://docs.gitlab.com/ci/docker/using_docker_build/?utm_source=chatgpt.com "Use Docker to build Docker images"
[12]: https://docs.docker.com/build/metadata/attestations/sbom/?utm_source=chatgpt.com "SBOM attestations"
[13]: https://docs.gitlab.com/user/packages/container_registry/cosign_tutorial/?utm_source=chatgpt.com "Annotate container images with build provenance data"
[14]: https://docs.gitlab.com/ci/docker/buildah_rootless_multi_arch/?utm_source=chatgpt.com "Use Buildah to build multi-platform images"
[15]: https://github.com/orgs/nginx/packages/container/package/nginx-unprivileged?utm_source=chatgpt.com "Package nginx-unprivileged"
