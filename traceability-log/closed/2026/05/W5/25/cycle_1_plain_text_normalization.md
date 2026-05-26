# [PLAN] Cycle 1 — Plain-Text Normalization

## Summary

Cycle 1 isolates plain-text language detection inside the Shiki loader boundary without changing canonical language
resolution, service orchestration, result shape, or concurrency behavior.

The cycle should add a small normalization gate before alias resolution so `text`, `txt`, `plain`, and the existing
project-compatible `plaintext` input all return `{ kind: "plain-text" }`. The important compatibility rule is that
`plaintext` remains supported even though the upstream Shiki documented aliases are `text`, `txt`, and `plain`.

### Goals

- Recognize plain-text language identifiers before Shiki alias resolution.
- Preserve existing `plaintext` behavior.
- Keep `resolveShikiLanguage` unchanged.
- Keep `LanguageLoadResult` unchanged for this cycle.
- Prove plain-text inputs do not reach the loading path.
- Keep the helper local to the loader unless another production module needs it.

### Non-goals

- Do not change `LanguageLoadResult`.
- Do not return canonical bundled languages yet.
- Do not modify `service.ts`.
- Do not introduce in-flight load deduplication.
- Do not create a new language lifecycle module.
- Do not add dependencies.

### Steps

1. Add a loader-local helper in `packages/shiki-core/src/highlighter/language-loader.ts`.

   The helper should:
   - trim the incoming language identifier;
   - lowercase it once;
   - recognize `text`, `txt`, `plain`, and `plaintext`;
   - keep the alias set close to the helper for readability.

   Suggested shape:

   ```ts
   const plainTextLanguages = new Set(["text", "txt", "plain", "plaintext"]);

   const isPlainTextLanguage = (language: string): boolean => plainTextLanguages.has(language.trim().toLowerCase());
   ```

2. Refactor `ensureLanguageLoaded` to call `isPlainTextLanguage` before `resolveShikiLanguage`.

   The intended branch order should be:

   ```txt
   plain-text check
   -> canonical alias resolution
   -> unknown-language branch
   -> already-loaded check
   -> load attempt
   -> load-failed branch
   ```

3. Add focused DDT coverage for the plain-text normalization contract.

   Cover:
   - exact documented aliases: `text`, `txt`, `plain`;
   - project compatibility alias: `plaintext`;
   - mixed case, for example `Text`, `TXT`, `Plain`, `PlainText`;
   - surrounding whitespace, for example `text` and `\tplain\n`;
   - unknown input, for example `khonshu-script`, still returning `unknown-language`.

4. Add a loader-path assertion that plain-text inputs do not call `loadLanguage`.

   This should be a direct unit test of `ensureLanguageLoaded`, not only a service smoke test. The test should fail if
   the helper is accidentally moved after alias resolution or after the loaded-language check.

5. Keep canonical alias tests unchanged.

   Existing tests for normal language aliases like `ts`, `js`, or `py` should continue to prove that non-plain-text
   identifiers still flow through `resolveShikiLanguage`.

6. Run only the focused checks needed for this cycle first, then broader package checks.

### Suggested Tests

#### Plain-text aliases return `plain-text`

```ts
describe("ensureLanguageLoaded plain-text normalization", () => {
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
    ])("treats %s as plain text", async (language) => {
        const loadLanguage = vi.fn();

        const result = await ensureLanguageLoaded(
            fakeHighlighter([]),
            language,
            loadLanguage,
        );

        expect(result).toEqual({ kind: "plain-text" });
        expect(loadLanguage).not.toHaveBeenCalled();
    });
});
```

#### Unknown languages still use the existing branch

```ts
it("returns unknown-language for unresolved non-plain-text input", async () => {
    const loadLanguage = vi.fn();

    const result = await ensureLanguageLoaded(
        fakeHighlighter([]),
        "midnight-mission",
        loadLanguage,
    );

    expect(result).toEqual({
        kind: "unknown-language",
        language: "midnight-mission",
    });
    expect(loadLanguage).not.toHaveBeenCalled();
});
```

#### Normal aliases remain unchanged

```ts
it("keeps resolving regular Shiki aliases through the existing resolver", async () => {
    const loadLanguage = vi.fn().mockResolvedValue(undefined);

    const result = await ensureLanguageLoaded(
        fakeHighlighter([]),
        "ts",
        loadLanguage,
    );

    expect(result).toEqual({ kind: "loaded" });
    expect(loadLanguage).toHaveBeenCalledWith("typescript");
});
```

### Relevant Files

- `packages/shiki-core/src/highlighter/language-loader.ts`
  - Add `isPlainTextLanguage`.
  - Add the early plain-text branch in `ensureLanguageLoaded`.

- `packages/shiki-core/src/languages/resolution.ts`
  - Leave unchanged in this cycle.
  - Do not move `plaintext` behavior here unless it already lives there.

- `packages/shiki-core/tests/highlighter-language-loader.test.ts`
  - Preferred location for the new DDT tests and load-path assertions.

- `packages/shiki-core/tests/language-resolution.test.ts`
  - Only update if existing tests currently pin `plaintext` behavior at the resolver level.

- `packages/shiki-core/tests/highlighter-service.test.ts`
  - Avoid changes unless there is already a public-path regression test for plain-text rendering.

### Verification

Run the focused loader tests first:

```bash
pnpm --filter @ravenhill/shiki-core test -- highlighter-language-loader
```

Then run the package typecheck:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
```

If the package has fast tests, finish with the full package suite:

```bash
pnpm --filter @ravenhill/shiki-core test
```

### Decisions

- Treat `text`, `txt`, and `plain` as upstream Shiki plain-text aliases.
- Treat `plaintext` as a project compatibility alias.
- Keep the helper loader-local because this cycle only changes the loader boundary.
- Do not export the helper unless the current test setup cannot reasonably test it through `ensureLanguageLoaded`.
- Prefer DDT over PBT because the accepted alias set is finite and intentionally small.

### Acceptance Criteria

- `text`, `txt`, `plain`, and `plaintext` return `{ kind: "plain-text" }`.
- Plain-text matching is case-insensitive.
- Plain-text matching tolerates surrounding whitespace.
- Plain-text inputs do not call `loadLanguage`.
- Unknown non-plain-text input still returns `unknown-language`.
- Regular aliases still flow through existing canonical resolution.
- `LanguageLoadResult` remains unchanged.
- `service.ts` remains unchanged.
- No new module or dependency is introduced.

## Implementation Notes

- Completed the loader-local plain-text gate in `packages/shiki-core/src/highlighter/language-loader.ts`.
- Added focused loader tests for `text`, `txt`, `plain`, `plaintext`, mixed case, whitespace, and unresolved input.
- Updated the package README to mention plain-text normalization and the existing `plaintext` compatibility alias.
