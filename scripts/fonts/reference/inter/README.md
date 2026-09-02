# Inter 4.1 evaluation reference

This directory pins the official Inter 4.1 release used only as the local visual and layout comparator for the DIBS Sans
body/UI experiment. It is not a production typography dependency.

The four committed WOFF2 files are copied unchanged from the `web/` directory of `Inter-4.1.zip`:

```text
400 normal  ← web/Inter-Regular.woff2
400 italic  ← web/Inter-Italic.woff2
500 normal  ← web/Inter-Medium.woff2
700 normal  ← web/Inter-Bold.woff2
```

`upstream.json` records the release archive, archive digest, source asset names, local asset digests, and the OFL-1.1
license digest. `public/dev-fixtures/fonts/inter-4.1/provenance.json` mirrors those records for the browser fixture.

## Commands

The normal check is offline:

```text
pnpm fonts:reference:check
```

To re-acquire the reference from the pinned release, use the explicit preparation command:

```text
pnpm fonts:reference:vendor
```

Neither command is invoked by dependency installation, development, tests, or production builds. The vendor command
downloads only the pinned release archive and verifies it before publishing the four expected files.
