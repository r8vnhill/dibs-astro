## [DONE] Phase 4 — Direct Shiki Core Adoption with Compatibility Bridge

## Summary

Migrate `astro-website` consumers to the root-only public API of `@ravenhill/shiki-core`, while preserving
`src/lib/shiki/*` as a thin deprecated compatibility bridge for one release cycle.

This phase should reduce app-level duplication without widening the package contract. The package remains host-agnostic;
Astro-, Markdown-, cache-, theme-registration-, and dev-transport-specific behavior stays in the app. This matches the
package-boundary goal: `@ravenhill/shiki-core` exposes reusable Shiki primitives, while `astro-website` owns rendering
integration and runtime policy.

Root-only imports are especially important because Node’s `package.json` `exports` field defines public entry points and
encapsulates unexported subpaths, making accidental `@ravenhill/shiki-core/*` imports fail by design. ([Node.js][1])
TypeScript’s `bundler` module resolution also supports package `exports` and `imports`, so tests should validate the
same contract the app relies on at build time. ([TypeScript][2])

---

## Goals

- Replace app consumers with direct root imports from `@ravenhill/shiki-core` wherever the public API already covers the
  behavior.
- Keep one app-local highlighting boundary for Astro-specific wiring, especially dev retry behavior through
  `runWithDevTransportRetry`.
- Preserve all existing behavior of `LightCode.astro`, `DarkCode.astro`, `CodeLayout.astro`, and Markdown-rendered code
  blocks.
- Keep `src/lib/shiki/*` resolving as deprecated wrappers for one release cycle.
- Remove duplicated deterministic helper logic from `config/patches/shiki` only when the replacement is behaviorally
  identical.
- Add regression tests that make the migration safe and make future bridge removal straightforward.

## Non-Goals

- Do not add patch-facade APIs to `@ravenhill/shiki-core`.
- Do not move Astro components, props, CSS, markdown patching, cache-key construction, theme registration, or retry
  wiring into `packages/shiki-core`.
- Do not expose package subpaths such as `@ravenhill/shiki-core/languages` or `@ravenhill/shiki-core/transformers`.
- Do not remove `src/lib/shiki/*` in this phase.
- Do not change generated HTML, HAST shape, class-token behavior, language fallback behavior, cache semantics, or error
  recovery behavior.

---

## Proposed Target Shape

### 1. Package API Usage

New app code should import reusable primitives only from the package root:

```ts
import {
    resolveShikiLanguage,
    transformerNotationLineTextColor,
    transformerTailwindClasses,
} from "@ravenhill/shiki-core";
```

No app code should import package internals or package subpaths.

### 2. App-Local Highlighting Boundary

Keep an app-owned boundary for configured highlighting, for example:

```text
src/lib/code-highlighting/
  create-app-highlighter-service.ts
  app-highlighter-service.ts
```

This boundary may depend on:

- `@ravenhill/shiki-core`
- app configuration
- `runWithDevTransportRetry`
- Astro/Markdown-specific theme and rendering assumptions

It should not be part of the deprecated bridge. The bridge should point to this boundary only where old imports require
it.

### 3. Deprecated Compatibility Bridge

Keep `src/lib/shiki/*` as wrappers only:

```text
src/lib/shiki/
  index.ts
  languages.ts
  transformers.ts
  highlighter.ts
```

Each file should do one of these:

- re-export root package symbols;
- delegate to the app-local highlighting boundary;
- expose deprecated aliases required by existing consumers.

Avoid new logic inside the bridge. It should be mechanically removable in Phase 6.

---

## Implementation Steps

## Step 1: Lock the Current Public Surface

Before migration, add or strengthen a data-driven compatibility test that enumerates every existing `src/lib/shiki/*`
import path and expected export name.

Use a table-style test so future bridge removal is deliberate:

```ts
describe("src/lib/shiki compatibility bridge", () => {
    test.each([
        ["~/lib/shiki/languages", ["resolveShikiLanguage"]],
        ["~/lib/shiki/transformers", ["transformerTailwindClasses"]],
        ["~/lib/shiki/highlighter", ["createConfiguredHighlighter"]],
    ])("keeps %s compatible for one release cycle", async (specifier, exports) => {
        const module = await import(specifier);

        for (const name of exports) {
            expect(module).toHaveProperty(name);
        }
    });
});
```

