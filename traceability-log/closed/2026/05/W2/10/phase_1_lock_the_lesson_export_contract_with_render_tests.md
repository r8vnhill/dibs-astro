# [DONE] Phase 1: Lock the Lesson Export Contract With Render Tests

## Summary

Define and test the HTML contract for an exportable lesson document before adding manifest logic, export routes, print
CSS, browser automation, or PDF generation.

Phase 1 introduces only non-visual structural selectors and focused render tests. Its purpose is to make later refactors
measurable: the tests should prove that the lesson document, lesson metadata, lesson body, web-only chrome, and export
findings can be identified consistently in the current `NotesLayout` rendering path.

This phase should not attempt to make the rendered HTML PDF-ready yet. It only establishes the contract that later
phases will preserve and refine.

## Goals

- Identify the lesson document independently from the surrounding web shell.
- Identify the export-relevant body region independently from sidebar, navigation, reading-time, and repository widgets.
- Mark web-only regions explicitly so later export layouts can omit them without relying on brittle CSS selectors.
- Mark unresolved client-only/export-risk content as findings rather than hard failures.
- Add low-cost render tests that lock the contract without changing visual behaviour.

## Non-Goals

Do **not** add any of the following in Phase 1:

- export routes;
- Playwright or Puppeteer;
- PDF generation scripts;
- print CSS;
- `packages/lesson-export-core`;
- manifest generation;
- route filtering;
- export-mode rendering;
- tab expansion logic;
- server-computed reading time;
- changes to lesson authoring syntax;
- visual redesigns of `NotesLayout`.

## Contract Semantics

Use `data-export-*` attributes as the Phase 1 public HTML contract.

### Required selectors

| Selector                            | Meaning                                                                                                           | Expected count |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------: |
| `data-export-role="document"`       | Root of the exportable lesson document, excluding site chrome.                                                    |      Exactly 1 |
| `data-export-role="metadata"`       | Metadata region that is allowed to appear in exported documents.                                                  |         0 or 1 |
| `data-export-role="body"`           | Main authored lesson body, including abstract content before the default body when present.                       |      Exactly 1 |
| `data-export-hidden="true"`         | Web-only region that must not be treated as part of the document contract. It remains visible in normal web mode. |      0 or more |
| `data-export-finding="client-only"` | Content that cannot be represented reliably in server-rendered export HTML yet.                                   |      0 or more |

### Clarification on `data-export-hidden`

`data-export-hidden="true"` must **not** mean “visually hidden in the browser”. It means:

```text
This node is visible in normal web mode, but it is outside the exportable document contract.
```

That distinction matters because the attribute is a structural contract, not a styling instruction.

## Key Changes

### 1. Add export selectors to `NotesLayout.astro`

Add stable selectors without changing the visual DOM behaviour:

```astro
<article data-export-role="document">
    <section data-export-role="metadata">
        <!-- existing metadata panel -->
    </section>

    <main data-export-role="body">
        <!-- abstract slot/fallback before default lesson body -->
        <slot name="abstract" />
        <slot />
    </main>
</article>
```

Exact placement should follow the current layout structure, but the tested invariant should be:

```text
document contains metadata and body;
body contains authored content;
document does not include web-only chrome as part of body.
```

### 2. Mark web-only regions

Add `data-export-hidden="true"` to regions that are part of browser reading/navigation rather than the lesson document:

```text
- lesson sidebar;
- reading-time widget/island;
- previous/next navigation;
- repository panel, only if the current contract treats it as web chrome;
- any layout-only controls that are not authored lesson content.
```

For `LessonRepoPanel`, keep the plan’s current conservative assumption: mark it only if it is clearly outside the
document contract. Otherwise, defer the include/omit decision to the export content policy phase.

### 3. Mark unresolved client-only fallback content

Add `data-export-finding="client-only"` to the existing abstract fallback `ToDo` wrapper or equivalent unresolved
placeholder.

The finding should not fail rendering. It should simply make the export risk discoverable:

```astro
<div data-export-finding="client-only">
    <!-- existing ToDo/client-only fallback -->
</div>
```

Later phases can decide whether findings remain warnings or become hard failures.

### 4. Add a render-contract test suite

Suggested location:

```text
src/layouts/__tests__/NotesLayout.export-contract.test.ts
```

Or, if the repository groups Astro render tests elsewhere, follow the existing convention rather than creating a new
pattern.

Use the existing Astro container helper and `NotesLayout` harness patterns. Astro’s official testing guide positions
Vitest and other testing tools as valid choices for unit/integration testing Astro projects, while the Container API is
specifically appropriate for isolated `.astro` output testing. ([Astro Docs][2])

## Test Fixture Strategy

Prefer a small layout harness over a full real lesson page.

The fixture should provide:

```text
- required layout props;
- an abstract slot;
- a default body slot;
- metadata data;
- optional previous/next navigation props;
- enough text to distinguish abstract/body ordering;
- one fake code-like block or callout-like block if the existing harness supports it cheaply.
```

Use `src/pages/notes/installation.astro` only as an optional smoke fixture, not as the primary contract fixture. Real
pages are valuable for coverage, but they tend to make tests brittle when the lesson content changes.

## Test Plan

### Document root contract

Add tests proving:

```text
- exactly one `[data-export-role="document"]` exists;
- the document root contains the lesson title;
- the document root contains the body region;
- the document root does not rely on sidebar/header/footer selectors to be identifiable.
```

### Body contract

Add tests proving:

```text
- exactly one `[data-export-role="body"]` exists;
- the abstract slot renders before the default lesson body;
- authored body content appears inside `[data-export-role="body"]`;
- web-only chrome does not appear inside `[data-export-role="body"]`.
```

