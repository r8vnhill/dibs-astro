# Iosevka provenance

This directory pins the upstream Iosevka source used to generate the `DIBS Sans` and `DIBS Slab` webfonts, and holds
the custom build plans that generate them. It is a provenance and build-plan boundary only: nothing here is part of
the site's runtime or build dependency graph, and Iosevka is not vendored as a Git submodule.

If you are new to this directory: Iosevka is a single open-source type family that can generate many different
faces from the same design space by "custom build." DIBS uses that to derive two visually distinct, non-monospaced
faces (a sans for body/UI text and a slab serif for headings) that still share metrics, punctuation, and technical
glyph design, without paying for two separate commercial fonts.

## Contents

- `upstream.json` — the pinned Iosevka release: version, tag, commit, upstream repository, source archive URL and
  SHA-256, license, and the build-plan revision that was generated against it.
- `private-build-plans.toml` — the Iosevka custom build plans for `DIBS Sans` and `DIBS Slab`.

## Build plans

The plan identifiers (`dibs-sans`, `dibs-slab`) are stable tooling inputs, not CSS family names. The CSS family
names come from each plan's `family` property (`DIBS Sans`, `DIBS Slab`).

| Plan        | Serifs | Weights              | Slopes            |
| ----------- | ------ | --------------------- | ----------------- |
| `dibs-sans` | sans   | Regular, Medium, Bold | Upright and Italic |
| `dibs-slab` | slab   | Medium, Bold          | Upright only       |

Both use quasi-proportional spacing, request WOFF2 output, and are restricted to exactly the weight/style/width states
the DIBS typography contract requires — no unused weights, obliques, or extended widths.

## Ligature configuration

The official Iosevka Aile/Etoile packages (the upstream sans/slab presets DIBS derives from) ship with ligatures
off, so both DIBS build plans declare an explicit `ligations` subsection that cherry-picks only the Iosevka `calt`
groups needed to shape the DIBS technical-ligature corpus:

| Sequence | Iosevka group    |
| -------- | ---------------- |
| `->`     | `arrow-r-hyphen`  |
| `<-`     | `arrow-l-hyphen`  |
| `<->`    | `arrow-lr-hyphen` |
| `=>`     | `arrow-r-equal`   |
| `<=`     | `lteq`            |
| `>=`     | `gteq`            |
| `!=`     | `exeq`            |
| `==`     | `eqeq`            |
| `===`    | `eqeq`            |

Neither plan sets `inherits`, so no broader preset (`dlig`, `default-calt`, a language preset, etc.) contributes
ligatures beyond this table — see [Iosevka's custom-build documentation][custom-build] for the full group list if
you need to extend it.

The common ligatures `fi`, `fl`, `ffi`, and `ffl` are **not** part of this cherry-picked `calt` group list: Iosevka's
custom-build documentation does not describe them as configurable groups, so they are expected to follow the
standard `liga` feature instead, which only `noLigation` disables (neither plan sets it).

Because that `liga` behavior is not documented for a quasi-proportional custom build, treat each generated family as
a ligature **candidate**, not conforming, until all four common ligatures are actually observed rendering correctly
in a browser.

The plan revision in `upstream.json` is the SHA-256 digest of the exact `private-build-plans.toml` file. The
typography build-plan test (below) parses the committed TOML, checks its role-specific dimensions and ligature
groups against the shared typography contract, and verifies that this digest still matches — so an edit to the TOML
without updating `upstream.json` fails the test rather than drifting silently.

---

## Verifying the pinned source

```sh
curl -sL -o iosevka-34.8.0.tar.gz \
    https://github.com/be5invis/Iosevka/archive/refs/tags/v34.8.0.tar.gz
sha256sum iosevka-34.8.0.tar.gz
```

The resulting digest must match `sourceArchive.sha256` in `upstream.json`. The `commit` field is the authoritative
pin; the archive digest is a convenience check recorded at pin time, since GitHub's tag-archive endpoint is not a
cryptographically guaranteed-stable artifact the way a release-uploaded asset is.

The provenance files are not read by Astro and do not generate fonts during `pnpm dev`, `pnpm test`, or `pnpm build`.
Font generation remains an explicit tooling operation against the pinned source and the committed build plans:

```sh
pnpm fonts:generate
pnpm fonts:check
```

`fonts:generate` downloads the pinned archive into the ignored `tmp/fonts/` cache, verifies its SHA-256, runs
Iosevka's `woff2-unhinted` targets, and publishes only the required WOFF2 files to `public/fonts/`. The command is
deliberately separate from normal site workflows; the committed assets make a clean checkout usable without the
Iosevka build toolchain. An already downloaded archive can be supplied for an offline regeneration with
`pnpm fonts:generate -- --source-archive path/to/iosevka-34.8.0.tar.gz`.

`public/fonts/provenance.json` records the upstream pin, build-plan digest, license digest, and SHA-256 for every
generated asset. `fonts:check` verifies those records without downloading or compiling anything.

The plan contract can be checked without building Iosevka:

```sh
pnpm exec vitest run src/lib/typography/__tests__/dibs-font-build-plans.test.ts --config vitest.config.ts
```

The TOML parser used by that test is a development-only dependency; it is not part of the site's runtime dependency
graph.

---

## License

Iosevka is licensed under the SIL Open Font License 1.1, which permits zero-cost development, self-hosted
deployment, web embedding, and redistribution. See `licenseUrl` in `upstream.json` for the license text at the
pinned tag.

---

## Updating the pin

Bumping the Iosevka version is a deliberate decision, not an automatic upgrade. Update `version`, `tag`, `commit`,
and `sourceArchive` in `upstream.json` together, verify the new archive digest, and regenerate the `DIBS Sans` and
`DIBS Slab` webfonts from the updated pin.

[custom-build]: https://github.com/be5invis/Iosevka/blob/v34.8.0/doc/custom-build.md#configuring-ligations
