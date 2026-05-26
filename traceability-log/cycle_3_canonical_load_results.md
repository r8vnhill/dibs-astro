# [DONE] Cycle 3 — Canonical Load Results

## Summary

Update `LanguageLoadResult` so successful and failed language-load branches carry the canonical `BundledLanguage` resolved by `resolveLoadableLanguage`.

Cycles 1 and 2 introduced plain-text normalization and the pure `ResolvedLanguageLoadRequest` contract. Cycle 3 should now make the loader result precise enough for later service integration: once a language is known to be loadable, downstream code should not need to re-resolve aliases such as `ts` or `py`.

This cycle changes the loader result shape only. It must not introduce service-level deduplication, fallback-rendering changes, or highlighter lifecycle refactors.

### Goals

* Return canonical bundled language from `loaded`.
* Return canonical bundled language from `load-failed`.
* Keep `plain-text` and `unknown-language` unchanged.
* Keep `ensureLanguageLoaded` as the only implementation entry point changed in this cycle.
* Preserve current service behavior until Cycle 5.
* Update tests to lock the new canonical result contract.

### Non-goals

* Do not modify concurrency behavior.
* Do not add the in-flight load map.
* Do not remove language re-resolution from `service.ts` yet.
* Do not change fallback rendering.
* Do not change `resolveLoadableLanguage`.
* Do not add new public root exports.
* Do not add dependencies.

### Files to Modify

| File                                                            | Required Change                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/shiki-core/src/highlighter/types.ts`                  | Add `BundledLanguage` to `loaded` and `load-failed` result variants.      |
| `packages/shiki-core/src/highlighter/language-loader.ts`        | Return `request.language` in loaded and failed branches.                  |
| `packages/shiki-core/tests/highlighter-language-loader.test.ts` | Update loader expectations and add/rename tests around canonical results. |
| `traceability-log/refactor_shiki_language_loading_lifecycle.md` | Mark Cycle 3 done only after tests and typecheck pass.                    |

Usually unchanged:

| File                                              | Expected Status                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/shiki-core/src/highlighter/service.ts`  | No behavioral refactor in this cycle. Only allow minimal type fallout fixes if required by TypeScript. |
| `packages/shiki-core/src/languages/resolution.ts` | No change.                                                                                             |
| `packages/shiki-core/src/index.ts`                | No change.                                                                                             |

### Phase 1 — Red: Update Tests First

Update the existing loader tests so they expect canonical language information.

#### 1. Alias load success

Rename or keep the test as:

```ts
it("loads aliases through their canonical bundled language", async () => {
    const loadLanguage = vi.fn().mockResolvedValue(undefined);

    const result = await ensureLanguageLoaded(
        fakeHighlighter([]),
        "ts",
        loadLanguage,
    );

    expect(result).toEqual({
        kind: "loaded",
        language: "typescript",
    });
    expect(loadLanguage).toHaveBeenCalledExactlyOnceWith("typescript");
});
```

#### 2. Already-loaded canonical language

Use alias input to prove the returned language is canonical even when loading is skipped:

```ts
it("returns canonical language when an alias is already loaded", async () => {
    const loadLanguage = vi.fn();

    const result = await ensureLanguageLoaded(
        fakeHighlighter(["typescript"]),
        "ts",
        loadLanguage,
    );

    expect(result).toEqual({
        kind: "loaded",
        language: "typescript",
    });
    expect(loadLanguage).not.toHaveBeenCalled();
});
```

#### 3. Failed load result

Rename:

```txt
keeps failed load results on the legacy caller-input shape
```

to:

```txt
returns canonical language even on failed load
```

Then update the expectation:

```ts
it("returns canonical language even on failed load", async () => {
    const error = new Error("Shadow Cabinet load failed");

    const result = await ensureLanguageLoaded(
        fakeHighlighter([]),
        "ts",
        async () => {
            throw error;
        },
    );

    expect(result).toEqual({
        kind: "load-failed",
        language: "typescript",
        error,
    });
});
```

#### 4. Preserve unchanged branches

Keep or add explicit guard tests for:

```ts
expect(await ensureLanguageLoaded(fakeHighlighter([]), "text", loadLanguage))
    .toEqual({ kind: "plain-text" });

expect(await ensureLanguageLoaded(fakeHighlighter([]), "khonshu-script", loadLanguage))
    .toEqual({ kind: "unknown-language", language: "khonshu-script" });
```

