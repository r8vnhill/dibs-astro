# [DONE] Phase 3: Extract Highlighter Orchestration and Cache Lifecycle

## Summary

Move the remaining stateful Shiki infrastructure from `src/lib/shiki` into `packages/shiki-core` and replace the Phase 3
placeholders with real, host-agnostic implementations.

`@ravenhill/shiki-core` should become the owner of:

- lazy highlighter creation;
- promise-backed cache lifecycle;
- process-wide singleton synchronization;
- language loading and loaded-language tracking;
- escaped fallback rendering;
- warning de-duplication;
- `highlightToHtml` orchestration;
- configurable retry boundaries for host-specific runtime concerns.

The Astro app should keep only app-specific wiring, mainly the existing `runWithDevTransportRetry` integration and
compatibility wrappers for legacy imports.

## Design Constraints

- Keep the package ESM-only and host-agnostic.
- Do not import from app aliases such as `~/...`.
- Do not move Astro components or UI rendering into the package.
- Do not export package-local test controls from the root API.
- Preserve the existing `globalThis.__dibsShikiHighlighterPromise` key unless this phase explicitly introduces a
  migration alias.
- Preserve current runtime behaviour before broadening behaviour.

## Reference-Backed Decisions

Shiki recommends long-lived highlighter instances because `createHighlighter` performs asynchronous initialisation and
loads themes/languages; this supports keeping a shared singleton instead of creating a highlighter per render.
([Shiki][1])

Shiki requires themes and languages to be explicitly loaded when using a highlighter instance, and supports
`loadLanguage` after creation; this supports keeping package-owned loaded-language tracking and failure handling.
([Shiki][1])

Shiki supports `transformers` as part of `codeToHtml` processing, so `highlightToHtml` should preserve transformer
pass-through rather than baking in only the current DIBS transformers. ([Shiki][2])

The package should depend directly on `shiki`, because it imports Shiki runtime APIs and must work when installed as a
tarball rather than relying on the app’s transitive dependency graph.

---

# Target Public API

## Root Exports

`@ravenhill/shiki-core` should export:

- `createShikiHighlighterService(options?)`
- `highlightToHtml(options)`
- `getShikiHighlighter()`
- Phase 2 class-token helpers
- Phase 2 transformer exports
- public option/result types needed by consumers

## Non-Root Internal Test Controls

Keep these package-local only, for package tests:

- `resetShikiHighlighterCache`
- `setShikiHighlighterForTesting`
- `resetShikiWarnings`
- any warning/counter inspection helpers

These may live under internal modules, but should not be reachable from the package root or documented public surface.

## Suggested API Shape

```ts
export interface ShikiRetryContext {
    readonly operation: "create-highlighter" | "load-language";
    readonly language?: string;
}

export type ShikiRetry = <T>(
    operation: () => Promise<T>,
    context: ShikiRetryContext,
) => Promise<T>;

export interface ShikiHighlighterServiceOptions {
    readonly retry?: ShikiRetry;
    readonly warn?: (message: string) => void;
    readonly defaultTheme?: BundledTheme;
    readonly initialLanguages?: readonly BundledLanguage[];
}

export interface HighlightToHtmlOptions {
    readonly code: string;
    readonly language: string;
    readonly theme?: BundledTheme;
    readonly meta?: string;
    readonly transformers?: readonly ShikiTransformer[];
}

export interface ShikiHighlighterService {
    readonly getHighlighter: () => Promise<Highlighter>;
    readonly highlightToHtml: (options: HighlightToHtmlOptions) => Promise<string>;
}
```

The package-level `highlightToHtml(options)` should delegate to a default no-retry service. The Astro app should create
its own configured service and use that through compatibility wrappers.

---

# Implementation Plan

## Cycle 3.1: Lock Existing App Behaviour

Before moving code, add or confirm app-level characterisation tests for the current behaviour.

Cover:

- lazy highlighter creation;
- concurrent calls sharing the same in-flight promise;
- rejected creation promise clearing the cache;
- unknown language fallback HTML;
- failed language load fallback HTML;
- warning de-duplication;
- `text` language bypassing language-load failure paths;
- already-loaded languages not being loaded again;
- transformer pass-through.

This gives the migration a behavioural safety net.

## Cycle 3.2: Introduce Package Internal Modules

Replace `contract-placeholders.ts` with focused internal modules:

```text
packages/shiki-core/src/
  index.ts
  highlighter/
    service.ts
    store.ts
    global-singleton.ts
    language-loader.ts
    fallback-html.ts
    warnings.ts
    defaults.ts
    types.ts
  testing/
    cache-controls.ts
    warning-controls.ts
```

Recommended responsibility split:

