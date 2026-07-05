# [PLAN] Phase 1 --- Establish Licensing, Provenance, and Attribution

## Summary

Prepare `@ravenhill/astro-icons` for public redistribution by documenting the package-code license, preserving required
upstream notices, recording provenance for every non-Phosphor asset, and making attribution coverage and package
inclusion mechanically verifiable.

This phase does not change runtime behavior, generated exports, SVG bytes, source layout, or consumer imports.

## Scope Classification

This is a **medium-sized change** and should be divided into four subphases:

1. Establish asset provenance and redistribution status.
2. Introduce a machine-readable attribution contract and generated notices.
3. Integrate licensing into package metadata and maintainer documentation.
4. Verify the publishable tarball and close the release gate.

Each implementation subphase can later be executed as short TDD cycles.

---

## Corrected Domain Model

The Phase 0 inventory group named `custom` means only:

```text
non-Phosphor asset
```

It must not be interpreted as:

```text
original Ravenhill artwork
```

All nine `custom`-group records are therefore handled as third-party or externally sourced assets unless independently
proven otherwise.

The implementation and documentation should consistently use:

- **Phosphor assets** for the 1,512 upstream Phosphor icons;
- **non-Phosphor assets** for the nine inventory entries currently labeled `custom`;
- **package code** for scripts, configuration, generated TypeScript, and other original source material.

Do not rename the Phase 0 inventory group in this phase because that would mutate the frozen migration contract.
Translate its meaning only at the licensing boundary.

---

## Licensing Principles

### Separate the applicable rights

For every asset, record copyright licensing and trademark restrictions separately.

A project repository license must not be assumed to cover:

- its logo;
- its name or word mark;
- artwork downloaded from a website;
- an independently uploaded copy on an icon aggregator.

### Do not present uncertainty as verification

Every non-Phosphor asset must have one explicit redistribution status:

```text
verified
restricted
permission-required
risk-accepted
```

Definitions:

- `verified`: evidence identifies a source and terms that permit the intended redistribution.
- `restricted`: available evidence does not permit this packaging use.
- `permission-required`: the governing policy requires approval that has not yet been recorded.
- `risk-accepted`: redistribution permission remains unconfirmed, but the maintainer has explicitly decided to retain
  the asset.

`risk-accepted` documents a project decision. It does not convert uncertain provenance into verified permission.

Do not publish placeholders such as:

```text
to verify
TBD
probably MIT
assumed allowed
```

### Preserve license texts separately

Keep the package-code license and asset notices separate:

```text
LICENSE
LICENSES/
```

`LICENSE` must contain only the standard BSD-2-Clause license text with the confirmed copyright holder.

Place explanatory prose in:

```text
README.md
LICENSES/README.md
LICENSES/THIRD_PARTY.md
```

Do not add a custom preamble or pointer inside the BSD license text itself.

---

# Subphase 1.1 — Establish Provenance and Redistribution Status [DONE]

## Goal

Determine and record the strongest available provenance and licensing evidence for the Phosphor corpus and each of the
nine non-Phosphor assets.

## Scope

Investigate:

- the exact source revision or package from which the Phosphor SVGs were obtained;
- the exact source page, repository revision, or distributed asset bundle for each non-Phosphor SVG;
- the copyright license governing the specific image;
- any separate trademark or brand policy;
- whether the intended npm-package redistribution is verified, restricted, permission-dependent, or accepted as an
  unresolved risk.

Embedded SVG metadata may be used as an investigative clue, but not as sufficient provenance by itself.

### Required research records

For each non-Phosphor icon, capture:

```text
file
exportName
project or asset name
asset type
source URL
source revision or retrieval evidence
copyright owner, when known
copyright license or policy
trademark owner, when applicable
trademark policy
redistribution status
status rationale
traceability decision reference
```

For Phosphor, capture:

```text
upstream project
source package, tag, or commit
license source
copyright notice
asset-count relationship to the inventory
```