This is a better fit for DDT than PBT because the risk is not input-space behavior; it is import-surface drift.

## Step 2: Introduce the App Highlighting Boundary

Create or keep a single app-local service that wires:

- public `@ravenhill/shiki-core` helpers;
- app theme defaults;
- CSS-variable theme registration;
- cache key strategy;
- `codeToHtml` / `codeToHast` usage;
- failed-initialization reset behavior;
- `runWithDevTransportRetry`.

Shiki’s own API separates core highlighting from transformers that manipulate the HAST tree, so keeping
renderer-specific wiring in the app is the cleaner boundary. ([Shiki][3])

## Step 3: Migrate Astro Components to Root Package Imports

Update:

- `LightCode.astro`
- `DarkCode.astro`
- `CodeLayout.astro`

Replace imports from `~/lib/shiki/*` with root imports from `@ravenhill/shiki-core` when the imported symbol is
package-owned.

Keep imports from the app-local highlighting boundary when the behavior is app-owned.

Expected direction:

```ts
// Good: package-owned primitive
import { resolveShikiLanguage } from "@ravenhill/shiki-core";

// Good: app-owned integration
import { createAppHighlighterService } from "~/lib/code-highlighting";

// Avoid
import { resolveShikiLanguage } from "~/lib/shiki/languages";

// Forbidden
import { resolveShikiLanguage } from "@ravenhill/shiki-core/languages";
```

## Step 4: Convert `src/lib/shiki/*` into Thin Deprecated Wrappers

After consumers are migrated, simplify bridge modules.

Example shape:

```ts
/**
 * @deprecated Import from `@ravenhill/shiki-core` instead.
 */
export { normalizeShikiLanguage, resolveShikiLanguage } from "@ravenhill/shiki-core";
```

For app-configured highlighter behavior:

```ts
/**
 * @deprecated Import from `~/lib/code-highlighting` instead.
 */
export { createAppHighlighterService } from "~/lib/code-highlighting";
```

Do not add behavioural branching, fallback rules, or duplicated utility functions here.

## Step 5: Reduce Duplication in `config/patches/shiki`

Audit deterministic helpers in `config/patches/shiki`.

For each helper, classify it as:

| Classification                                    | Action                                                   |
| ------------------------------------------------- | -------------------------------------------------------- |
| Equivalent to existing public `shiki-core` helper | Replace with root package import                         |
| Astro/Markdown/cache-specific                     | Keep app-local                                           |
| Equivalent but not currently public               | Keep local for now; do not expand package API in Phase 4 |
| Similar but semantically different                | Keep local and document the difference in a test name    |

This keeps Phase 4 from becoming an accidental public API expansion.

## Step 6: Add Import-Boundary Enforcement

Add tests or architecture rules that fail on:

```ts
import ... from '@ravenhill/shiki-core/...';
```

Allow only:

```ts
import ... from '@ravenhill/shiki-core';
```

Also fail new imports from `~/lib/shiki/*` outside the compatibility tests and bridge files.

Suggested rule intent:

```text
- app code may import @ravenhill/shiki-core root only;
- app code may not import @ravenhill/shiki-core subpaths;
- new app code may not import deprecated ~/lib/shiki bridge modules;
- bridge modules may import @ravenhill/shiki-core root and app highlighting boundary.
```

---

## Test Plan

## Compatibility Tests

- Prove every existing `src/lib/shiki/*` import still resolves.
- Prove every expected legacy export is still present.
- Mark the suite clearly as a one-release-cycle bridge contract.
- Add a TODO or issue reference for Phase 6 bridge removal.

## Direct Import Tests

Add regression tests proving app code can consume package exports through the root entry point only.

Recommended assertions:

- root import succeeds;
- expected symbols are present;
- subpath import fails or is blocked by the architecture checker;
- no migrated component imports `~/lib/shiki/*`.

## Astro Render Tests

