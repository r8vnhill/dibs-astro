# [DONE] Cycle 4: Freeze Exportable-Entry Boundary

## Completion Summary

Cycle 4 is complete. Added test-only coverage documenting the exportable-entry boundary:

- `scripts/__tests__/pdf-export-cli.test.ts` now asserts that selector fixtures contain already exportable PDF entries
  with `/notes/` routes, PDF export routes, and PDF output paths.
- `src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts` now asserts that the valid note entry in the
  non-note filtering case includes route, export route, and output path.

No production code changed. The selector remains a pure selector over `LessonExportManifest.entries`; manifest
construction remains responsible for keeping non-note lessons out of the PDF export manifest.

Verification:

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/pdf-export-cli.test.ts
node ./node_modules/vitest/vitest.mjs run src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts
```

Result:

- `scripts/__tests__/pdf-export-cli.test.ts`: passed, 19 tests.
- `src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts`: passed, 6 tests.

## Summary

Add test-only coverage documenting that `selectExportEntries()` operates on an already exportable PDF lesson manifest.

In this design, “exportable” means:

> the entry already exists in `LessonExportManifest.entries` and has the fields needed by the PDF exporter.

The selector should not decide whether a route is exportable. That responsibility belongs to manifest construction and
manifest validation.

This cycle is behaviour-preserving. Do not add an `exportable` flag and do not move route eligibility checks into
`scripts/lib/pdf-export-cli.mjs`.

---

## Scope

### In scope

- Clarify selector assumptions in `scripts/__tests__/pdf-export-cli.test.ts`.
- Ensure selector fixtures represent already-exportable PDF entries.
- Strengthen manifest-builder tests if the non-note filtering boundary is not already explicit.
- Confirm validation ownership stays in manifest/core validation paths.

### Out of scope

- No selector production changes.
- No new `exportable` field.
- No new CLI validation for non-exportable entries.
- No manifest shape redesign.
- No batch-execution changes.
- No changes to route eligibility semantics unless an existing test exposes a mismatch.

---

# Key Decisions

1. `selectExportEntries()` is a pure selector over manifest entries.
2. Manifest construction owns filtering routes into the PDF export manifest.
3. Manifest/core validation owns rejecting unsupported or invalid manifest entries.
4. Selector tests should use already-exportable entries only.
5. Non-note routes should not be introduced into selector fixtures as fake “non-exportable” entries.
6. The phrase “exportable” should be documented through fixture shape and test names, not a new boolean field.

---

# Test Changes

## Step 1: Rename or add selector assumption tests

Update:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Add or rename the all-selection test to make the assumption explicit:

```ts
test("returns every entry from an already exportable manifest", () => {
    const manifest = createSelectionManifestFixture();

    const selected = selectExportEntries(manifest, { kind: "all" });

    expect(selected).toEqual(manifest);
    expect(selected).not.toBe(manifest);
});
```

The exact assertion can vary depending on whether existing tests compare routes or full entries. The important points
are:

- all entries in the selector fixture are already valid PDF export entries;
- all-selection returns every fixture entry;
- the result array is fresh;
- the selector does not filter route eligibility.

## Step 2: Assert selector fixture shape

Add a small fixture contract test, preferably near `createSelectionManifestFixture()`.

Example:

```ts
test("uses an already exportable PDF manifest fixture", () => {
    const manifest = createSelectionManifestFixture();

    expect(manifest.length).toBeGreaterThan(0);

    for (const entry of manifest) {
        expect(entry.route).toMatch(/^\/notes\//u);
        expect(entry.exportRoute).toMatch(/^\/exports\/pdf\/notes\//u);
        expect(entry.outputPath).toMatch(/\.pdf$/u);
    }
});
```

This prevents future tests from adding `/blog/...`, `/slides/...`, or partial entries to the selector fixture and then
expecting selector-level filtering.

## Step 3: Keep exact route and subtree tests on exportable fixtures

Do not add non-note routes to selector tests.

Existing exact route and subtree tests should continue to use entries such as:

```text
/notes/software-libraries/
/notes/software-libraries/api-design/
/notes/build-systems/
```

This keeps selector tests focused on:

- selection mode;
- ordering;
- failure semantics;
- subtree boundaries.

Not exportability.

---

# Manifest Builder Boundary

If coverage is not already explicit, update:

```text
src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts
```

## Step 4: Confirm non-note lessons never enter the PDF manifest

Add or keep a test for:

```ts
test("excludes lessons outside the notes route namespace from the PDF export manifest", () => {
    // arrange course entries with one /notes/... route and one non-note route
    // act through buildPdfLessonExportEntries()
    // assert only /notes/... appears
});
```

Expected contract:

- `/notes/...` entries enter the PDF export manifest;
- non-note routes do not enter the manifest;
- selector never sees them.

## Step 5: Confirm valid note lessons still enter the manifest

Add a positive counterpart:

```ts
test("includes valid note lessons in the PDF export manifest", () => {
    // arrange one valid /notes/... lesson
    // assert it produces route, exportRoute, and outputPath
});
```

This avoids a test suite that only proves exclusion.

---

# Validation Boundary

## Step 6: Keep unsupported-route validation outside the selector

Do not add selector tests such as:

```ts
selectExportEntries([{ route: "/blog/post/" }], { kind: "all" });
```

unless the selector currently receives such entries in real execution.

Instead, keep unsupported-route validation in the existing manifest/core validation path:

```text
assertValidPdfLessonExportManifest()
validateManifest()
```

If there is already a core test for unsupported routes, leave it there. If not, add a narrow one in the owning
validation suite, not in `pdf-export-cli.test.ts`.

Expected ownership:

| Concern                                                   | Owner                    |
| --------------------------------------------------------- | ------------------------ |
| Build PDF export entries from course data                 | manifest adapter         |
| Exclude non-note lessons                                  | manifest adapter         |
| Reject unsupported manifest routes                        | manifest/core validation |
| Select all, exact route, or subtree from manifest entries | CLI selector             |
| Parse empty/conflicting CLI selectors                     | CLI parser               |

---

# Test Plan

## Selector boundary

In:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Cover:

- `selectExportEntries(manifest, { kind: "all" })` returns every entry from an already-exportable manifest;
- selector fixture entries all have `/notes/` routes;
- selector fixture entries all have `exportRoute`;
- selector fixture entries all have `outputPath`;
- exact route and subtree selection keep using the same exportable fixture;
- no selector test introduces an `exportable` flag.

## Manifest builder boundary

In:

```text
src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts
```

Cover, if not already covered:

- `buildPdfLessonExportEntries()` excludes lessons whose route does not start with `/notes/`;
- valid note lessons enter the manifest;
- generated entries include route, export route, and output path.

## Validation boundary

In the owning validation suite, only if existing coverage is missing:

- unsupported routes are rejected by manifest/core validation;
- selector does not duplicate that validation.

---

# Verification

Use direct Vitest while the Stage 3 import-specifier helper test is intentionally red:

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/pdf-export-cli.test.ts
node ./node_modules/vitest/vitest.mjs run src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts
```

If validation tests are updated too, run the relevant core validation test file directly.

Avoid `pnpm test:unit` for this cycle if it includes the intentionally red Stage 3 helper test.

---

# Acceptance Criteria

Cycle 4 is complete when:

- selector tests explicitly state that the selector receives an already-exportable manifest;
- selector fixtures contain only valid PDF export entries;
- selector fixture entries have `/notes/` routes;
- selector fixture entries have `exportRoute` and `outputPath`;
- all-selection returns every entry from the already-exportable fixture;
- exact route and subtree tests do not depend on selector-level exportability filtering;
- non-note route exclusion is tested in the manifest builder suite if not already covered;
- unsupported-route rejection remains manifest/core validation responsibility;
- no `exportable` field is invented;
- `scripts/lib/pdf-export-cli.mjs` remains unchanged;
- focused Vitest runs pass.

---

# Revised TDD Cycle Plan

## Goal

Freeze the exportable-entry boundary without changing selector behaviour.

## Test first

Add or adjust tests for:

- already-exportable selector fixture shape;
- all-selection returning every manifest entry;
- manifest builder excluding non-note routes;
- valid note routes entering the manifest.

## Smallest move

Only modify tests.

## Payoff

Later batch execution can rely on a clean responsibility split:

- manifest builder decides what can be exported;
- selector decides which manifest entries were requested;
- batch executor decides how to process the selected entries.

## Verify

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/pdf-export-cli.test.ts
node ./node_modules/vitest/vitest.mjs run src/infrastructure/adapters/__tests__/lesson-export-manifest.test.ts
```
