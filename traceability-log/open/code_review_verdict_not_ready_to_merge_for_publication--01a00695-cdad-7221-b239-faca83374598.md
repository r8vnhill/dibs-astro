# Code review verdict: **not ready to merge for publication**

I reviewed `feat/brands-corpus-simple-icons` against `main`. The branch is currently two commits ahead, ending at
`989a0f82` (`feat: Add Simple Icons brand support to @ravenhill/astro-icons`), and its latest branch pipeline is green.

The overall design is strong: `./brands` is a separate public corpus rather than leaking the provider into the API, the
package root remains Phosphor-only, `simple-icons` is pinned at `16.28.0` as a development dependency, and the ingestion
layer already has good deterministic and malformed-SVG coverage.

However, I would **not merge or bump the version yet**. The green pipeline does not currently establish several
contracts that are essential for publishing a new corpus. Under the DIBS review guidelines, these sit in the
highest-priority areas: correctness, explicit provenance, reproducibility, public-contract assurance, and release
artifact integrity.

## Blocking findings

| Priority                               | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Why it blocks publication                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blocking**                           | **Simple Icons provenance is recorded but not actually verified against the locked upstream corpus.** `provenance/simple-icons.json` records version, package integrity, and SHA-256 hashes for all 13 selected assets, but `icons:check` only reads and verifies Phosphor provenance. Meanwhile `generate.ts` loads and validates the selected Simple Icons records, but then discards the resulting `ingestion.icons` and generates from the separately committed release model. | A committed `src/brands/*.svg`, provenance digest, or upstream selection can drift without the same end-to-end check already provided for Phosphor. The release therefore does not yet demonstrate that published brand bytes are the bytes selected from the pinned provider.                                                                                                         |
| **Blocking**                           | **The brand-policy evidence contract is weaker than its own documentation claims.** `release-plan.ts` says `brand-icons.json` already records each mark's upstream license, source, and brand-guideline links, but the actual records contain `slug`, `title`, `source`, `policy`, and a generic rationale—not license or guideline evidence. `brandIsPublishable()` ultimately checks presence, export-name agreement, and `policy === "publishable"`.                            | This is especially important because the vendored Simple Icons disclaimer explicitly says its package-level CC0 status does not establish the status of every individual mark and recommends consulting per-icon license/guideline metadata. The loader already reads optional upstream `guidelines` and `license`, but that evidence is not reconciled with the publication manifest. |
| **Blocking**                           | **The new public `./brands` contract is not exercised by the real Astro consumer matrix.** `package.json` publishes `./brands` and the README demonstrates it, but `check-consumers.ts` constructs its production fixture only from the Quick Start and Phosphor examples. The README contract test's source map likewise contains root, `/phosphor`, and `/custom`, but not `/brands`; even the pack-contract unit fixture still models only the pre-brands export set.           | A successful `consumer-matrix` currently proves compatibility for the old public surface, not for the feature being introduced. For a new public Astro component entry point, I would require the packed archive itself to compile/render at the supported Astro lower bound and across the maintained major-version matrix.                                                           |
| **Blocking for the requested release** | **Persistent manual-download assets are not implemented.** The package job retains `release/` for seven days, while `gitlab-release` creates only release metadata and attaches no `.tgz`, checksum, or manifest asset. The project currently has no GitLab Releases, and the existing `astro-icons-v0.1.0` tag reports `release: null`.                                                                                                                                           | This does not satisfy your requirement that the release be downloadable manually from the repository's Releases page. GitLab explicitly supports placing release binaries in its Generic Package Registry and attaching them to the Release, including via `glab release create ... --use-package-registry`. ([GitLab Docs][1])                                                        |

There is also one small documentation inconsistency worth fixing in the same branch: the README's opening sentence still
describes the project as being built from a Phosphor corpus even though the document later introduces the new
multi-corpus `/brands` API.

## Remediation plan

Because these concerns form one coherent publication-readiness initiative, I would keep them as five short TDD cycles
rather than split them into separate milestones.

### 1. Make Simple Icons provenance executable evidence

**Goal:** every selected brand published by the project is demonstrably derived from the pinned `simple-icons` package
and agrees with committed provenance.

