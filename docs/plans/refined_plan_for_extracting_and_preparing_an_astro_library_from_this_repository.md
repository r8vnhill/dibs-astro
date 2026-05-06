# Refined plan for extracting and preparing an Astro library from this repository

## Goal

Extract a first reusable library from the current Astro site without disrupting product development, while leaving the repository ready to evolve toward:

* one or more internal packages consumed from the same workspace;
* future publication to an npm-compatible registry, likely GitLab;
* possible later growth into several packages or a stronger monorepo orchestration layer.

## Decisions already made

### Active decisions

* **The Astro app remains at the repository root** in this first stage.
* **The first package is `packages/content-core`.**
* **The first extraction targets domain and application logic**, not UI.
* **Consumption will use `workspace:*`.**
* **Nx, Turborepo, Changesets, and semantic-release are not introduced yet.**
* **Actual publication is out of scope for the first phase.**

These decisions should be treated as explicit constraints for the project so the effort does not drift in scope.

### Decisions explicitly postponed

* moving the app to `apps/site`;
* creating `course-ui`;
* creating `tooling/shiki-kit`;
* automating releases;
* publishing to the registry;
* opening multiple entry points or subpath exports.

---

## Guiding principle

**First extract a stable internal dependency; then harden it as a publishable package; only then publish it.**

That order matters. Trying to solve extraction, public API design, versioning, and CI/CD at the same time would increase coordination cost and risk.

---

## Scope of the first extraction

## Initial package: `content-core`

`content-core` should contain only reusable logic with low coupling to Astro, the DOM, and rendering.

### It should include

* domain entities and value objects;
* course-structure logic;
* flattening and navigation;
* sequencing rules;
* lesson- and navigation-related services or use cases;
* static repositories or pure adapters, only when necessary to support those use cases.

### It should not include

* `.astro` components;
* React components;
* browser-dependent utilities;
* Tailwind, styles, icons, or assets;
* Astro/Vite integrations;
* content-generation scripts;
* the Shiki pipeline.

### Dependency rule

`content-core` may depend on:

* TypeScript;
* serializable data;
* pure utilities;
* small, explicit contracts.

`content-core` must not depend on:

* `astro`;
* `react`;
* `react-dom`;
* `window`, `document`;
* site routes;
* layouts;
* components;
* visual assets.

---

## Expected outcome at the end of phase 1

By the end of the first phase, the repository should look like this conceptually:

```text
repo/
  package.json
  pnpm-workspace.yaml
  src/                    # current Astro app
  packages/
    content-core/
      package.json
      tsconfig.json
      src/
        index.ts
```

The root app remains the integration host and consumes `content-core` as a workspace dependency.

---

## Refined roadmap

## ~~Phase 0 — Preparation and baseline~~

### Objective

Prepare the ground without moving logic yet.

### Work

* Update `pnpm-workspace.yaml` to include `packages/*`.
* Create `packages/content-core/`.
* Create `package.json`, `tsconfig.json`, and `src/index.ts`.
* Add a minimal validation script for the package.
* Define consistent import paths or consumption rules from the app.

### Deliverables

* the workspace recognizes the package;
* the site installs and resolves `content-core`;
* `content-core` can compile even if it exports very little initially.

### Exit criteria

* `pnpm install` works;
* `pnpm check` still passes;
* the site can import something trivial from `content-core`.

---

## Phase 1 — Extraction of the pure core

### Objective

Move the smallest set of logic that already justifies the package.

### Work

* Extract course and navigation types and logic.
* Move pure entities and services from `src/domain` and `src/application`.
* Replace site imports so the app consumes the package.
* Avoid long-lived duplication: once something lives in the package, the site should stop importing the old local equivalent.

### Deliverables

* a first usable API for `content-core`;
* the site consuming extracted logic through the workspace;
* a clear boundary between package and app.

### Exit criteria

* navigation and sequencing still work;
* `NotesLayout` and course services consume `content-core`;
* there are no remaining imports from the site to “equivalent” files that have already been moved.

---

## Phase 2 — Stabilization of the internal API

### Objective

Stop thinking in terms of folders and start thinking in terms of contract.

### Work

* Reduce exports to a small, deliberate surface.
* Consolidate `src/index.ts` as the single entry point.
* Rename public symbols if they still reflect internal structure rather than intent.
* Review which types truly need to be public.

### Deliverables

* a stable main API;
* less accidental exposure;
* a package that can be consumed without deep imports.

### Exit criteria

* the app uses imports only from the package entry point;
* there is no dependency on internal `content-core` paths;
* the public API is understandable without knowing the repository layout.

---

## Phase 3 — Hardening as a publishable package

### Objective

Prepare `content-core` for real packaging without publishing yet.

### Work

