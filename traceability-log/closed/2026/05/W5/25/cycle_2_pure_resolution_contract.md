# [DONE] Cycle 2: Pure Resolution Contract

## Summary

Extract a pure `resolveLoadableLanguage` contract inside `packages/shiki-core/src/highlighter/language-loader.ts` so
language classification can be tested independently from highlighter state, loaded-language checks, and `loadLanguage`
side effects.

This cycle should preserve runtime behavior while making the decision model explicit:

```txt
raw language input
-> plain-text normalization
-> Shiki alias resolution
-> unknown-language or loadable canonical language
```

Cycle 2 must not change `LanguageLoadResult`, `service.ts`, fallback rendering, or concurrency behavior. Result-shape
changes belong to Cycle 3.

## Goals

- Extract the language-classification decision from `ensureLanguageLoaded`.
- Make plain-text, unknown-language, and loadable-language cases directly testable.
- Preserve the current `ensureLanguageLoaded` observable behavior.
- Preserve the existing `plaintext` compatibility behavior.
- Keep canonical Shiki alias resolution unchanged.
- Avoid adding modules, dependencies, or public root exports.

## Non-goals

- Do not change `LanguageLoadResult`.
- Do not make `{ kind: "loaded" }` carry `language` yet.
- Do not make `{ kind: "load-failed" }` carry canonical language yet.
- Do not change `service.ts`.
- Do not add in-flight language-load deduplication.
- Do not rework fallback rendering.
- Do not add PBT or new test dependencies.

## Key Changes

### 1. Add an internal resolution result type

Add `ResolvedLanguageLoadRequest` in `packages/shiki-core/src/highlighter/language-loader.ts`.

```ts
export type ResolvedLanguageLoadRequest =
    | { kind: "plain-text" }
    | { kind: "unknown-language"; language: string }
    | { kind: "loadable"; language: BundledLanguage };
```

This type is exported from the internal module for focused tests only. It should not be re-exported from `src/index.ts`.

### 2. Add `resolveLoadableLanguage`

Add:

```ts
export function resolveLoadableLanguage(
    language: string,
): ResolvedLanguageLoadRequest {
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

Rules:

- Use trimmed input for plain-text detection.
- Use trimmed input for Shiki alias resolution.
- Preserve the original caller input for `unknown-language`.
- Return canonical bundled language only in the `loadable` branch.
- Keep `plaintext` as a project compatibility alias.
- Keep `text`, `txt`, and `plain` as the upstream Shiki plain-text aliases.

### 3. Refactor `ensureLanguageLoaded` through the pure resolver

Change `ensureLanguageLoaded` to call `resolveLoadableLanguage` first.

Intended branch order:

```txt
resolveLoadableLanguage(language)
-> return plain-text directly
-> return unknown-language directly
-> check whether canonical loadable language is already loaded
-> call loadLanguage(canonicalLanguage)
-> return legacy loaded/load-failed result shape
```

Important compatibility constraint:

```ts
// Keep this shape for Cycle 2.
return { kind: "loaded" };

// Keep this shape for Cycle 2.
return { kind: "load-failed", language, error };
```

Even though `loadLanguage` should receive the canonical bundled language, failed load results should still preserve the
old `LanguageLoadResult` shape until Cycle 3.

## Implementation Notes

### Preferred local structure

Keep the helper order readable:

```ts
const plainTextLanguages = new Set(["text", "txt", "plain", "plaintext"]);

const isPlainTextLanguage = (language: string): boolean =>
    plainTextLanguages.has(language.trim().toLowerCase());

export type ResolvedLanguageLoadRequest = /* ... */;

export function resolveLoadableLanguage(
    language: string,
): ResolvedLanguageLoadRequest {
    // ...
}

