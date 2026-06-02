# [DONE] Cycle 5 — Service Integration Without Deduplication

## Summary

Update `packages/shiki-core` so `createShikiHighlighterService().highlightToHtml()` uses the canonical language returned
by `ensureLanguageLoaded()` instead of resolving the caller-provided language again inside `service.ts`.

Cycles 1-4 already established:

- plain-text normalization;
- `resolveLoadableLanguage`;
- canonical `LanguageLoadResult` branches;
- a narrowed loader boundary.

Cycle 5 should connect that result contract to the service rendering path. It must not add in-flight load deduplication.
That remains Cycle 6.

## Result

Implemented on May 27, 2026.

- `service.ts` no longer imports or calls `resolveShikiLanguage`.
- Successful loads render with the canonical `loadResult.language`.
- `text`, `txt`, `plain`, and `plaintext` all route through the loader result and render with Shiki `lang: "text"`.
- Unknown and failed languages still render with the existing fallback HTML.
- Retry wrapping around `highlighter.loadLanguage()` remains unchanged.
- No in-flight deduplication map was added; that remains Cycle 6.
- Service tests now follow `suite` / `describe` / `test` and use `test.each(...)` for plain-text aliases.

## Goals

- Remove duplicated language resolution from `service.ts`.
- Render successful loads with `loadResult.language`.
- Route all plain-text aliases through `ensureLanguageLoaded`.
- Preserve existing fallback behavior for unknown and failed languages.
- Preserve existing retry behavior around `highlighter.loadLanguage()`.
- Keep the public `createShikiHighlighterService` API unchanged.
- Keep this cycle focused on service integration only.

## Non-goals

- Do not add service-level in-flight load deduplication.
- Do not introduce a `Map<BundledLanguage, Promise<LanguageLoadResult>>`.
- Do not change `LanguageLoadResult`.
- Do not change `resolveLoadableLanguage`.
- Do not change plain-text alias definitions.
- Do not change the fallback HTML format.
- Do not change warning semantics except for unavoidable wording cleanup.
- Do not add public root exports.
- Do not add dependencies.

## Key Changes

### 1. Add service tests before implementation

Update:

```txt
packages/shiki-core/tests/highlighter-service.test.ts
```

Add tests proving that the service consumes the canonical loader result.

Required coverage:

- alias input such as `ts` renders through canonical `typescript`;
- `text`, `txt`, `plain`, and `plaintext` route through the plain-text path;
- plain-text aliases do not call `highlighter.loadLanguage`;
- unknown languages still render fallback HTML;
- failed loads still render fallback HTML and warn;
- the successful loaded path does not need `resolveShikiLanguage(language)` in `service.ts`.

Prefer behavior tests over implementation-only assertions. The import removal will be enforced by type/lint checks and
source review.

Use the repository Vitest style: `suite` for Given, optional `describe` for When, and `test` for Then. Do not use `it`;
use `test.each(...)` for data-driven cases.

### 2. Remove duplicate alias resolution from `service.ts`

Update:

```txt
packages/shiki-core/src/highlighter/service.ts
```

Remove the `resolveShikiLanguage` import from the service.

The service should use:

```ts
const loadResult = await ensureLanguageLoaded(
    highlighter,
    language,
    loadLanguageWithRetry,
);
```

Then render successful loads with:

```ts
loadResult.language;
```

instead of resolving `language` again.

### 3. Centralize render-language selection if useful

Add a small private helper only if it reduces branching inside `highlightToHtml`.

Suggested shape:

```ts
function getRenderableLanguage(
    loadResult: LanguageLoadResult,
): BundledLanguage | "text" | null {
    switch (loadResult.kind) {
        case "loaded":
            return loadResult.language;

        case "plain-text":
            return "text";

        case "unknown-language":
        case "load-failed":
            return null;
    }
}
```

Interpretation:

- `loaded` means render with canonical Shiki bundled language;
- `plain-text` means render using Shiki `lang: "text"` if that matches current service behavior;
- `null` means use the existing fallback HTML path.

Only keep this helper if it keeps `highlightToHtml` shorter and clearer.

### 4. Preserve fallback behavior

For `unknown-language` and `load-failed`, keep the existing fallback behavior:

```ts
buildPlainHtml(code, [], []);
```

or whatever the current fallback path already uses.

Do not change fallback HTML structure in this cycle. Tests should avoid brittle full-string snapshots unless the package
already relies on them.

### 5. Preserve warning behavior

For failed loads:

- keep warning behavior;
- keep the warning useful for diagnostics;
- avoid making tests depend on exact wording unless existing tests already do.

Prefer assertions like:

```ts
expect(warn).toHaveBeenCalledOnce();
expect(warn).toHaveBeenCalledWith(expect.stringContaining("typescript"));
```

or equivalent, depending on the current logger shape.

## TDD Phases

### Phase 1 — Red: service tests for canonical rendering

Add a test where the caller requests an alias such as `ts`.

The test should prove:

- `loadLanguage` is called with `typescript`;
- rendering uses `typescript`;
- the result is successful HTML, not fallback HTML.

