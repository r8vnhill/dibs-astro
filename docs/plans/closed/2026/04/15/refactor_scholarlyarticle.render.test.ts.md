## Refactor `ScholarlyArticle.render.test.ts`

### Summary

Refactor the `ScholarlyArticle.astro` render suite to make concurrent execution safe, improve readability, and tighten its component-level contract without changing component behavior.

The refactor should preserve `describe.concurrent(...)`, but remove the current shared mutable renderer setup. The resulting suite should follow the same direction as the stronger nearby reference-render suites: isolated render entrypoint, behavior-first test names, data-driven coverage for repeated formatting cases, and a clearer separation between content-resolution behavior and markup/link contracts.

Because Vitest runs concurrent tests in the same file together and still executes per-test hooks for each concurrent case, shared mutable state in a concurrent suite is an unnecessary risk surface. Vitest also explicitly supports data-driven tests through `test.each(...)`, and recommends local test-context `expect` for async concurrent tests. ([Vitest][1])

### Goals

* Keep the suite behaviorally complete while making each test fully isolated.
* Make the suite easier to scan by grouping tests around observable behavior.
* Reduce duplication in repeated rendering cases.
* Add one or two missing contract assertions that are central to this component’s purpose.
* Avoid expanding the scope into component logic changes or broader HTML-query infrastructure.

### Non-goals

* No behavioral changes in `ScholarlyArticle.astro`.
* No rewrite of the broader reference-test utilities.
* No new parsing/assertion dependency in this pass.
* No migration of page-formatting responsibility away from the lower-level pages formatter tests.

## Key Changes

### 1. Remove shared mutable renderer state

Replace the outer `let renderArticle` and `beforeEach(...)` pair with a local async helper that creates a fresh Astro renderer for each call.

This helper should:

* accept `ScholarlyArticleProps`;
* accept render options / slots;
* create the renderer internally;
* return rendered HTML directly.

That gives each test its own render path and eliminates cross-test interference under `describe.concurrent(...)`. Since concurrent tests in Vitest can run together within a file, and hooks remain part of each concurrent test’s lifecycle, avoiding shared mutable variables is the cleanest design here. ([Vitest][2])

Suggested shape:

```ts
type RenderOptions = Parameters<AstroRender<ScholarlyArticleProps>>[1];

async function renderArticle(
  props: ScholarlyArticleProps,
  options?: RenderOptions,
): Promise<string> {
  const render = await createAstroRenderer<ScholarlyArticleProps>(ScholarlyArticle);
  return render(props, options);
}
```

### 2. Keep `describe.concurrent(...)`, but make the suite concurrency-safe by construction

Do not remove concurrency just to accommodate shared setup. Instead, make the suite correct under concurrency.

As a small follow-up improvement, consider using test-context `expect` in async concurrent tests for consistency with Vitest’s guidance. It is most important for assertions/snapshots in concurrent async tests, and adopting it here would make the suite more future-proof even if the current assertions are simple string checks. ([Vitest][1])

### 3. Reorganize the suite by behavior

Group tests into small nested sections so the file reads like a component contract instead of a flat list of scenarios. A good shape would be:

* `describe("content resolution", ...)`
* `describe("page rendering", ...)`
* `describe("link rendering", ...)`
* `describe("optional content", ...)`
* `describe("failures", ...)`

This keeps the suite scalable and makes future additions more obvious.

### 4. Convert repeated page-formatting cases to DDT

Use `test.each(...)` for representative page-rendering cases:

* `{ start: 7 }` → `(p. 7)`
* `{ start: 7, end: 12 }` → `(pp. 7–12)`

This reduces duplication and makes the intended contract explicit. `test.each(...)` is the right fit here because the behavior is the same and only the input/output pair changes. ([Vitest][1])

Keep the assertion character aligned with the real formatter output:

* use an en dash if that is what the component currently renders;
* do not silently normalize to a plain hyphen in the test.

### 5. Tighten the main title-link contract

Add a focused test asserting that:

* the title is rendered;
* the title is linked to the article `url`.

