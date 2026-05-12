# `@ravenhill/lesson-export-core`

Host-agnostic primitives for planning lesson exports.

The package provides pure helpers for:

- normalizing lesson routes;
- deriving export routes;
- deriving manifest-relative PDF output paths;
- filtering export manifests;
- reporting structured manifest findings;
- normalizing export finding kinds;
- aggregating host-provided export report entries.

It does not render Astro components, launch browsers, read generated site data, or write PDFs.

Route semantics:

- `normalizeLessonRoute()` canonicalizes site-relative route-shaped input.
- It rejects raw query strings, raw fragments, relative path segments, absolute URLs, and control characters.
- It does not enforce that the route belongs to `/notes/**`; that remains a manifest-validation concern.

## Import Policy

Import from the package root only:

```ts
import { derivePdfOutputPath, normalizeLessonRoute } from "@ravenhill/lesson-export-core";
```

Subpath imports are not public API.

## Example

```ts
import { deriveExportRoute, derivePdfOutputPath, normalizeLessonRoute } from "@ravenhill/lesson-export-core";

const route = normalizeLessonRoute("notes/software-libraries/artifacts-taxonomy");

console.log(deriveExportRoute(route));
console.log(derivePdfOutputPath(route));
```

## Findings and Reports

Use the canonical finding registry when validating CLI input or normalizing report data:

```ts
import { buildExportSummary, normalizeExportFindingKind } from "@ravenhill/lesson-export-core";

console.log(normalizeExportFindingKind("client-only"));
console.log(buildExportSummary([{ status: "failed", error: { kind: "pdf-generation-failed" } }]));
```

The package only aggregates structural report data. Rendering, DOM collection, browser automation, filesystem writes,
and process exit policy stay in the consuming application.