The plain-text branch should still carry no language. The unknown branch should still preserve the caller input.

### Expected Red State

After Phase 1, the focused loader suite should fail only where the result shape still lacks canonical language data.

Expected failures:

* loaded alias result still returns `{ kind: "loaded" }`;
* already-loaded result still returns `{ kind: "loaded" }`;
* failed load still returns raw caller input such as `"ts"`.

Unexpected failures to investigate before implementation:

* plain-text tests failing;
* unknown-language tests failing;
* resolver tests failing;
* service tests failing before type changes are made.

### Phase 2 — Green: Update `LanguageLoadResult`

In `packages/shiki-core/src/highlighter/types.ts`, add the type import:

```ts
import type { BundledLanguage } from "shiki";
```

Update the result union:

```ts
export type LanguageLoadResult =
    | { readonly kind: "plain-text" }
    | { readonly kind: "unknown-language"; readonly language: string }
    | { readonly kind: "loaded"; readonly language: BundledLanguage }
    | {
          readonly kind: "load-failed";
          readonly language: BundledLanguage;
          readonly error: unknown;
      };
```

Keep `readonly` consistent with the existing type style.

### Phase 3 — Green: Return Canonical Languages from the Loader

In `packages/shiki-core/src/highlighter/language-loader.ts`, use the canonical language from the `loadable` request.

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
        return {
            kind: "load-failed",
            language: request.language,
            error,
        };
    }
}
```

Important invariant:

```txt
unknown-language.language = original caller input
load-failed.language = canonical BundledLanguage
loaded.language = canonical BundledLanguage
```

### Phase 4 — Compile Fallout Check

Run a repo/package search for old result-shape assumptions:

```bash
rg 'kind: "loaded"|kind: "load-failed"|load-failed|LanguageLoadResult' packages/shiki-core
```

Update only direct expectations or type errors caused by the new union shape.

Allowed in Cycle 3:

* test expectation updates;
* exhaustive switch updates;
* type-only adjustments where code destructures `loadResult.language`.

Not allowed in Cycle 3:

* replacing service re-resolution with `loadResult.language`;
* changing fallback rendering;
* introducing deduplication;
* moving service responsibilities.

### Phase 5 — Refactor

After tests pass:

* remove stale comments that describe failed load language as caller input;
* ensure test names describe the canonical contract;
* keep `service.ts` behavior unchanged;
* avoid helper extraction unless the loader exceeds the preferred size or duplicates logic.

### Traceability Update

Update:

```txt
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Only mark Cycle 3 as `[DONE]` after:

* focused loader tests pass;
* package typecheck passes;
* package test suite passes;
* any required type fallout has been handled.

Record that Cycle 3 changes the `LanguageLoadResult` shape and intentionally leaves service integration for Cycle 5.

### Verification

Run focused tests first:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader
```

Run typecheck:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

Run the full package suite:

```bash
pnpm --filter @ravenhill/shiki-core test
```

Optionally run build if this package is published or consumed by another workspace package:

```bash
pnpm --filter @ravenhill/shiki-core build
```

### Acceptance Criteria

* `ensureLanguageLoaded(..., "ts", ...)` returns `{ kind: "loaded", language: "typescript" }`.
* Already-loaded alias input returns canonical `loaded.language`.
* Failed alias loads return canonical `load-failed.language`.
* Plain-text results remain `{ kind: "plain-text" }`.
* Unknown-language results preserve the original caller input.
* `loadLanguage` is still called with the canonical bundled language.
* `resolveLoadableLanguage` behavior is unchanged.
* `service.ts` has no behavioral refactor.
* No concurrency logic is added.
* No package root export is added.
* Focused loader tests, package typecheck, and full package tests pass.

### Review Notes

The main improvement over the original plan is to avoid saying only “three expectations” must change. That is likely true now, but the safer contract is: update the known three tests, then search for all `LanguageLoadResult` consumers and fix only direct result-shape fallout. This keeps the cycle TDD-focused without making it brittle.

[1]: https://shiki.matsu.io/guide/install?utm_source=chatgpt.com "Installation & Usage - Shiki"
