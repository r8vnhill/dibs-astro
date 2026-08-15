# [PLAN] Fallback HTML Renderer Refactor

## Scope Classification

This is a **small-scope refactor**, so it should be organized as short **red-green-refactor cycles** rather than phases
or milestones.

The work affects `astro-website/packages/shiki-core/src/fallback/html.ts` and its focused test suite. It should remain
host-agnostic, avoid new runtime dependencies, and preserve public exports.

## Intentional Output Changes

This plan includes two intentional HTML-output changes:

1. Code text will use HTML text-context escaping instead of attribute-context escaping.
   - Escape `&`, `<`, and `>`.
   - Leave quotes and apostrophes unchanged inside code text.
2. Empty `class=""` will be omitted from `<code>` when no code classes are provided.

All other behavior should remain compatible.

---

# Cycle 1 — Characterize Existing Fallback Rendering [DONE]

## Status

Implemented.

Cycle 1 rewrote the focused fallback renderer tests to use package BDD conventions and characterize the current output
contract before production changes. Production code was intentionally left unchanged.

## Goal

Lock the current public behavior before changing the renderer internals.

## Scope

Add or adjust focused tests for:

- fallback wrapper shape;
- escaped code content;
- `shiki` class on `<pre>`;
- class arguments on `<pre>` and `<code>`;
- `buildPlainHtml` delegating to `renderFallbackCodeHtml`.

## Red

Add BDD-style tests using package conventions: `suite`, optional `describe`, and `test`.

Suggested test descriptions:

```ts
suite("fallback HTML rendering", () => {
    test("renders escaped code inside a Shiki-compatible fallback wrapper", () => {
        // ...
    });

    test("preserves the shiki class on the pre element", () => {
        // ...
    });

    test("renders provided pre and code classes", () => {
        // ...
    });

    test("keeps buildPlainHtml compatible with renderFallbackCodeHtml", () => {
        // ...
    });
});
```

Use fake values such as `Shi-Woon`, `Chun-Woo`, or `Seoul Alliance` where example code needs identifiers.

## Green

Make only the minimal test adjustments needed to reflect the current implementation.

## Refactor

Remove duplicate setup in the tests, but do not change production code yet.

## Acceptance Criteria

- Existing behavior is covered by focused tests.
- Tests follow the package style: `suite`, `describe`, and `test`; no `it`.
- No production behavior changes are introduced in this cycle.

## Non-Goals

- Do not split escaping helpers yet.
- Do not normalize class tokens yet.
- Do not change empty `class=""` output yet.

---

# Cycle 2 — Split HTML Text and Attribute Escaping [DONE]

## Status

Implemented.

Cycle 2 added explicit text-context and attribute-context escaping helpers. Fallback code text now escapes only `&`,
`<`, and `>`, while class attributes continue to escape quotes and apostrophes. The legacy `escapeCodeHtml` export
remains available as the compatibility alias for attribute-context escaping.

## Goal

Make escaping context-specific and explicit.

## Scope

Add:

- `escapeHtmlText(value: string): string`
- `escapeHtmlAttribute(value: string): string`

Keep:

- `escapeCodeHtml(value: string): string`

For compatibility, `escapeCodeHtml` should remain available. Because the old behavior escaped quotes and apostrophes,
the safest compatibility path is:

```ts
export const escapeCodeHtml = escapeHtmlAttribute;
```

or an equivalent wrapper.

## Red

Add DDT coverage for text-context escaping:

```ts
test.each([
    ["ampersand", "Kaiser & Alliance", "Kaiser &amp; Alliance"],
    ["less-than", "level < master", "level &lt; master"],
    ["greater-than", "master > disciple", "master &gt; disciple"],
    ["quote", "\"Black Origin\"", "\"Black Origin\""],
    ["apostrophe", "Goomoonryong's technique", "Goomoonryong's technique"],
])("escapes code text in HTML text context: %s", (_, input, expected) => {
    // ...
});
```

Add DDT coverage for attribute-context escaping:

```ts
test.each([
    ["quote", `theme-"dark"`, "theme-&quot;dark&quot;"],
    ["apostrophe", `lang-'ts'`, "lang-&#39;ts&#39;"],
    ["ampersand", "a&b", "a&amp;b"],
    ["less-than", "a<b", "a&lt;b"],
    ["greater-than", "a>b", "a&gt;b"],
])("escapes class attributes in HTML attribute context: %s", (_, input, expected) => {
    // ...
});
```

