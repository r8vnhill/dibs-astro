# Phase 0 Plan: Preparation and Baseline for `content-core`

## Summary

Phase 0 should prepare the repository to host `packages/content-core` without moving any production logic yet. The goal is to prove that this repo can behave as a root Astro application plus one internal workspace package, while preserving the current development flow and validating the future extraction path.

This phase should stay intentionally boring: workspace wiring, package skeleton, one trivial import from the root app, and baseline verification. No domain migration, no API redesign, no release tooling, and no publication setup beyond minimal metadata that does not block future publication.

The most important correction to the previous draft is this: the first package must be **content-oriented and host-agnostic**, not `dibs`-specific and not course-specific. The package identity should therefore move from `@dibs/course-core` to **`@ravenhill/content-core`**. The existing plan currently hardcodes the former. ecisions

* Keep the Astro app at the repository root.
* Do not introduce `apps/site` in this phase.
* Do not add Nx or Turborepo in this phase.
* Do not move real domain logic yet.
* Do not publish yet.
* Use a package name that can survive publication and reuse.

## Package identity

### Recommended default

* Folder: `packages/content-core`
* Package name: `@ravenhill/content-core`

### Rationale

* `@ravenhill/*` gives you a reusable, owner-based package family, which fits both npm’s scoped-package model and GitLab’s scoped registry workflow. ([npm Docs][2])
* `content-core` reflects the real boundary more accurately than `course-core`.
* The name leaves room for future packages without forcing DIBS terminology into the public API.

## Key changes

* Update `pnpm-workspace.yaml` to include `packages/*` alongside `.`.
* Create `packages/content-core/` with only the minimum files needed to resolve as a workspace package:

  * `package.json`
  * `tsconfig.json`
  * `src/index.ts`
  * optional `README.md` if it helps clarify the package boundary
* Add a minimal package identity that is realistic enough to keep:

  * use `@ravenhill/content-core`
  * do not use a placeholder that will obviously be renamed again later
* Add a trivial exported symbol in `packages/content-core/src/index.ts`.

  * This symbol exists only to prove workspace resolution and package consumption.
  * Recommended default: a constant such as `CONTENT_CORE_PACKAGE_NAME` or a very small no-op helper
* Add `@ravenhill/content-core: "workspace:*"` to the root app dependencies.

  * The app must consume the package as a real workspace dependency, not via relative imports.
* Add one temporary import site in the root app to prove resolution.

  * Keep it low-risk and non-user-facing.
  * Prefer a small unit test or utility-level smoke test over a layout or page import.
* Add one minimal package validation command.

  * Recommended default: `tsc -p packages/content-core/tsconfig.json --noEmit`
  * Expose it through a root script such as `check:content-core`

## What not to add yet

Do not add in Phase 0:

* `exports`
* `files`
* `publishConfig`
* Changesets
* semantic-release
* consumer fixture app
* package-local Vitest unless Phase 0 reveals a concrete need

I would keep those out for the same reason the earlier plan tried to keep Phase 0 structural only: this stage is about proving workspace topology, not about hardening the package for release. That basic direction is still sound. faces and configuration

### Root consumption rule

The root app must import only from `@ravenhill/content-core`, never from `packages/content-core/src/*`.

### `packages/content-core/package.json`

Keep it minimal but plausible:

* `name: "@ravenhill/content-core"`
* `version: "0.0.0"`
* `private: true`
* `type: "module"`

Leave `main`, `types`, `exports`, and `publishConfig` for a later hardening phase unless your validation flow truly requires them now.

### `packages/content-core/tsconfig.json`

Keep it package-local and conservative:

* extend the repo’s current TypeScript base config if one already exists;
* `rootDir: "src"`
* `noEmit: true`
* no path aliases back into the root app

### Root scripts

Add:

* `check:content-core`

Optionally add:

* `check:workspace`

Only do that if it stays small and does not duplicate the current root `check` script.

## Validation plan

### Baseline before changes

Run:

* `pnpm check`
* the smallest targeted unit check that proves the repo is green enough to compare before and after Phase 0

### Verification after wiring

Run:

* `pnpm install`
* `pnpm run check:content-core`
* `pnpm check`

### Optional proof of consumption

Run one narrow test that imports the trivial symbol from `@ravenhill/content-core`.

## Acceptance criteria

Phase 0 is complete when:

* the workspace resolves `@ravenhill/content-core`;
* the root app can import one trivial symbol from it;
* `check:content-core` passes;
* `pnpm check` still passes;
* no app code imports from `packages/content-core/src/*`;
* no package name in the repo still assumes the extracted library is DIBS-specific.

## Assumptions and defaults

* Phase 0 is structural only.
* The repo remains root-app-first.
* The package stays `private: true` to prevent accidental publication during wiring.
* The root app remains the only integration harness in this phase.
* The package family should be designed as if publication were real, even though publishing is not part of Phase 0.

## What I would change in the broader plan too

I would also make these two follow-up corrections beyond Phase 0:

First, rename the conceptual boundary from **course** to **content** wherever the abstraction is meant to be reusable. That means future references like:

* `course-core` → `content-core`
* `course-ui` → maybe `content-ui` or `astro-content-ui`

Second, add a **terminology audit** to Phase 1 or Phase 2. The current extraction language still revolves around lessons, course structure, and adjacent lessons. That is fine internally at first, but if the package is meant to become course-agnostic, you will eventually want more neutral public vocabulary such as:

* `Lesson` → `ContentNode`, `Entry`, or `DocumentNode`
* `courseStructure` → `contentTree` or `contentCatalog`
* adjacent lessons → previous/next content or neighbors

That keeps the implementation grounded in DIBS while letting the exported API mature into something reusable.

## My recommendation in one line

Replace `@dibs/course-core` with **`@ravenhill/content-core`**, and rewrite Phase 0 around that neutral identity before you create the first package. The current plan is structurally solid, but its naming locks too much product-specific meaning into the very first package. so rewrite the next phase in the same style, with the new `content-core` naming carried through the extraction roadmap.

[1]: https://docs.gitlab.com/user/packages/npm_registry/?utm_source=chatgpt.com "npm packages in the package registry | GitLab Docs"
[2]: https://docs.npmjs.com/cli/v7/using-npm/scope?utm_source=chatgpt.com "scope | npm Docs"
