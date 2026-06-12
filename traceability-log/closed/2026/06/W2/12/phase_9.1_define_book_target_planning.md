# [PLAN] Phase 9.1: Define Book Target Planning

## Summary

Create a pure, host-agnostic planning layer for book PDF targets in `@ravenhill/lesson-export-core`.

The planner derives:

- one full-course bundle;
- one bundle per top-level course unit group;
- lesson entries in existing course order;
- deterministic output paths under `outDir`;
- findings for missing already-exported lesson PDF inputs.

No PDFs are generated in this phase. No CLI is added. No filesystem reads are performed by the core package. The output
is data-only so Phase 9.2 can expose it through a dry-run CLI.

## Scope Classification

This is a small implementation slice, so it should be organized as short red-green-refactor cycles.

The work is limited to a pure planning API, public exports, and unit tests. It does not justify additional phases
because there is no I/O, no PDF assembly, no CLI behavior, and no renderer evaluation.

## Global Non-Goals

- Do not generate PDFs.
- Do not add `pdf-lib`.
- Do not add CLI flags or package scripts.
- Do not read from the filesystem.
- Do not import Astro app data into `@ravenhill/lesson-export-core`.
- Do not change single-lesson PDF export behavior.
- Do not rewrite existing lesson output paths.
- Do not decide CLI exit behavior for missing inputs.
- Do not add changelog entries unless explicitly requested.
- Do not use “violation” terminology; use “finding.”

## Proposed Public API

Add a new module:

```ts
// packages/lesson-export-core/src/book-planning.ts
```

Export from:

```ts
// packages/lesson-export-core/src/index.ts
```

Suggested public types:

```ts
export interface BookExportPlan {
    readonly targets: readonly BookExportTarget[];
    readonly findings: readonly BookExportFinding[];
}

export interface BookExportTarget {
    readonly id: string;
    readonly title: string;
    readonly kind: "full-course" | "unit";
    readonly outputPath: string;
    readonly lessons: readonly BookExportLessonEntry[];
    readonly findings: readonly BookExportFinding[];
}

export interface BookExportLessonEntry {
    readonly id: string;
    readonly title: string;
    readonly route: string;
    readonly pdfPath: string;
}

export interface BookExportFinding {
    readonly code: "missing-input" | "unsafe-output-path";
    readonly severity: "warning" | "error";
    readonly message: string;
    readonly targetId?: string;
    readonly lessonId?: string;
    readonly route?: string;
    readonly path?: string;
}
```

Suggested planner signature:

```ts
export interface PlanBookExportsOptions {
    readonly course: CourseTree;
    readonly manifest: LessonExportManifest;
    readonly outDir: string;
    readonly availablePdfPaths: ReadonlySet<string>;
    readonly fullCourse?: {
        readonly id?: string;
        readonly title: string;
    };
}

export function planBookExports(options: PlanBookExportsOptions): BookExportPlan;
```

The exact input type names can follow the package’s existing naming conventions. The important contract is that
`planBookExports` receives plain data and returns plain data.

## ~~Cycle 1: Add the Public Planning Contract~~

### Goal

Introduce the book-planning API shape without implementing traversal logic yet.

Status: implemented. The public contract lives in `packages/lesson-export-core/src/book-planning.ts`, is exported from
the package root, and is covered by `packages/lesson-export-core/tests/book-planning.test.ts` plus the root package API
test. The implementation currently returns an empty plan for the empty-course contract case only; traversal, target
construction, output paths, and findings remain deferred to later cycles.

### Scope

- Add `BookExportTarget`.
- Add `BookExportLessonEntry`.
- Add `BookExportFinding`.
- Add `BookExportPlan`.
- Add `planBookExports(...)`.
- Export the planner and types from the package root.

### Red

Add tests under:

```txt
packages/lesson-export-core/tests/book-planning.test.ts
```

BDD-style tests:

```ts
describe("planBookExports", () => {
    test("exposes a public planner that returns a book export plan", () => {
        const plan = planBookExports({
            course: emptyCourse(),
            manifest: emptyManifest(),
            outDir: "dist/pdf",
            availablePdfPaths: new Set(),
            fullCourse: { title: "The Red Book of Westmarch" },
        });

        expect(plan.targets).toEqual([]);
        expect(plan.findings).toEqual([]);
    });
});
```

Also add a public API test if the package already has one:

```ts
test("exports the book planning API from the package root", async () => {
    const module = await import("../src/index");

    expect(module.planBookExports).toBeTypeOf("function");
});
```

### Green

