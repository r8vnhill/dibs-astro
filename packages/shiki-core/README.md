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
- Plain-text language normalization for text, txt, plain, and plaintext inputs.
- Fallback HTML rendering contracts.
- Reusable transformer contracts.
- Root-only ESM package output with external consumer validation.

## Scope

Shiki infrastructure that is **not** UI-specific:

- Highlighter orchestration and caching.
- Language name normalization and alias mapping.
- Plain-text identifiers that bypass loading while still preserving the existing `plaintext` compatibility alias.
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

### Creating a Configured Service

Most consumers should create a configured service for their application:

```ts
import { createShikiHighlighterService } from "@ravenhill/shiki-core";

// Create a service with optional custom retry handler
const shikiService = createShikiHighlighterService({
    retry: myRetryHandler, // Optional
    warn: customWarnFn,    // Optional
    defaultTheme: "catppuccin-latte", // Optional
    initialLanguages: ["javascript", "python"], // Optional
});

// Use it for rendering
const html = await shikiService.highlightToHtml({
    code: 'console.log("hello")',
    language: "javascript",
});
```

### Default Service (No Retry)

For simpler use cases without custom retry policy:

```ts
const html = await shikiService.highlightToHtml({
    code: "code",
    language: "python",
    theme: "nord",
    meta: "highlight={1,3}",
    transformers: [myTransformer],
});
```

### Accessing the Cached Highlighter

If you need direct access to the Shiki highlighter instance:

```ts
import { getShikiHighlighter } from "@ravenhill/shiki-core";

const highlighter = await getShikiHighlighter();
const html = await highlighter.codeToHtml("code", { lang: "js", theme: "nord" });
```

### Root-Only Imports

Import from the package root only:

```ts
import {
    createShikiHighlighterService,
    getShikiHighlighter,
    normalizeShikiLanguage,
    renderFallbackCodeHtml,
    DEFAULT_DARK_THEME,
    DEFAULT_LIGHT_THEME,
    type ShikiHighlighterService,
    type HighlightToHtmlOptions,
    type ShikiRetry,
    type ShikiRetryContext,
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
- Typecheck appears silent: the default script runs `tsc --noEmit`, so it may produce no output until it exits. Use
  `pnpm --filter @ravenhill/shiki-core typecheck:diagnostics` for compiler timing and file-count diagnostics. If a
  Codex sandbox run fails with `EPERM` under `node_modules/.pnpm`, treat it as an execution-environment permission
  limit and rerun outside the sandbox before diagnosing a source-level TypeScript failure.
- Accidental subpath import attempt: import from `@ravenhill/shiki-core` only; subpaths are not part of the supported contract.

## Implementation Status

### Phase 2 (Complete)

Extracted pure highlighting utilities:

- Language alias and resolution contracts
- Theme configuration constants
- Fallback HTML rendering
- Class token utilities
- Reusable transformers (Tailwind classes, line text color)

### Phase 3 (Complete)

Extracted highlighter orchestration and cache lifecycle:

- **Highlighter management**: `createShikiHighlighterService` for configurable services
- **Direct access**: `getShikiHighlighter` for the cached singleton
- **Promise-backed cache**: Concurrent caller support with rejection recovery
- **Global singleton synchronization**: Process-level cache with ESM context reuse
- **Language lifecycle**: Alias normalization, loaded-language tracking, safe fallback
- **Warning deduplication**: One warning per language + kind to avoid console spam
- **Configurable retry**: Injected retry handler for host-specific concerns (e.g., dev transport retry)

Consumers can import from the root API and create configured services matching their runtime requirements.

### Future Phases

- Fine-grained Shiki bundle control (themes/languages as tree-shakeable imports)
- Additional transformer contracts
- Performance monitoring and metrics
