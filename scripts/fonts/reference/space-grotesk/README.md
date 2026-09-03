# Space Grotesk 2.0.0 evaluation reference

This directory pins the official Space Grotesk 2.0.0 release used only as the local visual and layout comparator for the
DIBS Slab heading experiment. It is not a production typography dependency.

The two committed WOFF2 files are copied unchanged from the `woff2/static/` directory of `SpaceGrotesk-2.0.0.zip`:

```text
500 normal  ← woff2/static/SpaceGrotesk-Medium.woff2
700 normal  ← woff2/static/SpaceGrotesk-Bold.woff2
```

Only the native 500 and 700 upright weights are vendored, because those are the only states the heading role declares.
`upstream.json` records the release archive, archive digest, source asset names, local asset digests, byte counts, and
the OFL-1.1 license digest. `public/dev-fixtures/fonts/space-grotesk-2.0.0/provenance.json` mirrors those records for
the browser fixture.

## Commands

The normal check is offline and also runs as part of `pnpm fonts:reference:check`:

```text
pnpm fonts:reference:space-grotesk:check
```

To re-acquire the reference from the pinned release, use the explicit preparation command:

```text
pnpm fonts:reference:space-grotesk:vendor
```

Neither command is invoked by dependency installation, development, tests, or production builds. The vendor command
downloads only the pinned release archive and verifies it before publishing the two expected files.