## Suggested Research Order

Investigate the highest-risk brand assets first:

1. `powershell.svg`
2. `python.svg`
3. `kotlin.svg`
4. `scala.svg`
5. `nushell-logo.svg`
6. `json.svg`
7. `bash.svg`
8. `csv.svg`
9. `xml.svg`
10. Phosphor corpus provenance

This order surfaces permission blockers before documentation or automation is built around unsupported assumptions.

## Acceptance Criteria

- Every non-Phosphor inventory entry has a completed evidence record.
- Every record has one explicit redistribution status.
- No asset is described as verified solely because its associated software project is open source.
- Any SVG Repo attribution identifies the exact asset page and its asset-specific license, not merely the SVG Repo
  website.
- The Phosphor notice is tied to the actual source lineage of the copied assets.
- The BSD copyright-holder string is explicitly confirmed rather than inferred from Git configuration.
- All `risk-accepted` decisions reference the relevant traceability record.

## Non-goals

- Obtaining formal legal advice.
- Requesting permissions from trademark owners unless separately authorized.
- Replacing or redrawing assets.
- Modifying SVG bytes.
- Publishing the package.

---

## Findings --- Phosphor Corpus Lineage

### Established repository evidence

- Import commit `1833b9e65a91917b565da9dae0df29c1642448a2`, dated 2026-03-19, documents a manual copy of the Phosphor
  `regular` variant from `B:\Downloads\phosphor-icons` into the `phosphor-icons/core` layout.
- The license notice committed alongside that import contains `Copyright (c) 2020-2024 Phosphor Icons`.
- No commit or lockfile ever pinned a `@phosphor-icons/core` package dependency.
- Subsequent commits moved or renamed the Phosphor assets but did not alter their SVG bytes.

### External comparison method

- Ten official `phosphor-icons/core` tags were resolved to immutable commit SHAs and downloaded as commit-addressed
  archives; candidate regular-weight filenames were normalized (e.g. `acorn-regular.svg` → `acorn.svg`) against the
  1,512 local Phosphor-group filenames read from `migration/icon-inventory.json`.
- Every candidate received a complete normalized filename-set comparison (Stage A); candidates whose set matched exactly
  advanced to a complete, unsampled byte-by-byte comparison of all 1,512 files (Stage B).

### Candidates investigated

- 10 candidate revisions were compared by filename set; 8 were rejected as `STAGE_A_FILENAME_SET_MISMATCH`.
- 2 candidates reached an exact filename-set match: `a2a0bfd7cb66d08a` (`assets/regular`) and `a5e861b1bd29ab95`
  (`raw/regular`). Both resolved to the same representative commit `036f8574bbfc7b74bb9220ee6c8e8a02103e9dc4`.
- Complete byte comparison (3,024 logical comparisons, no sampling) found: `assets/regular` matched 0 of 1,512 files;
  `raw/regular` matched 1,365 of 1,512 files, leaving 147 local files unexplained.

### Conclusion

Lineage is **unresolved** (`reasonCode: BYTE_MISMATCHES_UNEXPLAINED`). No candidate's corpus fully matches the local
1,512-file corpus, so no exact commit, equivalent revision set, or positively-evidenced mixed-corpus lineage can be
asserted under the DDT lineage matrix defined in `subphase_1.1.2_resolve_the_phosphor_corpus_lineage.md`.

### Downstream consequence

- Phase 1 records Phosphor provenance as `unresolved` rather than blocking on an unproven exact revision; no upstream
  package, version, or commit is guessed in `packages/astro-icons/LICENSES/third-party-icons.json`.
- Subphase 1.3 may safely copy the MIT notice text captured below as the applicable Phosphor license notice, but it must
  not cite an exact upstream tag, version, or immutable commit URL as the source of that text, since none is verified.

### Independent license conclusion

