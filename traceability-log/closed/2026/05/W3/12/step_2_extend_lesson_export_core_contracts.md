# [DONE] Step 2: Extend Lesson Export Core Contracts

## Summary

Extend `@ravenhill/lesson-export-core` with the pure, host-agnostic contracts required by Phase 8 before changing the
PDF CLI or exporter orchestration.

This step introduces:

- a canonical export finding-kind registry;
- legacy finding-kind normalisation;
- pure report aggregation helpers;
- stronger output-path contract tests;
- public API exports for the new contracts.

The current PDF scripts must keep their behaviour unchanged. In particular, `scripts/export-lessons-pdf.mjs` and
`scripts/lib/pdf-export-report.mjs` remain untouched until a later Phase 8 migration step.

This preserves the package’s public API boundary while adding new additive contracts, which aligns with SemVer’s
expectation that a package’s public API be precise and comprehensive. ([Semantic Versioning][1])

## Implementation Status

Implemented in `@ravenhill/lesson-export-core` without changing the PDF exporter scripts.

Completed changes:

- `exportFindingKinds` is now the canonical finding-kind registry.
- `LessonExportFindingKind` is derived from the registry.
- `isExportFindingKind()` and `normalizeExportFindingKind()` are exported from the package root.
- Legacy `"client-only"` normalises to `"client-only-island"` without becoming canonical.
- `reporting.ts` adds pure host-agnostic summary helpers:
  - `countEntriesByStatus()`
  - `countFindingsByKind()`
  - `countFailuresByKind()`
  - `buildExportSummary()`
- Root API exports include the new finding and reporting contracts.
- Output-path tests now cover root notes, unit index routes, deeper lesson routes, trailing/non-trailing inputs, and
  safe root-directory handling.
- `packages/lesson-export-core/README.md` documents the new finding/reporting helpers.

Verification completed:

```bash
pnpm run check:lesson-export-core
```

The check passed. PowerShell emitted the existing unrelated `Fun.Ffmpeg` profile/module warning.

---

## Goals

1. Make finding kinds a single source of truth.
2. Keep runtime validation and TypeScript unions aligned.
3. Add pure report-summary helpers that can later replace script-local aggregation.
4. Lock the current output-path semantics with more edge-case coverage.
5. Avoid any browser, DOM, Astro, filesystem, process, or CLI dependency in `lesson-export-core`.

---

## Non-Goals

- Do not update `scripts/export-lessons-pdf.mjs`.
- Do not update `scripts/lib/pdf-export-report.mjs`.
- Do not change the observable PDF export CLI behaviour.
- Do not introduce browser-backed, DOM, Astro, Playwright, filesystem, or process APIs.
- Do not add a changelog entry in this step.
- Do not treat legacy `"client-only"` as a canonical finding kind.

---

## Key Changes

### 1. Add a canonical finding-kind registry

Create `packages/lesson-export-core/src/findings.ts` or extend the existing module if it already owns finding types.

Define the canonical registry as a literal tuple:

```ts
export const exportFindingKinds = [
    "duplicate-route",
    "duplicate-export-route",
    "duplicate-output-path",
    "missing-title",
    "missing-source-file",
    "missing-generated-metadata",
    "unsafe-output-path",
    "unsupported-route",
    "invalid-generated-at",
    "invalid-last-modified",
    "pdf-generation-failed",
    "client-only-island",
    "hidden-content",
    "unresolved-todo",
] as const;
```

Then derive the public type from the registry:

```ts
export type LessonExportFindingKind = (typeof exportFindingKinds)[number];
```

Add runtime helpers:

```ts
export function isExportFindingKind(value: unknown): value is LessonExportFindingKind;

export function normalizeExportFindingKind(
    value: unknown,
): LessonExportFindingKind | undefined;
```

Normalisation rules:

- canonical finding kinds return themselves;
- legacy `"client-only"` returns `"client-only-island"`;
- unknown strings return `undefined`;
- blank strings return `undefined`;
- non-string values return `undefined`.

Keep `createExportFinding()` compatible, but ensure it accepts all canonical kinds, including Phase 8 additions such as
`"unresolved-todo"`.

---

### 2. Keep public finding contracts additive

Do not remove or rename:

- `LessonExportFindingKind`;
- `LessonExportFinding`;
- `createExportFinding`.

Update their implementation so the type-level and runtime-level contracts cannot drift.

Export from `src/index.ts`:

```ts
export { createExportFinding, exportFindingKinds, isExportFindingKind, normalizeExportFindingKind } from "./findings";

export type { LessonExportFinding, LessonExportFindingKind } from "./findings";
```

The important design point is that the registry becomes the source of truth, not a second representation maintained
beside the union.

