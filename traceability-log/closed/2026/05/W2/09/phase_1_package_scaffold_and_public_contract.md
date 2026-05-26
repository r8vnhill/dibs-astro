# [DONE] Phase 1: Package Scaffold and Public Contract

## Summary

Create `astro-website/packages/shiki-core` as a publishable, ESM-only TypeScript workspace package named
`@ravenhill/shiki-core`.

This phase establishes package structure, documentation, package-boundary validation, root-only exports, and
external-consumer checks. It must not move Shiki implementation logic from `src/lib/shiki`; extraction of pure helpers
begins in Phase 2, and extraction of stateful highlighter/cache behaviour begins later.

The core deliverable is a package that can already be built, packed, linted, typechecked, and installed by an external
consumer, even though its runtime implementation is still intentionally skeletal.

---

## Non-Negotiable Phase Boundaries

### In scope

- Add `packages/shiki-core`.
- Add package metadata, build config, tests, docs, and validation scripts.
- Define the root public API shape.
- Add temporary scaffold implementations only where runtime exports are required.
- Validate root-only imports and blocked subpaths.
- Wire the package into root workspace checks.

### Out of scope

- Moving implementation from `src/lib/shiki`.
- Updating Astro code components.
- Updating markdown patch implementation.
- Changing Shiki runtime behaviour.
- Changing theme design, alias policy, fallback rendering, or transformer semantics.
- Removing or rewriting existing `src/lib/shiki` modules.
- Updating changelogs.

---

## Key Design Decisions

### 1. Use root-only package exports

`@ravenhill/shiki-core` should expose only the package root. Internal subpaths such as `@ravenhill/shiki-core/cache`,
`@ravenhill/shiki-core/src/index.js`, and `@ravenhill/shiki-core/dist/index.js` must fail.

This matches Node’s package encapsulation model: when `"exports"` is defined, package subpaths are not importable unless
explicitly exported. ([Node.js][1])

### 2. Keep Phase 1 stubs explicit and non-behavioural

Do not pretend the package already implements highlighting. Runtime value exports may exist only as scaffold stubs so
package import tests can execute.

Recommended convention:

```ts
const notImplemented = (name: string): never => {
    throw new Error(
        `${name} is part of the @ravenhill/shiki-core public contract, `
            + "but its implementation is scheduled for a later extraction phase.",
    );
};
```

This avoids accidental reliance on fake behaviour before Phase 2 or Phase 3.

### 3. Test contract shape, not highlighting behaviour

Phase 1 tests should verify:

- public exports exist;
- types can be imported;
- package subpaths are blocked;
- packed files are correct;
- external consumers can install and import the package.

They should not assert actual Shiki behaviour yet.

### 4. Use package validation as the main acceptance criterion

The package is successful in this phase when it behaves like a real publishable package. `publint` is appropriate
because it checks package compatibility and common packaging mistakes across environments. ([Publint][2])

---

## Package Scaffold

Add:

```text
packages/shiki-core/
  AGENTS.md
  README.md
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  scripts/
    assert-pack-files.mjs
    validate-packed-consumer.mjs
  src/
    index.ts
    contract-placeholders.ts
  tests/
    public-api.test.ts
    package-boundary.test.ts
```

---

## `package.json`

Use the existing `content-core` / `site-core` package shape as the local convention, but make the package explicitly
ESM-only.

Recommended fields:

```json
{
    "name": "@ravenhill/shiki-core",
    "version": "0.1.0",
    "type": "module",
    "sideEffects": false,
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
        "README.md"
    ],
    "publishConfig": {
        "registry": "${GITLAB_PACKAGE_REGISTRY_URL}"
    },
    "scripts": {
        "build": "tsup",
        "typecheck": "tsc --noEmit",
        "test": "pnpm exec vitest run --config vitest.config.ts",
        "lint": "publint --strict",
        "pack:check": "node scripts/assert-pack-files.mjs",
        "pack:dry-run": "pnpm pack --dry-run",
        "consumer:check": "node scripts/validate-packed-consumer.mjs",
        "check": "pnpm run build && pnpm run typecheck && pnpm run test && pnpm run lint && pnpm run pack:check && pnpm run consumer:check"
    }
}
```

Two notes:

- Keep `main` and `types` for compatibility with tooling that still inspects them, but treat `exports` as authoritative.
- Keep the real GitLab registry value consistent with the existing packages rather than introducing a new registry
  convention.

`pnpm` workspaces support local monorepo packages through `pnpm-workspace.yaml`, and `workspace:*` can force local
workspace resolution where needed. ([pnpm][3])

---

## Build Configuration

Add `tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    splitting: false,
});
```

This is a good fit for a small TypeScript library package: `tsup` is designed to bundle TypeScript libraries and is
powered by `esbuild`. ([GitHub][4])

---

## TypeScript Configuration

Add `tsconfig.json`:

