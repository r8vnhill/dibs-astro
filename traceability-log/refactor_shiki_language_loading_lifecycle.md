# [PLAN] Refactor: Shiki Language Loading Lifecycle

## Summary

Refactor `@ravenhill/shiki-core` language loading so language normalization, canonical language resolution, and
lifecycle coordination are explicit, testable, and concurrency-safe.

The refactor should preserve the public `createShikiHighlighterService` API while improving the internal contract:

- plain-text aliases are recognized consistently;
- successful load results expose the canonical Shiki bundled language;
- fallback branches preserve the original user-facing language where useful;
- concurrent requests for the same unresolved language share one in-flight load;
- `service.ts` no longer has to re-resolve languages after loading.

This aligns with Shiki’s documented plain-text behavior: `text` bypasses highlighting, while `txt` and `plain` are
aliases to `text`. It also fits Shiki’s performance guidance to reuse a highlighter instance instead of creating a new
one per highlight operation. Shiki also supports loading languages after highlighter creation, which makes service-level
lifecycle coordination a natural boundary.

---

## Goals

- Keep the public service factory unchanged.
- Keep language loading behavior deterministic under concurrent rendering.
- Avoid duplicated language resolution between loader and service.
- Improve type precision by returning canonical bundled languages on successful load paths.
- Keep helpers small, pure where possible, and directly unit-testable.
- Add no new runtime dependencies.

---

## Non-goals

- Do not change theme loading.
- Do not introduce custom Shiki language registration.
- Do not change the public package export surface unless the existing internal structure already exports
  `LanguageLoadResult`.
- Do not add PBT dependencies for this refactor unless the package already uses them.
- Do not rewrite the highlighter service beyond the language lifecycle boundary.

---

## Key Changes

### 1. Extract pure language classification

Add a pure helper for Shiki’s plain-text aliases:

```ts
const plainTextLanguages = new Set(["text", "txt", "plain"]);

const isPlainTextLanguage = (language: string): boolean => plainTextLanguages.has(language.trim().toLowerCase());
```

Add a pure resolver:

```ts
export type ResolvedLanguageLoadRequest =
    | { kind: "plain-text" }
    | { kind: "unknown-language"; language: string }
    | { kind: "loadable"; language: BundledLanguage };

export function resolveLoadableLanguage(language: string): ResolvedLanguageLoadRequest {
    const normalizedLanguage = language.trim();

    if (isPlainTextLanguage(normalizedLanguage)) {
        return { kind: "plain-text" };
    }

    const { resolvedLang } = resolveShikiLanguage(normalizedLanguage);

    if (!resolvedLang) {
        return { kind: "unknown-language", language };
    }

    return { kind: "loadable", language: resolvedLang };
}
```

Preserve the original input for `unknown-language` so fallback diagnostics can report what the caller actually
requested.

### 2. Make load results canonical

Update `LanguageLoadResult`:

```ts
export type LanguageLoadResult =
    | { kind: "plain-text" }
    | { kind: "unknown-language"; language: string }
    | { kind: "loaded"; language: BundledLanguage }
    | { kind: "load-failed"; language: BundledLanguage; error: unknown };
```

Use canonical bundled languages for `loaded` and `load-failed`, because both branches occur after successful alias
resolution.

### 3. Narrow the loader boundary

Change `ensureLanguageLoaded` so it only depends on the highlighter capability it actually needs:

```ts
type LoadedLanguageReader = Pick<Highlighter, "getLoadedLanguages">;
```

Keep `loadLanguage` injected:

```ts
export async function ensureLanguageLoaded(
    highlighter: LoadedLanguageReader,
    language: string,
    loadLanguage: (language: BundledLanguage) => Promise<void>,
): Promise<LanguageLoadResult> {
    const request = resolveLoadableLanguage(language);

    if (request.kind !== "loadable") {
        return request;
    }

    if (highlighter.getLoadedLanguages().includes(request.language)) {
        return { kind: "loaded", language: request.language };
    }

    try {
        await loadLanguage(request.language);
        return { kind: "loaded", language: request.language };
    } catch (error) {
        return { kind: "load-failed", language: request.language, error };
    }
}
```

### 4. Move in-flight deduplication to the service layer