**Red.** Add BDD/DDT cases proving that `icons:check` reports a nonconformance when a selected upstream SVG, committed
`src/brands/*.svg`, recorded digest, provider version, or selected file set differs. Include all 13 selected brands
through a table-driven fixture.

A particularly useful differential contract is:

```text
installed simple-icons SVG
        =
provenance-recorded SHA-256
        =
committed brand SVG SHA-256
```

**Green.** Generalize the existing Phosphor verifier rather than creating an unrelated second implementation. Introduce
a corpus/provider verification abstraction that can verify the locked package version, exact selected file set,
source/target mapping, digests, and fixed legal evidence for both Phosphor and Simple Icons. `icons:check` should
execute both providers and remain part of `bun run check`. The existing Simple Icons provenance already supplies most of
the necessary evidence.

**Refactor.** Move shared digest/file-set/version logic into a pure domain module and keep filesystem/package reads in
adapters. Do not couple the verifier directly to `BRAND_SELECTION` in multiple places.

**Acceptance:** modifying any one selected brand SVG or its recorded provenance makes the normal verification pipeline
nonconforming; a clean checkout with `bun install --frozen-lockfile` reproduces all checks without network-dependent
metadata lookup.

---

### 2. Make the brand publication policy match its evidence model

**Goal:** a `publishable` decision remains an explicit project decision, but the evidence behind that decision is
complete and synchronized with the pinned upstream record.

**Red.** Add release-policy tests for missing policy records, mismatched slugs/export names/source URLs, upstream
license metadata that is not reflected in the evidence record, available brand-guideline metadata that is omitted or
differs, and excluded brands. Keep optional upstream fields optional: absence in Simple Icons should not be interpreted
as absence of external restrictions. Simple Icons itself makes that caveat explicit.

**Green.** Extend the brand evidence schema so each record preserves the upstream evidence actually available from the
pinned Simple Icons metadata, for example:

```text
upstream
├── slug
├── title
├── source
├── guidelines?
└── license?
    ├── type
    └── url?
```

Preserve the upstream license URL as well as its type if Simple Icons supplies it; the current loader reduces the
license to its `type` before normalization.

Then validate `brand-icons.json` against the installed upstream metadata **before** its project-local publication
decision is consumed. Keep `policy: "publishable"` as a human-reviewed decision; do not attempt to encode legal judgment
in an automated heuristic.

**Refactor.** Make this one typed evidence model used by parsing, generation, release planning, documentation, and
tests. Correct the `release-plan.ts` comment and README so they describe exactly the evidence actually retained.

**Acceptance:** no selected brand can reach the release plan if its committed upstream identity/evidence has drifted;
missing upstream optional metadata remains distinguishable from metadata that was never reviewed; policy decisions stay
explicit and reviewable.

---

### 3. Exercise `/brands` as a real public API

**Goal:** the exact packed artifact proves that documented brand imports work everywhere the package claims Astro
compatibility.

**Red.** Add a README extractor for the Brands example and require it to resolve only names exported by
`@ravenhill/astro-icons/brands`. Add `./brands` to pack-contract fixtures and brand cases to
generated-artifact/package-contract coverage. The README currently documents `Gradle`, `Kotlin`, and `Python`, which are
good representative consumer imports.

**Green.** Change `readmeProductionPage()` to build the production consumer from:

```text
Quick Start
+ Phosphor example
+ Brands example
```

and run that page against the **release tarball**, not local source, through the existing Astro compatibility matrix.
`./custom` can remain its separate synthetic scenario.

Add DDT over all 13 brand export names at the package-contract level; there is no need to render all 13 under every
Astro version. Render a representative subset in the compatibility consumer while structural/package tests prove the
complete barrel.

**Refactor.** Generalize README example extraction around documented public subpaths so the next corpus does not require
another ad-hoc compatibility path.

**Acceptance:** the packed archive successfully imports and renders `/brands` at Astro `5.14.0` and each supported major
represented by the project's pinned matrix; an absent or incorrectly packaged `/brands` entry makes ordinary/release CI
nonconforming.

---