Keep or strengthen render tests for:

- `LightCode.astro`
- `DarkCode.astro`
- `CodeLayout.astro`

Assertions should focus on externally observable behavior:

- language aliases still resolve;
- fallback to `text` remains stable;
- expected wrapper structure is preserved;
- line/text color transformer behavior remains visible in rendered HTML;
- light/dark theme behavior remains unchanged;
- generated class tokens remain deduplicated.

Astro’s official testing guidance supports end-to-end testing with Playwright, and Astro’s Container API can render
components to strings for focused component checks, so use the existing project style but keep the tests at the lowest
reliable level. ([Astro Documentation][4])

## Markdown Patch Tests

Keep patch tests focused on app-local behavior:

- cache reuse;
- failed initialization reset;
- alias handling;
- fallback to `text`;
- `codeToHtml`;
- `codeToHast`;
- CSS-variable theme registration;
- dev-transport retry injection.

Do not assert package internals from markdown patch tests.

## Architecture Tests

Add or extend boundary tests for:

- no package subpath imports;
- no new imports from deprecated bridge modules;
- bridge modules are thin wrappers;
- app-local highlighting boundary does not leak into `packages/shiki-core`.

---

## Acceptance Criteria

Phase 4 is complete when:

- `LightCode.astro`, `DarkCode.astro`, and `CodeLayout.astro` import package-owned helpers from `@ravenhill/shiki-core`.
- `src/lib/shiki/*` still resolves and exposes the old names.
- `src/lib/shiki/*` contains no substantial logic beyond re-export/delegation/deprecation.
- Markdown patch behavior is unchanged.
- No app file imports `@ravenhill/shiki-core/*`.
- No new app file imports `~/lib/shiki/*`.
- Retry behavior remains injected only at the app boundary.
- Package API remains root-only and host-agnostic.
- All relevant unit, render, architecture, and package checks pass.

---

## Commands

```bash
pnpm --dir packages/shiki-core run check
pnpm test:unit -- src/lib/shiki
pnpm test:unit -- config/patches/shiki
pnpm test:astro
pnpm check
```

If the repository already has an architecture-check target, include it explicitly:

```bash
pnpm check:architecture
```

---

## Risks and Mitigations

| Risk                                                   | Mitigation                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Bridge wrappers accidentally preserve too much logic   | Add tests that classify bridge files as re-export/delegation-only where practical                    |
| Package API expands to satisfy app-only markdown needs | Keep “no new public API” as an explicit acceptance criterion                                         |
| Direct imports bypass app retry/cache behavior         | Route configured highlighting through the app-local service only                                     |
| Root-only package contract regresses                   | Add import-boundary tests for forbidden subpaths                                                     |
| Markdown and Astro component highlighting diverge      | Share only public language/transformer helpers; keep separate tests for app-specific rendering paths |
| Phase 6 removal becomes unclear                        | Add deprecation comments and a removal checklist now                                                 |

---

## Phase 6 Removal Notes

Record this during Phase 4 so the later removal is mechanical:

- list every deprecated bridge module;
- list every legacy export it preserves;
- list the preferred replacement import;
- add a changelog reminder for bridge removal;
- add a failing reminder test or tracked TODO for the removal phase if that matches project conventions.

---

## References

- Node.js package `exports` documentation, especially encapsulation of unexported subpaths and package public-interface
  definition. ([Node.js][1])
- TypeScript module resolution theory, including `bundler` support for package `exports` and `imports`.
  ([TypeScript][2])
- Shiki transformer documentation, which frames transformers as HAST manipulation over generated highlighting output.
  ([Shiki][3])
- Astro testing and Container API documentation for component/render verification strategy. ([Astro Documentation][4])

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.1.0 Documentation"
[2]: https://www.typescriptlang.org/docs/handbook/modules/theory.html?utm_source=chatgpt.com "Documentation - Modules - Theory"
[3]: https://shiki.style/guide/transformers?utm_source=chatgpt.com "Transformers - Shiki"
[4]: https://docs.astro.build/en/guides/testing/?utm_source=chatgpt.com "Testing - Astro Docs"