Example intent:

```ts
suite("given a Shiki highlighter service", () => {
    describe("when rendering a language alias", () => {
        test("then it renders with the canonical loaded language", async () => {
            // Arrange
            const highlighter = fakeHighlighter({
                loadedLanguages: [],
                codeToHtml: vi.fn().mockReturnValue("<pre>highlighted</pre>"),
                loadLanguage: vi.fn().mockResolvedValue(undefined),
            });

            const service = createShikiHighlighterService({ highlighter });

            // Act
            const html = await service.highlightToHtml({
                code: "const moon = 'Khonshu';",
                language: "ts",
            });

            // Assert
            expect(highlighter.loadLanguage).toHaveBeenCalledWith("typescript");
            expect(highlighter.codeToHtml).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ lang: "typescript" }),
            );
            expect(html).toContain("highlighted");
        });
    });
});
```

Adapt the helper names and service options to the actual test setup.

### Phase 2 — Red: plain-text aliases through the loader path

Add DDT cases for:

```txt
text
txt
plain
plaintext
```

Each case should prove:

- `loadLanguage` is not called;
- the render language is `text`, if current service behavior renders plain text through Shiki;
- fallback behavior remains unchanged if current service behavior bypasses Shiki for plain text.

The important regression guard is that `txt`, `plain`, and `plaintext` now behave like `text` at the service boundary.

### Phase 3 — Red: fallback branches remain stable

Add or update tests for:

- unknown language;
- failed canonical language load.

Unknown-language expectations:

- renders fallback HTML;
- does not call `loadLanguage`;
- preserves useful diagnostics if the service exposes warnings.

Failed-load expectations:

- calls `loadLanguage` with canonical language;
- renders fallback HTML;
- emits a warning;
- does not throw.

### Phase 4 — Green: service consumes `loadResult.language`

Update `service.ts` so successful loads render with the canonical language from the loader result.

Expected implementation flow:

```txt
highlightToHtml(input)
-> ensureLanguageLoaded(highlighter, language, loadLanguageWithRetry)
-> choose render language from LanguageLoadResult
-> render with canonical language or text
-> fallback for unknown/load-failed
```

Remove the service-level `resolveShikiLanguage` import.

### Phase 5 — Refactor: simplify branching

After tests pass:

- extract `getRenderableLanguage` only if it improves readability;
- keep helper private to `service.ts`;
- avoid creating a new module;
- keep retry wrapping around `highlighter.loadLanguage()` unchanged;
- keep public service options unchanged.

## Files to Modify

Expected:

```txt
packages/shiki-core/src/highlighter/service.ts
packages/shiki-core/tests/highlighter-service.test.ts
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Possibly touched only if test helpers are shared:

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

### Accidental Cycle 6 work

Do not add an in-flight promise map in this cycle. If duplicate concurrent loads still happen, that is acceptable until
Cycle 6.

### Fallback HTML drift

Fallback HTML may be used by snapshots or export tests. Keep the exact fallback structure unchanged unless a test proves
the current structure is already wrong.

### Warning brittleness

Prefer partial warning assertions. The contract is that failed loads warn and fallback, not that the wording is
byte-for-byte stable.

### Hidden duplicate resolution

Removing the `resolveShikiLanguage` import from `service.ts` is the clearest structural guard. After implementation,
search for duplicate resolution:

```bash
rg "resolveShikiLanguage" packages/shiki-core/src/highlighter/service.ts
```

The search should return no matches.

### Type-only fallout

If TypeScript reports exhaustiveness issues because `LanguageLoadResult` now carries canonical languages, fix only the
service integration branch. Do not reshape the union again.

## Verification

Run the focused service tests first:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-service
```

Run the focused loader tests to confirm no regression:

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

Run the package validation gate when practical:

```bash
pnpm check:shiki-core
```

## Traceability Update

Update:

```txt
traceability-log/refactor_shiki_language_loading_lifecycle.md
```

Mark Cycle 5 as `[DONE]` only after:

- focused service tests pass;
- focused loader tests pass;
- package typecheck passes;
- full package tests pass;
- `service.ts` no longer imports `resolveShikiLanguage`.

Record that Cycle 5 removes duplicate service-side language resolution and intentionally leaves concurrent load
deduplication for Cycle 6.

## Acceptance Criteria

- Alias input such as `ts` renders with canonical `typescript`.
- `service.ts` no longer imports or calls `resolveShikiLanguage`.
- Successful load rendering uses `loadResult.language`.
- `text`, `txt`, `plain`, and `plaintext` are handled consistently as plain text.
- Plain-text aliases do not call `highlighter.loadLanguage`.
- Unknown languages still render fallback HTML.
- Failed loads still render fallback HTML and warn.
- Retry wrapping around `highlighter.loadLanguage()` remains unchanged.
- No in-flight deduplication is added.
- Public `createShikiHighlighterService` API remains unchanged.
- No package root exports are added or removed.
- No dependency is added.
- Focused tests, typecheck, and package tests pass.