- Add placeholder types.
- Add a minimal `planBookExports` implementation that returns an empty plan for an empty course.
- Export the function and types from `src/index.ts`.

### Refactor

- Keep type definitions close to the planner.
- Use `readonly` arrays and properties consistently.
- Prefer `export type` for type-only root exports where appropriate.

### Acceptance Criteria

- The package compiles.
- Tests can import `planBookExports`.
- Empty input returns an empty, well-formed plan.
- Public exports are available from the package root.

### Non-Goals

- No course traversal yet.
- No output path generation yet.
- No missing-input detection yet.

### Suggested Execution Order

1. Add the failing public contract test.
2. Add minimal types and function.
3. Export from `src/index.ts`.
4. Run the package test/typecheck target.

## ~~Cycle 2: Plan the Full-Course Target in Course Order~~

### Goal

Create the full-course book target using existing pre-order course traversal and manifest-matched lesson entries.

Status: implemented. `planBookExports` now builds a normalized manifest route lookup, traverses the host-provided
course tree in pre-order, skips structural groups, skips course lessons without manifest entries, and creates one
`full-course` target when exportable lessons exist. Coverage lives in
`packages/lesson-export-core/tests/book-planning.test.ts`, and the package README describes the current Cycle 2
planner behavior.

### Scope

- Match course lessons to manifest entries by normalized route.
- Include only lessons with matching manifest entries.
- Skip root/group entries that are structural and non-exportable.
- Preserve existing course order.

### Red

Add BDD-style tests with Tolkien-inspired fixture data:

```ts
describe("full-course book planning", () => {
    test("plans the full-course target in pre-order course order", () => {
        const plan = planBookExports({
            course: courseTree([
                unitGroup("unit-1", "The Shire", [
                    lesson("bag-end", "/notes/bag-end"),
                    lesson("the-green-dragon", "/notes/the-green-dragon"),
                ]),
                unitGroup("unit-2", "Rivendell", [
                    lesson("the-council-of-elrond", "/notes/the-council-of-elrond"),
                ]),
            ]),
            manifest: manifestWithRoutes([
                "/notes/bag-end",
                "/notes/the-green-dragon",
                "/notes/the-council-of-elrond",
            ]),
            outDir: "dist/pdf",
            availablePdfPaths: new Set([
                "dist/pdf/notes/bag-end.pdf",
                "dist/pdf/notes/the-green-dragon.pdf",
                "dist/pdf/notes/the-council-of-elrond.pdf",
            ]),
            fullCourse: { title: "There and Back Again" },
        });

        expect(plan.targets).toHaveLength(1);
        expect(plan.targets[0]).toMatchObject({
            id: "full-course",
            title: "There and Back Again",
            kind: "full-course",
        });
        expect(plan.targets[0].lessons.map((lesson) => lesson.route)).toEqual([
            "/notes/bag-end",
            "/notes/the-green-dragon",
            "/notes/the-council-of-elrond",
        ]);
    });

    test("skips structural course groups without reporting findings", () => {});
});
```

### Green

- Implement route normalization.
- Build a manifest lookup by normalized route.
- Traverse the course tree in pre-order.
- Add matching lesson entries to the full-course target.
- Ignore structural groups that do not represent exportable lessons.

### Refactor

- Extract small helpers:

  - `normalizeLessonRoute(...)`;
  - `createManifestByRoute(...)`;
  - `collectExportableLessonEntries(...)`.
- Keep each helper independently testable if it carries non-trivial behavior.
- Keep implementation blocks short and intention-revealing.

### Acceptance Criteria

- One full-course target is created when exportable lessons exist.
- Full-course lesson order follows existing course pre-order.
- Structural root/group entries are skipped without findings.
- Lessons absent from the manifest are not included.

### Non-Goals

- No unit targets yet.
- No missing-input findings yet.
- No path-safety validation yet.

### Suggested Execution Order

1. Add the full-course order test.
2. Add manifest route lookup.
3. Add pre-order traversal.
4. Add group skipping.
5. Refactor route normalization.

## ~~Cycle 3: Plan Top-Level Unit Targets~~

### Goal

Create one unit book target per top-level course group with children.

Status: implemented. `planBookExports` now creates one `unit` target for each top-level course group that has at least
one exportable descendant lesson. Unit target ids and titles come from the top-level group, nested groups remain
structural only, and unit lesson lists reuse the same manifest-matched descendant collection as the full-course target.
Coverage lives in `packages/lesson-export-core/tests/book-planning.test.ts`, and the package README describes the
current Cycle 3 planner behavior.