export async function ensureLanguageLoaded(/* ... */): Promise<LanguageLoadResult> {
    // ...
}
```

Do not move this into `src/languages/resolution.ts` in this cycle. The new contract is not general alias resolution; it
is specifically the loader’s decision model.

## TDD Steps

### Step 1 — Red: pure resolver cases

Extend `packages/shiki-core/tests/highlighter-language-loader.test.ts` with:

```ts
describe("resolveLoadableLanguage", () => {
    test.each([
        ["ts", "typescript"],
        ["py", "python"],
        [" ts ", "typescript"],
    ])("resolves %s to canonical %s", (input, expected) => {
        expect(resolveLoadableLanguage(input)).toEqual({
            kind: "loadable",
            language: expected,
        });
    });

    test.each([
        "text",
        "txt",
        "plain",
        "plaintext",
        "Text",
        "TXT",
        "Plain",
        "PlainText",
        " text ",
        "\ttxt\n",
        " plain ",
        "\r\nplaintext\t",
    ])("classifies %s as plain text", (input) => {
        expect(resolveLoadableLanguage(input)).toEqual({
            kind: "plain-text",
        });
    });

    test.each([
        "khonshu-script",
        " midnight-mission ",
    ])("preserves original unknown input %s", (input) => {
        expect(resolveLoadableLanguage(input)).toEqual({
            kind: "unknown-language",
            language: input,
        });
    });
});
```

Use fake language names from _Vengeance of the Moon Knight_ references, but avoid reusing the same fake identifier
across nearby tests.

### Step 2 — Green: implement the pure resolver

Implement `ResolvedLanguageLoadRequest` and `resolveLoadableLanguage`.

Keep the implementation small and branch-oriented. No service changes should be needed.

### Step 3 — Red/Green: route `ensureLanguageLoaded` through the resolver

Update or add `ensureLanguageLoaded` tests proving:

- `ts` still calls `loadLanguage("typescript")`;
- already-loaded canonical languages still skip loading;
- plain-text input still returns `{ kind: "plain-text" }`;
- unknown input still returns `{ kind: "unknown-language"; language: original }`;
- failed load still returns the Cycle 1/Cycle 2 legacy shape.

Suggested compatibility test:

```ts
test("loads aliases through their canonical bundled language", async () => {
    const loadLanguage = vi.fn().mockResolvedValue(undefined);

    const result = await ensureLanguageLoaded(
        fakeHighlighter([]),
        "ts",
        loadLanguage,
    );

    expect(result).toEqual({ kind: "loaded" });
    expect(loadLanguage).toHaveBeenCalledExactlyOnceWith("typescript");
});
```

Suggested failed-load compatibility test:

```ts
test("keeps failed load results on the legacy caller-input shape", async () => {
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
        language: "ts",
        error,
    });
});
```

This makes the Cycle 3 migration explicit rather than accidental.

### Step 4 — Refactor

After tests pass:

- remove duplicated trim/lowercase logic from `ensureLanguageLoaded`;
- keep `isPlainTextLanguage` private unless direct testing is already required;
- keep `resolveLoadableLanguage` exported only from the internal module;
- verify no root API exports changed.

## Test Plan

### Unit tests

Update:

```txt
packages/shiki-core/tests/highlighter-language-loader.test.ts
```

Add coverage for:

- pure resolution of regular aliases;
- pure resolution of direct bundled languages, if existing tests already cover direct Shiki language names;
- plain-text aliases;
- compatibility alias `plaintext`;
- whitespace-tolerant resolution;
- original input preservation for unknown languages;
- legacy `ensureLanguageLoaded` result shapes.

### DDT

Use `test.each` for finite alias sets. This is clearer than PBT because the accepted plain-text identifiers are
deliberately small and closed.

### PBT

Do not add PBT in this cycle. Reconsider it only if language aliases become configurable or if normalization expands
beyond trim/case handling.

## Traceability Docs

When implementing:

1. Create or update the Cycle 2 traceability note.
2. Mark it `[PLAN]` before implementation or `[DONE]` after completion, following the Cycle 1 style.
3. Record explicitly that Cycle 2 introduces `resolveLoadableLanguage` but intentionally leaves `LanguageLoadResult`
   unchanged.
4. In `refactor_shiki_language_loading_lifecycle.md`, mark Cycle 2 done only after tests, implementation, and typecheck
   pass.

## Relevant Files

```txt
packages/shiki-core/src/highlighter/language-loader.ts
packages/shiki-core/src/highlighter/types.ts          # only if type placement requires it
packages/shiki-core/tests/highlighter-language-loader.test.ts
```

Files that should usually remain unchanged in Cycle 2:

```txt
packages/shiki-core/src/highlighter/service.ts
packages/shiki-core/src/languages/resolution.ts
packages/shiki-core/src/index.ts
```

## Verification

Run focused tests first:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader
```

Then typecheck:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

If both pass, run the full package test suite:

```bash
pnpm --filter @ravenhill/shiki-core test
```

## Assumptions

- `plaintext` remains a project compatibility alias.
- `text`, `txt`, and `plain` are upstream Shiki plain-text aliases.
- `resolveLoadableLanguage` may be exported from `language-loader.ts` for tests.
- Internal module exports are acceptable as long as `src/index.ts` does not re-export the helper or type.
- Cycle 3 will change `LanguageLoadResult` so successful and failed load results carry canonical bundled languages.
- Cycle 2 must preserve the existing service behavior exactly.

## Acceptance Criteria

- `resolveLoadableLanguage("ts")` returns loadable `typescript`.
- `resolveLoadableLanguage("py")` returns loadable `python`.
- Whitespace is trimmed before alias resolution.
- `text`, `txt`, `plain`, and `plaintext` return `plain-text`.
- Plain-text matching is case-insensitive and whitespace-tolerant.
- Unknown languages preserve the exact original caller input.
- `ensureLanguageLoaded` delegates its first decision to `resolveLoadableLanguage`.
- `ensureLanguageLoaded("ts", ...)` still calls `loadLanguage("typescript")`.
- `LanguageLoadResult` remains unchanged.
- `service.ts` remains unchanged.
- No package root export is added.
- No dependency is added.
- Focused tests, typecheck, and package tests pass.

## Implementation Notes

- Added `ResolvedLanguageLoadRequest` and `resolveLoadableLanguage` in
  `packages/shiki-core/src/highlighter/language-loader.ts`.
- Routed `ensureLanguageLoaded` through the pure resolver while preserving the Cycle 1/Cycle 2
  `LanguageLoadResult` shape.
- Added focused resolver and loader tests in `packages/shiki-core/tests/highlighter-language-loader.test.ts`.
- Added `ts -> typescript` to the central language alias map because the Cycle 2 contract requires canonical
  TypeScript resolution.
- Updated language-resolution tests to pin the new `ts` alias.
- Left `service.ts`, `src/index.ts`, and `LanguageLoadResult` unchanged.

## Verification Results

- `pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader`
  - Passed. The package script forwarded the argument in a way that ran the full shiki-core Vitest suite:
    9 files and 201 tests passed.
- `pnpm --filter @ravenhill/shiki-core typecheck`
  - Passed.
