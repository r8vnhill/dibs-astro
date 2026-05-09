# @ravenhill/shiki-core

Host-agnostic Shiki infrastructure for Ravenhill projects.

## Status

`@ravenhill/shiki-core` is a pilot workspace package with a publication path to the GitLab Package Registry. It is designed to be reused across multiple Ravenhill projects as a standalone package.

Current publish target:

- package: `@ravenhill/shiki-core`
- version: `0.1.0`
- publish registry: `https://gitlab.com/api/v4/projects/71752456/packages/npm/`
- consumer registry: `https://gitlab.com/api/v4/groups/110542663/-/packages/npm/`

## What It Provides

- Host-agnostic Shiki highlighter lifecycle management.
- Language alias and language resolution contracts.
- Fallback HTML rendering contracts.
- Reusable transformer contracts.
- Root-only ESM package output with external consumer validation.

## Scope

Shiki infrastructure that is **not** UI-specific:

- Highlighter orchestration and caching.
- Language name normalization and alias mapping.
- Transformer composition (abstract contracts).
- Plain HTML fallback rendering.
- Theme configuration constants.

## Non-Goals

- Astro components or rendering.
- UI layout or styling decisions.
- Application-specific retry policy.
- Test-only cache reset hooks in public API.
- Public subpath imports.

## Installation

Configure the `@ravenhill` scope to read from the GitLab group registry:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Install the pilot package:

```sh
npm install @ravenhill/shiki-core@0.1.0
```

If your token is not already configured locally, set it without committing secrets:

```sh
npm config set -- //gitlab.com/api/v4/groups/110542663/-/packages/npm/:_authToken="${NPM_TOKEN}"
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"
```

## Usage

Import from the package root only:

```ts
import {
    getShikiHighlighter,
    normalizeShikiLanguage,
    renderFallbackCodeHtml,
    DEFAULT_DARK_THEME,
    DEFAULT_LIGHT_THEME,
    type HighlightCodeOptions,
    type RetryHighlightOperation,
} from "@ravenhill/shiki-core";
```

Subpath imports are intentionally unsupported:

```ts
// ❌ This will fail
import { getShikiHighlighter } from "@ravenhill/shiki-core/src/index.js";
```

## Manual Publish Checklist

Run the local preflight checks before publishing:

```sh
pnpm install
pnpm check:shiki-core
pnpm check
pnpm --dir packages/shiki-core run consumer:check
pnpm --dir packages/shiki-core run pack:dry-run
pnpm --dir packages/shiki-core exec npm pkg get name version private publishConfig exports files types main
```

Check whether the release version already exists before publishing:

```sh
npm view @ravenhill/shiki-core@0.1.0 version \
  --registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Publish manually from the package directory after configuring `NPM_TOKEN` locally:

```sh
export NPM_TOKEN="<token-with-package-publish-permission>"
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"
pnpm --dir packages/shiki-core publish --no-git-checks
```

## Build and Package Checks

Run package validation from the repository root:

```sh
pnpm check:shiki-core
```

That command builds `dist/index.js` and `dist/index.d.ts`, typechecks the package, runs `publint --strict`, verifies the pack file list, validates the packed tarball from a temporary external consumer, and runs the Vitest test suite.

`dist/` is generated output and should not be edited by hand.

To run only the packaged-consumer validation:

```sh
pnpm --dir packages/shiki-core run consumer:check
```

That command builds the package, creates a local tarball, installs it into a temporary project outside the workspace, and verifies runtime imports, TypeScript declarations, and blocked subpath imports.

To run only the tests:

```sh
pnpm --dir packages/shiki-core run test
```

To run only the pack file checks:

```sh
pnpm --dir packages/shiki-core run pack:check
```

The package artifact is intentionally small: `package.json`, `README.md`, and the built `dist` entry files. Source files, tests, local build config, and agent guidance are excluded from the packed artifact.

## Design Goals

- **Neutral identity**: `shiki-core` to enable reuse beyond DIBS
- **Host-agnostic**: Pure highlighting abstractions without Astro or platform-specific coupling
- **Publication-ready**: The package is ready for manual GitLab registry publication at `0.1.0`
- **Root-only API**: Consumers import from `@ravenhill/shiki-core`, not package subpaths; validation checks this boundary

## Troubleshooting

- Missing auth token: configure the project and group registry tokens locally before publishing or installing.
- Wrong registry endpoint: use the project endpoint for publish and the group endpoint for consumer installs.
- Duplicate version: stop and choose a new version if `0.1.0` already exists in the registry.
- Tarball 404 after group metadata resolution: add the project endpoint token mapping as well as the group endpoint mapping.
- Accidental subpath import attempt: import from `@ravenhill/shiki-core` only; subpaths are not part of the supported contract.

## Future Evolution

Phase 2 will extract the actual Shiki orchestration and cache lifecycle logic from the Astro app. Phase 3 will integrate the app to consume the extracted package while maintaining backward compatibility through a bridge layer.