## Green

Implement the two helpers and update `renderFallbackCodeHtml` to use text-context escaping for code content.

## Refactor

Keep each helper small and direct. Avoid clever generic encoders unless more HTML contexts are needed later.

## Acceptance Criteria

- Code text escapes `&`, `<`, and `>`.
- Code text does not escape `"` or `'`.
- Attribute values escape `&`, `<`, `>`, `"`, and `'`.
- `escapeCodeHtml` remains exported and keeps old escaping behavior.
- No new dependency is introduced.

## Non-Goals

- Do not introduce DOM serialization.
- Do not add a general-purpose HTML builder.
- Do not change class normalization yet.

---

# Cycle 3 — Normalize Class Tokens Defensively [DONE]

## Status

Implemented.

Cycle 3 added local fallback class-token normalization for `<pre>` and `<code>` class arrays. Fallback rendering now
accepts readonly class arrays, trims and splits whitespace-heavy inputs, drops empty tokens, escapes each token for
attribute context, joins tokens with single spaces, and still prepends `shiki` to `<pre>` classes.

## Goal

Make class rendering safe and predictable when callers pass whitespace-heavy or multi-token class strings.

## Scope

Add a small internal helper, preferably local to `fallback/html.ts` unless another existing neutral utility is a better
dependency target.

The helper should:

- accept `readonly string[]`;
- trim values;
- split on whitespace;
- drop empty tokens;
- escape each token for attribute context;
- join normalized tokens with a single space.

Prefer a local helper over importing from `transformers/class-tokens.ts` if that import would couple fallback rendering
to transformer-specific code.

## Red

Add DDT coverage:

```ts
test.each([
    {
        name: "single token",
        input: ["rounded"],
        expected: "rounded",
    },
    {
        name: "multiple tokens in one string",
        input: ["rounded shadow"],
        expected: "rounded shadow",
    },
    {
        name: "extra whitespace",
        input: ["  rounded   shadow  "],
        expected: "rounded shadow",
    },
    {
        name: "empty tokens",
        input: ["", "   ", "bordered"],
        expected: "bordered",
    },
    {
        name: "attribute-sensitive token",
        input: [`theme-"dark"`],
        expected: "theme-&quot;dark&quot;",
    },
])("normalizes fallback class tokens: $name", ({ input, expected }) => {
    // ...
});
```

## Green

Use the helper for both `preClasses` and `codeClasses`.

Always prepend `shiki` to the normalized `<pre>` classes.

## Refactor

Extract a tiny `renderAttribute(name, value)` helper only if it simplifies Cycle 4. Otherwise keep the renderer
straightforward.

## Acceptance Criteria

- `preClasses` and `codeClasses` accept `readonly string[]`.
- Each class array item may contain one or more whitespace-separated tokens.
- Empty tokens are removed.
- Attribute-sensitive characters are escaped.
- `<pre>` always includes `shiki`.
- No transformer-specific dependency is introduced unless the target utility is already neutral and stable.

## Non-Goals

- Do not support object-style class maps.
- Do not add `clsx`; the current needs are smaller than that dependency.
- Do not validate CSS identifier syntax beyond whitespace tokenization and escaping.

---

# Cycle 4 — Omit Empty `class=""` on `<code>` [DONE]

## Status

Implemented.

Cycle 4 updated fallback rendering so empty normalized code classes produce `<code>` instead of `<code class="">`, while
non-empty code classes still render as a `class` attribute. Package documentation now records that `<pre>` always keeps
its `shiki` class and `<code>` only receives a class attribute when caller-provided code classes remain after
normalization.

## Goal

Clean up fallback HTML output when no code classes are present.

## Scope

Change only the `<code>` attribute rendering contract:

- render `<code>` when normalized code classes are empty;
- render `<code class="...">` when normalized code classes exist.

Keep `<pre class="shiki ...">` unchanged.

## Red

Add tests:

```ts
test("omits the code class attribute when no code classes are provided", () => {
    // expect: <code>
    // reject: <code class="">
});

test("renders the code class attribute when code classes are provided", () => {
    // expect: <code class="language-ts">
});
```

## Green

Implement conditional attribute rendering.

## Refactor

If useful, introduce:

```ts
function renderAttribute(name: string, value: string): string {
    return value === "" ? "" : ` ${name}="${value}"`;
}
```

Keep the renderer short and readable.

## Acceptance Criteria

