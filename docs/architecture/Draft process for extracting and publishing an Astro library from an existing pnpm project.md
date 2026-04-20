# Draft process for extracting and publishing an Astro library from an existing pnpm project

## Context and design constraints

You are starting from a single Astro website repository (currently one package.json, managed with pnpm) where the “would‑be library” code is scattered across the site. The goal is to extract that reusable code into a publishable package (or packages) and publish to a package registry (potentially GitLab’s npm registry), while keeping a clear path to multiple modules over time (either multiple entry points in one package, or multiple packages in a monorepo).

Astro’s own guidance for shipping component packages strongly aligns with a workspace-style layout: keep a “demo” (or your existing site) alongside one or more packages under a packages/ directory, so you can develop and test the package(s) in a real Astro app. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

Astro also explicitly notes that there is no special “package mode”: you typically validate packages using a demo project, and even when extracting from an existing project you can keep using that project to develop the extracted components. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

## Multi-module packaging models

A key up-front decision is what “multiple modules” means for your library. There are two common models, and you can design your repo so you can shift between them later.

**Single package with multiple entry points (subpath exports).**
You publish one package name, but expose multiple import paths using package.json exports, e.g. @scope/dibs-astro/icons, @scope/dibs-astro/content, etc. This is a formally supported Node packaging pattern: exports is the recommended field for defining entry points, and it also *encapsulates* the package so that consumers cannot import undeclared internal subpaths (which is good for API discipline, but can be a breaking change if you previously allowed deep imports). [[2]](https://nodejs.org/api/packages.html)

Astro’s packaging example for components uses exactly this pattern: a package can export a main entry point plus framework- or component-specific subpaths via exports (including .astro files). [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

**Multiple packages in a monorepo (one registry release stream, N packages).**
You publish several packages from one repository, typically with names like @scope/ui, @scope/icons, @scope/content, etc. This model is often better once parts of the codebase need different release cadences, different dependencies, or clearer ownership boundaries. pnpm workspaces natively support multi-package repos (via pnpm-workspace.yaml), and make it straightforward to develop packages together and publish them later. [[3]](https://pnpm.io/workspaces)

**A pragmatic synthesis for your situation.**
Given that your code is currently embedded in a functioning site, the most migration-friendly approach is:

* Convert the repo to a workspace (so apps/ and packages/ can develop together). [[4]](https://pnpm.io/workspaces)
* Start with **one package** that uses **subpath exports** to create clean module boundaries without immediately paying the operational overhead of many separate published packages. [[5]](https://nodejs.org/api/packages.html)
* Split into multiple packages later if (and only if) modules need independent versioning or dependency isolation.

## Recommended toolchains

This section proposes toolchains in layers: a baseline that fits your current state (pnpm-only) and optional scale-up layers if the repo grows into a true monorepo with multiple packages and heavier CI needs.

### Baseline toolchain for extraction + future multi-module growth

**Workspace + local linking:** pnpm workspaces
pnpm’s workspace support is first-party and requires a pnpm-workspace.yaml at the repository root. [[3]](https://pnpm.io/workspaces)
During migration, the workspace: protocol is particularly valuable because it forces resolution to a local workspace package (and avoids accidentally pulling from a remote registry). pnpm also rewrites workspace: references into publishable semver ranges when you pack/publish, which is designed for exactly your “develop locally, publish remotely later” use case. [[3]](https://pnpm.io/workspaces)

**Versioning + changelogs for multi-package readiness:** Changesets
pnpm explicitly describes workspace versioning as “complex” and points to Changesets as a well-tested solution for versioning packages in a workspace. [[3]](https://pnpm.io/workspaces)
Changesets is designed for monorepos, using committed markdown files to declare release intent, then automatically coordinating version bumps, changelogs, and updating inter-package dependency versions. [[6]](https://changesets-docs.vercel.app/)

**Publishing mechanism:** pnpm publish -r (workspace-aware publishing)
pnpm can publish all workspace packages whose versions are not yet present in the target registry via recursive publish (pnpm -r publish). [[7]](https://pnpm.io/cli/publish)
This is compatible with a monorepo roadmap even if you start with only one package.

**Packaging contract:** exports + files + strict public API
For multi-module behavior inside one package, exports is the key mechanism, and Node recommends it for new packages; it also defines a strict boundary that helps you prevent accidental internal imports. [[2]](https://nodejs.org/api/packages.html)
Use a files whitelist to ensure you only ship what consumers need (which improves install size and reduces accidental leakage of scripts/config). Astro explicitly calls out files as a useful optimization for component packages, and npm documents the semantics of files as controlling what goes into the packed tarball. [[8]](https://docs.astro.build/pl/reference/publish-to-npm/)
To avoid accidental publication to the wrong registry, npm recommends using publishConfig for publish-time overrides (registry, tag, access). [[9]](https://docs.npmjs.com/cli/v8/configuring-npm/package-json/)

**Type strategy:** “Astro-first” types + TypeScript declarations where necessary
Astro supports importing .ts/.tsx and treating component code as TypeScript, and ships utility types via the astro/types entry point (useful for strongly typed component props you publish). [[10]](https://docs.astro.build/en/guides/typescript/)
If you choose to ship built .js entry points (rather than raw .ts), TypeScript’s guidance is to publish declaration files with your package and point to them via the types field in package.json. [[11]](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

### Optional scale-up layer for monorepo orchestration

If you end up with multiple packages and CI becomes slow, add a task orchestrator/cacher.

**Turborepo (lighter-weight orchestration):**
Turborepo caches task outputs declared in configuration (and can share cache remotely across machines/CI). Its documentation emphasizes that caching hinges on defining outputs in turbo.json, otherwise outputs won’t be cached. [[12]](https://turborepo.dev/docs/crafting-your-repository/caching)

**Nx (heavier-weight orchestration + more built-ins):**
Nx’s own comparison notes that both Nx and Turborepo provide scheduling, caching (local/remote), and affected detection, but Nx extends further into code generation, module boundary rules, and built-in release management—and it is designed for incremental adoption using existing package.json scripts. [[13]](https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo)

If you already expect many packages and want “one integrated system” for task running + releases, Nx plus its release tooling can reduce the number of separate tools you operate. Nx Release supports versioning/changelogs/publishing and can be configured for custom registries via .npmrc. [[14]](https://nx.dev/docs/guides/nx-release/release-npm-packages)

### Registry + publishing target recommendations

**GitLab npm registry (private-first):**
GitLab documents how to authenticate, configure registry URLs, and publish packages (including a CI/CD example that generates .npmrc using ${CI\_JOB\_TOKEN}, ${CI\_PROJECT\_ID}, and ${CI\_SERVER\_HOST}). It also explicitly warns not to hardcode tokens into committed .npmrc files. [[15]](https://docs.gitlab.com/user/packages/npm_registry/)

GitLab also explains when scoped names matter: if installing from an *instance-level* endpoint, packages must be scoped (@owner/name). [[15]](https://docs.gitlab.com/user/packages/npm_registry/)

**Public npm (community / Astro ecosystem discoverability):**
Astro’s integrations/components library indexing is driven by npm publication plus keywords (e.g., astro-component, withastro). If discoverability in the Astro ecosystem matters later, plan for eventual npm publication (even if you begin private on GitLab). [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

## Migration and repository restructuring plan

This is a first-draft “extraction plan” that minimizes disruption to your existing site while creating a clean published library boundary.

### Workspace conversion with minimal disruption

1. **Add pnpm-workspace.yaml** at repo root, so you can host the site and package(s) together. pnpm requires this file for a workspace. [[3]](https://pnpm.io/workspaces)
2. **Decide where the existing site lives.** Two viable patterns:
3. **Keep site at repo root** and add packages/\* (fastest migration, fewer moves).
4. **Move site under apps/site** and make the repo root a pure workspace root (cleaner long-term, especially if you add more apps like documentation or a demo). Astro’s own publishing guidance shows a workspaces layout with a demo/ app plus packages/\*. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

A common long-term structure (even if you keep the current site as the “demo” initially) looks like:

repo/
 pnpm-workspace.yaml
 package.json # root scripts for orchestration only
 apps/
 site/ # your current Astro site (or a demo/docs app)
 packages/
 dibs-astro/ # main library package (start here)
 dibs-astro-icons/ # future: optional split package
 dibs-astro-content/ # future: optional split package

This mirrors Astro’s recommended idea: maintain a demo app alongside package code, because there is no dedicated package dev mode. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

### Extraction mechanics for “scattered” code

The central migration principle is: **extract behind workspace dependencies first, publish later.** pnpm’s workspace: protocol supports exactly this approach and will later rewrite local references into semver ranges at publish time. [[3]](https://pnpm.io/workspaces)

A practical extraction sequence:

* **Inventory and classify reusable code** (the “what becomes library” boundary):
* UI components (.astro, .tsx/.jsx if you have React components)
* Style primitives (Tailwind utility wrappers, shared CSS)
* Data/schema utilities (e.g., Zod schemas)
* Build-time generators (your icon index generator, bibliography/lesson metadata scripts)
* **Create an explicit public API surface** early:
* A main entry point file (src/index.ts or index.js) that re-exports the intended public modules.
* A deliberate exports map that defines what is supported for import. This aligns with Node’s guidance: once exports is present, only exported subpaths are accessible, which helps prevent accidental deep imports. [[5]](https://nodejs.org/api/packages.html)
* **Move code into packages/dibs-astro/src/\*\*** and replace imports in the site to consume the workspace package:
* In the site: depend on the package using "workspace:\*" (or a fixed workspace version) so the site only resolves locally during migration. [[3]](https://pnpm.io/workspaces)
* **Keep the site running at each step.** Astro’s documentation explicitly endorses continuing to use the existing project to develop extracted components. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

### Packaging specifics for an Astro component-style library

Astro’s own package example includes several key fields you should adopt early:

* "type": "module" for ESM packages
* exports mapping that can include .astro files and subpath entry points
* files whitelist
* keywords for discoverability (if/when you publish publicly) [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

A concrete first-draft packages/dibs-astro/package.json skeleton (illustrative, not complete):

{
 "name": "@your-scope/dibs-astro",
 "version": "0.0.0",
 "type": "module",
 "exports": {
 ".": "./src/index.ts",
 "./components/\*": "./src/components/\*.astro",
 "./icons": "./src/icons/index.ts",
 "./content": "./src/content/index.ts"
 },
 "files": ["src/\*\*", "README.md", "LICENSE"],
 "publishConfig": {
 "access": "restricted"
 }
}

This combines Astro’s recommended exports/files approach with Node’s “exports-first” entry point discipline. [[16]](https://docs.astro.build/pl/reference/publish-to-npm/)

If you later decide to ship compiled output, TypeScript recommends bundling declaration files and setting types accordingly. [[11]](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

## Publishing pipeline and release governance

### GitLab npm registry configuration essentials

GitLab’s npm registry documentation provides three operational pillars:

* **Authenticate** using supported token types (personal/group/project access token with api scope, deploy token with package registry scopes, or CI\_JOB\_TOKEN for CI publishing). [[15]](https://docs.gitlab.com/user/packages/npm_registry/)
* **Configure the registry URL** (for publishing, GitLab recommends the project endpoint format). [[15]](https://docs.gitlab.com/user/packages/npm_registry/)
* **Avoid committing secrets**: GitLab explicitly warns against hardcoding tokens in .npmrc. [[15]](https://docs.gitlab.com/user/packages/npm_registry/)

A minimal CI publishing job pattern from GitLab is: generate .npmrc within the CI job using predefined variables, then run npm publish. [[15]](https://docs.gitlab.com/user/packages/npm_registry/)
In a pnpm workspace, the direct translation is: generate .npmrc the same way, then run pnpm publish -r (which publishes workspace packages whose versions are not yet in the registry). [[17]](https://docs.gitlab.com/user/packages/npm_registry/)

### Release workflow options that fit “multi-module later”

There are three credible release governance patterns; choosing one early reduces future friction.

**Changesets-driven releases (strong fit for multi-package monorepos).**
pnpm’s guidance is explicit: install Changesets, generate changesets, then release by running pnpm changeset version, pnpm install, committing results, and finally pnpm publish -r. [[18]](https://pnpm.io/using-changesets)
This is especially attractive if you expect multiple packages or multiple independently releasable modules. [[19]](https://changesets-docs.vercel.app/)
Operational caveat: GitHub-centric automation examples exist in pnpm’s docs; on GitLab you typically implement similar logic via CI jobs and (if desired) automated merge requests, because CI needs a mechanism to commit version bumps safely. [[20]](https://pnpm.io/using-changesets)

**Semantic-release on GitLab (commit-message driven automation).**
GitLab provides an official CI example for publishing npm packages to its registry with semantic-release, including a pipeline that generates .npmrc during CI and runs semantic-release on the default branch. It also documents that you need a project access token (GITLAB\_TOKEN) to push version bumps back to the repo. [[21]](https://docs.gitlab.com/ci/examples/semantic-release/)
This approach reduces manual release steps but ties versioning strongly to conventional commit discipline. [[21]](https://docs.gitlab.com/ci/examples/semantic-release/)

**Nx Release (integrated monorepo release management).**
If you adopt Nx for task orchestration, Nx Release can also manage versioning/changelogs/publishing, including configuring custom registries via .npmrc. [[22]](https://nx.dev/docs/guides/nx-release/release-npm-packages)
This can simplify long-term operations by consolidating orchestration + releases in one toolchain, but is heavier than a pnpm+Changesets baseline. [[13]](https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo)

## Roadmap draft

This roadmap is written to support incremental migration: you should be able to stop after any phase with a functional site and an increasingly well-formed library.

### Foundation and scoping

Establish the library boundary and the intended growth model (“single package with subpath modules first” vs “multiple packages soon”). Draft your public API structure and naming, especially if GitLab registry use implies adopting a scope (GitLab highlights the importance of scopes depending on registry endpoint choices). [[23]](https://docs.gitlab.com/user/packages/npm_registry/)

### Workspace migration and internal consumption

Convert the repo to a workspace (pnpm-workspace.yaml) and introduce the first packages/dibs-astro package while keeping the site running as the integration test bed (Astro explicitly supports using a demo project and notes you can keep using the existing project after extraction). [[4]](https://pnpm.io/workspaces)
Adopt workspace: dependencies so the site consumes the library locally with strict guarantees during the migration. [[3]](https://pnpm.io/workspaces)

### Public API stabilization and packaging hardening

Define exports (main + subpath modules) and a strict files whitelist. This provides a stable contract and avoids accidental deep imports; Node documents that introducing exports restricts non-exported entry points and can be breaking if consumers relied on them. [[24]](https://nodejs.org/api/packages.html)
If you ship built JS, add .d.ts generation and types pointers per TypeScript’s publishing guidance. [[11]](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
Introduce publishConfig to prevent accidental publication to the wrong place and to encode your intended publish behavior. [[25]](https://docs.npmjs.com/cli/v8/configuring-npm/package-json/)

### Testing strategy aligned with Astro packages

Stand up a “fixtures” or demo validation flow. Astro notes it does not ship a test runner and recommends a fixture-pages approach validated via astro build output comparison; your existing site can also serve as the primary integration test harness during early extraction. [[1]](https://docs.astro.build/pl/reference/publish-to-npm/)

### First registry publication and CI automation

Implement GitLab npm registry publication: configure .npmrc/registry mapping and CI authentication using documented token methods, and use a CI job that generates .npmrc dynamically (per GitLab guidance) before publishing. [[15]](https://docs.gitlab.com/user/packages/npm_registry/)
Choose one release governance path: - Changesets + pnpm publish -r (best aligned to multiple packages later). [[26]](https://pnpm.io/using-changesets)
- Or semantic-release with GitLab’s official example if you want conventional-commit-driven automation, including repo write-back via GITLAB\_TOKEN. [[21]](https://docs.gitlab.com/ci/examples/semantic-release/)
- Or Nx Release if you are adopting Nx for orchestration and want an integrated release system, including custom registry configuration via .npmrc. [[27]](https://nx.dev/docs/guides/nx-release/configure-custom-registries)

### Multi-module expansion path

Once the first package is stable and published, expand modules by either: - Adding new subpath exports within the same package (fastest operationally, keeps versions aligned). [[5]](https://nodejs.org/api/packages.html)
- Or promoting a module into its own package inside packages/ when it needs independent dependency management or release cadence; pnpm workspaces and Changesets are explicitly designed to coordinate multi-package versioning and publishing. [[28]](https://pnpm.io/workspaces)

### Performance and governance upgrades as the repo grows

If CI/runtime iteration becomes slow with multiple packages, add either Turborepo (define cached outputs carefully) or Nx (incremental adoption, deeper monorepo features). [[29]](https://turborepo.dev/docs/crafting-your-repository/caching)

[[1]](https://docs.astro.build/pl/reference/publish-to-npm/) [[8]](https://docs.astro.build/pl/reference/publish-to-npm/) [[16]](https://docs.astro.build/pl/reference/publish-to-npm/) Working with integrations | Docs

<https://docs.astro.build/pl/reference/publish-to-npm/>

[[2]](https://nodejs.org/api/packages.html) [[5]](https://nodejs.org/api/packages.html) [[24]](https://nodejs.org/api/packages.html) Modules: Packages | Node.js v25.9.0 Documentation

<https://nodejs.org/api/packages.html>

[[3]](https://pnpm.io/workspaces) [[4]](https://pnpm.io/workspaces) [[28]](https://pnpm.io/workspaces) Workspace | pnpm

<https://pnpm.io/workspaces>

[[6]](https://changesets-docs.vercel.app/) [[19]](https://changesets-docs.vercel.app/) Changesets - Changesets

<https://changesets-docs.vercel.app/>

[[7]](https://pnpm.io/cli/publish) pnpm publish | pnpm

<https://pnpm.io/cli/publish>

[[9]](https://docs.npmjs.com/cli/v8/configuring-npm/package-json/) [[25]](https://docs.npmjs.com/cli/v8/configuring-npm/package-json/) package.json | npm Docs

<https://docs.npmjs.com/cli/v8/configuring-npm/package-json/>

[[10]](https://docs.astro.build/en/guides/typescript/) TypeScript | Docs

<https://docs.astro.build/en/guides/typescript/>

[[11]](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html) TypeScript: Documentation - Publishing

<https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html>

[[12]](https://turborepo.dev/docs/crafting-your-repository/caching) [[29]](https://turborepo.dev/docs/crafting-your-repository/caching) Caching

<https://turborepo.dev/docs/crafting-your-repository/caching>

[[13]](https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo) Nx vs Turborepo | Nx

<https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo>

[[14]](https://nx.dev/docs/guides/nx-release/release-npm-packages) [[22]](https://nx.dev/docs/guides/nx-release/release-npm-packages) Release TypeScript/JavaScript Packages to NPM | Nx

<https://nx.dev/docs/guides/nx-release/release-npm-packages>

[[15]](https://docs.gitlab.com/user/packages/npm_registry/) [[17]](https://docs.gitlab.com/user/packages/npm_registry/) [[23]](https://docs.gitlab.com/user/packages/npm_registry/) npm packages in the package registry | GitLab Docs

<https://docs.gitlab.com/user/packages/npm_registry/>

[[18]](https://pnpm.io/using-changesets) [[20]](https://pnpm.io/using-changesets) [[26]](https://pnpm.io/using-changesets) Using Changesets with pnpm | pnpm

<https://pnpm.io/using-changesets>

[[21]](https://docs.gitlab.com/ci/examples/semantic-release/) Publish npm packages to the GitLab package registry using semantic-release | GitLab Docs

<https://docs.gitlab.com/ci/examples/semantic-release/>

[[27]](https://nx.dev/docs/guides/nx-release/configure-custom-registries) Configure Custom Registries | Nx

<https://nx.dev/docs/guides/nx-release/configure-custom-registries>