### Scope

- Treat only top-level `group` lessons with children as unit bundle targets.
- Use unit group ids as target ids.
- Use unit group titles as target titles.
- Include only descendant lessons with manifest entries.
- Exclude lessons from other units.

### Red

Add tests:

```ts
describe("unit book planning", () => {
    test("creates one target per top-level unit group", () => {
        const plan = planBookExports(unitFixture());

        expect(plan.targets.map((target) => target.id)).toEqual([
            "full-course",
            "unit-1",
            "unit-2",
        ]);
    });

    test("includes only descendant lessons for each unit target", () => {
        const plan = planBookExports(unitFixture());

        const unitOne = findTarget(plan, "unit-1");
        const unitTwo = findTarget(plan, "unit-2");

        expect(unitOne.lessons.map((lesson) => lesson.id)).toEqual([
            "bag-end",
            "the-green-dragon",
        ]);
        expect(unitTwo.lessons.map((lesson) => lesson.id)).toEqual([
            "the-council-of-elrond",
        ]);
    });

    test("does not create unit targets for nested groups", () => {});
});
```

### Green

- Identify top-level group nodes.
- For each top-level group with children, collect descendant exportable lessons.
- Create one target per unit group that has at least one exportable descendant.

### Refactor

- Reuse the same descendant collection logic for full-course and unit targets.
- Keep target construction in a dedicated helper:

  - `createFullCourseTarget(...)`;
  - `createUnitTarget(...)`.
- Avoid duplicating route matching logic.

### Acceptance Criteria

- Unit targets are created only for top-level groups with children.
- Unit target ids come from top-level group ids.
- Unit target titles come from top-level group titles.
- Unit targets include only their descendant exportable lessons.
- Nested groups do not become independent book targets.

### Non-Goals

- No custom unit selection.
- No CLI filtering.
- No lesson reordering.

### Suggested Execution Order

1. Add unit target count test.
2. Add descendant inclusion test.
3. Add nested group exclusion test.
4. Implement top-level group detection.
5. Refactor shared target creation.

## ~~Cycle 4: Add Deterministic Safe Output Paths~~

### Goal

Generate safe, deterministic book output paths under `outDir`.

Status: implemented. `planBookExports` now assigns deterministic full-course and unit book paths under `outDir`,
rejects path-like or unsafe target ids with `unsafe-output-path` findings, and omits unsafe targets from the returned
target list. Coverage lives in `packages/lesson-export-core/tests/book-planning.test.ts`, and the package README
documents the planned book path contract.

### Scope

- Full-course path:

  - `<outDir>/books/full-course.pdf`
- Unit paths:

  - `<outDir>/books/units/<unit-id>.pdf`
- Reject target ids that would produce traversal or absolute paths.
- Reject Windows drive paths and backslash-based traversal.
- Keep path safety independent from single-lesson output naming.

### Red

Use DDT for unsafe target ids and path-like ids:

```ts
describe("book output path safety", () => {
    test("plans deterministic output paths under outDir", () => {
        const plan = planBookExports(unitFixture({ outDir: "dist/pdf" }));

        expect(findTarget(plan, "full-course").outputPath).toBe(
            "dist/pdf/books/full-course.pdf",
        );
        expect(findTarget(plan, "unit-1").outputPath).toBe(
            "dist/pdf/books/units/unit-1.pdf",
        );
    });

    test.each([
        ["../outside"],
        ["units/../../outside"],
        ["/absolute/path"],
        ["C:\\outside"],
        ["..\\outside"],
    ])("reports unsafe target ids as findings: %s", (unsafeId) => {
        const plan = planBookExports(unitFixtureWithUnitId(unsafeId));

        expect(plan.findings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: "unsafe-output-path",
                    severity: "error",
                }),
            ]),
        );
    });
});
```

### Green

- Add a dedicated `createSafeBookOutputPath(...)` helper.
- Build paths from sanitized target ids, not arbitrary paths.
- Validate that resolved output paths remain inside the resolved `outDir`.
- Normalize emitted paths to the package’s expected path style.

### Refactor

- Keep path validation small and explicit.
- Prefer rejecting suspicious ids over silently rewriting them.
- Keep output path concerns separate from route normalization.

### Acceptance Criteria

- Full-course and unit paths are deterministic.
- All book outputs stay under `outDir`.
- Traversal, absolute POSIX paths, Windows drive paths, and backslash traversal are rejected.
- Unsafe targets produce findings and are not allowed to escape `outDir`.

### Non-Goals

