# [PLAN] Migrate Site Repository Metadata Into `@ravenhill/site-core`

## Summary

Extract reusable repository-hosting primitives into a new publishable package, `@ravenhill/site-core`.

This should **not** go into `@ravenhill/content-core`. `content-core` should remain focused on host-agnostic lesson
navigation and lesson metadata. Repository hosting, source links, repository labels, commit URLs, and platform
normalisation are a separate concern.

The Astro site should continue to own concrete site configuration, including DIBS-specific authors, repository names,
owners, and defaults. The new package should provide only reusable primitives and pure functions for representing and
linking to repositories.

## Decision

Create `packages/site-core` as a small, root-only public API package.

The package should contain generic repository and hosting-platform logic. The Astro app should keep concrete
configuration and adapt it through `src/infrastructure/adapters/site-data-adapter.ts`.

## Goals

- Keep `@ravenhill/content-core` focused and cohesive.
- Extract pure, reusable repository primitives from `src/utils/git.ts`.
- Preserve current Astro behaviour.
- Make repository-link generation testable outside the Astro app.
- Validate the package as a real installed dependency, not only as a workspace-linked package.
- Keep the public API root-only, matching the `content-core` packaging convention.

## Non-goals

- Do not move DIBS-specific literals into the package.
- Do not move `WEBSITE_PRIMARY_AUTHOR`, `WEBSITE_REPO_REFS`, or `getWebsiteRepoRef`.
- Do not introduce broader website identity modelling yet.
- Do not move `site-data-adapter.ts` out of the Astro app.
- Do not expose internal package modules through subpath imports.
- Do not make `site-core` depend on Astro, site data files, generated data, or presentation components.

## Package Boundary

### Move to `@ravenhill/site-core`

Move the generic repository primitives currently living in `src/utils/git.ts`:

```ts
RepoRef;
RepoPlatform;
DEFAULT_REPO_PLATFORMS;
REPO_PLATFORM_HOST;
REPO_PLATFORM_LABEL;
buildRepoUrl;
buildRepoLinkText;
buildCommitUrl;
isRepoPlatform;
normalizePlatforms;
```

These are package-worthy because they are pure, host-agnostic, and reusable across applications that need to construct
repository links.

### Keep in the Astro app

Keep concrete site configuration in `src/data/site.ts` or the existing local site-data module:

```ts
WEBSITE_PRIMARY_AUTHOR;
WEBSITE_REPO_REFS;
getWebsiteRepoRef;
```

These values are app-specific configuration, not reusable package behaviour.

### Keep as an Astro infrastructure adapter

Keep:

```ts
src / infrastructure / adapters / site - data - adapter.ts;
```

Its role should remain:

- reading local Astro-site configuration;
- adapting that configuration into presentation-facing data;
- importing shared repository primitives from `@ravenhill/site-core`;
- preventing presentation code from importing infrastructure or site configuration directly.

## Proposed Package Layout

```txt
packages/site-core/
  README.md
  package.json
  tsconfig.json
  tsup.config.ts
  src/
    index.ts
    repositories/
      repo-platform.ts
      repo-ref.ts
      repo-links.ts
      repo-platform-normalization.ts
      __tests__/
        repo-links.test.ts
        repo-platform-normalization.test.ts
        public-api.test.ts
  scripts/
    check-pack-file.mjs
    validate-packed-consumer.mjs
```

Keep internal files small and focused:

- `repo-platform.ts`: platform type, constants, predicates.
- `repo-ref.ts`: repository reference type.
- `repo-links.ts`: URL and label builders.
- `repo-platform-normalization.ts`: platform-list normalisation.
- `index.ts`: the only public export surface.

## Public API Policy

`packages/site-core/src/index.ts` should be the only public API.

Example package export shape:

```json
{
    "name": "@ravenhill/site-core",
    "version": "0.1.0",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "files": [
        "dist",
        "README.md",
        "package.json"
    ]
}
```

Do not expose:

```ts
@ravenhill/site-core/repositories
@ravenhill/site-core/src/...
@ravenhill/site-core/dist/...
```

This keeps the package free to refactor internals without breaking consumers.

## Implementation Plan

### Phase 1 — Lock Existing Behaviour

Add or verify Astro-side tests for the current behaviour of `src/utils/git.ts`.

Cover:

- supported repository platforms;
- unknown platform rejection;
- default platform normalisation;
- duplicate platform handling, if applicable;
- repository URL construction;
- commit URL construction;
- link text construction;
- behaviour for missing optional fields, if supported.

This phase should not move code yet.

### Phase 2 — Scaffold `@ravenhill/site-core`

Add `packages/site-core` using the same conventions as `packages/content-core`.

Include:

- `package.json`;
- `tsconfig.json`;
- `tsup.config.ts`;
- `src/index.ts`;
- package README;
- `publint`;
- pack-file validation;
- isolated packaged-consumer validation.

Recommended package scripts:

```json
{
    "scripts": {
        "clean": "rimraf dist",
        "build": "tsup",
        "typecheck": "tsc --noEmit",
        "test": "vitest run",
        "lint:package": "publint",
        "check:pack-file": "node scripts/check-pack-file.mjs",
        "consumer:check": "node scripts/validate-packed-consumer.mjs",
        "check": "pnpm run typecheck && pnpm run test && pnpm run build && pnpm run lint:package && pnpm run check:pack-file && pnpm run consumer:check"
    }
}
```

Use the exact script names already established in `content-core` where possible to minimise workspace variation.

### Phase 3 — Move Pure Repository Logic

Move the reusable repository code from:

```txt
src/utils/git.ts
```

to:

```txt
packages/site-core/src/repositories/...
```

Export only from:

```txt
packages/site-core/src/index.ts
```

The package should have no runtime dependency on:

- Astro;
- app aliases such as `~`;
- `src/data/site.ts`;
- generated data;
- UI components;
- infrastructure adapters.

### Phase 4 — Move and Expand Tests

Move the existing test coverage from:

```txt
src/utils/__tests__/git.test.ts
```

to package-local tests under:

```txt
packages/site-core/src/repositories/__tests__/
```

Add tests for the package boundary itself:

```ts
import {
    buildCommitUrl,
    buildRepoLinkText,
    buildRepoUrl,
    isRepoPlatform,
    normalizePlatforms,
} from "@ravenhill/site-core";
```

Also add a negative consumer test for blocked subpath imports, if `content-core` already enforces that convention.

The package tests should treat the package API as the contract, not the internal file layout.

### Phase 5 — Update Astro Imports

Replace app imports from:

```ts
~/utils/git;
```

with:

```ts
@ravenhill/site-core
```

Update affected files, likely including:

- `src/infrastructure/adapters/site-data-adapter.ts`;
- any source-link components;
- any tests importing `RepoRef`, `RepoPlatform`, or repository helper functions.

The adapter should continue to expose site-specific data to presentation code. Presentation code should not import
`src/data/site.ts` directly.

### Phase 6 — Decide Compatibility Strategy

Prefer direct removal of `src/utils/git.ts` if the migration is small.

If the diff becomes too large, keep a temporary compatibility facade:

```ts
export {
    buildCommitUrl,
    buildRepoLinkText,
    buildRepoUrl,
    isRepoPlatform,
    normalizePlatforms,
    type RepoPlatform,
    type RepoRef,
} from "@ravenhill/site-core";
```

If this facade is kept, add a clear TODO or deprecation comment and remove it in the next cycle.

Do not leave the facade indefinitely, because it weakens the package boundary and keeps the old import path alive.

### Phase 7 — Update Workspace Checks

Add root-level scripts:

```json
{
    "scripts": {
        "build:site-core": "pnpm --dir packages/site-core run build",
        "check:site-core": "pnpm --dir packages/site-core run check"
    }
}
```

Include `check:site-core` in the root `pnpm check`.

Also update architecture checks to enforce:

- app code may import from `@ravenhill/site-core`;
- app code may not import from `@ravenhill/site-core/src/...`;
- app code may not import from `@ravenhill/site-core/dist/...`;
- `site-core` may not import from the Astro app;
- `content-core` and `site-core` should not depend on each other unless a future design explicitly justifies that
  coupling.

### Phase 8 — Update Documentation

Add `packages/site-core/README.md` covering:

- package purpose;
- non-goals;
- public API;
- examples;
- package boundary rules;
- relationship with the Astro app;
- relationship with `@ravenhill/content-core`.

Suggested README positioning:

```md
# @ravenhill/site-core

Reusable site and repository primitives for Ravenhill projects.

This package provides pure helpers for representing repository references, normalising repository platforms, and
building repository or commit URLs.

It does not contain concrete website configuration, authors, course metadata, Astro integration, generated data, or
presentation components.
```

Also update any architecture documentation that currently treats repository helpers as app-local utilities.

## Test Plan

Run package-level checks first:

```sh
pnpm --dir packages/site-core run check
```

Then run app-level and workspace checks:

```sh
pnpm test:unit
node scripts/run-astro-check.mjs
pnpm check
```

Recommended test coverage:

| Area                   | Expected coverage                                                    |
| ---------------------- | -------------------------------------------------------------------- |
| Platform predicates    | Valid platforms accepted; invalid values rejected                    |
| Platform normalisation | Defaults, explicit lists, duplicates, and invalid values             |
| Repo URL generation    | Correct host, owner, repository, and path handling                   |
| Commit URL generation  | Correct commit URL shape per platform                                |
| Link text generation   | Stable readable labels                                               |
| Public API             | Root imports expose the intended symbols                             |
| Package boundary       | Subpath imports are blocked                                          |
| Consumer validation    | Package works after `pack` and install into an external temp project |
| Astro adapter          | Site-specific values still flow through `site-data-adapter.ts`       |

## Acceptance Criteria

- `@ravenhill/site-core` exists as a publishable workspace package.
- Repository primitives are exported from the package root.
- Astro app imports repository primitives from `@ravenhill/site-core`.
- DIBS-specific literals remain in the Astro app.
- `@ravenhill/content-core` remains unchanged by this concern.
- `site-data-adapter.ts` remains the infrastructure boundary for site configuration.
- Package internals are not importable by consumers.
- Root `pnpm check` includes `site-core`.
- All tests and package validation pass.

## Risks and Mitigations

| Risk                                             | Mitigation                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `site-core` becomes too broad too early          | Limit the first extraction to repository/link primitives only                                   |
| Package leaks DIBS-specific configuration        | Add tests or review checks ensuring no literals like repo owner, repo name, or author are moved |
| App keeps importing the old utility path         | Remove `src/utils/git.ts` or keep only a short-lived compatibility facade                       |
| Internal imports become de facto public API      | Use package `exports` and consumer validation to block subpaths                                 |
| `content-core` starts depending on site concerns | Keep `content-core` unchanged and document the package boundary                                 |
| Workspace linking hides package errors           | Validate the packed package in a temporary external consumer project                            |

## Suggested Commit Breakdown

1. **Lock current repository helper behaviour**

   - Add or strengthen tests around `src/utils/git.ts`.

2. **Scaffold `@ravenhill/site-core`**

   - Add package metadata, build config, README, and empty public API.

3. **Move repository primitives**

   - Move pure logic into `packages/site-core`.
   - Port tests to the package.

4. **Validate packaged consumption**

   - Add pack-file and isolated consumer checks.

5. **Update Astro imports**

   - Replace `~/utils/git` imports with `@ravenhill/site-core`.

6. **Remove or deprecate old utility path**

   - Prefer removal.
   - Use a temporary facade only if needed to keep the migration reviewable.

7. **Wire root checks and architecture rules**

   - Add `check:site-core`.
   - Extend boundary checks.

8. **Update architecture documentation**

   - Document the distinction between `content-core`, `site-core`, and Astro infrastructure adapters.

## Refined Assumptions

- `@ravenhill/site-core` is a reusable package for pure site/repository primitives.
- `@ravenhill/content-core` remains dedicated to lesson content, lesson metadata, and navigation contracts.
- Concrete site data remains in the Astro app.
- The first extraction should not attempt to model full website identity.
- The package should be dependency-light and framework-agnostic.
- The public API should be root-only.
- The package should be validated as an installed dependency before any registry publication.

## References

- Node.js package `exports` field: supports root-only public APIs and blocks accidental subpath contracts.
- TypeScript project/package boundaries: useful for keeping package APIs explicit and avoiding app-to-package internals.
- pnpm workspaces: supports local package development while still requiring packed-consumer validation to catch
  publication issues.
- publint: validates package publishing metadata and common ESM/type declaration mistakes.
- Vitest: suitable for fast package-local unit tests around pure TypeScript functions.
- tsup: appropriate for small ESM TypeScript library packaging with declaration output.
