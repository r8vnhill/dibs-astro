# [DONE] Phase 1 — Characterize Current Head Behavior

## Scope Decision

This is a **small, test-only phase**, so it should be organized directly as short **red-green-refactor cycles**.

The goal is to lock current observable behavior before extracting `Head.astro` and `buildHeadPageMeta` into
`@ravenhill/astro-head`. This phase must not create packages, move files, change imports, introduce compatibility
re-exports, or refactor production code.

## Guiding Constraints

- Keep the phase behavior-preserving.
- Prefer semantic assertions over broad snapshots.
- Add small local test helpers only when they reduce fragile string matching.
- Keep DIBS-specific expectations where they reflect current hardcoded behavior, but label them as current host
  coupling.
- Use non-DIBS fake data for pure helper tests and reusable-behavior characterization.
- Use Kaleido Star-inspired fixtures without repeating references unnecessarily.
- Do not introduce PBT in this phase; the behavior is mostly deterministic metadata rendering and table-driven examples
  are clearer.

## Test File Layout

`Head.render.test.ts` was split after Cycle 5 to keep characterization tests reviewable:

- `Head.render.support.ts` owns shared fixtures, render setup, HTML query helpers, and JSON-LD parsing.
- `Head.common.render.test.ts` covers query helper smoke coverage, current DIBS host coupling, common tags, and font
  links.
- `Head.social.render.test.ts` covers Open Graph, Twitter, locale mapping, and type precedence.
- `Head.article.render.test.ts` covers citation tags, Dublin Core tags, and JSON-LD behavior.

Use this layout for later Phase 1 test additions instead of recreating a monolithic render test file.

## Fixture Strategy

Use two fixture families:

### Current DIBS Coupling Fixtures

Use these only where the current component hardcodes or imports DIBS defaults. These tests intentionally document
coupling that later phases will remove.

### Reusable Non-DIBS Fixtures

Use Kaleido Star-inspired test data to prove the pure metadata helper can work without DIBS-specific defaults.

Example reusable fixture values:

```ts
const kaleidoHost = {
    siteName: "Kaleido Stage",
    defaultTitle: "Kaleido Stage Archives",
    defaultDescription: "Reusable metadata fixtures for stage performance notes.",
    defaultUrl: "https://kaleido-stage.example",
    defaultSocialImage: "/images/sora-naegino-social-card.png",
};
```

Additional varied fake values:

- `title: "Layla Hamilton Training Journal"`
- `description: "Notes about discipline, performance, and trust on stage."`
- `author: "Junichi Sato"`
- `coAuthor: "Reiko Yoshida"`
- `setting: "Cape Mary"`
- `image: "/images/fool-stage-spirit-card.png"`

## Cycle 1 — Add Local HTML Assertion Helpers [DONE]

**Status:** Completed in this cycle. Local Cheerio-based helpers were added to `Head.render.test.ts`, one existing
assertion was converted to use them, and the helper-focused characterization test now passes.

**Validation:**
`node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/meta/__tests__/Head.render.test.ts`
passed. `pnpm test:astro -- src/components/meta/__tests__/Head.render.test.ts` collected unrelated Astro suites in this
workspace and failed on pre-existing generated icon import issues, so the direct Vitest command is the recorded narrow
validation for this cycle.

### Goal

Make `Head.render.test.ts` easier to extend without relying on brittle raw string checks.

### Scope

- Add helper functions inside `src/components/meta/__tests__/Head.render.test.ts` only.
- Keep helpers small and local.
- Support common assertions for:

  - finding meta tags by `name` or `property`
  - finding links by `rel`
  - extracting attributes
  - counting rendered tags
  - extracting and parsing JSON-LD script content, if needed

### Red

Add one pending or failing test that demonstrates the helper need:

- `Head exposes metadata through queryable rendered tags`

The test should render the current component and assert at least one existing tag through the helper.

### Green

Implement the smallest helper set needed for the current cycle.

Suggested helper shape:

```ts
const getMetaContent = (html: string, selector: string): string | undefined => {
    const document = parseHtml(html);
    return document.querySelector(selector)?.getAttribute("content") ?? undefined;
};
```

Use the repository’s existing HTML parser/helper if one already exists.

### Refactor

- Keep helpers below roughly 25 lines each.
- Avoid a generic testing library abstraction.
- Remove duplicated ad hoc string checks only when touched by this phase.

### Acceptance Criteria

- Helpers are local to the test file unless an existing shared test utility already exists.
- At least one current `Head.astro` assertion uses the helper.
- Existing assertions still pass.
- No production code changes.

### Non-goals