- No user-configurable book filenames.
- No single-lesson path changes.
- No filesystem existence checks.

### Suggested Execution Order

1. Add deterministic output path test.
2. Add unsafe id DDT matrix.
3. Implement path helper.
4. Add resolved-path containment validation.
5. Refactor emitted path formatting.

## ~~Cycle 5: Report Missing Lesson PDF Inputs~~

### Goal

Represent absent already-exported lesson PDFs as findings while preserving valid targets and valid lesson entries.

Status: implemented. `planBookExports` now compares each planned lesson PDF path with the host-provided
`availablePdfPaths` set, attaches `missing-input` warning findings to every affected target, mirrors those target
findings in `plan.findings`, and keeps targets and lesson entries present for the consuming adapter to decide later
CLI or assembly policy. Coverage lives in `packages/lesson-export-core/tests/book-planning.test.ts`, and the package
README documents the missing-input contract.

### Scope

- Accept `availablePdfPaths` as input.
- Compare each manifest-matched lesson PDF path against `availablePdfPaths`.
- Add `missing-input` findings to the relevant target.
- Keep the target in the plan.
- Keep valid lessons in the plan.
- Do not decide whether missing inputs are fatal.

### Red

Add tests:

```ts
describe("missing input findings", () => {
    test("reports missing lesson PDFs on the relevant target", () => {
        const plan = planBookExports({
            ...unitFixtureOptions(),
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
        });

        const fullCourse = findTarget(plan, "full-course");

        expect(fullCourse.findings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: "missing-input",
                    severity: "warning",
                    lessonId: "the-green-dragon",
                }),
            ]),
        );
    });

    test("keeps valid lessons and targets when some inputs are missing", () => {
        const plan = planBookExports({
            ...unitFixtureOptions(),
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
        });

        expect(findTarget(plan, "full-course").lessons.map((lesson) => lesson.id))
            .toContain("bag-end");
        expect(plan.targets.map((target) => target.id)).toContain("unit-1");
    });
});
```

### Green

- Add available-input lookup.
- Attach missing-input findings to every affected target.
- Mirror target findings at plan level only if the existing package style favors aggregate findings.
- Keep severity as `warning`, because Phase 9.2 will decide CLI exit behavior.

### Refactor

- Avoid recomputing missing-input checks in multiple target constructors.
- Consider a helper:

  - `createLessonEntryFinding(...)`;
  - `withMissingInputFindings(...)`.
- Keep finding messages stable enough for tests, but assert on structured fields rather than full prose where possible.

### Acceptance Criteria

- Missing lesson PDFs are reported as `missing-input`.
- Findings include enough context to diagnose the issue:

  - target id;
  - lesson id;
  - route;
  - PDF path.
- Targets remain present when some inputs are missing.
- Valid lessons remain usable.
- No filesystem reads are introduced.

### Non-Goals

- No CLI failure policy.
- No automatic skipping policy.
- No PDF repair or regeneration.

### Suggested Execution Order

1. Add missing-input test.
2. Add preservation test.
3. Implement available path lookup.
4. Attach findings to targets.
5. Refactor finding construction.

## ~~Cycle 6: Harden Route and Manifest Matching~~

### Goal

Make route matching predictable across common route formatting differences.

Status: implemented. `planBookExports` now builds a deterministic manifest index keyed by normalized lesson route,
matches course links and manifest entries across common leading- and trailing-slash spelling differences, keeps the first
manifest entry when later entries normalize to the same route, and reports `duplicate-manifest-route` warning findings
for those later duplicates. Coverage lives in `packages/lesson-export-core/tests/book-planning.test.ts`, and the package
README documents the normalized route matching and duplicate manifest route contract.

### Scope

- Normalize route keys consistently.
- Match course lessons to manifest entries by normalized lesson route.
- Avoid accidental duplicate manifest matches.
- Report or deterministically handle duplicate routes.

### Red

Add DDT route normalization tests:

```ts
describe("route matching", () => {
    test.each([
        ["/notes/bag-end", "/notes/bag-end/"],
        ["notes/bag-end", "/notes/bag-end"],
        ["/notes/bag-end/", "notes/bag-end"],
    ])("matches equivalent routes: %s and %s", (courseRoute, manifestRoute) => {
        const plan = planBookExports(routeFixture(courseRoute, manifestRoute));

        expect(findTarget(plan, "full-course").lessons).toHaveLength(1);
    });

    test("uses deterministic behavior for duplicate manifest routes", () => {});
});
```

### Green