```json
{
    "extends": "astro/tsconfigs/strictest",
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "dist",
        "declaration": true,
        "declarationMap": true,
        "noEmit": true
    },
    "include": [
        "src/**/*.ts",
        "tests/**/*.ts",
        "vitest.config.ts",
        "tsup.config.ts"
    ]
}
```

If the existing workspace package pattern separates source and test configs, follow that instead. The important
constraint is that package source must not depend on app-local aliases.

---

## Vitest Configuration

Add `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
```

The Node environment is enough for Phase 1 because tests validate package contracts, not DOM or Astro rendering.

---

## Package Guidance

Add `AGENTS.md` with rules such as:

````md
# @ravenhill/shiki-core Guidance

This package owns host-agnostic Shiki infrastructure.

## Allowed

- Shiki orchestration contracts.
- Highlighting cache lifecycle contracts.
- Language alias contracts.
- Fallback HTML contracts.
- Reusable transformer contracts.
- Package-level tests and external-consumer validation.

## Not Allowed

- Astro components.
- UI rendering policy.
- App-local aliases such as `~/...`.
- Imports from `src/components`.
- Imports from `src/lib/shiki`.
- Test hooks in the public root API.
- Public subpath exports.

## Public API Rule

Consumers may import only from:

```ts
import { ... } from '@ravenhill/shiki-core';
```
````

Internal files are private.

````
---

## README

The README should be short but explicit:

```md
# @ravenhill/shiki-core

Host-agnostic Shiki infrastructure for Ravenhill projects.

This package provides the public contract for syntax-highlighting primitives used by the Astro site. It is intentionally UI-free: Astro components, layout decisions, and presentation-specific rendering remain in the application.

## Scope

- Highlighter lifecycle contracts.
- Language alias contracts.
- Fallback HTML contracts.
- Transformer contracts.
- Theme constants.

## Non-goals

- Astro components.
- UI layout.
- Application-specific retry policy.
- Test-only cache reset hooks.
- Public subpath imports.

## Importing

```ts
import { normalizeShikiLanguage } from '@ravenhill/shiki-core';
````

Do not import package internals.

````
---

## Public Contract

Add `src/index.ts` as the only public barrel.

Recommended Phase 1 shape:

```ts
export {
  createLineTextColorTransformer,
  createShikiHighlighter,
  createTailwindClassTransformer,
  escapeCodeHtml,
  getShikiHighlighter,
  isKnownShikiAlias,
  normalizeShikiLanguage,
  renderFallbackCodeHtml,
  resolveShikiLanguage,
} from './contract-placeholders';

export {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
} from './contract-placeholders';

export type {
  HighlightCodeOptions,
  HighlightLanguage,
  HighlightRetryContext,
  HighlightThemePair,
  RetryHighlightOperation,
} from './contract-placeholders';
````

Add `src/contract-placeholders.ts` with skeletal declarations.

Example:

```ts
export const DEFAULT_DARK_THEME = "night-owl";
export const DEFAULT_LIGHT_THEME = "github-light";

export type HighlightLanguage = string;

export interface HighlightThemePair {
    readonly light: string;
    readonly dark: string;
}

export interface HighlightRetryContext {
    readonly operation: string;
    readonly language?: string;
}

export type RetryHighlightOperation = <T>(
    operation: () => Promise<T>,
    context: HighlightRetryContext,
) => Promise<T>;

export interface HighlightCodeOptions {
    readonly code: string;
    readonly language?: HighlightLanguage;
    readonly themes?: HighlightThemePair;
    readonly retry?: RetryHighlightOperation;
}

const notImplemented = (name: string): never => {
    throw new Error(
        `${name} is part of the @ravenhill/shiki-core public contract, `
            + "but its implementation is scheduled for a later extraction phase.",
    );
};

export const createShikiHighlighter = (): never => notImplemented("createShikiHighlighter");

export const getShikiHighlighter = (): never => notImplemented("getShikiHighlighter");

export const isKnownShikiAlias = (): never => notImplemented("isKnownShikiAlias");

export const normalizeShikiLanguage = (): never => notImplemented("normalizeShikiLanguage");

export const resolveShikiLanguage = (): never => notImplemented("resolveShikiLanguage");

export const escapeCodeHtml = (): never => notImplemented("escapeCodeHtml");

export const renderFallbackCodeHtml = (): never => notImplemented("renderFallbackCodeHtml");

export const createLineTextColorTransformer = (): never => notImplemented("createLineTextColorTransformer");

