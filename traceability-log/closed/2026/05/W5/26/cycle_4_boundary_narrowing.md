# [DONE] Cycle 4 — Boundary Narrowing

## Summary

Narrow the `ensureLanguageLoaded` dependency boundary so the loader depends only on the highlighter capability it
actually uses: `getLoadedLanguages`.

This cycle is intentionally type-level. It should not change runtime behavior, result shapes, language resolution,
fallback rendering, service orchestration, or concurrency behavior.

The goal is to make the loader easier to test and less coupled to Shiki’s full `Highlighter` interface while preserving
the current public and internal runtime contracts.

## Outcome

Implemented on May 26, 2026.

- `ensureLanguageLoaded` now accepts a private `LoadedLanguageReader` alias based on
  `Pick<Highlighter, "getLoadedLanguages">`.
- Loader tests pass minimal highlighter fakes directly, without casting them to `Highlighter`.
- Runtime behavior, result shapes, language resolution, service orchestration, and fallback rendering were left
  unchanged.

## Goals

- Replace the full `Highlighter` parameter type with a minimal capability type.
- Remove unnecessary `as Highlighter` casts from loader tests.
- Keep test fakes structurally small and explicit.
- Preserve all `LanguageLoadResult` behavior from Cycle 3.
- Keep `service.ts` unchanged unless TypeScript reports unavoidable type fallout.
- Avoid public API changes.

## Non-goals

- Do not change `LanguageLoadResult`.
- Do not change `resolveLoadableLanguage`.
- Do not change plain-text or alias behavior.
- Do not change fallback rendering.
- Do not introduce service-level deduplication.
- Do not move language lifecycle logic into `service.ts`.
- Do not add or remove package root exports.
- Do not add dependencies.

## Key Changes

### 1. Add a local capability type

In:

```txt
packages/shiki-core/src/highlighter/language-loader.ts
```

Replace the full highlighter dependency with a local capability alias:

```ts
import type { BundledLanguage, Highlighter } from "shiki";

type LoadedLanguageReader = Pick<Highlighter, "getLoadedLanguages">;
```

Then update the function signature:

```ts
export async function ensureLanguageLoaded(
    highlighter: LoadedLanguageReader,
    language: string,
    loadLanguage: (language: BundledLanguage) => Promise<void>,
): Promise<LanguageLoadResult> {
    // unchanged body
}
```

If `Highlighter` is no longer otherwise used except for the `Pick`, keep the type import. If the project prefers
avoiding `Pick` from third-party interfaces, use a structural interface instead:

```ts
type LoadedLanguageReader = {
    getLoadedLanguages(): readonly BundledLanguage[];
};
```

Prefer the `Pick<Highlighter, "getLoadedLanguages">` version for this cycle because it stays tied to Shiki’s actual
highlighter contract.

### 2. Remove full-highlighter casts from tests

In:

```txt
packages/shiki-core/tests/highlighter-language-loader.test.ts
```

Update the fake helper so it returns the minimal capability:

```ts
const fakeHighlighter = (
    loadedLanguages: readonly BundledLanguage[],
): Pick<Highlighter, "getLoadedLanguages"> => ({
    getLoadedLanguages: () => [...loadedLanguages],
});
```

Then remove call-site casts such as:

```ts
fakeHighlighter([]) as Highlighter;
```

The tests should pass the fake directly.

### 3. Keep implementation behavior unchanged

The body of `ensureLanguageLoaded` should remain semantically identical:

```txt
resolveLoadableLanguage(language)
-> return plain-text / unknown-language directly
-> check highlighter.getLoadedLanguages()
-> call loadLanguage(request.language)
-> return canonical loaded/load-failed result from Cycle 3
```

No branch should be added, removed, or reordered.

## TDD Steps

### Phase 1 — Red: Remove test casts first

Update loader tests so the fake highlighter is no longer cast to `Highlighter`.

Expected red state:

- TypeScript should complain that the production function still requires the full `Highlighter`.
- Runtime tests may still pass if transpilation ignores the type mismatch, so the meaningful red check here is the
  package typecheck.

Run:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

### Phase 2 — Green: Narrow the production boundary

Change `ensureLanguageLoaded` to accept `LoadedLanguageReader`.

Expected green state:

- The minimal fake is accepted.
- The real Shiki highlighter remains accepted because it has `getLoadedLanguages`.
- No runtime test expectations change.

Run:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

### Phase 3 — Regression tests

Run the focused loader suite:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader
```

Then run the full package suite:

```bash
pnpm --filter @ravenhill/shiki-core test
```

### Phase 4 — Traceability update

Update:

```txt
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Mark Cycle 4 as `[DONE]` only after:

- typecheck passes;
- focused loader tests pass;
- full package tests pass.

Record that Cycle 4 is a type-boundary refactor and intentionally leaves service integration and deduplication for later
cycles.

## Files to Modify

Expected:

```txt
packages/shiki-core/src/highlighter/language-loader.ts
packages/shiki-core/tests/highlighter-language-loader.test.ts
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Should remain unchanged:

```txt
packages/shiki-core/src/highlighter/types.ts
packages/shiki-core/src/highlighter/service.ts
packages/shiki-core/src/languages/resolution.ts
packages/shiki-core/src/index.ts
```

## Risk Management

### Type-only cycle may not fail under the test runner

Vitest may not enforce the same type errors as `tsc`, depending on the setup. Use `typecheck` as the primary red/green
signal for this cycle.

### Over-exporting internal capability types

Keep `LoadedLanguageReader` private to `language-loader.ts`. Export it only if another production module needs to name
it. Tests should not need to import this type directly if the fake helper is structurally compatible.

### Accidental service refactor

Do not replace `service.ts` language re-resolution in this cycle. That belongs to Cycle 5, after the narrowed boundary
and canonical result shape are both stable.

### Third-party type coupling

`Pick<Highlighter, "getLoadedLanguages">` keeps the boundary aligned with Shiki. If Shiki changes the method signature
later, TypeScript will surface that drift. A hand-written interface would be more decoupled but could silently diverge
from Shiki’s real contract.

## Acceptance Criteria

- `ensureLanguageLoaded` accepts `Pick<Highlighter, "getLoadedLanguages">`.
- Loader tests no longer cast fakes to `Highlighter`.
- The fake highlighter exposes only `getLoadedLanguages`.
- A real Shiki `Highlighter` remains a valid argument.
- No `LanguageLoadResult` shape changes occur.
- No `resolveLoadableLanguage` behavior changes occur.
- `service.ts` remains behaviorally unchanged.
- No fallback rendering, alias resolution, service integration, or deduplication logic changes.
- No public root exports are added or removed.
- Focused loader tests pass.
- Package typecheck passes.
- Full package tests pass.

## Verification

Passed:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader
pnpm --filter @ravenhill/shiki-core typecheck
pnpm --filter @ravenhill/shiki-core test
```

Notes:

- The sandboxed typecheck session stalled after printing `tsc --noEmit`.
- The sandboxed focused test command failed before running Vitest with `EPERM` while reading `node_modules/.pnpm`.
- Rerunning the commands outside the sandbox completed successfully. The exact package test command reported 9 passing
  test files / 201 passing tests.

[1]: https://www.typescriptlang.org/docs/handbook/type-compatibility.html?utm_source=chatgpt.com "Documentation - Type Compatibility"