- Do not add a shared test utility package.
- Do not rewrite the entire test suite around helpers in this cycle.
- Do not introduce snapshot-based approval tests.

### Suggested Execution Order

1. Add the smallest helper for meta/link lookup.
2. Convert one existing assertion to prove usefulness.
3. Run `Head.render.test.ts`.

---

## Cycle 2 — Characterize Default and Common Head Tags [DONE]

**Status:** Completed in this cycle. Added current DIBS host-coupling characterization tests for omitted page props,
common static head tags, and base Google font links.

**Validation:**
`node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/meta/__tests__/Head.render.test.ts`
passed with 10 tests.

### Goal

Lock the baseline tags that every page currently receives from `Head.astro`.

### Scope

Cover current behavior for:

- default title
- default description
- default URL/canonical URL
- favicon `.ico`
- favicon `.png`
- sitemap link
- generator meta
- viewport meta
- base Google font links

### Red

Add BDD-style tests:

- `Head renders the current default title, description, and canonical URL when page props are omitted`
- `Head renders favicon, sitemap, generator, and viewport tags for every page`
- `Head renders base font links for every page`

Use DIBS-specific expected values where the component currently imports or hardcodes them. Label the test group clearly,
for example:

```ts
describe("current DIBS host coupling", () => {
    // characterization tests
});
```

### Green

No production changes are expected. If a test fails, first verify whether the expected value misstates current behavior.
Correct the test unless the production code is genuinely broken and already contradicted by existing behavior.

### Refactor

- Consolidate duplicate render setup.
- Keep each test focused on one behavior cluster.
- Prefer explicit assertions over one large full-head snapshot.

### Acceptance Criteria

- Missing `title`, `description`, and `url` behavior is documented.
- Common head tags are covered.
- Base font rendering is covered.
- Tests pass without production changes.

### Non-goals

- Do not change default metadata values.
- Do not introduce explicit host config yet.
- Do not remove DIBS coupling.

### Suggested Execution Order

1. Add default metadata fallback test.
2. Add common static tag test.
3. Add base font link test.
4. Run `pnpm test:astro -- src/components/meta/__tests__/Head.render.test.ts`.

---

## Cycle 3 — Characterize Social Metadata, Locale Mapping, and Type Precedence [DONE]

**Status:** Completed in this cycle. Added a `social metadata, locale mapping, and type precedence` describe block to
`Head.render.test.ts` covering Open Graph / Twitter output from the effective page metadata, `pageMeta.type` precedence
over the `type` prop, and the current language-to-Open-Graph-locale mapping via DDT. No production code changed.

**Behavior note:** The actual locale mapping differs from the proposed table — English variants map to `en_GB` (not
`en_US`), and unknown languages fall back to `es_CL`. The DDT was adjusted to lock current behavior: `es`/`es-CL` →
`es_CL`, `en`/`en-GB` → `en_GB`, `zz` → `es_CL`.

**Validation:**
`node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/meta/__tests__/Head.render.test.ts`
passed with 17 tests.

### Goal

Lock behavior that is easy to break during component parameterization.

### Scope

Cover:

- Open Graph metadata
- Twitter metadata
- canonical URL used by social metadata
- `type` prop versus `pageMeta.type`
- language-to-Open-Graph-locale mapping

### Red

Add BDD-style tests:

- `Head renders Open Graph and Twitter metadata from the effective page metadata`
- `Head uses pageMeta.type over the type prop when both are provided`
- `Head maps supported and unknown languages to the current Open Graph locale behavior`

Use DDT for language mapping:

```ts
test.each([
    { language: "es", expectedLocale: "es_CL" },
    { language: "es-CL", expectedLocale: "es_CL" },
    { language: "en", expectedLocale: "en_US" },
    { language: "en-GB", expectedLocale: "en_GB" },
    { language: "zz", expectedLocale: "es_CL" },
])("maps $language to $expectedLocale", ({ language, expectedLocale }) => {
    // assertion
});
```

Adjust expected values to match actual current behavior.

### Green

No production changes are expected. If behavior differs from the proposed table, preserve the actual behavior in the
characterization test.

### Refactor

- Extract a small render helper if setup becomes repetitive.
- Keep the language matrix compact and explicit.
- Avoid testing every possible locale; test representative current branches only.

### Acceptance Criteria

- Open Graph and Twitter output is covered.
- `pageMeta.type` precedence is locked.
- Locale behavior is locked with DDT.
- Tests pass without production changes.

### Non-goals

- Do not improve locale mapping.
- Do not add new locale support.
- Do not rename `type` or `pageMeta.type`.

### Suggested Execution Order

1. Add social metadata test.
2. Add type precedence test.
3. Add locale DDT test.
4. Run the Astro render test file.