export const createTailwindClassTransformer = (): never => notImplemented("createTailwindClassTransformer");
```

This should be replaced incrementally during Phase 2 and Phase 3.

---

## Validation Scripts

### `scripts/assert-pack-files.mjs`

Purpose: verify the package tarball contains only intended distributable files.

Expected files:

```text
README.md
package.json
dist/index.js
dist/index.js.map
dist/index.d.ts
```

Consider including `dist/index.d.ts.map` only if declaration maps are actually emitted. The expected list should match
the real build output exactly.

### `scripts/validate-packed-consumer.mjs`

Purpose: validate the package outside workspace linking.

The script should:

1. Run package build.
2. Run `pnpm pack`.
3. Create a temporary directory outside the workspace.
4. Write a minimal external ESM consumer project.
5. Install the generated tarball.
6. Validate runtime root import:

```ts
import * as shikiCore from "@ravenhill/shiki-core";

if (!("getShikiHighlighter" in shikiCore)) {
    throw new Error("Missing public export: getShikiHighlighter");
}
```

7. Validate TypeScript declarations:

```ts
import type { HighlightCodeOptions, RetryHighlightOperation } from "@ravenhill/shiki-core";

const retry: RetryHighlightOperation = async operation => operation();

const options: HighlightCodeOptions = {
    code: "println(\"Hello\")",
    language: "kotlin",
    retry,
};

console.log(options);
```

8. Assert blocked imports fail:

   - `@ravenhill/shiki-core/cache`
   - `@ravenhill/shiki-core/src/index.js`
   - `@ravenhill/shiki-core/dist/index.js`

---

## Workspace Wiring

### `pnpm-workspace.yaml`

Confirm `packages/*` already includes `packages/shiki-core`. Add it only if the current workspace pattern requires
explicit entries.

### Root app dependency

Add:

```json
{
    "dependencies": {
        "@ravenhill/shiki-core": "workspace:*"
    }
}
```

Only do this if Phase 1 tests or root scripts import the package through workspace resolution. Otherwise, defer the app
dependency until Phase 2 integration.

### Root scripts

Add:

```json
{
    "scripts": {
        "build:shiki-core": "pnpm --dir packages/shiki-core run build",
        "check:shiki-core": "pnpm --dir packages/shiki-core run check"
    }
}
```

Then include:

```text
check:shiki-core
```

inside the root `pnpm check` pipeline.

Add `build:shiki-core` to:

- `predev`
- `prebuild`
- `predeploy`

only if existing publishable packages are already built there. If `content-core` and `site-core` are built in those
hooks, `shiki-core` should follow the same rule for consistency.

---

## Tests

### Package tests

Add `tests/public-api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as shikiCore from "../src";

describe("@ravenhill/shiki-core public API", () => {
    it("exposes the Phase 1 root contract", () => {
        expect(shikiCore).toHaveProperty("createShikiHighlighter");
        expect(shikiCore).toHaveProperty("getShikiHighlighter");
        expect(shikiCore).toHaveProperty("normalizeShikiLanguage");
        expect(shikiCore).toHaveProperty("renderFallbackCodeHtml");
        expect(shikiCore).toHaveProperty("createTailwindClassTransformer");
        expect(shikiCore).toHaveProperty("DEFAULT_DARK_THEME");
        expect(shikiCore).toHaveProperty("DEFAULT_LIGHT_THEME");
    });

    it("marks scaffold runtime functions as intentionally unimplemented", () => {
        expect(() => shikiCore.getShikiHighlighter()).toThrow(
            /scheduled for a later extraction phase/,
        );
    });
});
```

Package-boundary tests that require packed output should live in `validate-packed-consumer.mjs`, not normal unit tests,
because source-level tests cannot prove real package export encapsulation.

---

## Verification

Run:

```bash
pnpm --dir packages/shiki-core run build
pnpm --dir packages/shiki-core run typecheck
pnpm --dir packages/shiki-core run test
pnpm --dir packages/shiki-core run pack:dry-run
pnpm --dir packages/shiki-core run consumer:check
pnpm --dir packages/shiki-core run check
pnpm run check:shiki-core
pnpm check
```

No Astro rendering tests are required in Phase 1 because no app integration should change. Running full `pnpm check` is
enough to catch accidental workspace regressions.

---

## Acceptance Criteria

Phase 1 is complete when:

- `packages/shiki-core` exists as a valid workspace package.
- The package is ESM-only.
- The root API exports the intended Phase 1 contract.
- Runtime exports are clearly marked as scaffold-only.
- Type exports are usable by TypeScript consumers.
- The package builds to `dist`.
- `publint --strict` passes.
- `pnpm pack` contains only expected files.
- An external temporary ESM consumer can install and import the package root.
- Internal package subpaths fail from the external consumer.
- Root `pnpm check` includes `check:shiki-core`.
- No files under `src/lib/shiki` are moved or modified for implementation purposes.
- No Astro components or markdown patch files are changed.

---

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.0.0 Documentation"
[2]: https://publint.dev/docs/?utm_source=chatgpt.com "Getting started"
[3]: https://pnpm.io/workspaces?utm_source=chatgpt.com "Workspace"
[4]: https://github.com/egoist/tsup?utm_source=chatgpt.com "egoist/tsup: The simplest and fastest ..."
