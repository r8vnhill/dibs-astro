# [COMPLETED] Phase 2: Extract Pure and Low-Risk Shiki Modules

## Summary

Extract deterministic, low-risk Shiki utilities from `src/lib/shiki` into the publishable `@ravenhill/shiki-core`
package while preserving current Astro app import paths through compatibility wrappers.

This phase establishes the package as the canonical home for pure Shiki-related behaviour, but it must **not** move
highlighter creation, highlighter caching, warning caches, retry logic, or app-specific custom language registration.
Those remain app-local until Phase 3.

## Goals

- Move pure Shiki helpers into `packages/shiki-core/src`.
- Replace Phase 1 placeholder exports for extracted units only.
- Preserve existing app imports through thin compatibility wrappers.
- Add package-level tests that lock behaviour at the new package boundary.
- Keep the public package API root-only; do not introduce subpath exports.
- Keep extraction mechanical: no semantic redesign, no cache migration, no app rendering changes.

## Non-Goals

- Do not move `createShikiHighlighter`.
- Do not move `getShikiHighlighter`.
- Do not move highlighter cache state.
- Do not expose cache reset helpers.
- Do not expose warning reset helpers.
- Do not move `custom-languages.ts`.
- Do not rename existing app-facing wrapper exports except where wrappers map to new canonical package names.
- Do not introduce package subpath exports.

## Extraction Scope

Move these units into `packages/shiki-core/src`:

```text
packages/shiki-core/src/
  index.ts
  languages/
    aliases.ts
    resolution.ts
  themes/
    defaults.ts
  fallback/
    html.ts
  transformers/
    class-tokens.ts
    tailwind-classes.ts
    line-text-color.ts
    index.ts
```

The exact folder layout can change, but the package should keep a clear separation between:

- language resolution;
- theme defaults;
- fallback HTML rendering;
- transformer support utilities;
- concrete transformer factories.

## Public API

### Canonical Phase 2 Exports

Export these from `packages/shiki-core/src/index.ts`:

```ts
export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from "./themes/defaults";

export { escapeCodeHtml, renderFallbackCodeHtml } from "./fallback/html";

export { isKnownShikiAlias, normalizeShikiLanguage, resolveShikiLanguage } from "./languages/resolution";

export { createLineTextColorTransformer, createTailwindClassTransformer } from "./transformers";
```

### Temporary Compatibility Exports

Export these from the package root only to support existing app wrappers during the migration window:

```ts
export { SHIKI_DEFAULT_THEMES } from "./themes/defaults";

export { buildPlainHtml } from "./fallback/html";

export { availableLanguages } from "./languages/resolution";

export { applyTailwindClasses, transformerNotationLineTextColor } from "./transformers";
```

These names should be documented as **compatibility aliases**, not as the preferred public vocabulary for future
consumers.

## Compatibility Wrappers

Keep the existing `src/lib/shiki/*` files, but reduce them to thin re-export wrappers.

Example shape:

```ts
export { applyTailwindClasses, createTailwindClassTransformer } from "@ravenhill/shiki-core";
```

Rules for wrappers:

- No duplicated implementation logic.
- No local fallback behaviour.
- No local test-only branches.
- No imports from package internals.
- No subpath imports from `@ravenhill/shiki-core`.

This keeps the app migration safe while enforcing the package root as the only supported API surface. The root-only
export policy also aligns with Node package encapsulation through `exports`. ([Node.js][1])

## Dependency Changes

Add `shiki` as a runtime dependency of `@ravenhill/shiki-core` if extracted code imports Shiki runtime values such as
bundled language metadata or transformer contracts.

Add `fast-check` as a package dev dependency only if property-based tests are kept inside `packages/shiki-core`. This is
justified for escaping, token normalization, and directive sanitization because `fast-check` generates broad input
spaces and shrinks failures to smaller counterexamples. ([Fast Check][3])

Avoid adding `@shikijs/transformers` unless Phase 2 directly reuses one of its packaged transformer implementations.
Shiki already supports custom transformers over the HAST output, which is enough for the current extraction.
([Shiki][2])

