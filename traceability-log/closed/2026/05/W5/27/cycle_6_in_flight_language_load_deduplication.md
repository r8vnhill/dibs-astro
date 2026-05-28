# [PLAN] Cycle 6 — In-flight Language Load Deduplication

## Summary

Add service-local in-flight language load deduplication to `@ravenhill/shiki-core` so concurrent highlights for the same
canonical unloaded language share one `highlighter.loadLanguage(...)` operation.

The public `createShikiHighlighterService` API remains unchanged. Deduplication lives inside each service instance,
because the service owns the long-lived highlighter lifecycle. Cycle 6 should not change language normalization,
canonical resolution, fallback rendering, warning semantics, or public exports.

## Goals

- Deduplicate concurrent loads for the same canonical `BundledLanguage`.
- Treat aliases that resolve to the same language, such as `ts` and `typescript`, as the same in-flight load.
- Keep deduplication scoped to one service instance.
- Remove failed in-flight promises so future attempts can retry.
- Preserve existing fallback behavior for unknown and failed languages.
- Preserve retry behavior around `highlighter.loadLanguage(...)`.
- Keep `ensureLanguageLoaded` and its tests intact as the lower-level loader contract.

## Non-goals

- Do not change the public `createShikiHighlighterService` API.
- Do not add root exports.
- Do not remove `ensureLanguageLoaded`.
- Do not change `LanguageLoadResult`.
- Do not change `resolveLoadableLanguage`.
- Do not change plain-text aliases.
- Do not change fallback HTML.
- Do not add global cross-service deduplication.
- Do not add dependencies.

## Design Decision

Cycle 6 should deduplicate at the service layer, not inside `ensureLanguageLoaded`.

Reasoning:

- `ensureLanguageLoaded` is a lower-level, side-effect-light orchestration helper.
- The service owns the long-lived highlighter instance.
- The service is where concurrent `highlightToHtml(...)` calls meet.
- Per-service maps avoid hidden global state and keep tests isolated.

Use:

```ts
const inFlightLanguageLoads = new Map<
    BundledLanguage,
    Promise<LanguageLoadResult>
>();
```

The map key must be the canonical bundled language, not the raw caller input.

## Key Changes

### 1. Add a service-local in-flight map

Inside `createShikiHighlighterService`, add:

```ts
const inFlightLanguageLoads = new Map<
    BundledLanguage,
    Promise<LanguageLoadResult>
>();
```

This map should be created once per service instance.

### 2. Add a private service helper

Add a private helper inside `createShikiHighlighterService`, or directly inside the service module if the current
structure favors top-level private functions.

Preferred behavior:

```txt
resolve caller input once
-> return plain-text / unknown-language immediately
-> check highlighter.getLoadedLanguages()
-> reuse existing in-flight promise for canonical language
-> create and store new promise before awaiting
-> remove map entry in finally
```

Suggested shape:

```ts
async function ensureServiceLanguageLoaded(
    language: string,
): Promise<LanguageLoadResult> {
    const request = resolveLoadableLanguage(language);

    if (request.kind !== "loadable") {
        return request;
    }

    if (highlighter.getLoadedLanguages().includes(request.language)) {
        return { kind: "loaded", language: request.language };
    }

    const current = inFlightLanguageLoads.get(request.language);

    if (current) {
        return current;
    }

    const next = loadResolvedLanguage(request.language);

    inFlightLanguageLoads.set(request.language, next);

    try {
        return await next;
    } finally {
        inFlightLanguageLoads.delete(request.language);
    }
}
```

Then:

```ts
async function loadResolvedLanguage(
    language: BundledLanguage,
): Promise<LanguageLoadResult> {
    try {
        await retry(
            () => highlighter.loadLanguage(language),
            retryOptions,
        );

        return { kind: "loaded", language };
    } catch (error) {
        return { kind: "load-failed", language, error };
    }
}
```

Adapt `retryOptions` and helper names to the existing service code.

### 3. Replace the service call site

In `highlightToHtml`, replace the direct call to `ensureLanguageLoaded(...)` with the new service-local helper.

Before, conceptually:

```ts
const loadResult = await ensureLanguageLoaded(
    highlighter,
    language,
    loadLanguageWithRetry,
);
```

After:

```ts
const loadResult = await ensureServiceLanguageLoaded(language);
```

Keep rendering logic from Cycle 5 unchanged.