### Metadata contract

Add tests proving:

```text
- metadata is exposed through `[data-export-role="metadata"]` when metadata exists;
- displayed metadata remains user-facing;
- infrastructure-only fields such as `sourceFile` are not rendered;
- missing optional metadata does not remove the document/body contract.
```

### Web-only chrome contract

Add tests proving these regions are marked with `data-export-hidden="true"` when present:

```text
- sidebar;
- reading-time region;
- previous/next navigation;
- repository panel, only if classified as web-only in this phase.
```

Prefer testing by semantic local markers or component-owned selectors rather than brittle class names.

### Export findings contract

Add tests proving:

```text
- unresolved abstract fallback/client-only placeholder content is marked with `data-export-finding="client-only"`;
- the finding remains inside the document if it represents missing document content;
- the finding does not break normal web-mode rendering;
- findings are discoverable with a simple selector query.
```

### Optional real-page smoke test

Add a page-level smoke render only if the existing test helpers make it cheap.

For `src/pages/notes/installation.astro`, assert only stable structural invariants:

```text
- it renders one `[data-export-role="document"]`;
- it renders one `[data-export-role="body"]`;
- it does not render infrastructure-only metadata fields.
```

Do not assert lesson text unless that text is intentionally stable.

## Suggested Test Shape

Use BDD-style names that describe contract behaviour:

```ts
describe("NotesLayout export contract", () => {
    it("renders exactly one exportable lesson document root", async () => {
        // ...
    });

    it("renders abstract content before the default lesson body", async () => {
        // ...
    });

    it("marks web-only chrome as excluded from the export contract", async () => {
        // ...
    });

    it("marks unresolved client-only fallback content as an export finding", async () => {
        // ...
    });
});
```

Keep each test focused on one invariant. Avoid snapshots for this phase; selector-level assertions are more stable and
better aligned with the contract.

## Verification Commands

Primary verification:

```bash
pnpm test:astro
```

Use a narrower command only if one already exists and is faster, for example:

```bash
pnpm vitest run src/layouts/__tests__/NotesLayout.export-contract.test.ts
```

Do not introduce a new script unless the repository already has a clear convention for targeted Astro render tests.

## Public Interfaces

Phase 1 introduces only an HTML selector contract:

```text
data-export-role
data-export-hidden
data-export-finding
```

It does not introduce:

```text
- TypeScript package APIs;
- route APIs;
- CLI flags;
- PDF manifest formats;
- lesson authoring syntax;
- export-mode props.
```

Treat these selectors as stable enough for later phases, but still internal to the site until the exporter becomes
user-facing.

## Assumptions

- Selector additions are acceptable because they are non-visual.
- The current web rendering must remain unchanged.
- Tests should be green at the end of Phase 1.
- `ToDo` and `client:only` content produce export findings first, not hard failures.
- `LessonRepoPanel` remains visible in normal web mode.
- Whether repo links belong in the final PDF is decided later.
- No changelog update is needed because this phase does not change user-facing behaviour.

## Exit Criteria

Phase 1 is complete when:

```text
- `pnpm test:astro` passes.
- `NotesLayout` exposes one document root.
- `NotesLayout` exposes one body region.
- Metadata is marked as export-relevant without leaking infrastructure-only fields.
- Web-only chrome is marked as excluded from the export contract.
- Client-only fallback content is discoverable as an export finding.
- No export routes, manifest logic, print CSS, or PDF generation have been added.
```

## Risks and Mitigations

| Risk                                                        | Mitigation                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Selector names become too broad or ambiguous.               | Define exact semantics in the test file and assert counts.              |
| Tests become brittle by rendering a real lesson page.       | Prefer a small layout harness; keep real-page smoke assertions minimal. |
| `data-export-hidden` is confused with visual hiding.        | Document that it is structural, not styling-related.                    |
| Phase 1 grows into layout refactoring.                      | Restrict changes to selectors and tests only.                           |
| Client-only placeholders are treated as failures too early. | Mark them as findings; defer policy enforcement.                        |

## Recommended Next Phase

Phase 2 should extract or introduce the first real document boundary, likely `LessonDocumentLayout.astro`, using the
selectors locked in Phase 1 as regression protection. That keeps the TDD sequence clean: first contract tests, then
structural refactor, then export-mode behaviour.

## Implementation Status

Implemented.

Changes made:

- `NotesLayout.astro` now exposes the Phase 1 export selector contract:
  - `data-export-role="document"`;
  - `data-export-role="metadata"`;
  - `data-export-role="body"`;
  - `data-export-hidden="true"`;
  - `data-export-finding="client-only"`.
- Added `src/layouts/__tests__/NotesLayout.export-contract.render.test.ts`.
- Kept Phase 1 limited to non-visual selectors and render tests. No export routes, print CSS, manifest package, browser
  automation, or PDF generation were added.

Verification:

```bash
node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/layouts/__tests__/NotesLayout.export-contract.render.test.ts
```

Result: passed, 6 tests.

Known unrelated baseline issue:

- Full `pnpm test:astro` currently fails in `src/layouts/__tests__/NotesLayout.render.test.ts` on two manual navigation
  precedence assertions. The implementation in `NotesLayout.astro` combines a manual previous/next override with the
  auto-resolved opposite direction, while those assertions expect any manual direction to disable auto navigation in
  both directions. This Phase 1 implementation did not change navigation semantics.

[1]: https://docs.astro.build/en/reference/container-reference/?utm_source=chatgpt.com "Astro Container API (experimental) | Docs"
[2]: https://docs.astro.build/en/guides/testing/?utm_source=chatgpt.com "Testing - Astro Docs"