## TDD Execution Order

### Cycle 1: Lock Existing Behaviour

Before moving code, add or confirm focused tests around the current app-local implementation:

- language alias normalization;
- unknown-language fallback;
- HTML escaping;
- fallback rendered class shape;
- Tailwind class mutation;
- class token normalization;
- line text colour directive parsing;
- line text colour sanitization;
- line text colour transformer flow.

These tests define the behavioural contract that package tests must preserve.

### Cycle 2: Extract Fallback HTML

Move:

- `escapeCodeHtml`;
- `renderFallbackCodeHtml`;
- `buildPlainHtml`.

Package tests should cover:

- escaping `&`, `<`, `>`, `"`, and `'`;
- preserving line structure;
- empty input;
- trailing newline behaviour;
- rendered wrapper class shape;
- language class normalization.

Suggested PBT property:

```ts
fc.assert(
    fc.property(fc.string(), (input) => {
        const escaped = escapeCodeHtml(input);

        expect(escaped).not.toContain("<script");
        expect(escaped).not.toContain("<");
        expect(escaped).not.toContain(">");
    }),
);
```

### Cycle 3: Extract Theme Defaults

Move:

- `DEFAULT_LIGHT_THEME`;
- `DEFAULT_DARK_THEME`;
- `SHIKI_DEFAULT_THEMES`.

Tests should verify:

- default light and dark values are stable;
- `SHIKI_DEFAULT_THEMES.light` matches `DEFAULT_LIGHT_THEME`;
- `SHIKI_DEFAULT_THEMES.dark` matches `DEFAULT_DARK_THEME`;
- the exported object is not mutated by consumers if the implementation promises immutability.

### Cycle 4: Extract Language Resolution

Move:

- aliases;
- alias predicates;
- normalization;
- resolution;
- `availableLanguages`.

Tests should cover:

- known aliases;
- canonical language names;
- case normalization;
- whitespace normalization;
- unknown language fallback;
- bundled Shiki language fallback;
- no mutation of alias tables.

Keep `custom-languages.ts` app-local and make the boundary explicit: package resolution only knows about package-level
aliases and Shiki bundled languages.

### Cycle 5: Extract Transformer Support

Move:

- class token helpers;
- class normalization;
- class uniqueness helpers;
- directive parsing helpers;
- directive sanitization helpers.

Tests should prefer pure helper coverage before transformer integration tests.

Useful test groups:

- `describe("class token normalization", ...)`
- `describe("class token uniqueness", ...)`
- `describe("line text color directive parsing", ...)`
- `describe("line text color sanitization", ...)`

Suggested PBT properties:

- normalized class tokens never contain whitespace;
- duplicate class tokens collapse to one token;
- sanitized colour values never preserve unsafe CSS fragments;
- invalid directives are ignored without throwing.

### Cycle 6: Extract Transformer Factories

Move:

- `createTailwindClassTransformer`;
- `createLineTextColorTransformer`;
- `applyTailwindClasses`;
- `transformerNotationLineTextColor`;
- transformer barrel.

Package tests should verify transformer-level behaviour over minimal HAST-like nodes or real Shiki transformer hooks
where practical. Shiki custom transformers are intended to modify the generated HAST tree, so tests should focus on node
mutation contracts rather than full highlighter integration. ([Shiki][2])

### Cycle 7: Rewire App Wrappers

Replace app-local implementation files with re-export wrappers from `@ravenhill/shiki-core`.

Keep app-level tests minimal:

- old import paths still resolve;
- old export names still exist;
- wrappers do not alter return values;
- representative component imports still compile.

Do not duplicate all package internals through wrapper tests.

### Cycle 8: Update Package Public API Tests

Update Phase 1 package API tests so extracted units no longer expect placeholder errors.

Assertions should verify:

- canonical exports are functions or stable constants;
- compatibility aliases are available;
- highlighter/cache exports still behave as Phase 3 placeholders;
- package root is the only public import path.

## Test Plan

### Package-Level Tests