---

### 3. Add pure report aggregation contracts

Add `packages/lesson-export-core/src/reporting.ts`.

Define minimal, host-agnostic input types:

```ts
export type LessonExportReportStatus =
    | "exported"
    | "failed"
    | "skipped";

export interface LessonExportReportFindingLike {
    readonly kind: unknown;
}

export interface LessonExportReportErrorLike {
    readonly kind?: unknown;
}

export interface LessonExportReportEntryLike {
    readonly status: LessonExportReportStatus;
    readonly findings?: readonly LessonExportReportFindingLike[];
    readonly error?: LessonExportReportErrorLike;
}
```

Define output types:

```ts
export interface LessonExportStatusCounts {
    readonly exported: number;
    readonly failed: number;
    readonly skipped: number;
}

export type LessonExportKindCounts = Partial<
    Record<LessonExportFindingKind, number>
>;

export interface LessonExportSummary extends LessonExportStatusCounts {
    readonly selected: number;
    readonly findings: number;
    readonly findingsByKind: LessonExportKindCounts;
    readonly failuresByKind: LessonExportKindCounts;
}
```

Add helpers:

```ts
export function countEntriesByStatus(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportStatusCounts;

export function countFindingsByKind(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportKindCounts;

export function countFailuresByKind(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportKindCounts;

export function buildExportSummary(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportSummary;
```

Aggregation rules:

- `selected` is `entries.length`;
- status counts always include `exported`, `failed`, and `skipped`, even when zero;
- finding counts use `normalizeExportFindingKind()`;
- legacy `"client-only"` is counted as `"client-only-island"`;
- unknown finding kinds are ignored;
- blank and non-string finding kinds are ignored;
- failure counts use `normalizeExportFindingKind(error.kind)`;
- entries without `error.kind` do not contribute to `failuresByKind`;
- `findings` is the total number of normalised, recognised findings, not the raw number of finding-like objects.

This keeps the summary deterministic and avoids leaking host-specific report shapes into core.

---

### 4. Export reporting contracts from the package root

Update `packages/lesson-export-core/src/index.ts`:

```ts
export { buildExportSummary, countEntriesByStatus, countFailuresByKind, countFindingsByKind } from "./reporting";

export type {
    LessonExportKindCounts,
    LessonExportReportEntryLike,
    LessonExportReportErrorLike,
    LessonExportReportFindingLike,
    LessonExportReportStatus,
    LessonExportStatusCounts,
    LessonExportSummary,
} from "./reporting";
```

The public API test should verify both function and type exports where the existing package-api test pattern supports
it.

---

### 5. Harden output-path tests

Strengthen tests around the current mapping contract. Change implementation only if the new tests reveal a real helper
bug.

Preserve this mapping:

| Route                                   | Expected PDF path shape                                   |
| --------------------------------------- | --------------------------------------------------------- |
| `/notes/`                               | `<rootDir>/notes/index.pdf`                               |
| `/notes/software-libraries/`            | `<rootDir>/notes/software-libraries/index.pdf`            |
| `/notes/software-libraries/api-design/` | `<rootDir>/notes/software-libraries/api-design.pdf`       |
| deeper lesson routes                    | `<rootDir>/<normalised-route-without-trailing-slash>.pdf` |

Cover:

- root notes route;
- one-level unit route;
- two-level lesson route;
- deeply nested lesson route;
- trailing and non-trailing input variants;
- `rootDir` with and without trailing separators;
- route segments that must not escape `rootDir`;
- already-normalised route inputs;
- Windows-safe expectations if the helper is intended to be cross-platform.

Prefer table-driven tests for these cases. Vitest’s test model is a good fit here because each test has a named case and
assertions, which keeps contract failures readable. ([vitest.dev][2])

---

## Test Plan

### 1. Add `findings.test.ts`

Create `packages/lesson-export-core/tests/findings.test.ts`.

Test cases:

- every value in `exportFindingKinds` passes `isExportFindingKind`;
- representative unknown values fail `isExportFindingKind`;
- `"client-only"` normalises to `"client-only-island"`;
- canonical values normalise to themselves;
- unknown strings normalise to `undefined`;
- blank strings normalise to `undefined`;
- non-string values normalise to `undefined`;
- `createExportFinding()` accepts a new Phase 8 kind such as `"unresolved-todo"`;
- `exportFindingKinds` does not contain duplicate values.

Useful BDD-style names:

```ts
it("accepts every canonical finding kind");
it("normalises the legacy client-only marker");
it("rejects unknown and malformed finding kinds");
it("keeps createExportFinding aligned with the canonical registry");
```

---

### 2. Add `reporting.test.ts`