The MIT conclusion is supported independently of exact corpus lineage: the license notice was committed
contemporaneously with the original import and is unaffected by which upstream revision (if any) exactly matches the
current 1,512-file corpus. `concludedLicense` is recorded as `"MIT"` with `copyrightNotice`
`"Copyright (c) 2020-2024 Phosphor Icons"`; `licenseSourceUrl` remains `null` because no exact upstream revision is
verified to link to.

### Package-code holder

`Ignacio Slater-Muñoz`.

---

## Findings — Non-Phosphor Asset Provenance

### Investigation Method

These findings transcribe the completed Phase 3.2 research pass (see
`traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md`) into the manifest and this narrative record.
That pass used an external research hand-off (a self-contained brief was drafted and sent for research, and the
response was relayed back and incorporated) rather than direct fetches performed by the agent. No raw upstream SVG
has been fetched and no byte or normalized-content comparison against a local file has been performed for any of the
nine assets. Consequently every conclusion below is intentionally conservative: `NOASSERTION` for copyright unless a
page-specific license was quoted, and no evidence status is promoted to `verified`. The Phase 2 Research Handoff
Checklist (fetch, byte-compare, normalize, structurally compare) remains the gate for any future pass that wants to
strengthen this evidence; it is not executed here.

### Batch A — Brand-Controlled Assets

- **`powershell`** — no local fingerprint to anchor on; matched only by visual/project association to a Wikimedia
  candidate and the official PowerShell/Microsoft brand context. `metadata-only`, `partially-verified`. Microsoft's
  trademark policy applies to the PowerShell mark independently of any code license.
- **`python`** — the local file's Inkscape `sodipodi:docname="python-logo-only.svg"` matches the exact filename
  convention used on the Python Software Foundation's brand-assets page. `metadata-only`, `partially-verified`. PSF
  trademark terms apply separately from any code license.
- **`kotlin`** — the local gradient stops match the published Kotlin brand gradient. `metadata-only`,
  `partially-verified`. Kotlin Foundation/JetBrains brand-asset constraints apply separately from any code license.
- **`scala`** — cross-batch-corrected: the local file's own `SVG Repo` upload comment matches an exact SVG Repo asset
  page, so this asset is treated as aggregator-sourced rather than brand-controlled for match-method purposes, even
  though the mark itself is Scala's brand. `metadata-only`, `partially-verified`.

### Batch B — Project and Community Marks

- **`nushell-logo`** — the local file is a VTracer lossy auto-trace (confirmed via embedded generator metadata), so
  the match method is capped at `visual-match` against a Wikimedia candidate; it can never be byte- or
  structurally-identical to a real source vector. `partially-verified`.
- **`json`** — the local `<title>JSON logo</title>` matches the well-known JSON mark family, but the exact vector's
  lineage to a specific rights holder (original author vs. mirror vs. aggregator repost) is not established.
  `metadata-only`, `partially-verified`.
- **`bash`** — cross-batch-corrected: like `scala`, the local file's own `SVG Repo` upload comment matches an exact
  SVG Repo asset page, so this asset is treated as aggregator-sourced. `metadata-only`, `partially-verified`.

### Batch C — Generic and Aggregator-Sourced Icons

- **`csv`** — a plausible SVG Repo candidate page was found by visual/style search only; the exact local-file match
  is not established. `metadata-only`, `unresolved`.
- **`xml`** — a plausible SVG Repo candidate page was found by visual/style search only; the exact local-file match
  is not established. `metadata-only`, `unresolved`.

An aggregator-style candidate page being visually similar is not sufficient to claim verified source status; both
assets remain `unresolved` until a raw/local comparison is performed.

### Cross-Batch Correction

`bash` and `scala` are both classified as aggregator-sourced (`metadata-only` match method) rather than by their
original batch assignment, because their local files carry an `SVG Repo` upload comment that matches an exact SVG
Repo asset page. `nushell-logo` remains capped at `visual-match` because it is a machine-generated auto-trace, not an
authored vector, and so cannot be byte- or structurally-compared to any source.