---

## Cycle 4 — Characterize Optional 404 Font Behavior [DONE]

**Status:** Completed in this cycle. Added DDT coverage for current `include404Font` behavior, proving base font links
always render, the optional 404 font is omitted by default, and the optional stylesheet renders when enabled.

**Validation:**
`node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/meta/__tests__/Head.render.test.ts`
passed with 19 tests.

### Goal

Lock the current optional font behavior before it is later generalized as `extraFontLinks` or `fontLinks`.

### Scope

Cover:

- base fonts always render
- 404 font does not render by default
- 404 font renders when `include404Font` is true

### Red

Add BDD-style tests:

- `Head renders base font links without the optional 404 font by default`
- `Head renders the optional 404 font when include404Font is true`

Use DDT if there are multiple optional link tags:

```ts
test.each([
    { include404Font: false, shouldRender404Font: false },
    { include404Font: true, shouldRender404Font: true },
])("renders optional 404 font: $shouldRender404Font", ({ include404Font, shouldRender404Font }) => {
    // assertion
});
```

### Green

No production changes are expected.

### Refactor

- Name assertions around current behavior, not the future API.
- Add a comment that `include404Font` is current app-specific behavior to be generalized in a later phase.

### Acceptance Criteria

- Optional font behavior is covered independently from common font behavior.
- The test makes the future extraction seam visible.
- Tests pass without production changes.

### Non-goals

- Do not introduce `extraFontLinks` yet.
- Do not rename `include404Font` in this phase.
- Do not move font configuration.

### Suggested Execution Order

1. Add default optional-font omission test.
2. Add enabled optional-font test.
3. Run the Astro render test file.

---

## Cycle 5 — Characterize Article-Only Metadata [DONE]

> **Status:** Done (2026-06-19). Added an `article-only metadata` describe block to
> `src/components/meta/__tests__/Head.render.test.ts` with three BDD tests covering article citation + Dublin Core +
> JSON-LD emission, website-page omission of article-only tags, and JSON-LD author URL preservation. Kaleido
> Star-inspired fixtures used; JSON-LD parsed before asserting fields. No production changes.
>
> **Behavior locked:** Article pages emit `citation_*`, `DC.creator/date`, `DC.type =
> "Journal Article"`, and an
> `Article` JSON-LD script whose `author[]` preserves `@type`/`name`/ `url`. Website pages omit all `citation_*` tags
> and the JSON-LD script, and degrade `DC.type` to `"Web Page"`.
>
> **Validation:**
> `node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts
> src/components/meta/__tests__/Head.render.test.ts`
> → 22 passed.

### Goal

Lock article-specific metadata rendering so extraction does not accidentally affect website pages or article pages.

### Scope

Cover:

- article citation tags
- Dublin Core creator/date/type tags
- JSON-LD script generation
- omission of article-only tags for website pages

### Red

Add BDD-style tests:

- `Head emits article citation tags, Dublin Core tags, and JSON-LD for article pages`
- `Head omits article citation tags and JSON-LD for website pages`
- `Head preserves author URLs in rendered JSON-LD for article pages`

Use Kaleido Star-inspired article data where DIBS defaults are not required:

```ts
const articleMeta = {
    title: "Sora Naegino Practice Notes",
    description: "A short article about preparing for a stage audition.",
    type: "article",
    authors: [
        { name: "Junichi Sato", url: "https://kaleido-stage.example/staff/junichi-sato" },
        { name: "Reiko Yoshida", url: "https://kaleido-stage.example/staff/reiko-yoshida" },
    ],
};
```

### Green

No production changes are expected. If JSON-LD structure differs from the planned assertion, assert the current
structure exactly enough to protect extraction without overfitting formatting.

### Refactor

- Parse JSON-LD before asserting fields.
- Avoid asserting whitespace or property order.
- Keep article and website cases separate.

### Acceptance Criteria

- Article-only metadata is covered.
- Website pages are proven not to emit article-only tags.
- JSON-LD assertions are semantic, not whitespace-based.
- Tests pass without production changes.

### Non-goals

- Do not change JSON-LD schema.
- Do not add new structured-data fields.
- Do not redesign author modeling.

### Suggested Execution Order

1. Add article metadata render test.
2. Add website omission test.
3. Add JSON-LD author URL assertion.
4. Run the Astro render test file.

---

## Cycle 6 — Characterize `buildHeadPageMeta` [DONE]

