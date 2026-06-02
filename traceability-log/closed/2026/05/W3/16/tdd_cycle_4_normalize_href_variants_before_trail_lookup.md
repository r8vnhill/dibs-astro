# [DONE] TDD Cycle 4: Normalize `href` Variants Before Trail Lookup

Status: implemented and verified in `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`.

## Summary

Lock `LessonCatalogAdapter.findTrailByHref(href)` so lookup is performed through the existing [LessonHref] normalization
contract. Equivalent authored-route variants must resolve to the same catalog-authored trail, without introducing
adapter-local URL parsing, synthetic breadcrumbs, or new normalization rules.

This cycle is adapter-facing: it verifies that `findTrailByHref(...)` delegates normalization correctly. It must not
expand the set of valid href forms beyond what [LessonHref.create(...)] already accepts.

## Scope

### In Scope

- Add focused behavior coverage for normalized href variants.
- Prove that equivalent href forms resolve to the same authored ancestry trail.
- Keep the returned trail based on catalog structure, not URL segments.
- Preserve the existing behaviour for missing routes and invalid blank hrefs.

### Out of Scope

- `includeNotesRoot`.
- New href-normalization semantics.
- Synthetic group links.
- URL-segment breadcrumb generation.
- Top-level lesson behaviour, unless already covered by existing tests.
- Missing-route behaviour, except as a regression check from earlier cycles.

## Precondition

Before adding the adapter table, confirm that every variant listed here is already valid under [LessonHref.create(...)].
If one is not supported, do **not** make the adapter accept it directly.

Instead:

- remove that case from this cycle; or
- move it to a separate [LessonHref] normalization cycle.

This prevents `LessonCatalogAdapter` from becoming a second normalization authority.

## Test Changes

Update:

```text
src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Add or reshape a focused block:

```ts
describe("findTrailByHref with normalized href variants", () => {
    // ...
});
```

Use the same non-isomorphic authored fixture introduced in earlier cycles:

- group title: `Build Systems`
- group href: `/notes/scripting/`
- lesson title: `Tasks as Abstractions`
- lesson href: `/notes/scripting/tasks-as-abstractions/`

Define the expected trail once:

```ts
const expectedTrail = [
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
];
```

Add a table-driven test for the href variants already supported by [LessonHref]:

```ts
it.each([
    "/notes/scripting/tasks-as-abstractions",
    "/notes/scripting/tasks-as-abstractions/",
    "notes/scripting/tasks-as-abstractions",
    "//notes//scripting//tasks-as-abstractions//",
    "  /notes/scripting/tasks-as-abstractions/  ",
    "/notes/scripting/tasks-as-abstractions/?section=intro",
    "/notes/scripting/tasks-as-abstractions/#intro",
])("resolves %s to the authored lesson trail", (href) => {
    expect(adapter.findTrailByHref(href)).toEqual(expectedTrail);
});
```

The assertion should remain exact with `toEqual(...)`, not piecemeal title/href checks.

### Verification

- Focused test command: `pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`
- Result: passed.
- Production code changes: none.
- Covered variants: canonical href, missing trailing slash, missing leading slash, repeated slashes, surrounding whitespace, query string, and fragment.
- Normalization authority: `LessonHref.create(...)` remains the single source of truth.

## Implementation Guidance

Run the focused behavior suite after adding the failing or characterization test.

Only change production code if the test fails.

If production code changes are needed, keep the implementation constrained to the existing design:

- normalize the requested href through:

```ts
LessonHref.create(href).value;
```

- normalize authored catalog hrefs through the same contract before comparison;
- keep trail construction based on catalog ancestry;
- keep the current lesson as the final trail item;
- do not introduce an adapter-local normalization helper unless duplication becomes unavoidable.

Avoid these changes in this cycle:

- parsing path segments into labels;
- creating synthetic ancestor hrefs;
- special-casing query strings or fragments in the adapter;
- accepting invalid hrefs that [LessonHref] rejects.

## Regression Expectations

Earlier-cycle behaviour must remain unchanged:

- nested lessons return authored catalog ancestry;
- groups with authored `href` remain linkable;
- groups without authored `href` remain plain labels;
- lessons inside non-linkable groups still resolve;
- missing routes still return the existing missing-route result;
- blank and whitespace-only hrefs still fail according to the existing invalid-href contract.

## Test Plan

Run the focused adapter suite:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

If there is dedicated [LessonHref] coverage, also run it when any listed variant is not already clearly covered:

```bash
pnpm vitest run src/**/__tests__/*LessonHref*.test.ts
```

Then run the broader relevant slice if the adapter implementation changed:

```bash
pnpm test
```

or the project’s narrower quality gate if one exists for infrastructure adapter tests.

## Acceptance Criteria

Cycle 4 is complete when:

- every supported href variant resolves to the same exact authored trail;
- the returned trail is still catalog-authored ancestry, not URL-derived breadcrumbs;
- the current lesson remains last;
- no unsupported href form is accepted only by `LessonCatalogAdapter`;
- blank and whitespace-only href behaviour remains unchanged;
- Cycle 1–3 tests remain green;
- any production change is limited to normalization-before-lookup behaviour.

## Documentation / Traceability

Update the cycle traceability note, or append to `catalog_trail_query.md`, with:

- the list of normalized variants covered;
- whether production code changed;
- whether the existing adapter implementation already satisfied the contract;
- confirmation that [LessonHref] remains the single source of truth for href normalization.

## References

- [LessonHref] as the domain-level normalization authority.
- [LessonCatalogAdapter.findTrailByHref(...)] as the infrastructure-facing trail lookup boundary.
- Vitest `it.each` / table-driven tests for compact behavioural coverage.
- TDD red-green-refactor discipline: add the focused behaviour first, then change production code only if the test
  exposes a real contract gap.