- `store.ts`: promise-backed cache semantics only.
- `global-singleton.ts`: reads/writes the `globalThis` compatibility key.
- `service.ts`: orchestration facade.
- `language-loader.ts`: loaded-language detection and `loadLanguage` coordination.
- `fallback-html.ts`: escaped fallback rendering.
- `warnings.ts`: warning keys and de-duplication.
- `defaults.ts`: default theme/language constants.

Keep modules small and pure where possible.

## Cycle 3.3: Implement Promise-Backed Highlighter Store

Implement a generic cache primitive first, then use it for Shiki.

Required behaviour:

- first call invokes the factory;
- concurrent calls reuse the same promise;
- fulfilled promise remains cached;
- rejected promise is removed so later calls can retry;
- tests can inject a value or reset the store;
- no Shiki imports are required in the generic store.

This keeps cache semantics testable without Shiki.

## Cycle 3.4: Implement Global Singleton Synchronisation

Add a narrow module for the process-wide singleton:

```ts
const DIBS_SHIKI_GLOBAL_KEY = "__dibsShikiHighlighterPromise";
```

Required behaviour:

- package store checks the global key before creating a new promise;
- package store writes the in-flight promise to the global key;
- rejected promise clears both local and global cache;
- compatibility with the current app global key is preserved.

Avoid spreading `globalThis` access across the service.

## Cycle 3.5: Implement Highlighter Creation

Move highlighter creation into the package.

Required behaviour:

- use package-owned default themes and initial languages;
- create the highlighter lazily;
- wrap creation with configured retry only when the service was configured with one;
- default retry is direct execution;
- keep warning formatting host-neutral.

Suggested default:

```ts
const runWithoutRetry: ShikiRetry = (operation) => operation();
```

This avoids package-level knowledge of Astro, dev servers, transport retries, or environment variables.

## Cycle 3.6: Implement Language Lifecycle

Add `ensureLanguageLoaded(language)` inside the service.

Required behaviour:

- normalise language aliases consistently with existing app behaviour;
- treat `text` as a valid direct-render path;
- check loaded languages before calling `loadLanguage`;
- call `loadLanguage` through the configured retry wrapper;
- warn once when language loading fails;
- return a typed outcome rather than throwing into the caller.

Suggested internal result:

```ts
type LanguageLoadResult =
    | { readonly kind: "loaded" }
    | { readonly kind: "plain-text" }
    | { readonly kind: "unknown-language"; readonly language: string }
    | { readonly kind: "load-failed"; readonly language: string; readonly error: unknown };
```

This makes fallback decisions explicit and testable.

## Cycle 3.7: Implement Fallback Rendering

Extract fallback HTML generation into a pure helper.

Required behaviour:

- escape unsafe HTML characters;
- preserve the current `<pre><code>` shape;
- keep language class behaviour compatible with existing snapshots;
- avoid using Shiki for unknown/failed languages;
- use the same fallback for unknown language and failed language load, unless current behaviour distinguishes them.

Add direct tests for escaping:

- `<script>`
- `&`
- quotes if currently relevant
- multiline snippets
- empty snippets

## Cycle 3.8: Implement `highlightToHtml`

Implement the package orchestration API.

Required flow:

1. If language is `text`, render with highlighter directly or with the existing text path.
2. Get or create the shared highlighter.
3. Ensure the requested language is loaded.
4. On unknown language or load failure, return escaped fallback HTML.
5. Otherwise call `highlighter.codeToHtml`.
6. Pass through theme, meta, and transformers.
7. Preserve current warning de-duplication.

Keep `highlightToHtml` small by delegating to the modules above.

## Cycle 3.9: Add App Wiring and Compatibility Wrappers

Convert app-local files into wrappers.

Suggested app structure:

```text
src/lib/shiki/
  service.ts
  cache.ts
  highlighter.ts
```

`service.ts` should create the configured app service:

```ts
export const appShikiHighlighterService = createShikiHighlighterService({
    retry: runWithDevTransportRetry,
});
```

`cache.ts` and `highlighter.ts` should re-export or delegate to `appShikiHighlighterService`.

Preserve old import names so existing components do not need to change in this phase.

## Cycle 3.10: Remove Placeholder Contract

Delete or fully replace `contract-placeholders.ts`.

Update root exports to expose real implementations. Add a public API test that fails if placeholders return.

---

# Test Plan

## Package Tests

Move/adapt the current app tests into `packages/shiki-core`.

### Highlighter Store

Cover:

- lazy initialisation;
- concurrent reuse;
- reset;
- injected test value;
- rejected promise recovery;
- no duplicate factory calls under concurrency.

### Global Singleton

Cover:

- reads existing global promise;
- writes newly-created promise;
- clears global promise after rejection;
- preserves `__dibsShikiHighlighterPromise` compatibility.