This is one of the component’s primary responsibilities and deserves a direct contract test instead of being covered only indirectly.

### 6. Tighten publication rendering behavior

Split publication coverage into two focused cases:

* renders publication as a link when `publicationUrl` is present;
* renders publication as plain text when `publicationUrl` is absent.

That makes the optional-link behavior explicit and avoids hiding two different contracts inside a broader “props render” test.

### 7. Keep slot precedence and fallback coverage, but sharpen the naming

Retain the existing title/publication/author precedence tests, but rename them to make the behavior unambiguous. For example:

* `prefers meaningful title, publication, and author slot content over props`
* `falls back to props when title, publication, or author slots are empty`

This makes the expected resolution order obvious from the test list alone.

### 8. Keep description coverage, but express it as optional-content behavior

Retain the description test, but name it in terms of contract:

* `renders the description slot when it has meaningful content`
* `omits the description section when no description is provided`

If empty or comment-only description slot handling is part of the same utility policy as other slots, consider folding that into this test area as well.

### 9. Keep the missing-title failure test, but strengthen it if the project already uses typed reference errors

Retain the current failure coverage. If nearby reference component tests already import and assert a specific error type such as `MissingReferenceTitleError`, use that same pattern here for consistency and stronger intent. Otherwise, keep the current `/title/i` assertion and do not introduce a new coupling just for this file.

### 10. Standardize naming style

Standardize all test names in English and keep them short, behavior-first, and scan-friendly.

Fixture content may remain Spanish where it is intentionally modeling real content, labels, or bibliography text. What matters is that the suite’s structure and test titles are consistent.

## Recommended Final Structure

A good end state for the suite would look roughly like this:

* `describe.concurrent("ScholarlyArticle.astro", ...)`

  * `describe("content resolution", ...)`

    * slot precedence
    * empty-slot fallback
  * `describe("page rendering", ...)`

    * DDT for page/page-range output
  * `describe("link rendering", ...)`

    * title links to article URL
    * publication links only when `publicationUrl` exists
  * `describe("optional content", ...)`

    * description present/absent
    * optional metadata omission if applicable
  * `describe("failures", ...)`

    * missing meaningful title source

## Test Plan

Run the focused Vitest target for:

```text
src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts
```

Use the Astro website’s existing Vitest command rather than introducing Gradle unless this repository already routes frontend tests through Gradle.

Suggested checks:

* run the file directly;
* run the surrounding reference-component test directory;
* run the suite repeatedly, since concurrency-related issues often appear as flakiness rather than deterministic failures.

## Acceptance Criteria

* No outer shared mutable renderer variable remains.
* No `beforeEach(...)` is required for renderer creation.
* The suite remains under `describe.concurrent(...)`.
* Repeated page-rendering cases are expressed with DDT.
* The title `url` is asserted explicitly as the rendered title link.
* Publication link vs plain-text behavior is asserted explicitly.
* Slot precedence, empty-slot fallback, description rendering, and missing-title failure remain covered.
* Test names are standardized and behavior-first.

## Assumptions

* This is a test-only refactor.
* Page validation and normalization rules belong to the lower-level pages formatter tests, so this suite only needs representative delegation coverage.
* Substring assertions are acceptable in this pass; introducing DOM parsing helpers can be deferred to a wider cleanup of reference render tests.
* Keeping `describe.concurrent(...)` is intentional, but correctness under concurrency matters more than micro-performance. Vitest’s concurrency is most useful when tests actually benefit from overlapping async work, so this refactor should preserve concurrency safely rather than relying on it for meaning. ([Vitest][3])

One thing I would definitely add to the original plan: explicitly mention local test isolation as the core reason for the refactor, not just “match the newer pattern.” That gives the change a stronger technical rationale.

[1]: https://vitest.dev/api/test?utm_source=chatgpt.com "Vitest"
[2]: https://vitest.dev/guide/lifecycle?utm_source=chatgpt.com "Test Run Lifecycle | Guide"
[3]: https://vitest.dev/guide/parallelism?utm_source=chatgpt.com "Parallelism | Guide"
