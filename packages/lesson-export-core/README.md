# `@ravenhill/lesson-export-core`

Host-agnostic primitives for planning lesson exports.

The package provides pure helpers for:

- normalizing lesson routes;
- deriving export routes;
- deriving manifest-relative PDF output paths;
- exposing a data-only book export planning contract;
- filtering export manifests;
- reporting structured manifest findings;
- normalizing export finding kinds;
- aggregating host-provided export report entries;
- evaluating host-provided finding policies.

It does not render Astro components, launch browsers, read generated site data, or write PDFs.

Route semantics:

- `normalizeLessonRoute()` canonicalizes site-relative route-shaped input.
- It rejects raw query strings, raw fragments, relative path segments, absolute URLs, and control characters.
- It does not enforce that the route belongs to `/notes/**`; that remains a manifest-validation concern.

Manifest filtering with `filterManifest()`:

- `all` filter returns a new entries array containing all entries (wrapper copy).
- `exact-route` filter returns entries whose route exactly matches the normalized filter route.
- `subtree` filter returns entries that are **descendants only** of the normalized route prefix (the prefix root itself
  is excluded). For example, filtering by `/notes/software-libraries/` excludes an entry at `/notes/software-libraries/`
  but includes `/notes/software-libraries/diary/`. Sibling prefixes like `/notes/software-libraries-advanced/` are also
  excluded due to canonical route shape with trailing slashes.

## Import Policy

Import from the package root only:

```ts
import {
    buildExportSummary,
    derivePdfOutputPath,
    hasFatalExportFindings,
    normalizeLessonRoute,
} from "@ravenhill/lesson-export-core";
```

Subpath imports such as `@ravenhill/lesson-export-core/reporting` or `@ravenhill/lesson-export-core/findings` are not
public API. The package metadata intentionally exposes only the root entry point, and the packed consumer check verifies
that internal `src/*`, `dist/*`, reporting, and finding subpaths stay private.

## Example

```ts
import { deriveExportRoute, derivePdfOutputPath, normalizeLessonRoute } from "@ravenhill/lesson-export-core";

const route = normalizeLessonRoute("notes/software-libraries/artifacts-taxonomy");

console.log(deriveExportRoute(route));
console.log(derivePdfOutputPath(route));
```

## Book Planning Contract

`planBookExports()` creates data-only book planning targets from host-provided course-tree and manifest data:

```ts
import { planBookExports } from "@ravenhill/lesson-export-core";

const plan = planBookExports({
    course: [
        {
            id: "unit-1",
            title: "Unidad 1",
            kind: "group",
            children: [
                {
                    id: "lesson-1",
                    title: "Primera lección",
                    kind: "link",
                    href: "/notes/lesson-1",
                },
            ],
        },
    ],
    manifest: {
        generatedAt: new Date().toISOString(),
        entries: [
            {
                route: "/notes/lesson-1/",
                exportRoute: "/exports/pdf/notes/lesson-1/",
                title: "Primera lección",
                sourceFile: "src/pages/notes/lesson-1/index.astro",
                outputPath: "dist/pdf/notes/lesson-1.pdf",
            },
        ],
    },
    outDir: "dist/pdf",
    availablePdfPaths: new Set(["dist/pdf/notes/lesson-1.pdf"]),
    fullCourse: { title: "DIBS" },
});

console.log(plan.targets);
console.log(plan.targets[0]?.lessons);
```

The planner currently creates the full-course target in course pre-order and one unit target for each top-level course
group with exportable descendants. Unit targets use the top-level group id and title, include only descendant lessons
with manifest entries, and do not promote nested structural groups into independent book targets. Structural groups and
lessons absent from the manifest are skipped without findings.

Course links and manifest entries are matched by normalized lesson route, so common spelling differences such as a
missing leading slash or missing trailing slash still resolve to the same lesson. If multiple manifest entries normalize
to the same route, the planner keeps the first entry in manifest order and reports `duplicate-manifest-route` warning
findings for later duplicates.

Book target output paths are deterministic and stay under the requested `outDir`:

- full-course bundles use `<outDir>/books/full-course.pdf`;
- unit bundles use `<outDir>/books/units/<unit-id>.pdf`.

Target ids are rejected instead of rewritten when they look path-like or unsafe, including POSIX traversal, absolute
paths, Windows drive paths, or backslash traversal. Unsafe book targets produce `unsafe-output-path` findings and are
omitted from `plan.targets`.

The host provides `availablePdfPaths` so the planner can compare each manifest-matched lesson PDF path against already
exported inputs without reading the filesystem. Missing lesson PDFs produce `missing-input` findings with warning
severity on every affected target and in the aggregate `plan.findings` list. Targets and lesson entries remain present;
the consuming adapter decides whether missing inputs should only be reported, fail a dry run, or block later PDF
assembly.

## Findings and Reports

Use the canonical finding registry when validating CLI input, normalizing report data, or evaluating whether findings
match a host-provided failure policy:

```ts
import {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    hasFatalExportFindings,
    normalizeExportFindingKind,
} from "@ravenhill/lesson-export-core";

console.log(normalizeExportFindingKind("client-only"));
console.log(countEntriesByStatus([{ status: "exported" }]));
console.log(countFindingsByKind([{ status: "exported", findings: [{ code: "client-only" }] }]));
console.log(countFailuresByKind([{ status: "failed", error: { kind: "pdf-generation-failed" } }]));
console.log(buildExportSummary([
    {
        status: "exported",
        findings: [{ code: "client-only" }],
    },
]));
console.log(hasFatalExportFindings([
    {
        status: "exported",
        findings: [{ code: "client-only" }],
    },
], ["client-only-island"]));
```

The package only aggregates structural report data. Rendering, DOM collection, browser automation, filesystem writes,
CLI parsing, and process exit behavior stay in the consuming application.