### Service Factory

Cover:

- default service uses direct execution;
- configured retry wraps highlighter creation;
- configured retry wraps language loading;
- retry context includes operation name;
- retry context includes language for language loading.

### `highlightToHtml`

Cover:

- known language renders highlighted HTML;
- `text` language behaviour remains compatible;
- unknown language returns escaped fallback HTML;
- unknown language warns once;
- failed language load returns escaped fallback HTML;
- failed language load warns once;
- already-loaded language skips `loadLanguage`;
- transformers are passed through;
- meta is passed through.

### Fallback HTML

Cover:

- escaping;
- empty input;
- multiline input;
- class names;
- snapshot compatibility if current output shape is already snapshot-tested.

## Public API Tests

Update `packages/shiki-core/tests/public-api.test.ts`:

- remove placeholder throw expectations;
- assert `createShikiHighlighterService` exists;
- assert `highlightToHtml` exists;
- assert `getShikiHighlighter` exists;
- assert helpers and transformers from Phase 2 still export;
- assert test controls are not root exports.

## App Compatibility Tests

Keep focused app tests proving legacy imports still work:

- `src/lib/shiki/cache`
- `src/lib/shiki/highlighter`
- code UI components that depend on those wrappers

Do not duplicate all package behaviour in the app. The app tests should only prove wiring and compatibility.

---

# Documentation Updates

Update `packages/shiki-core/README.md` to describe the real Phase 3 contract:

- package purpose;
- root-only public API;
- default no-retry service;
- app-configured retry service;
- singleton cache semantics;
- fallback semantics;
- warning de-duplication;
- transformer support;
- compatibility wrapper status.

Add a short migration note:

> App code should prefer `@ravenhill/shiki-core` for package-level utilities and the app-local configured service for
> DIBS runtime rendering. Legacy `src/lib/shiki/*` imports remain supported during this phase but are compatibility
> wrappers.

---

# Verification Commands

Run:

```bash
pnpm --dir packages/shiki-core run test
pnpm --dir packages/shiki-core run check
pnpm test:unit -- src/lib/shiki
pnpm test:unit -- src/components/ui/code
pnpm check:shiki-core
pnpm check
```

For the first implementation pass, also run a focused app render test for at least one lesson/code-block page that
exercises Shiki through Astro.

---

# Acceptance Criteria

Phase 3 is complete when:

- `packages/shiki-core` contains real highlighter/cache/orchestration implementations.
- `contract-placeholders.ts` is removed or no longer contains placeholder behaviour.
- `@ravenhill/shiki-core` exports the agreed root API.
- `shiki` is a real package dependency of `@ravenhill/shiki-core`.
- Package tests cover cache lifecycle, language loading, fallback rendering, retry wiring, warnings, and public exports.
- App wrappers preserve old imports.
- Astro runtime behaviour remains unchanged with `runWithDevTransportRetry`.
- No package module imports from app aliases or app-local utilities.
- Test-only controls are not exported from the package root.
- Full focused verification passes.

---

# Risks and Mitigations

| Risk                                                          | Mitigation                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Duplicate highlighter instances across app/package boundaries | Preserve the existing `globalThis.__dibsShikiHighlighterPromise` key during this phase.                       |
| Retry logic leaks app/runtime concerns into the package       | Keep retry as an injected function; default to direct execution.                                              |
| Public API becomes too broad too early                        | Root-export only stable service/orchestration APIs and existing Phase 2 helpers. Keep test controls internal. |
| Fallback HTML changes snapshots unexpectedly                  | Add fallback-specific tests before moving code, then preserve exact output shape.                             |
| Language loading becomes racy                                 | Track loaded and in-flight language loads explicitly, ideally with a small `Map<string, Promise<void>>`.      |
| Warning de-duplication becomes too coarse                     | Key warnings by warning kind and normalised language, not just by message string.                             |
| App compatibility wrappers become permanent debt              | Add a later cleanup phase to remove wrappers once imports have migrated.                                      |

---

# Later Cleanup Phase

Defer these until after Phase 3:

- migrate app imports directly to package/service APIs;
- remove `src/lib/shiki` compatibility wrappers;
- consider subpath exports only if real consumers need them;
- evaluate a fine-grained Shiki bundle if package size becomes a measurable issue. Shiki documents full and web bundles,
  as well as a fine-grained `shiki/core` approach for controlling bundled themes/languages, so this should be a
  performance-driven follow-up rather than part of the behavioural migration. ([Shiki][3])

[1]: https://shiki.matsu.io/guide/install "Installation & Usage | Shiki"
[2]: https://shiki.style/guide/transformers "Transformers | Shiki"
[3]: https://shiki.style/guide/bundles "Bundles | Shiki"
