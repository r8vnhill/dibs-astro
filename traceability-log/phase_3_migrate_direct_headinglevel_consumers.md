# [PLAN] Phase 3: Migrate Direct `HeadingLevel` Consumers

## Summary

Migrate the three app-local direct consumers of `HeadingLevel` from `~/utils` to `@ravenhill/html-core`, while
preserving rendered HTML and keeping the legacy utility bridge untouched for the next phase.

This phase is behavior-preserving. It should not change heading defaults, callout markup, CSS classes, slots, IDs,
accessibility semantics, or runtime behavior.

---

## Cycle 1 — Lock `Heading.astro` Rendering Behavior [DONE]

### Goal

Add or strengthen render coverage for `src/components/semantics/Heading.astro` before changing its import source.

### Scope

Create `src/components/semantics/__tests__/Heading.render.test.ts` if absent.

Cover:

- `headingLevel="h2"` through `headingLevel="h6"`.
- The requested semantic tag is emitted.
- The default slot text is preserved.
- Existing classes, attributes, or wrapper behavior remain unchanged if already part of the observable contract.

Use `suite` and `test.each(...)`, matching the project’s preferred Vitest style.

### Red

Add behavior-first tests with BDD-style names:

```ts
suite("Heading", () => {
    test.each([
        ["h2", "Kakyoin Noriaki"],
        ["h3", "Jean Pierre Polnareff"],
        ["h4", "Muhammad Avdol"],
        ["h5", "Noriaki's Hierophant"],
        ["h6", "Star Platinum"],
    ])("renders a %s heading with its slot content", async (headingLevel, text) => {
        // Render Heading.astro with headingLevel and default slot text.
        // Assert the emitted tag and preserved slot text.
    });
});
```

Use Stardust Crusaders fake text only where text content is needed, and avoid reusing the same names in later tests.

### Green

Make the tests pass against the current `~/utils` implementation.

### Refactor

Extract a small render helper only if the test setup becomes duplicated or noisy. Avoid abstraction if there is only one
test matrix.

### Acceptance Criteria

- [x] `Heading.astro` has focused render coverage.
- [x] The test matrix covers `h2` through `h6`.
- [x] Tests assert semantic output, not implementation details.
- [x] Tests pass before the import migration.

### Completion Notes

- Added `src/components/semantics/__tests__/Heading.render.test.ts`.
- The render suite checks each supported non-page heading level (`h2` through `h6`) and verifies
  that default slot text is preserved.
- Validation passed with the direct Astro Vitest invocation after the pnpm wrapper attempted dependency restoration in
  the sandbox:

```powershell
node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/semantics/__tests__/Heading.render.test.ts
```

### Non-goals

- Do not test the `HeadingLevel` union type here; that belongs to `@ravenhill/html-core`.
- Do not assert import paths from tests.
- Do not add runtime validation for invalid heading strings.

---

## Cycle 2 — Migrate `Heading.astro` to `@ravenhill/html-core` [DONE]

### Goal

Change the semantic heading component to consume `HeadingLevel` from the new package.

### Scope

Update:

```ts
import type { HeadingLevel } from "@ravenhill/html-core";
```

in:

```text
src/components/semantics/Heading.astro
```

### Red

Run the focused heading tests after changing the import. They should fail only if dependency resolution or the import
path is incorrect.

### Green

Fix the import and any local type-only import formatting.

### Refactor

Keep the component implementation unchanged. This should be a source-of-truth migration, not a rendering refactor.

### Acceptance Criteria

- [x] `Heading.astro` imports `HeadingLevel` from `@ravenhill/html-core`.
- [x] Focused heading render tests pass.
- [x] No rendered HTML changes.
- [x] No dependency wiring is added unless this file belongs to a package that does not already declare
  `@ravenhill/html-core`.

### Completion Notes

- Updated `src/components/semantics/Heading.astro` to import the `HeadingLevel` type from the
  `@ravenhill/html-core` package root.
- Left the component implementation, defaults, classes, slots, and rendered markup unchanged.
- Confirmed that the root app already declares `@ravenhill/html-core` as a `workspace:*` dependency.

### Non-goals

- Do not remove `src/utils/heading-level.ts`.
- Do not alter heading defaults or props.

---

## Cycle 3 — Lock Callout Heading Behavior [DONE]

### Goal

Add or strengthen render coverage proving callouts still pass the configured heading level through to the rendered
heading.

### Scope

Prefer extending:

```text
src/components/ui/callouts/__tests__/Definition.render.test.ts
```

Cover:

- A definition callout rendered with `headingLevel="h2"` emits an `<h2>`.
- The callout title remains visible.
- Existing title classes remain observable.
- Slotted body content remains preserved.

### Red

Add BDD-style tests:

```ts
suite("Definition callout heading", () => {
    test("renders the configured heading level", async () => {
        // Render Definition.astro with headingLevel="h2".
        // Assert an h2 heading is emitted.
    });

    test("preserves the title and body content", async () => {
        // Use distinct Stardust Crusaders fake content.
        // Assert title and body are still rendered.
    });
});
```

Suggested fake content:

- Title: `The World`
- Body: `DIO has entered the clock tower.`

### Green

Make tests pass with the current implementation.

### Refactor