### 4. Make GitLab Releases a durable second distribution channel

**Goal:** the registry package and the manual GitLab Release download are the **same validated tarball**, identified by
the same SHA-256.

The existing release design already has an excellent invariant: one package intent, one tarball, one SHA-256, and
publication of those exact bytes. Extend that invariant rather than creating a second build.

**Red.** Extend the release contract and post-publication verification fixtures to require a GitLab Release containing:

```text
@ravenhill-astro-icons-<version>.tgz
SHA256SUMS
release-manifest.json
```

and require the release archive digest to equal the manifest digest and the independently downloaded npm-package digest.

**Green.** After npm registry publication succeeds, upload the **existing `release/*.tgz`**, `SHA256SUMS`, and manifest
to GitLab's Generic Package Registry and attach those files as GitLab Release assets. GitLab documents this exact
Generic-Package-backed release-asset pattern and supports it through `glab`. ([GitLab Docs][1])

Conceptually, the publication graph becomes:

```text
                     ┌─→ GitLab npm registry
validated .tgz ──────┤
                     └─→ Generic Package Registry
                           ↓
                     GitLab Release asset

all paths preserve the same SHA-256
```

Do not repack in the release job.

**Refactor.** Extend `release:verify-post-publish` so it verifies both distribution planes:

```text
pre-publish manifest digest
= npm registry/download digest
= GitLab Release asset digest
```

Also update `docs/release-process.md`, including recovery behavior for “package published but Release asset creation did
not complete.” A retry in that state should upload/create release metadata only; it must not publish the npm package
again.

**Acceptance:** a GitLab Release exposes the `.tgz` for permanent manual download; its digest matches the registry
package; release assets survive expiration of the seven-day CI artifact.

---

### 5. Close the release candidate and only then version it

**Goal:** turn the corrected feature branch into a reproducible `0.2.0` release candidate.

First fix the README's Phosphor-only opening description. Then run the complete clean-checkout assurance path:

```text
bun install --frozen-lockfile
bun run check
bun run release:prepare
bun run release:check
bun run consumer:check-release
```

The latest branch pipeline is already green, so this cycle should extend—not replace—the existing assurance.

Once Cycles 1–4 are green, **bump `0.1.0 → 0.2.0`**. That is the appropriate SemVer direction because the branch adds
the new public `./brands` entry point without intentionally changing the existing root or `/phosphor` contracts; this is
an additive public API change. The package remains at `0.1.0` today.

At that point the changelog entry should describe the **final capability**, not the intermediate commits: the audited
`/brands` corpus, the 13 selected technology marks, Simple Icons provenance/policy evidence, preserved root/Phosphor
compatibility, and the durable GitLab Release download path. Do not write that release entry now, because several of
those guarantees are not yet true.

## Testing selection

For these corrections I would use **BDD/example tests + DDT as the primary approach**, **differential testing** for
locked Simple Icons bytes versus committed/provenance bytes, and real packed-artifact consumer tests rather than mocks.
PBT has little additional value beyond perhaps simple manifest round-trip invariants; fuzzing and mutation testing would
add little assurance for the publication blockers identified here. This follows the project's requirement to consider
the available testing styles but only adopt them where their value justifies the complexity.

## Merge/release gate

I would merge only when all four publication blockers above are closed and a fresh branch pipeline demonstrates:

```text
locked upstream
    ↓
verified provenance + policy
    ↓
generated /brands API
    ↓
single packed tarball
    ↓
Astro consumer matrix
    ↓
release manifest + SHA-256
```

Then the release can extend that same candidate to:

```text
                  ┌─→ npm registry
candidate .tgz ───┤
                  └─→ GitLab Release/manual download
```

with post-publication verification proving both destinations carry the same bytes.

So I am **not bumping the version, writing the final changelog entry, or drafting the merge request yet**. Those would
assert release readiness that the current branch does not establish. Once these remediation cycles are complete, the
expected release target is **`0.2.0`**, and the MR can be drafted from the corrected final state rather than describing
gaps that still need to be closed.

[1]: https://docs.gitlab.com/user/project/releases/ "Releases | GitLab Docs"