Add focused tests under:

```text
packages/shiki-core/tests/
  fallback-html.test.ts
  language-resolution.test.ts
  theme-defaults.test.ts
  class-tokens.test.ts
  tailwind-transformer.test.ts
  line-text-color-transformer.test.ts
  public-api.test.ts
```

### App-Level Wrapper Tests

Keep only thin compatibility tests under `src/lib/shiki/__tests__`:

```text
src/lib/shiki/__tests__/
  compatibility-imports.test.ts
```

The wrapper test should verify old names such as:

- `applyTailwindClasses`;
- `transformerNotationLineTextColor`;
- `SHIKI_DEFAULT_THEMES`;
- `buildPlainHtml`;
- `resolveLanguage`.

## Verification

Run focused checks in this order:

```bash
pnpm --dir packages/shiki-core run test
pnpm --dir packages/shiki-core run build
pnpm --dir packages/shiki-core run typecheck
pnpm --dir packages/shiki-core run check
pnpm test:unit -- src/lib/shiki
pnpm check:shiki-core
```

If component imports or rendered code blocks are affected, also run:

```bash
pnpm test:unit -- src/components/ui/code
```

If this package uses `tsup`, keep the Phase 1 build configuration aligned with the existing package pattern. `tsup`
supports options such as `target`, and the existing `target: "es2022"` choice should remain stable unless there is a
consumer compatibility reason to change it. ([Tsup][4])

## Acceptance Criteria

✅ Phase 2 is complete:

- ✅ `@ravenhill/shiki-core` contains real implementations for all Phase 2 pure helpers (fallback HTML, language resolution, theme defaults, class tokens, transformers)
- ✅ `src/lib/shiki/*` compatibility wrappers preserve existing app import paths (6 wrapper files with thin re-exports)
- ✅ No highlighter cache or orchestration logic has moved (remains app-local)
- ✅ No package subpath exports have been added (root-only exports enforced via package.json)
- ✅ Package tests cover extracted behaviour directly (7 test files, 152 tests all passing)
- ✅ App tests verify wrapper compatibility without duplicating internals (compatibility-imports test: 9 tests passing)
- ✅ `createShikiHighlighter` and `getShikiHighlighter` remain Phase 3 placeholders
- ✅ All verification commands pass:
  - Build: ✅ tsup ESM 7.08 MB, DTS 16.18 KB
  - Typecheck: ✅ tsc --noEmit (0 errors)
  - Tests: ✅ 152 package tests passing
  - Lint: ✅ publint strict (all good)
  - Pack: ✅ 5 expected files present
  - Consumer: ✅ external consumer validation passed (root import, type imports, subpath blocking)

## Risks and Mitigations

### Risk: Compatibility aliases become permanent accidental API

Mitigation: mark aliases as compatibility exports in comments and public API tests. Add a later Phase 4 cleanup task to
remove app wrappers once all imports use canonical names.

### Risk: App-specific custom languages leak into the package

Mitigation: keep `custom-languages.ts` app-local and document that package-level resolution covers only generic aliases
and bundled Shiki languages.

### Risk: Transformer tests become too coupled to Shiki internals

Mitigation: test pure helper functions heavily, and keep transformer tests focused on observable node mutation. Avoid
snapshot-heavy tests unless the rendered structure is intentionally part of the contract.

### Risk: Duplicate behaviour remains in wrappers

Mitigation: wrappers should only re-export. A simple static test can scan wrapper files and fail if they contain local
function declarations.

## Recommended Small Addition

Add one architecture-boundary test for the package:

```text
packages/shiki-core must not import from src/
```

This prevents the new package from accidentally depending on the Astro app while extraction is in progress.

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.0.0 Documentation"
[2]: https://shiki.style/guide/transformers?utm_source=chatgpt.com "Transformers - Shiki"
[3]: https://fast-check.dev/?utm_source=chatgpt.com "fast-check official documentation | fast-check"
[4]: https://tsup.egoist.dev/?utm_source=chatgpt.com "tsup.config - EGOIST"
