# `@ravenhill/lesson-export-core`

Host-agnostic primitives for planning lesson exports.

The package provides pure helpers for:

- normalizing lesson routes;
- deriving export routes;
- deriving manifest-relative PDF output paths;
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

Subpath imports such as `@ravenhill/lesson-export-core/reporting` or
`@ravenhill/lesson-export-core/findings` are not public API. The package
metadata intentionally exposes only the root entry point, and the packed
consumer check verifies that internal `src/*`, `dist/*`, reporting, and
finding subpaths stay private.

## Example

```ts
import { deriveExportRoute, derivePdfOutputPath, normalizeLessonRoute } from "@ravenhill/lesson-export-core";

const route = normalizeLessonRoute("notes/software-libraries/artifacts-taxonomy");

console.log(deriveExportRoute(route));
console.log(derivePdfOutputPath(route));
```

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
CLI parsing, and process exit behaviour stay in the consuming application.
