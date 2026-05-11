# `@ravenhill/lesson-export-core`

Host-agnostic primitives for planning lesson exports.

The package provides pure helpers for:

- normalizing lesson routes;
- deriving export routes;
- deriving manifest-relative PDF output paths;
- filtering export manifests;
- reporting structured manifest findings.

It does not render Astro components, launch browsers, read generated site data, or write PDFs.

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