### Redistribution Conclusions

```text
permission-required: python, kotlin, powershell
undetermined: bash, scala, nushell-logo, json, csv, xml
```

The three `permission-required` assets are brand/trademark-controlled marks whose code-adjacent licenses (if any)
do not cover logo redistribution. The six `undetermined` assets have no confirmed page-specific license and no
confirmed rights holder for the exact local file.

### Closed Maintainer Decisions

All nine non-Phosphor assets are now marked `releaseDecision.action: "exclude"` in `third-party-icons.json`, closing
Subphase 1.1 Phase 4 (`reviewStatus: "complete"`). No source SVG was removed or modified — exclusion is a manifest
decision not to ship these assets under the current evidence state, and it is reversible if stronger evidence or
explicit permission is later obtained:

- **`powershell`, `python`, `kotlin`** are excluded because redistribution remains `permission-required`: Microsoft,
  PSF, and Kotlin Foundation/JetBrains trademark clearance is unconfirmed for these exact assets, and no exact
  byte/structural comparison against a candidate source has been performed.
- **`bash`, `scala`, `nushell-logo`, `json`, `csv`, `xml`** are excluded because redistribution remains
  `undetermined`: no exact byte or normalized-content comparison against a candidate source has been performed (or,
  for `nushell-logo`, no confirmation that its `visual-match` ceiling is an acceptable evidence level), and for
  `csv`/`xml` the exact source page itself remains unconfirmed.

`releaseDecision.riskAcceptance` remains `null` for all nine — no maintainer risk acceptance has been created, since
`exclude` requires only an exclusion rationale, not a risk-acceptance record.

---

# Subphase 1.2 — Define the Machine-Readable Attribution Contract [DONE]

## Goal

Create one structured source of truth from which human-readable third-party notices can be generated and mechanically
checked.

## Scope

Add:

```text
LICENSES/third-party-icons.json
scripts/lib/license-metadata.mjs
scripts/generate-third-party-notices.mjs
scripts/test/license-metadata.test.mjs
scripts/test/third-party-notices.test.mjs
```

Generate:

```text
LICENSES/THIRD_PARTY.md
```

The JSON metadata is authoritative. The Markdown notice is a generated distribution artifact.

This avoids parsing Markdown tables as if they were a reliable data model.

## Recommended Metadata Shape

```json
{
    "schemaVersion": 1,
    "phosphor": {
        "project": "Phosphor Icons",
        "sourceRevision": "<tag-or-commit>",
        "license": "MIT",
        "licenseFile": "LICENSES/PHOSPHOR.txt",
        "inventoryCount": 1512
    },
    "assets": [
        {
            "file": "python.svg",
            "exportName": "Python",
            "displayName": "Python logo",
            "assetType": "logo",
            "source": {
                "project": "Python Software Foundation",
                "url": "<authoritative-source>",
                "revision": null,
                "evidence": "<how-the-local-svg-was-matched>"
            },
            "copyright": {
                "license": "LicenseRef-PSF-Logo-Policy",
                "licenseFile": null
            },
            "trademark": {
                "owner": "Python Software Foundation",
                "policyUrl": "<authoritative-policy>"
            },
            "redistribution": {
                "status": "risk-accepted",
                "rationale": "<specific-rationale>",
                "decisionReference": "<traceability-reference>"
            },
            "notes": []
        }
    ]
}
```

Use SPDX identifiers where an SPDX license applies. Use a stable project-defined `LicenseRef-*` identifier for policies
or terms that are not SPDX licenses.

## Cycle 1 — Validate Attribution Coverage

### Red

Add BDD-style tests:

```text
Given the frozen icon inventory
When licensing metadata is validated
Then every custom-group icon has exactly one attribution record
```