- Empty code classes produce `<code>`.
- Non-empty code classes produce `<code class="...">`.
- `<pre>` still always has a class attribute containing `shiki`.
- Snapshot or exact-string tests are updated only where this intentional output change applies.

## Non-Goals

- Do not omit the `<pre>` class attribute.
- Do not change highlighted Shiki output.
- Do not change public root exports.

---

# Cycle 5 — Preserve Compatibility Alias Behavior [DONE]

## Status

Implemented.

Cycle 5 aligned the deprecated `buildPlainHtml` compatibility alias with the canonical `renderFallbackCodeHtml`
signature. The alias now returns `string` explicitly, accepts optional readonly class arrays, uses the same defaults,
and delegates directly to the canonical renderer. Package documentation now records this compatibility behavior.

## Goal

Keep old call sites stable while aligning the alias with the canonical renderer signature.

## Scope

Update `buildPlainHtml` to:

- return `string` explicitly;
- accept `readonly string[]`;
- provide default class arguments;
- delegate directly to `renderFallbackCodeHtml`.

## Red

Add compatibility tests:

```ts
test("buildPlainHtml matches renderFallbackCodeHtml without class arguments", () => {
    // ...
});

test("buildPlainHtml matches renderFallbackCodeHtml with class arguments", () => {
    // ...
});
```

## Green

Update the alias signature and implementation.

## Refactor

Ensure there is only one rendering implementation.

## Acceptance Criteria

- `buildPlainHtml` remains exported.
- `buildPlainHtml` output exactly matches `renderFallbackCodeHtml`.
- No duplicate rendering logic exists.
- TypeScript accepts readonly class arrays.

## Non-Goals

- Do not remove `buildPlainHtml`.
- Do not add a subpath export.
- Do not rename the canonical renderer.

---

# Cycle 6 — Run Focused Validation [DONE]

## Status

Implemented.

Cycle 6 completed the narrow validation pass for the fallback renderer refactor. The focused fallback suite passed
first, then the package-level Shiki validation passed without requiring broader website checks.

Validation evidence:

- `pnpm --dir packages/shiki-core exec vitest run --config vitest.config.ts tests/fallback-html.test.ts`
  - Passed: 1 test file, 31 tests.
- `pnpm check:shiki-core`
  - Passed: build, typecheck, package Vitest suite, `publint --strict`, pack-file check, and external consumer
    validation.

## Goal

Validate the refactor with the narrowest useful checks.

## Scope

Run the fallback suite first, then broader package validation only if needed.

## Suggested Execution Order

1. Run the focused fallback tests.
2. Fix only failures related to `fallback/html.ts` or `fallback-html.test.ts`.
3. Run:

```powershell
pnpm check:shiki-core
```

from `astro-website`.

## Acceptance Criteria

- Focused fallback tests pass. [DONE]
- `pnpm check:shiki-core` passes. [DONE]
- No unrelated package or website checks are broadened unless the package command requires them. [DONE]

## Non-Goals

- Do not run full website validation unless `check:shiki-core` passes but downstream integration still looks suspicious.
- Do not fix unrelated test failures in this refactor.

---

# Optional Later Work — Property-Based Escaping Tests [DONE]

## Status

Implemented.

The fallback renderer suite now includes `fast-check` properties for escaping and class-normalization invariants. The
package declares `fast-check` as a local dev dependency, matching the existing pattern in sibling workspace packages
that import it directly from package-level tests.

Validation evidence:

- `pnpm --dir packages/shiki-core exec vitest run --config vitest.config.ts tests/fallback-html.test.ts`
  - Passed: 1 test file, 35 tests.

## Goal

Add broader confidence around escaping if the package already uses mature PBT tooling.

## Scope

Consider `fast-check` only if it is already present in the workspace or if this renderer becomes a more central public
API.

Potential properties:

- rendered code text never contains raw `<` or `>`;
- raw `&` in input does not survive unescaped in output;
- class attributes never contain raw quotes;
- normalized class output does not contain repeated whitespace.

## Acceptance Criteria

- PBT adds meaningful coverage beyond the DDT matrix. [DONE]
- No new workspace dependency is added solely for this tiny helper; `fast-check` was already present in the workspace,
  and `packages/shiki-core` now declares the local dev dependency needed by its focused tests. [DONE]

## Non-Goals

- Do not add PBT in the first pass if it increases dependency surface or slows the focused suite noticeably.