Introduce a service-local map:

```ts
const inFlightLanguageLoads = new Map<BundledLanguage, Promise<LanguageLoadResult>>();
```

The service should:

1. call `resolveLoadableLanguage(language)` once;
2. return early for `plain-text` and `unknown-language`;
3. check `highlighter.getLoadedLanguages()`;
4. reuse an existing promise for the same canonical language;
5. insert a promise before awaiting;
6. remove the promise in `finally`.

This keeps concurrency coordination close to the long-lived highlighter instance, which is the stateful resource being
protected.

### 5. Stop re-resolving in `service.ts`

After `ensureLanguageLoaded` returns:

- use `loadResult.language` for rendered languages when `kind === "loaded"`;
- render plain text with Shiki’s `text` fallback or the existing fallback renderer;
- render unknown/load-failed branches through the existing fallback path;
- remove any non-null assertion caused by re-running `resolveShikiLanguage`.

---

## TDD Cycles

### Cycle 1 — Plain-text normalization [DONE]

**Red**

Add DDT tests for:

- `text`;
- `txt`;
- `plain`;
- mixed case;
- surrounding whitespace;
- unknown language still returning `unknown-language`.

**Green**

Implement `isPlainTextLanguage` and route plain-text aliases through `resolveLoadableLanguage`.

**Refactor**

Keep the alias set private unless other modules need direct access. Export the predicate only if tests live outside the
module boundary.

### Cycle 2 — Pure resolution contract [DONE]

**Red**

Add tests for `resolveLoadableLanguage`:

- `ts` resolves to canonical `typescript`;
- `py` resolves to canonical `python`;
- whitespace is trimmed before resolution;
- unknown languages preserve the original input;
- plain-text aliases do not call the Shiki alias resolver if that is observable.

**Green**

Implement `ResolvedLanguageLoadRequest`.

**Refactor**

Use fake data like `khonshu-script`, `midnight-mission`, or `hunter-moon-lang` for unknown-language cases, without
repeating the same reference across tests.

### Cycle 3 — Canonical load results [DONE]

**Red**

Add loader tests for:

- already-loaded alias input returns `{ kind: "loaded"; language: canonical }`;
- unloaded alias input calls `loadLanguage` with the canonical bundled language;
- failed load returns `{ kind: "load-failed"; language: canonical; error }`;
- plain text does not call `loadLanguage`;
- unknown language does not call `loadLanguage`.

**Green**

Update `LanguageLoadResult` and `ensureLanguageLoaded`.

**Refactor**

Update all exhaustiveness checks and remove any stale `{ kind: "loaded" }` expectations.

### Cycle 4 — Boundary narrowing [DONE]

**Red**

Change tests to use a fake object with only `getLoadedLanguages`.

**Green**

Change the loader parameter type to `Pick<Highlighter, "getLoadedLanguages">`.

**Refactor**

Introduce a local alias only if it improves readability:

```ts
type LoadedLanguageReader = Pick<Highlighter, "getLoadedLanguages">;
```

This cycle should be type-level only. Runtime behavior should not change.

**Result**

Implemented on May 26, 2026. `ensureLanguageLoaded` now accepts a private
`Pick<Highlighter, "getLoadedLanguages">` capability alias, and loader tests pass minimal fakes without `Highlighter`
casts. Verification passed with the focused/package shiki-core Vitest run and package typecheck outside the sandbox.

### Cycle 5 — Service integration without deduplication

**Red**

Add service tests proving that:

- alias input renders using the canonical language;
- `txt` and `plain` use the plain-text path;
- failed load uses the fallback renderer;
- `service.ts` does not need to call `resolveShikiLanguage` after loading.

**Green**

Update `service.ts` to consume `loadResult.language`.

**Refactor**

Centralize fallback branching in a small helper if `highlightToHtml` starts exceeding the preferred size.

Suggested helper shape:

```ts
function getRenderableLanguage(loadResult: LanguageLoadResult): BundledLanguage | "text" {
    return loadResult.kind === "loaded" ? loadResult.language : "text";
}
```

Only keep this helper if it removes branching noise.

### Cycle 6 — In-flight deduplication

**Red**

Add a service-level concurrency test:

- arrange a deferred `loadLanguage` promise;
- call `highlightToHtml` twice concurrently with the same unloaded alias;
- assert the load path is invoked once;
- resolve the deferred promise;
- assert both calls render successfully.

Add a second test for cleanup:

- make the first load reject;
- assert fallback behavior;
- call again after failure;
- assert the service attempts to load again.

**Green**

Implement the `Map<BundledLanguage, Promise<LanguageLoadResult>>` in the service lifecycle layer.

**Refactor**

Move deduplication into a small private helper if needed:

```ts
async function ensureDeduplicatedLanguageLoad(
    language: BundledLanguage,
): Promise<LanguageLoadResult> {
    const current = inFlightLanguageLoads.get(language);

    if (current) {
        return current;
    }

    const next = loadResolvedLanguage(language);
    inFlightLanguageLoads.set(language, next);

    try {
        return await next;
    } finally {
        inFlightLanguageLoads.delete(language);
    }
}
```

Keep this helper inside the service factory unless there is a clear reuse case.

---

## Test Plan

### Unit tests

Add focused tests for:

- `isPlainTextLanguage`;
- `resolveLoadableLanguage`;
- `ensureLanguageLoaded`.

Use DDT/table tests for alias and normalization cases.

### Service tests

Add or update tests for:

- canonical alias rendering;
- plain-text alias fallback;
- skipped loading for already-loaded languages;
- failed language load fallback;
- concurrent deduplication;
- retry after failed load.

### Type-level checks

Run the package typecheck to catch stale consumers of the old `LanguageLoadResult` shape.

### PBT decision

Do not add PBT for this change yet. The normalization surface is intentionally small and finite. Reconsider PBT only if
the resolver later accepts configurable aliases, custom language maps, or Unicode normalization rules.

---

## Suggested File-Level Changes

Likely touched files:

```txt
packages/shiki-core/src/highlighter/language-loader.ts
packages/shiki-core/src/highlighter/types.ts
packages/shiki-core/src/highlighter/service.ts
packages/shiki-core/src/languages/resolution.ts       # only if exports need reshaping
packages/shiki-core/src/**/*.test.ts                  # focused loader/service tests
```

Avoid creating a new module unless `language-loader.ts` becomes crowded. If a split is needed, prefer:

```txt
language-resolution.ts
language-loader.ts
service.ts
types.ts
```

---

## Risk Management

### Internal result type churn

Changing `LanguageLoadResult` may break internal tests and callers. Treat this as expected churn, but avoid
compatibility aliases unless the type is exported as part of the package’s public root API.

### Concurrency flakiness

Use deferred promises in tests instead of timers. Timer-based concurrency tests are more fragile and slower.

### Duplicate resolution

Do not let both `service.ts` and `language-loader.ts` call `resolveShikiLanguage` for the same render path. The
canonical language should flow through the result object.

### Failed-load cache poisoning

Always remove in-flight entries in `finally`. A failed language load must not permanently poison future attempts.

### Fallback semantics

Keep this invariant explicit:

- `unknown-language.language` preserves caller input;
- `load-failed.language` stores canonical bundled language;
- rendering fallback should use `text` or the existing fallback renderer;
- diagnostics should preserve enough information to explain the original input when available.

---

## Acceptance Criteria

- `text`, `txt`, and `plain` all bypass language loading.
- Plain-text detection is case-insensitive and whitespace-tolerant.
- Alias inputs like `ts` and `py` return canonical Shiki bundled languages.
- `ensureLanguageLoaded` does not depend on the full `Highlighter` type.
- `service.ts` renders from `loadResult.language` and no longer re-resolves the language after loading.
- Concurrent requests for the same canonical unloaded language trigger one underlying load.
- Failed loads are not cached permanently.
- Public `createShikiHighlighterService` API remains unchanged.
- No runtime dependency is added.
- Focused tests and package typecheck pass.

---

## Execution Commands

Adjust names to the repo’s actual scripts, but the intended verification order is:

```bash
pnpm --filter @ravenhill/shiki-core test
pnpm --filter @ravenhill/shiki-core typecheck
pnpm --filter @ravenhill/shiki-core build
```

If this package is consumed by the Astro site in the same workspace, finish with the smallest site-level smoke check
that exercises code block highlighting.