- Implement one canonical route normalizer.
- Use the normalizer for both course and manifest entries.
- Decide duplicate behavior:

  - preferably report a finding and keep the first deterministic entry;
  - or reject duplicates as an error finding if that matches existing package conventions.

### Refactor

- Keep route normalization separate from output path normalization.
- Add tests only for behavior the current data actually needs.
- Do not over-generalize URL handling beyond lesson routes.

### Acceptance Criteria

- Equivalent route spellings match.
- Duplicate manifest routes are handled deterministically.
- Route normalization does not alter output path generation.
- Non-exportable course entries remain silently skipped.

### Non-Goals

- No URL parser dependency.
- No route rewrite behavior.
- No content route migration.

### Suggested Execution Order

1. Add equivalent-route DDT cases.
2. Add duplicate route test.
3. Implement canonical route normalizer.
4. Add duplicate handling.
5. Refactor manifest lookup.

## ~~Cycle 7: Finalize Public API and Package Integration~~

### Goal

Make the planning layer ready for Phase 9.2 consumption.

Status: implemented. The package root exports `planBookExports` and all public book-planning types, the root API test
asserts that the planner and type contract resolve from `../src`, and the packed consumer validation imports the
planner and book-planning types from `@ravenhill/lesson-export-core`. Internal helper functions remain private to
`src/book-planning.ts`.

### Scope

- Export all intended public types and functions.
- Ensure generated declarations are correct.
- Ensure tests follow existing package style.
- Keep internal helpers private unless there is a clear reuse case.

### Red

Add or update package-level tests:

```ts
describe("book planning public API", () => {
    test("exports the planner and public book planning types", async () => {
        const module = await import("../src/index");

        expect(module.planBookExports).toBeTypeOf("function");
    });
});
```

If type-test conventions exist, add a lightweight type assertion for `BookExportPlan`.

### Green

- Export `planBookExports`.
- Export public types.
- Keep helper functions unexported unless tests or downstream packages require them.

### Refactor

- Review naming consistency:

  - `BookExportTarget`
  - `BookExportLessonEntry`
  - `BookExportFinding`
  - `BookExportPlan`
- Keep module boundaries clean.
- Replace value imports with type-only imports where possible.

### Acceptance Criteria

- Root package export exposes the planner.
- Root package export exposes public book planning types.
- Tests pass.
- Typecheck passes.
- Phase 9.2 can consume the planner without importing internal files.

### Non-Goals

- No documentation site changes unless the package has mandatory API docs.
- No CLI wiring.
- No artifact generation.

### Suggested Execution Order

1. Add root export test.
2. Add final public exports.
3. Run tests.
4. Run typecheck.
5. Review public/internal boundary.

## Recommended Overall Execution Order

1. Cycle 1 — Add the public planning contract.
2. Cycle 2 — Plan the full-course target in course order.
3. Cycle 3 — Plan top-level unit targets.
4. Cycle 4 — Add deterministic safe output paths.
5. Cycle 5 — Report missing lesson PDF inputs.
6. Cycle 6 — Harden route and manifest matching.
7. Cycle 7 — Finalize public API and package integration.

## Validation Commands

Use the narrowest package-level checks available in the repository. For example:

```powershell
pnpm --filter @ravenhill/lesson-export-core test -- book-planning
pnpm --filter @ravenhill/lesson-export-core typecheck
```

If the package already uses a different script name, keep the existing convention rather than introducing a new one.

## Final Acceptance Criteria

- `planBookExports(...)` is exported from `@ravenhill/lesson-export-core`.
- The planner accepts plain course-tree and manifest input.
- The planner does not import Astro app data.
- The planner does not read the filesystem.
- The planner creates one full-course target when exportable lessons exist.
- The planner creates one unit target per top-level course group with exportable descendants.
- Lesson entries follow existing pre-order course order.
- Course lessons are matched to manifest entries by normalized route.
- Lessons without manifest entries are skipped without findings.
- Manifest entries whose PDF paths are unavailable produce `missing-input` findings.
- Planned output paths are deterministic and remain under `outDir`.
- Unsafe output path inputs produce `unsafe-output-path` findings.
- Public types and the planner are available from the package root.
- Existing single-lesson PDF export behavior is unchanged.

## Deferred to Phase 9.2

- CLI flags.
- Dry-run command output.
- Filesystem reads.
- CLI exit codes.
- Skip/fail policy for missing inputs.

## Deferred to Phase 9.3

- `pdf-lib`.
- Cover page generation.
- Table of contents generation.
- PDF merging.
- PDF metadata.
- Bundle report JSON.
