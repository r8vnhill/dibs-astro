# [DONE] Cycle 6 — Lock Locator-Based Finding Collection

## Summary

Replace the old finding-collection API contract with a Locator-based Playwright contract, without changing export
behavior.

The runner already collects export findings through:

```ts
page.locator("[data-export-finding]").evaluateAll(...)
```

Cycle 6 is therefore a narrow contract-locking pass. The implemented change proves that the runner uses the Locator API
for `[data-export-finding]`, preserves the collected finding shape, and no longer depends on `page.$$eval(...)` anywhere
in the PDF export flow.

This aligns with Playwright’s current API model: locators are the primary abstraction for finding elements, and
`locator.evaluateAll(...)` executes a callback over all matching elements in the page context. ([Playwright][1])

## Goals

- Lock `[data-export-finding]` as the selector used for export finding collection.
- Lock `page.locator(...).evaluateAll(...)` as the collection API.
- Preserve the mapped finding shape: `code`, `message`, and `severity`.
- Confirm no `page.$$eval(...)` call remains in the PDF export path.
- Avoid touching lifecycle, report policy, CLI flags, PDF options, or report schema.

## Implementation Notes

- The runner already used `page.locator("[data-export-finding]").evaluateAll(...)`, so no production code change was
  needed for this cycle.
- `scripts/__tests__/pdf-export/runner.test.ts` now characterizes the contract with an explicit Locator double and
  preserves the mapped `code`, `message`, and `severity` shape.
- A repository-wide search found no remaining `$$eval` usage in the PDF export path.

## Non-Goals

- Do not refactor page/browser cleanup.
- Do not change failure-summary wording.
- Do not add new finding kinds.
- Do not change the DOM contract.
- Do not introduce a new helper module unless duplication appears in more than one test file.
- Do not broaden this into report validation or CLI behavior.

## Steps

### 1. Characterize the current Locator contract first

Add or tighten one focused BDD test in:

```text
scripts/__tests__/pdf-export/runner.test.ts
```

The test should prove that finding collection:

- calls `page.locator("[data-export-finding]")`;
- calls `evaluateAll(...)` on the returned locator;
- executes the supplied callback against fake finding elements;
- maps DOM data into the existing report finding shape.

Use a small Pokémon-themed fixture, for example:

```ts
const fakeFindingElements = [
    {
        dataset: {
            exportFinding: "client-only-island",
            exportFindingSeverity: "warning",
        },
        textContent: "Pikachu island rendered on the client only.",
    },
];
```

Expected mapped finding:

```ts
{
  code: "client-only-island",
  message: "Pikachu island rendered on the client only.",
  severity: "warning",
}
```

Keep the test focused on observable behavior. It should not assert private helper names such as
`collectPageFindings(...)` unless that helper is intentionally exported for tests.

### 2. Make the Playwright double explicit but small

Use a page double shaped around the actual contract:

```ts
const evaluateAll = vi.fn((callback) => callback(fakeFindingElements));

const page = {
    locator: vi.fn((selector) => {
        expect(selector).toBe("[data-export-finding]");
        return { evaluateAll };
    }),
    // existing page double members needed by the runner
};
```

This keeps the test anchored to the public Playwright call pattern without requiring a real browser. It also avoids
over-modeling Playwright internals.

### 3. Preserve finding shape exactly

Assert only the current report-facing fields:

```ts
expect(entry.findings).toEqual([
    {
        code: "client-only-island",
        message: "Pikachu island rendered on the client only.",
        severity: "warning",
    },
]);
```

Do not add fields such as `selector`, `text`, `kind`, `source`, or `details` in this cycle.

### 4. Search for remaining `$$eval` usage in the export path

After the characterization test is in place, check the relevant scripts:

```bash
rg '\$\$eval' scripts/lib scripts/__tests__/pdf-export scripts/export-lessons-pdf.mjs
```

If a remaining `page.$$eval(...)` appears in the PDF export path, replace only that call site with the Locator
equivalent:

```ts
await page
    .locator("[data-export-finding]")
    .evaluateAll((elements) =>
        elements.map((element) => ({
            code: element.getAttribute("data-export-finding"),
            severity: element.getAttribute("data-export-finding-severity"),
            message: element.textContent?.trim() ?? "",
        }))
    );
```

Adapt the exact attribute-reading logic to match the current implementation. The important part is preserving the
existing output shape and normalisation rules.

### 5. Avoid lifecycle churn

Do not touch the browser/page `try/finally` structure unless the new test exposes a direct regression in finding
collection. Cycle 5 already covered cleanup hardening, so Cycle 6 should stay API-focused.

## Acceptance Criteria

- `scripts/__tests__/pdf-export/runner.test.ts` proves that the runner collects findings through
  `page.locator("[data-export-finding]").evaluateAll(...)`.
- The `evaluateAll(...)` callback is exercised in the test, not merely asserted as a called mock.
- Collected findings still expose exactly:

  - `code`;
  - `message`;
  - `severity`.
- No `page.$$eval(...)` call remains in the PDF export runner path.
- Existing lifecycle and failure-handling tests still pass unchanged.
- No report schema, CLI, PDF option, or selection behavior changes are introduced.

## Verification

Run the focused runner suite:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export/runner.test.ts
```

Then run the broader PDF export regression set if it is part of the current local workflow:

```bash
pnpm test:unit -- \
  scripts/__tests__/pdf-export/pdf-export-cli.test.ts \
  scripts/__tests__/pdf-export/pdf-export-report.test.ts \
  scripts/__tests__/pdf-export/pdf-export-smoke.test.ts \
  scripts/__tests__/pdf-export/runner.test.ts
```

Finally, confirm the migration check:

```bash
rg '\$\$eval' scripts/lib scripts/__tests__/pdf-export scripts/export-lessons-pdf.mjs
```

## Refined Decisions

- Treat Locator-based finding collection as the locked contract.
- Keep `[data-export-finding]` as the canonical selector.
- Keep finding objects limited to `code`, `message`, and `severity`.
- Keep this cycle local to the runner and its tests.
- If no `$$eval` usage remains, this cycle is still valid as a test/documentation lock rather than a production-code
  edit.

[1]: https://playwright.dev/docs/api/class-locator "Locator | Playwright"