* Add `type: "module"`.
* Add `exports`.
* Add `files`.
* Add `publishConfig`.
* Define `main` and `types` only if they are actually needed by the chosen build strategy.
* Classify dependencies correctly:

  * `dependencies` for actual runtime needs of the package;
  * `peerDependencies` for frameworks or hosts already expected in the consumer;
  * `devDependencies` for package-local build and test tooling.

### Deliverables

* coherent package metadata;
* a package installable locally in the shape of a real package;
* a public contract that is harder to break by accident.

### Exit criteria

* `pnpm pack --filter @ravenhill/content-core` produces a sensible artifact;
* the tarball does not include repository noise;
* the package declares only what it truly exposes.

---

## Phase 4 — Validation as a package consumer

### Objective

Verify that the package works not only “inside the repo” but as an actual dependency.

### Work

* Create a minimal consumer validation setup.
* This may be the root app itself or a small fixture.
* Install or consume the packed package, not only the internal path.
* Confirm that the public contract is sufficient.

### Deliverables

* a real consumer test;
* early detection of `exports`, `files`, or `types` problems.

### Exit criteria

* a consumer can import the package without relying on internal details;
* no packaging issues appear that the workspace had previously hidden.

---

## Phase 5 — Pilot publication

### Objective

Publish a controlled first version.

### Work

* Choose the final package name.
* Configure `.npmrc` or CI for the GitLab registry.
* Perform a first manual or semi-manual publish.
* Document installation and consumption.

### Deliverables

* first release of the package;
* a reproducible process;
* a consumer-facing README.

### Exit criteria

* the package can be installed from the target registry;
* a real consumer can use it;
* the process is documented.

---

## Phase 6 — Optional expansion

This phase should begin only if there are clear signals that it is needed.

Possible next steps include `course-ui`, `tooling/shiki-kit`, moving the app to `apps/site`, or introducing Nx or Turbo. None of these should happen automatically.

They make sense only if at least one of these signals appears:

* builds or tests become slow enough to matter;
* there is more than one package with repeated scripts or workflows;
* releasing one package starts blocking others;
* the separation between core and UI is already stable enough;
* the repository needs affected builds, stronger caching, or release orchestration.

---

## Recommended toolchain by stage

## Right now

* **pnpm workspace** as the foundation;
* **TypeScript**;
* **Vitest**;
* existing repository scripts;
* the root app as the integration harness.

## After the first package stabilizes

* **Changesets**, if more than one package actually appears or if you want better controlled release history;
* **GitLab npm registry** as the first publication target;
* possibly **semantic-release** later, but not at the same time as the extraction.

## Later, only if the repository asks for it

* **Nx** if you want stronger orchestration, boundaries, generators, and release management;
* **Turborepo** if the main problem turns out to be caching and task orchestration and you want a lighter layer.

The current instinct to avoid Nx or Turbo for now is sound and should be preserved.

---

## Main risks and mitigations

## Risk 1: extracting too much

Trying to move UI, Astro bindings, or content scripts in the first phase.

### Mitigation

Limit the first extraction to pure course and navigation logic.

## Risk 2: accidental public API

Exporting internal structure instead of contracts.

### Mitigation

Use a single `src/index.ts` and forbid deep imports from the app.

## Risk 3: the workspace hides publication problems

Something works locally but fails once packaged.

### Mitigation

Add an explicit `pack` and packaged-consumer validation phase before publishing.

## Risk 4: introducing tooling too early

Adding Nx, Changesets, or release CI before the first package is stable.

### Mitigation

Postpone them until the first package exists and is consumed internally.

---

## Refined test plan

The validation strategy should become more explicit.

### Minimum checks per phase

* **site compilation**;
* **package unit tests**;
* **package contract tests**;
* **navigation validation**.

### Cases that should definitely be covered

* flattening of the lesson tree;
* adjacent lesson resolution;
* boundary behavior in navigation;
* behavior with empty or inconsistent input;
* stability of public types.

### Definition of done for phase 1

* the site still works;
* `content-core` is consumed through the workspace;
* navigation depends on the package, not on local duplicates;
* the package does not know about Astro or UI;
* there is a small, explicit public API.

---

## What the original plan was missing

The main improvements worth making were these:

* it did not separate **extraction** from **publication** strongly enough;
* it did not define phases with clear exit criteria;
* it did not specify concrete deliverables for each stage;
* it did not make risks and tooling triggers explicit enough;
* it did not include a dedicated validation phase using the packaged artifact, which is often where real problems surface.

---

## Short version of the strategy

* **Step 1:** create `packages/content-core`.
* **Step 2:** move pure course and navigation logic.
* **Step 3:** make the app consume it via `workspace:*`.
* **Step 4:** stabilize the API.
* **Step 5:** harden package metadata.
* **Step 6:** validate with `pack`.
* **Step 7:** only then publish.
* **Step 8:** afterwards evaluate `course-ui`, `shiki-kit`, Changesets, Nx, or Turbo.