### 4. Keep `ensureLanguageLoaded` intact

Do not delete or rewrite `ensureLanguageLoaded` in Cycle 6.

It remains useful as:

- the lower-level loader contract;
- a focused unit-test target;
- a possible reusable primitive for non-service callers;
- a safe fallback if the service lifecycle is refactored later.

If it becomes unused after Cycle 6, evaluate removal in a separate cleanup cycle.

## TDD Phases

### Phase 1 — Red: concurrent same alias

Add a service test in:

```txt
packages/shiki-core/tests/highlighter-service.test.ts
```

Test behavior:

- `getLoadedLanguages` returns `[]`;
- `loadLanguage` returns a deferred promise;
- call `highlightToHtml(...)` twice concurrently with `language: "ts"`;
- assert `loadLanguage` is called once with `"typescript"` before resolving;
- resolve the deferred promise;
- await both highlight calls;
- assert both render with `lang: "typescript"`.

Use deferred promises, not timers.

Suggested helper:

```ts
function createDeferred<T = void>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}
```

### Phase 2 — Red: alias collision

Add a test where concurrent calls use different inputs that resolve to the same canonical language.

Example:

```txt
"ts" + "typescript" -> one loadLanguage("typescript")
```

Assertions:

- one load attempt;
- both render successfully;
- both render with canonical `typescript`.

This test protects the requirement that the map key is canonical.

### Phase 3 — Red: cleanup after failure

Add a test proving failed loads do not poison future attempts.

Behavior:

1. first `highlightToHtml({ language: "ts" })` rejects internally through `loadLanguage`;
2. service returns fallback HTML and warns;
3. call `highlightToHtml({ language: "ts" })` again;
4. assert `loadLanguage` is attempted again.

Use `mockRejectedValueOnce(...)` followed by either another rejection or a success, depending on which behavior is
easiest to assert with existing helpers.

Important assertion:

```ts
expect(highlighter.loadLanguage).toHaveBeenCalledTimes(2);
```

### Phase 4 — Red: independent service instances

Optional but valuable.

Create two service instances with separate fake highlighters. Run one highlight on each with the same language.

Assertion:

- each service calls its own `loadLanguage`;
- no global sharing occurs.

This guards against accidental module-level state.

### Phase 5 — Green: implement service-local deduplication

Implement the `Map<BundledLanguage, Promise<LanguageLoadResult>>` and helper.

Important implementation details:

- insert the promise before awaiting it;
- delete the map entry in `finally`;
- use canonical `request.language` as the key;
- do not deduplicate `plain-text` or `unknown-language`;
- do not store failed results beyond the active promise.

### Phase 6 — Refactor

After tests pass:

- keep helper functions short;
- keep the map private to the service factory;
- avoid adding a new module unless `service.ts` becomes too large;
- keep warning/fallback rendering unchanged;
- keep loader tests unchanged.

## Suggested Test Structure

Use the repo’s preferred Vitest style:

```ts
suite("createShikiHighlighterService language loading", () => {
    describe("in-flight deduplication", () => {
        test("shares one load for concurrent calls to the same alias", async () => {
            // ...
        });

        test("shares one load for aliases with the same canonical language", async () => {
            // ...
        });

        test("removes failed in-flight loads so later calls can retry", async () => {
            // ...
        });
    });
});
```

Use `vi.fn()` mocks for `loadLanguage`, `getLoadedLanguages`, and `codeToHtml` so tests can assert calls precisely.
Vitest’s mock utilities are appropriate for controlling side effects and observing call counts.

## Files to Modify

Expected:

```txt
packages/shiki-core/src/highlighter/service.ts
packages/shiki-core/tests/highlighter-service.test.ts
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Possibly touched if shared helpers exist:

```txt
packages/shiki-core/tests/helpers/*
```

Should remain unchanged:

```txt
packages/shiki-core/src/highlighter/types.ts
packages/shiki-core/src/highlighter/language-loader.ts
packages/shiki-core/src/languages/resolution.ts
packages/shiki-core/src/index.ts
```

## Risk Management

### Promise cleanup

Always remove the map entry in `finally`. A rejected load must not permanently block future attempts.

### Race condition on insertion

Create and store the promise before awaiting it. Otherwise, two concurrent calls can both start their own load.

### Alias key drift

Use `resolveLoadableLanguage` before reading or writing the map. The key must be canonical `BundledLanguage`, not caller
input.

### Loaded-language state staleness

Check `highlighter.getLoadedLanguages()` before consulting the map. This keeps already-loaded languages fast and avoids
unnecessary map reads.

### Retry interactions

The in-flight promise should wrap the existing retry behavior. Concurrent callers should share the full retry operation,
not only a single raw `loadLanguage` call.

### Warning duplication

Decide and pin the intended behavior:

- Preferred: one failed shared load emits one warning even if two callers await the same failed load result.
- Acceptable only if existing behavior requires it: each caller emits its own fallback warning.

The test should make this explicit. My recommendation is one warning per `highlightToHtml` fallback, because warnings
are tied to rendered fallback outputs, not load attempts.

### Service instance isolation

Do not put the map at module scope. Module-scope state would make tests and parallel rendering harder to reason about.

## Verification

Run focused service tests first:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-service.test.ts
```

Run the full package test suite:

```bash
pnpm --filter @ravenhill/shiki-core test
```

Run typecheck:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

Run the package validation gate when practical:

```bash
pnpm check:shiki-core
```

If the Windows sandbox hits the known `EPERM` `node_modules` issue, rerun the same focused and package checks outside
the sandbox.

## Traceability Update

Update:

```txt
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Mark Cycle 6 as `[DONE]` only after:

- focused service tests pass;
- full package tests pass;
- package typecheck passes;
- `pnpm check:shiki-core` passes when practical;
- source review confirms the map is service-local, not module-global.

Record that Cycle 6 adds per-service in-flight language load deduplication and keeps `ensureLanguageLoaded` intact for
now.

## Acceptance Criteria

- Concurrent calls for `language: "ts"` share one `highlighter.loadLanguage("typescript")` operation.
- Concurrent calls for `"ts"` and `"typescript"` share one canonical in-flight load.
- Failed in-flight loads are removed and later calls can retry.
- Deduplication is scoped per service instance.
- Already-loaded languages still skip `loadLanguage`.
- Plain-text aliases still skip `loadLanguage`.
- Unknown languages still render fallback HTML without calling `loadLanguage`.
- Failed loads still render fallback HTML and warn.
- Existing retry behavior is preserved.
- `ensureLanguageLoaded` remains intact.
- No public API, package root export, dependency, changelog, or README change is required.
- Focused service tests, package tests, and typecheck pass.

## Result

Implemented on May 27, 2026.

Cycle 6 added per-service in-flight language load deduplication in `packages/shiki-core/src/highlighter/service.ts`.
The service now resolves caller input once, keys active loads by canonical `BundledLanguage`, reuses the active
`Promise<LanguageLoadResult>` for concurrent calls, and removes entries in `finally` so failed loads do not poison later
attempts.

Coverage added in `packages/shiki-core/tests/highlighter-service.test.ts`:

- concurrent calls for `ts` share one `loadLanguage("typescript")`;
- concurrent `ts` and `typescript` calls share one canonical load;
- a failed load is removed so a later call retries;
- separate service instances do not share in-flight maps.

`ensureLanguageLoaded` remains intact. Public API, root exports, dependencies, fallback HTML, warning semantics, and
plain-text aliases were not changed.

## Verification Notes

- Sandboxed `pnpm --filter @ravenhill/shiki-core test -- highlighter-service.test.ts` failed before test execution with
  the recurring Windows `EPERM` while reading `node_modules/.pnpm/fdir.../dist/types.js`.
- The same test command passed outside the sandbox and ran the full package Vitest suite: 9 files and 209 tests passed.
- `pnpm --filter @ravenhill/shiki-core typecheck` passes in normal execution. The earlier confusion came from silent
  `tsc --noEmit` output and Codex sandbox `EPERM` failures under `node_modules/.pnpm`.

## Follow-up: Typecheck Diagnostics

Use the diagnostic command when `pnpm --filter @ravenhill/shiki-core typecheck` appears silent:

```bash
pnpm --filter @ravenhill/shiki-core typecheck:diagnostics
```

Equivalent direct package diagnostic:

```bash
pnpm --dir packages/shiki-core exec tsc --noEmit --pretty false --extendedDiagnostics
```

If a Codex sandbox run fails with `EPERM` under `node_modules/.pnpm`, treat it as an execution-environment permission
limit and rerun outside the sandbox before diagnosing a source-level TypeScript failure.