Create `packages/lesson-export-core/tests/reporting.test.ts`.

Test cases:

- `countEntriesByStatus()` returns zero defaults for an empty list;
- status counts include `exported`, `failed`, and `skipped`;
- `countFindingsByKind()` groups canonical kinds;
- `countFindingsByKind()` normalises `"client-only"` to `"client-only-island"`;
- `countFindingsByKind()` ignores unknown, blank, and non-string kinds;
- `countFailuresByKind()` groups recognised `error.kind` values;
- `countFailuresByKind()` ignores entries without `error.kind`;
- `buildExportSummary()` returns the expected additive summary for mixed entries;
- `buildExportSummary()` does not mutate input entries.

A representative mixed-entry fixture should include:

- one exported entry with no findings;
- one exported entry with `"hidden-content"`;
- one failed entry with `error.kind = "pdf-generation-failed"`;
- one skipped entry with `"client-only"`;
- one entry with an unknown finding kind that must be ignored.

---

### 3. Update `package-api.test.ts`

Assert that the package root exports:

- `exportFindingKinds`;
- `isExportFindingKind`;
- `normalizeExportFindingKind`;
- `countEntriesByStatus`;
- `countFindingsByKind`;
- `countFailuresByKind`;
- `buildExportSummary`.

This prevents accidental internal-only implementation of contracts intended for Phase 8 consumers.

---

### 4. Update `output-paths.test.ts`

Add table-driven route/path cases for:

- `/notes/`;
- `/notes`;
- `/notes/software-libraries/`;
- `/notes/software-libraries`;
- `/notes/software-libraries/api-design/`;
- `/notes/software-libraries/api-design`;
- `/notes/software-libraries/api-design/naming/`;
- safe `rootDir` behaviour.

Also include at least one negative or safety case if the existing helper exposes path-escape validation.

---

### 5. Keep `validation.test.ts` passing

Ensure manifest validation still recognises all previous validation finding kinds after deriving
`LessonExportFindingKind` from the registry.

The test should confirm that expanding the registry does not weaken current manifest validation semantics.

---

## Suggested Implementation Order

1. Refactor or add `findings.ts` registry.
2. Update `LessonExportFindingKind` to derive from the registry.
3. Add `isExportFindingKind()` and `normalizeExportFindingKind()`.
4. Add `findings.test.ts`.
5. Add `reporting.ts`.
6. Add `reporting.test.ts`.
7. Export new contracts from `src/index.ts`.
8. Update `package-api.test.ts`.
9. Expand `output-paths.test.ts`.
10. Run the package verification command.
11. Fix implementation only where tests expose a real contract mismatch.

This order keeps the refactor small and preserves a TDD rhythm: define the contract, test the contract, then expose it.

---

## Verification

Run:

```bash
pnpm run check:lesson-export-core
```

Optionally run the narrower package test command first if one exists, then the full package check.

---

## Acceptance Criteria

This step is complete when:

- `exportFindingKinds` is the canonical source of finding kinds;
- `LessonExportFindingKind` is derived from the registry;
- legacy `"client-only"` is normalised but not canonicalised;
- unknown finding kinds are ignored by aggregation helpers;
- report aggregation is pure and host-agnostic;
- all new helpers are exported from `src/index.ts`;
- output-path tests cover Phase 8 route/path cases;
- no PDF script behaviour changes;
- `pnpm run check:lesson-export-core` passes.

---

## Risks and Mitigations

### Risk: Registry and existing validation drift

Mitigation: derive the public union from the registry and keep validation tests asserting existing manifest findings.

### Risk: Report helpers accidentally encode script-local assumptions

Mitigation: keep input types minimal and structural: `status`, `findings`, and optional `error.kind` only.

### Risk: Unknown findings silently hide future bugs

Mitigation: ignore unknown kinds in core aggregation for compatibility, but leave later CLI/reporting phases free to
surface unknown raw findings as diagnostics.

### Risk: Output-path tests force implementation churn

Mitigation: treat this as a characterization pass. Only change implementation when a test reveals behaviour that
violates the already-agreed route/output contract.

---

## References

- Semantic Versioning 2.0.0: public APIs should be declared precisely and comprehensively, which supports making these
  new exports explicit and additive. ([Semantic Versioning][1])
- Vitest writing-tests guide: named test cases plus explicit assertions support the table-driven contract tests proposed
  here. ([vitest.dev][2])

[1]: https://semver.org/?utm_source=chatgpt.com "Semantic Versioning 2.0.0 | Semantic Versioning"
[2]: https://vitest.dev/guide/learn/writing-tests?utm_source=chatgpt.com "Writing Tests | Guide"