Reuse existing callout render helpers if they already exist. Do not create a new testing utility unless at least two
tests need the same setup.

### Acceptance Criteria

- [x] Callout render tests cover custom heading level behavior.
- [x] Existing title and body rendering remain covered.
- [x] Tests do not inspect import paths.
- [x] Tests pass before migrating the callout imports.

### Completion Notes

- Extended `src/components/ui/callouts/__tests__/Definition.render.test.ts` with a focused
  `Definition callout heading` suite.
- The suite renders a definition callout with `headingLevel="h2"` and confirms that the emitted
  heading is an `<h2>`.
- The tests keep title behavior observable by checking the visible composed title
  `Definición - The World` and the existing `callout__title` class.
- The tests also verify that slotted body content remains preserved.
- Validation passed with:

```powershell
pnpm test:astro -- src/components/ui/callouts/__tests__/Definition.render.test.ts
```

The wrapper ran the Astro render suite and reported 31 files / 244 tests passing.

### Non-goals

- Do not snapshot the entire callout HTML unless the project already uses stable snapshots for these components.
- Do not broaden coverage to every callout variant unless this shared behavior is not already exercised through
  `Definition`.

---

## Cycle 4 — Migrate Callout Consumers

### Goal

Move the two callout-related direct consumers to the new `HeadingLevel` source.

### Scope

Update imports in:

```text
src/components/ui/callouts/shared.ts
src/components/ui/callouts/CalloutHeading.astro
```

Use:

```ts
import type { HeadingLevel } from "@ravenhill/html-core";
```

### Red

Run focused callout tests after changing the imports.

### Green

Fix import paths or type-only import formatting until focused tests pass.

### Refactor

Keep shared props and heading rendering unchanged.

### Acceptance Criteria

- `shared.ts` imports `HeadingLevel` from `@ravenhill/html-core`.
- `CalloutHeading.astro` imports `HeadingLevel` from `@ravenhill/html-core`.
- Callout render tests pass.
- No callout HTML, classes, slots, IDs, or default semantics change.

### Non-goals

- Do not remove the legacy utility bridge.
- Do not migrate unrelated callout types.
- Do not change callout API behavior.

---

## Cycle 5 — Verify Phase 3 Import Boundary

### Goal

Confirm that all Phase 3 direct consumers use the new package while the compatibility bridge remains available for later
phases.

### Scope

Search for remaining legacy imports in the touched consumers only:

```text
src/components/semantics/Heading.astro
src/components/ui/callouts/shared.ts
src/components/ui/callouts/CalloutHeading.astro
```

Also inspect whether any new direct consumer outside the app package appeared during the work. If so, add an explicit
`@ravenhill/html-core: workspace:*` dependency to that package.

### Red

A simple search should fail the phase if any touched Phase 3 consumer still imports `HeadingLevel` from `~/utils`.

### Green

Replace remaining legacy imports in the touched files.

### Refactor

Leave `src/utils/heading-level.ts` and `src/utils/index.ts` unchanged.

### Acceptance Criteria

- No touched Phase 3 consumer imports `HeadingLevel` from `~/utils`.
- The legacy bridge still exists.
- No unrelated files are migrated opportunistically.
- Any package that imports `@ravenhill/html-core` directly declares the dependency explicitly.

### Non-goals

- Do not perform Phase 4 compatibility documentation work here.
- Do not perform Phase 5 bridge deletion here.
- Do not add an architecture rule that forbids all legacy imports yet, unless the project already has a targeted
  allowlist mechanism.

---

## Validation

Run focused validation from `astro-website`:

```powershell
pnpm test:astro -- src/components/semantics src/components/ui/callouts
pnpm check:architecture
pnpm check:html-core
```

Then run the broader gate:

```powershell
pnpm check
```

Before editing or committing, check Git state from a shell where `astro-website` is configured as a safe Git directory,
because the sandbox user currently hits Git’s dubious-ownership guard.

---

## Suggested Execution Order

1. Add or strengthen `Heading.astro` render tests.
2. Migrate `Heading.astro`.
3. Add or strengthen callout heading render tests.
4. Migrate `shared.ts` and `CalloutHeading.astro`.
5. Search touched files for legacy `HeadingLevel` imports.
6. Run focused validation.
7. Run the full `pnpm check` gate.

---

## Deferred to Later Phases

- Marking the legacy utility bridge as deprecated.
- Removing `src/utils/heading-level.ts`.
- Removing any `src/utils/index.ts` export.
- Adding a global architecture rule forbidding the legacy path.
- Expanding `@ravenhill/html-core` with additional semantic HTML primitives.
- Adding type-level tests for `HeadingLevel`; those belong in `packages/html-core`, not this app-consumer migration
  phase.

---

## Main Improvements Over the Original Plan

- Splits the phase into executable red-green-refactor cycles.
- Tests behavior before each import migration.
- Keeps the compatibility bridge explicitly out of scope.
- Avoids testing implementation details such as import paths.
- Uses DDT only where the finite heading-level matrix improves clarity.
- Avoids PBT because the input domain is tiny, closed, and already covered by explicit examples.
- Keeps the migration behavior-preserving and minimizes blast radius.

[1]: https://docs.astro.build/en/guides/testing/ "Testing | Docs"