```text
Given the attribution metadata
When its filenames are compared with the inventory
Then no unknown or duplicate icon record exists
```

```text
Given an attribution record
When its redistribution data is validated
Then its status is one of the supported explicit statuses
```

```text
Given a published attribution record
When placeholder text is scanned
Then no unresolved placeholder remains
```

Use synthetic One Piece-themed fixtures for generic validation cases, for example:

```text
going-merry.svg
thousand-sunny.svg
water-seven.svg
```

These are test names only; do not add corresponding artwork.

### Green

Implement pure validation functions that:

- load the frozen inventory;
- select records whose inventory group is `custom`;
- compare the expected and actual filename sets;
- reject missing, duplicate, or unexpected records;
- validate required fields by status;
- reject placeholder values;
- validate referenced local notice files.

### Refactor

- Keep filesystem access outside the pure validator.
- Represent supported statuses as one frozen collection.
- Return all validation findings together rather than failing on the first row.
- Keep error messages stable and filename-specific.

### Acceptance Criteria

- Metadata coverage is exact and scale-independent.
- The test does not hardcode the number nine as its coverage oracle.
- Adding or removing a non-Phosphor inventory entry causes the test to fail until metadata is updated.
- Tests verify completeness and consistency, not legal truth.

## Cycle 2 — Generate the Human-Readable Notice

### Red

Add BDD-style tests:

```text
Given valid attribution metadata
When THIRD_PARTY.md is generated
Then it contains one Phosphor summary and one section per non-Phosphor asset
```

```text
Given unchanged attribution metadata
When the notice is generated twice
Then the output is byte-identical
```

```text
Given a stale committed notice
When generation runs in check mode
Then the command exits non-zero without rewriting it
```

### Green

Implement:

```text
node scripts/generate-third-party-notices.mjs --write
node scripts/generate-third-party-notices.mjs --check
```

The generated notice should:

- identify the package-code license separately;
- summarize the Phosphor corpus and point to `PHOSPHOR.txt`;
- list every non-Phosphor asset;
- distinguish copyright terms from trademark notices;
- state the redistribution status plainly;
- avoid language implying endorsement;
- avoid claiming verified permission for `risk-accepted` records.

### Refactor

- Make rendering a pure function.
- Use deterministic ordering by inventory filename.
- Use fixed heading and column order.
- Add exactly one trailing newline.
- Do not add timestamps.

### Acceptance Criteria

- `THIRD_PARTY.md` is fully derived from the JSON source.
- `--check` detects manual drift.
- Output is deterministic.
- Every non-Phosphor icon is represented exactly once.

## Non-goals

- Building a general-purpose license scanner.
- Parsing arbitrary SPDX documents.
- Automatically deciding whether a trademark use is lawful.
- Adding a runtime dependency.

---

# Subphase 1.3 — Add License Texts and Package Documentation

## Goal

Add the required license and attribution files and explain their scopes accurately to package users and maintainers.

## Scope

### 1. `LICENSE`

Add the standard BSD-2-Clause text for original package code.

Before creating it, confirm the exact holder string. Do not infer ownership from:

- Git username;
- npm scope;
- repository directory name;
- package author metadata alone.

### 2. `LICENSES/PHOSPHOR.txt`

Copy the exact applicable Phosphor MIT notice and license text from the source revision established in Subphase 1.1.

Record the source revision in `third-party-icons.json`.

Preserve the upstream copyright notice.

### 3. Additional third-party license texts

Where an asset-specific license requires redistribution of its text, add a dedicated file such as:

```text
LICENSES/SVG-REPO-CC0.txt
LICENSES/NUSHELL-MIT.txt
LICENSES/<ASSET-OR-SOURCE>.txt
```

Do not copy a software-project license merely because the icon depicts that project. Add a notice file only when the
evidence establishes that the license applies to the asset.

### 4. `LICENSES/README.md`

Explain:

- `LICENSE` covers original package code;
- `PHOSPHOR.txt` covers the Phosphor asset corpus;
- `THIRD_PARTY.md` covers non-Phosphor assets;
- trademarks remain the property of their respective owners;
- inclusion does not imply sponsorship or endorsement;
- `risk-accepted` means redistribution permission has not been independently verified.

### 5. `README.md`

Add an **Attribution and licensing** section linking to:

```text
LICENSE
LICENSES/PHOSPHOR.txt
LICENSES/THIRD_PARTY.md
```

Avoid a blanket statement such as:

```text
This package is BSD-2-Clause licensed.
```

Prefer wording that separates code from assets:

```text
The package code is distributed under BSD-2-Clause. Included icon assets are subject to their respective licenses, notices, and trademark policies.
```

### 6. `AGENTS.md`

Add a maintenance policy:

- every new non-Phosphor icon requires a metadata record;
- the exact source and asset-specific terms must be recorded;
- software-project licensing must not be assumed to cover a logo;
- generated notices must be refreshed;
- both attribution tests and pack checks must pass;
- unresolved records require an explicit traceability decision.

### 7. `package.json`

Add:

```json
{
    "license": "BSD-2-Clause"
}
```

Include the `LICENSES/` directory in the package `files` allowlist.

The root `LICENSE` may also be listed explicitly for clarity, but actual tarball contents remain the acceptance oracle.

Recommended shape:

```json
{
    "files": [
        "dist",
        "README.md",
        "LICENSE",
        "LICENSES"
    ]
}
```

Add scripts such as:

```json
{
    "test:licenses": "node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs",
    "licenses:check": "node scripts/generate-third-party-notices.mjs --check",
    "licenses:update": "node scripts/generate-third-party-notices.mjs --write"
}
```

Keep licensing tests separate from `test:audit-icons` unless the repository intentionally defines a single
package-contract test suite. Separate scripts provide clearer failure ownership.

## Acceptance Criteria

- `LICENSE` contains the unmodified BSD-2-Clause body with the confirmed holder.
- `PHOSPHOR.txt` matches the established upstream notice.
- Every required third-party notice file is present.
- `THIRD_PARTY.md` is generated and current.
- README accurately separates package code from asset licensing.
- AGENTS.md defines the future attribution workflow.
- `package.json.license` is `BSD-2-Clause`.
- `LICENSES/` is selected for package inclusion.

## Non-goals

- Updating the changelog.
- Changing package version.
- Publishing.
- Reorganizing source assets.
- Adding source-code license headers to every generated file.

---

# Subphase 1.4 — Enforce the Publishable Artifact Contract

## Goal

Prove that the built tarball contains all required notices and no unintended project-only material.

## Scope

Extend:

```text
scripts/assert-pack-files.mjs
```

Make licensing-file validation mandatory rather than optional.

## Cycle 1 — Validate Pack Contents

### Red

Add or extend BDD-style tests:

```text
Given the packed package
When required legal files are inspected
Then LICENSE, PHOSPHOR.txt, THIRD_PARTY.md, and attribution metadata are present
```

```text
Given a metadata record that references a local license file
When the tarball is inspected
Then that referenced file is included
```

```text
Given the package allowlist
When the tarball is inspected
Then migration artifacts, source tests, and internal scripts are absent unless explicitly intended
```

```text
Given an unresolved attribution status
When release validation runs
Then publication fails unless the status is explicitly risk-accepted with a traceability reference
```

### Green

Update the pack validator to:

- read the attribution metadata;
- derive required notice paths;
- inspect the dry-run or packed file list;
- assert exact inclusion of required legal files;
- reject missing referenced notices;
- retain existing leak-prevention assertions.

### Refactor

- Derive required files instead of hardcoding every future license filename.
- Separate required, allowed, and forbidden file rules.
- Produce one grouped diagnostic for all missing licensing files.

### Acceptance Criteria

