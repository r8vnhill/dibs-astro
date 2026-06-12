# @ravenhill/site-core

Reusable site and repository primitives for Ravenhill projects.

This package provides pure helpers for representing repository references, normalizing repository platforms, and
building repository or commit URLs.

It does not contain concrete website configuration, authors, course metadata, Astro integration, generated data, or
presentation components. Host applications own their site-specific values and pass those values into the helpers
exported from this package.

## Public API

Import from the package root only:

```ts
import { buildCommitUrl, buildRepoUrl, normalizePlatforms, type RepoRef } from "@ravenhill/site-core";
```

Subpath imports are intentionally unsupported so the package can change its internal layout without breaking consumers.

## Distribution Contract

The package is published as an ESM-only library with a single public root entry point. `package.json` declares
`type: "module"`, `main`, `types`, an `exports` map for `"."`, and `files: ["dist"]`. The manifest does not expose
implementation subpaths or `./package.json`; npm still includes the package manifest and README in packed artifacts by
default.

The build config keeps that contract explicit: `tsup` emits a neutral ESM build from `src/index.ts`, with declarations,
source maps, and no extra tree-shaking override. The package stays host-agnostic at the bundler level as well as the API
level.

The package-level `check` script validates the distribution contract from a consumer perspective:

- `publint --strict` checks the package metadata and published entry points.
- `scripts/assert-pack-files.mjs --pack` verifies the packed files include only the intended distribution artifacts.
- `scripts/validate-packed-consumer.mjs` builds the package, packs it, installs the tarball into a temporary ESM
  consumer, runs a runtime import check, verifies TypeScript declaration resolution, and confirms unsupported subpath
  imports stay blocked.

The package also declares `sideEffects: false`. The public root import is expected to stay passive: no style imports,
global or prototype mutation, process or environment mutation, runtime registration, or host I/O during import. The
runtime package version is exposed from package metadata as module data, not by reading host state at import time.

## Maintenance Notes

`tsup` remains the package bundler for now. A future maintenance task should evaluate `tsdown` as a behavior-preserving
replacement by running `pnpm dlx tsdown-migrate --dry-run`, comparing generated artifacts, and keeping the ESM-only
distribution contract unchanged unless a later package-contract review intentionally changes it.

## Repository Links

```ts
const ref: RepoRef = { user: "example", repo: "project" };

buildRepoUrl(ref, "gitlab");
// "https://gitlab.com/example/project"

buildCommitUrl(ref, "gitlab", "abc1234");
// "https://gitlab.com/example/project/-/commit/abc1234"
```

## Relationship With `@ravenhill/content-core`

`@ravenhill/content-core` owns lesson navigation and lesson metadata contracts.

`@ravenhill/site-core` owns generic site/repository primitives. It has no dependency on `content-core`, and
`content-core` should not depend on it unless a future design explicitly introduces a shared package boundary.