> **Status:** Done — 2026-06-19.
>
> **Behavior locked:** Added a non-DIBS, Kaleido Star–inspired `describe` block to
> `src/utils/__tests__/page-meta.test.ts` covering author name trimming and blank removal, author URL preservation in
> JSON-LD, language defaulting to `es` for missing/blank/whitespace values, canonical URL fallback to the (trimmed)
> input URL for invalid/relative candidates, JSON-LD generated exactly when the effective type is `article`, and a full
> non-DIBS fixture pass. The pre-existing DIBS-host tests and the property-based invariants were left untouched (per
> non-goals, no production changes and no removal of existing PBT).
>
> **Validation:** `node ./node_modules/vitest/vitest.mjs run src/utils/__tests__/page-meta.test.ts` → **22 passed**. No
> production code changed.

### Goal

Lock pure metadata normalization behavior before moving it into the reusable package.

### Scope

Cover current behavior for:

- author normalization
- blank author removal
- author URL preservation
- language defaulting
- canonical URL fallback behavior
- article JSON-LD generation
- non-DIBS fixture compatibility

### Red

Add or tighten tests in `src/utils/__tests__/page-meta.test.ts`:

- `buildHeadPageMeta trims author names and removes blank authors`
- `buildHeadPageMeta preserves author URLs for JSON-LD`
- `buildHeadPageMeta defaults missing or blank language to es`
- `buildHeadPageMeta falls back to the input URL for invalid or relative canonical URLs`
- `buildHeadPageMeta generates JSON-LD exactly when the effective type is article`
- `buildHeadPageMeta works with non-DIBS host-like fixture values`

Use DDT for author normalization:

```ts
test.each([
    {
        authors: ["Sora Naegino", "  Layla Hamilton  ", ""],
        expectedNames: ["Sora Naegino", "Layla Hamilton"],
    },
    {
        authors: ["  ", "\t", "Mia Guillem"],
        expectedNames: ["Mia Guillem"],
    },
])("normalizes author names", ({ authors, expectedNames }) => {
    // assertion
});
```

Use DDT for language fallback:

```ts
test.each([
    { language: undefined, expected: "es" },
    { language: "", expected: "es" },
    { language: "   ", expected: "es" },
    { language: "en", expected: "en" },
])("normalizes language $language", ({ language, expected }) => {
    // assertion
});
```

### Green

No production changes are expected. If a test uncovers behavior different from the plan, update the expected value to
current behavior unless the existing test suite already proves the plan’s expectation.

### Refactor

- Keep helper fixture builders local to the test file.
- Use Kaleido Star values for fake data instead of DIBS defaults.
- Avoid broad snapshots for the full metadata object unless the object is intentionally the public behavior under
  characterization.

### Acceptance Criteria

- Pure metadata normalization behavior is covered independently from `Head.astro`.
- Non-DIBS fixtures prove the helper does not conceptually require DIBS content.
- JSON-LD generation rules are covered.
- Tests pass without production changes.

### Non-goals

- Do not move `page-meta.ts`.
- Do not rename exported types.
- Do not change canonical URL semantics.
- Do not add property-based tests.

### Suggested Execution Order

1. Add author normalization DDT.
2. Add language fallback DDT.
3. Add canonical fallback cases.
4. Add JSON-LD article/website cases.
5. Add non-DIBS fixture case.
6. Run the page-meta unit test file.

---

## Final Validation

Run narrow checks only:

```powershell
pnpm test:astro -- src/components/meta/__tests__/Head.render.test.ts
pnpm test:unit -- src/utils/__tests__/page-meta.test.ts
```

If the unit-test script does not accept a file path, use:

```powershell
pnpm exec vitest run src/utils/__tests__/page-meta.test.ts
```

If the Astro test script does not accept a file path, use the repository’s existing narrowest supported Astro test
command and record the substitution in the traceability notes.

## Overall Acceptance Criteria

- `Head.render.test.ts` characterizes current rendered head behavior.
- `page-meta.test.ts` characterizes current pure metadata normalization behavior.
- DIBS-specific expectations are clearly labeled as current host coupling.
- Reusable helper behavior uses non-DIBS Kaleido Star-inspired fixtures.
- DDT is used for compact behavior matrices such as locale mapping, author normalization, language fallback, and
  optional font behavior.
- No package is created.
- No file is moved.
- No imports are migrated.
- No compatibility re-export is added.
- No production code is refactored.
- All targeted tests pass.

## Deferred Items

- Creating `@ravenhill/astro-head`.
- Moving `Head.astro`.
- Moving `buildHeadPageMeta`.
- Replacing DIBS defaults with explicit host config.
- Replacing `include404Font` with generic `extraFontLinks` or `fontLinks`.
- Adding package boundary checks.
- Updating `BaseLayout.astro`.
- Running full `pnpm check`.