The following commands pass:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons build
pnpm --filter @ravenhill/astro-icons pack:check
pnpm --filter @ravenhill/astro-icons lint
```

The dry-run tarball contains:

```text
LICENSE
LICENSES/README.md
LICENSES/PHOSPHOR.txt
LICENSES/THIRD_PARTY.md
LICENSES/third-party-icons.json
```

It also contains every additional notice file referenced by the metadata.

The tarball does not contain:

```text
migration/
scripts/test/
internal research notes
unbuilt source files
```

unless those files were already intentionally part of the package contract.

## Non-goals

- Publishing to npm.
- Treating `publint` success as legal verification.
- Automatically contacting rights holders.
- Removing risk-accepted assets against the confirmed maintainer decision.

---

## Critical Files

### New

```text
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/README.md
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/scripts/lib/license-metadata.mjs
packages/astro-icons/scripts/generate-third-party-notices.mjs
packages/astro-icons/scripts/test/license-metadata.test.mjs
packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

Additional notice files under `LICENSES/` may be required by the evidence review.

### Modified

```text
packages/astro-icons/package.json
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/scripts/assert-pack-files.mjs
```

### Reference only

```text
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/scripts/lib/icon-inventory.mjs
packages/astro-icons/scripts/lib/icon-name.mjs
packages/astro-icons/src/
```

---

## End-to-End Acceptance Criteria

Phase 1 is complete when:

1. The exact Phosphor source lineage and applicable MIT notice are recorded.
2. Every non-Phosphor icon has one structured attribution record.
3. Every record has an explicit redistribution status.
4. No published record contains placeholder or speculative license text.
5. Package code is licensed under BSD-2-Clause.
6. Asset licensing is clearly separated from the package-code license.
7. `THIRD_PARTY.md` is deterministically generated from structured metadata.
8. Attribution coverage exactly matches the frozen inventory.
9. Every referenced license notice is included in the tarball.
10. README and AGENTS.md explain the user-facing and maintainer-facing licensing model.
11. Builds, license tests, pack validation, and strict package linting pass.
12. No SVG, export name, runtime module, or consumer-facing behavior changes.

---

## Explicit Deferred Work

The following remain outside Phase 1:

- replacing assets whose redistribution status is restricted or uncertain;
- obtaining written trademark permissions;
- splitting `src/` into Phosphor and non-Phosphor directories;
- creating the standalone repository;
- changing package consumers;
- publishing a release;
- modifying the changelog;
- performing jurisdiction-specific legal review.

---

## Suggested Execution Order

1. Complete the provenance review before writing final attribution prose.
2. Confirm the package-code copyright holder.
3. Add the structured metadata schema and failing coverage tests.
4. Populate metadata for all nine non-Phosphor icons.
5. Add the exact Phosphor license notice.
6. Generate `THIRD_PARTY.md`.
7. Add README and AGENTS.md guidance.
8. Update `package.json`.
9. Extend pack validation.
10. Run the full package verification sequence.
11. Inspect the actual tarball.
12. Close Phase 1 only after all uncertainty is explicitly classified and no behavior or SVG change appears in the diff.

[1]: https://github.com/PowerShell/PowerShell/blob/master/LICENSE.txt?utm_source=chatgpt.com "PowerShell/LICENSE.txt at master"
[2]: https://www.python.org/psf/trademarks/?utm_source=chatgpt.com "PSF Trademark Usage Policy | Python Software Foundation"
[3]: https://github.com/phosphor-icons/core/blob/main/LICENSE?utm_source=chatgpt.com "MIT License - phosphor-icons/core"
[4]: https://docs.npmjs.com/cli/v10/configuring-npm/package-json/?utm_source=chatgpt.com "package.json"

[5]: https://spdx.org/licenses/BSD-2-Clause.html?utm_source=chatgpt.com "BSD 2-Clause \"Simplified\ "License"
