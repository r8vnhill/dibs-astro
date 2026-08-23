# Iosevka provenance

This directory pins the upstream Iosevka source used to generate the DIBS Sans and DIBS Slab webfonts. It is a
provenance and build-plan boundary only: nothing here is part of the site's runtime or build dependency graph, and
Iosevka is not vendored as a Git submodule.

- `upstream.json` records the pinned Iosevka release: version, tag, commit, upstream repository, source archive URL and
  SHA-256, license, and the build-plan revision that was generated against it.
- `private-build-plans.toml` holds the Iosevka custom build plans for `DIBS Sans` and `DIBS Slab`. Both use
  quasi-proportional spacing and are restricted to the audited weight/style dimensions: Sans uses Regular, Medium, and
  Bold with Upright and Italic slopes; Slab uses Medium and Bold with Upright only.

The plan identifiers are `dibs-sans` and `dibs-slab`. They are stable build inputs, not CSS family names.

The generated family names come from each plan's `family` property. Both plans request WOFF2 output and do not disable
ligations at the family-definition level; neither sets `noLigation`.

The plan revision in `upstream.json` is the SHA-256 digest of the exact TOML file.

The typography build-plan test parses the committed TOML, checks its role-specific dimensions against the shared
typography contract, and verifies that this digest still matches.

---

## Verifying the pinned source

```sh
curl -sL -o iosevka-34.8.0.tar.gz \
    https://github.com/be5invis/Iosevka/archive/refs/tags/v34.8.0.tar.gz
sha256sum iosevka-34.8.0.tar.gz
```

The resulting digest must match `sourceArchive.sha256` in `upstream.json`. The `commit` field is the authoritative pin;
the archive digest is a convenience check recorded at pin time, since GitHub's tag-archive endpoint is not a
cryptographically guaranteed-stable artifact the way a release-uploaded asset is.

The provenance files are not read by Astro and do not generate fonts during `pnpm dev`, `pnpm test`, or `pnpm build`.
Font generation remains an explicit tooling operation against the pinned source and the committed build plans.

The plan contract can be checked without building Iosevka:

```sh
pnpm exec vitest run src/lib/typography/__tests__/dibs-font-build-plans.test.ts --config vitest.config.ts
```

The TOML parser used by that test is a development-only dependency; it is not part of the site's runtime dependency
graph.

---

## License

Iosevka is licensed under the SIL Open Font License 1.1, which permits zero-cost development, self-hosted deployment,
web embedding, and redistribution. See `licenseUrl` in `upstream.json` for the license text at the pinned tag.

---

## Updating the pin

Bumping the Iosevka version is a deliberate decision, not an automatic upgrade. Update `version`, `tag`, `commit`, and
`sourceArchive` in `upstream.json` together, verify the new archive digest, and regenerate the DIBS Sans and DIBS Slab
webfonts from the updated pin.
