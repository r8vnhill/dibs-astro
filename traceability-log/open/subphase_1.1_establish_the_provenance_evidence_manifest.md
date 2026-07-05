# [PLAN] Subphase 1.1 — Establish the Provenance Evidence Manifest

## Summary

Create a complete, structured evidence manifest for:

- the 1,512 Phosphor-group icons; and
- every icon classified as `custom` in the frozen Phase 0 inventory.

In this subphase, `custom` continues to mean only **non-Phosphor**. The frozen inventory is not renamed or modified.

The manifest must distinguish:

1. where each local SVG was obtained;
2. how the local file was matched to that source;
3. what copyright terms govern the asset, if determinable;
4. what trademark or brand policies apply;
5. whether redistribution appears permitted, restricted, permission-dependent, or undetermined;
6. whether the maintainer has decided to include, exclude, or defer the asset.

No SVG, export, package, or consumer behavior changes are permitted.

---

## Scope Classification

This is a **medium-sized research and documentation task**, organized into four phases:

1. Freeze the evidence contract and expected asset set.
2. Resolve the Phosphor corpus lineage.
3. Investigate the nine non-Phosphor assets.
4. Normalize and close the evidence manifest.

Executable validation remains deferred to Subphase 1.2. During this subphase, use BDD-shaped review scenarios and a DDT
decision matrix for consistent manual verification.

PBT is not useful because the subject is a fixed, finite inventory rather than a broad generated input space.

---

## Deliverables

### New

```text
packages/astro-icons/LICENSES/third-party-icons.json
```

### Updated

```text
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

The traceability record must include:

- the confirmed BSD-2-Clause holder: `Ignacio Slater-Muñoz`;
- unresolved provenance findings;
- every explicit risk-acceptance decision;
- any downstream publication blocker.

### Reference only

```text
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/scripts/lib/icon-inventory.mjs
packages/astro-icons/src/
repository history and lockfiles
local package-manager metadata
maintainer-supplied retrieval sources
```

---

## Corrected Evidence Model

The original redistribution enum combines three separate dimensions. Replace it with the following model.

### Evidence status

Describes the strength of the provenance investigation:

```text
verified
partially-verified
unresolved
```

### Redistribution conclusion

Describes the conclusion supported by the evidence:

```text
permitted
restricted
permission-required
undetermined
```

### Release decision

Describes the maintainer’s project decision:

```text
include
exclude
pending
```

A release decision of `include` does not mean that redistribution was verified.

When an asset is included despite a conclusion other than `permitted`, a structured risk-acceptance record is required.

---

## Recommended Manifest Shape

```json
{
    "schemaVersion": 1,
    "reviewStatus": "complete",
    "inventoryFile": "migration/icon-inventory.json",
    "packageCodeCopyrightHolder": "Ignacio Slater-Muñoz",
    "phosphor": {
        "project": "Phosphor Icons",
        "inventoryCount": 1512,
        "source": {
            "package": null,
            "version": null,
            "commit": null,
            "url": null,
            "evidenceStatus": "verified",
            "verifiedAt": "YYYY-MM-DD",
            "evidence": ""
        },
        "copyright": {
            "concludedLicense": "MIT",
            "licenseSourceUrl": "",
            "copyrightNotice": "",
            "licenseFile": "LICENSES/PHOSPHOR.txt"
        }
    },
    "assets": [
        {
            "file": "python.svg",
            "exportName": "Python",
            "displayName": "Python logo",
            "assetType": "logo",
            "localArtifact": {
                "sha256": ""
            },
            "provenance": {
                "retrievalSource": {
                    "url": "",
                    "revision": null,
                    "suppliedByMaintainer": true
                },
                "upstreamSource": {
                    "project": "",
                    "url": "",
                    "revision": null
                },
                "match": {
                    "method": "exact-byte-match",
                    "evidenceStatus": "verified",
                    "details": ""
                }
            },
            "rights": {
                "copyright": {
                    "concludedLicense": "NOASSERTION",
                    "sourceUrl": null,
                    "verifiedAt": "YYYY-MM-DD",
                    "basis": "",
                    "licenseFile": null
                },
                "trademark": {
                    "owner": "",
                    "policyUrl": null,
                    "verifiedAt": null,
                    "applies": "unknown",
                    "notes": ""
                }
            },
            "redistribution": {
                "conclusion": "undetermined",
                "rationale": ""
            },
            "releaseDecision": {
                "action": "include",
                "riskAcceptance": {
                    "rationale": "",
                    "decisionReference": "traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md"
                }
            },
            "notes": []
        }
    ]
}
```

### Field rules

- `concludedLicense` accepts:

  - a valid SPDX license expression;
  - a documented `LicenseRef-*` for actual non-SPDX license terms;
  - `NOASSERTION` when no objective determination can be made;
  - `NONE` only when the investigation concludes that no license is available.
- Do not store trademark policies in `concludedLicense`.
- `verifiedAt` is an explicitly recorded review date, not an automatically changing timestamp.
- `localArtifact.sha256` ties the evidence record to the exact current SVG bytes without modifying them.
- `licenseFile` is non-null only when the relevant license text must later be distributed.
- The committed final manifest must not contain instructional placeholders such as `<source>`, `TBD`, or `to verify`.

An incomplete local working copy may temporarily contain null fields, but it must use:

```json
{
    "reviewStatus": "in-progress"
}
```

It must not be treated as the completed Subphase 1.1 artifact.

---

# Phase 1 — Freeze the Evidence Contract and Asset Set [DONE]

## Goal

Establish the exact records that must exist and prevent evidence collection from drifting away from the frozen
inventory.

## Scope

1. Read `migration/icon-inventory.json`.
2. Select every entry whose group is `custom`.
3. Create one manifest record per selected inventory entry.
4. Copy `file` and `exportName` directly from the inventory.
5. Calculate and record the SHA-256 digest of every local non-Phosphor SVG.
6. Record the expected Phosphor count from the inventory.
7. Establish deterministic ordering by filename.
8. Document the revised evidence, redistribution, and release-decision model.

Do not re-derive export names.

## Review Scenarios

```text
Given the frozen inventory
When the evidence manifest skeleton is created
Then every custom-group file appears exactly once
And every export name is copied unchanged
And no unknown file is introduced
```

```text
Given a local non-Phosphor SVG
When its evidence record is created
Then the record contains the SHA-256 of the current file
```

```text
Given an incomplete research record
When the manifest is reviewed
Then it is marked in-progress
And it cannot satisfy the subphase acceptance criteria
```

## Acceptance Criteria

- The manifest contains exactly the filename set selected from the inventory’s `custom` group.
- No expected filename or export name is hardcoded independently of the inventory.
- Every asset record includes the current local SVG digest.
- The Phosphor inventory count is derived from the inventory and equals 1,512.
- Asset records are ordered lexically by filename.
- The evidence model does not conflate trademark policy with copyright licensing.

## Non-goals

- Verifying external sources.
- Deciding redistribution rights.
- Adding automated validators.
- Modifying the Phase 0 inventory.
- Committing a completed manifest before the evidence review is finished.

## Suggested Execution Order

1. Create `LICENSES/`.
2. Read the frozen inventory.
3. Derive the expected asset records.
4. Record export names and local hashes.
5. Add the top-level Phosphor block.
6. Mark the working manifest `in-progress`.

---

# Phase 2 — Resolve the Phosphor Corpus Lineage [DONE]

## Goal

Identify the actual package version, tag, commit, or other upstream revision from which the local Phosphor SVG corpus
originated.

## Scope

Investigate evidence in this order:

1. repository history for the icon import or generation commit;
2. lockfiles and historical dependency versions;
3. generator scripts and migration notes;
4. local or cached package metadata;
5. candidate upstream release inventories;
6. filename-set comparison;
7. byte or normalized-content comparison where candidate SVGs are available.

Do not choose the current upstream revision merely because it is canonical today.

## Lineage Decision Rules

### Exact lineage

Record a precise source revision when:

- repository evidence identifies the imported version; or
- the complete local Phosphor set can be matched to a candidate source revision with sufficiently strong evidence.

### Mixed lineage

Record the corpus as mixed when icons demonstrably originate from more than one upstream revision.

Do not force a single `sourceRevision`.

### Unresolved lineage

Use an unresolved evidence status when no candidate can be supported objectively.

An unresolved Phosphor lineage is a downstream Phase 1 blocker; it must not be silently replaced by the current upstream
license notice.

## Review Scenarios

```text
Given an upstream candidate whose filename and asset content match the local corpus
When the lineage is recorded
Then the exact package version or commit is stored
And the applicable copyright notice is taken from that revision
```

```text
Given multiple plausible upstream revisions
When no evidence distinguishes their relationship to the local files
Then the lineage remains unresolved
And no preferred revision is guessed
```

```text
Given a current upstream license
When the local icons originated from an older package
Then the older source revision governs the recorded provenance
```

## Acceptance Criteria

- The Phosphor record identifies the actual source package, tag, or commit.
- The recorded MIT notice is taken from that source lineage.
- `inventoryCount` equals the inventory’s Phosphor count.
- The evidence field explains how the source revision was established.
- Any unresolved or mixed lineage is documented explicitly in the traceability record.
- The manifest does not imply that current upstream metadata proves historical provenance.

## Non-goals

- Copying `PHOSPHOR.txt`; that occurs in Subphase 1.3.
- Updating the Phosphor assets.
- Normalizing SVG contents.
- Replacing old icons with current upstream versions.

## Suggested Execution Order

1. Inspect repository history and dependency files.
2. Identify candidate versions.
3. Compare filename sets.
4. Compare representative and then complete asset content where possible.
5. Record the strongest supported conclusion.
6. Verify the applicable notice against the identified revision.

---

# [DONE] Phase 3 — Verify the Nine Non-Phosphor Assets

## Current Status

- All nine non-Phosphor assets were transcribed into the provenance manifest from the completed Phase 3.2 evidence
  table.
- Match-method distribution: 8 `metadata-only`, 1 `visual-match` (`nushell-logo`, capped due to VTracer auto-trace
  metadata).
- Evidence-status distribution: 7 `partially-verified`, 2 `unresolved` (`csv`, `xml`).
- Redistribution conclusions: 3 `permission-required` (`powershell`, `python`, `kotlin`) and 6 `undetermined` (`bash`,
  `scala`, `nushell-logo`, `json`, `csv`, `xml`).
- Cross-batch corrections: `bash` and `scala` are treated as aggregator-sourced records based on local SVG Repo upload
  metadata and exact candidate pages.
- All nine `releaseDecision.action` values remain `pending`; no raw byte/structural comparison was performed in this
  pass, and no maintainer risk acceptance was created.
- See `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`,
  `Findings — Non-Phosphor Asset Provenance`, for the audit narrative.

## Goal

Produce one complete, evidence-backed record for every non-Phosphor asset.

## Scope

For every asset:

1. receive the exact retrieval source from the maintainer;
2. verify that source;
3. identify an upstream or original source where possible;
4. explain how the local SVG maps to that source;
5. record evidence quality;
6. determine the copyright-license conclusion;
7. record applicable trademark or brand policy separately;
8. determine the redistribution conclusion;
9. record the maintainer’s release decision;
10. require risk acceptance where the release decision exceeds the supported rights conclusion.

Missing maintainer input must produce `pending`, not an assumed source or automatic risk acceptance.

## Investigation Batches

### Batch A — Brand-controlled assets

Investigate first:

```text
powershell.svg
python.svg
kotlin.svg
scala.svg
```

These records require especially clear separation between:

- the software project’s license;
- the SVG artwork’s copyright terms;
- trademark or brand-use policies.

### Batch B — Project and community marks

Investigate next:

```text
nushell-logo.svg
json.svg
bash.svg
```

Determine whether the source repository or project documentation actually licenses the artwork rather than merely the
accompanying software.

### Batch C — Generic or aggregator-sourced icons

Investigate last:

```text
csv.svg
xml.svg
```

For an aggregator source, record:

- the exact asset page;
- the named collection or author;
- the page-specific license;
- whether the local file matches that page;
- any redistribution restriction relevant to bundling the SVG in an icon package.

## Permitted Match Methods

Use one of these controlled values:

```text
exact-byte-match
normalized-content-match
structural-match
visual-match
metadata-only
maintainer-attestation
```

Prefer stronger evidence when available.

`metadata-only` and `maintainer-attestation` cannot by themselves produce a `verified` evidence status without
additional support.

## Review Scenarios

```text
Given a maintainer-supplied retrieval URL
When the local SVG exactly matches the retrieved asset
Then the source is recorded with exact-byte-match evidence
```

```text
Given an open-source software repository
When its license does not explicitly apply to the logo asset
Then the software license is not recorded as the logo license
```

```text
Given an aggregator-hosted SVG
When the asset page declares terms different from the aggregator default
Then the asset-page terms are recorded
```

```text
Given an asset whose copyright terms remain undetermined
When the maintainer decides to include it
Then the record contains an explicit risk-acceptance rationale and decision reference
```

```text
Given an asset whose source has not been supplied
When the record is reviewed
Then its release decision remains pending
And the record is not converted to risk-accepted automatically
```

## Acceptance Criteria

For every non-Phosphor asset:

- the retrieval source is recorded;
- the local SHA-256 digest is present;
- the source-matching method and evidence status are explicit;
- copyright and trademark findings are separated;
- the copyright conclusion has a concrete basis;
- the redistribution conclusion is explicit;
- the release decision is explicit;
- every included asset whose conclusion is not `permitted` has risk acceptance;
- every risk acceptance points to the Phase 1 traceability record;
- no asset is considered permitted merely because the represented project is open source;
- every aggregator attribution identifies the exact asset page and page-specific terms.

## Non-goals

- Obtaining legal opinions.
- Contacting rights holders.
- Requesting trademark permission.
- Replacing, redrawing, or re-sourcing an icon.
- Deciding whether a logo constitutes nominative fair use.
- Changing the maintainer’s confirmed inclusion decision without new instructions.

## Suggested Execution Order

1. Obtain the maintainer’s source for Batch A.
2. Verify Batch A and surface blockers.
3. Repeat for Batch B.
4. Repeat for Batch C.
5. Record release decisions only after the rights conclusions.
6. Add risk-acceptance references where required.

---

# Phase 4 — Normalize and Close the Evidence Manifest

## Goal

Produce a complete and internally consistent artifact ready for automated validation in Subphase 1.2.

## Scope

Perform a full-record review rather than a sample spot check.

Verify:

- exact asset-set equality with the frozen inventory;
- deterministic record order;
- local file hashes;
- required field combinations;
- every external source and policy reference;
- Phosphor count and lineage;
- absence of placeholders;
- risk-acceptance traceability;
- no unintended repository changes.

## DDT Completion Matrix

| Redistribution conclusion | Release action | Additional requirement                                     |
| ------------------------- | -------------- | ---------------------------------------------------------- |
| `permitted`               | `include`      | Evidence and license basis must be complete                |
| `restricted`              | `include`      | Explicit risk acceptance and traceability reference        |
| `permission-required`     | `include`      | Permission evidence or explicit risk acceptance            |
| `undetermined`            | `include`      | Explicit risk acceptance and unresolved-evidence rationale |
| Any                       | `exclude`      | Exclusion rationale                                        |
| Any                       | `pending`      | Subphase cannot be marked complete                         |

Additionally:

| Evidence status      | Completion rule                                  |
| -------------------- | ------------------------------------------------ |
| `verified`           | Source and match evidence support the conclusion |
| `partially-verified` | Limitations are documented explicitly            |
| `unresolved`         | Release conclusion cannot be `permitted`         |

## Review Scenarios

```text
Given the completed manifest
When its asset filenames are compared with the frozen inventory
Then the sets are identical
And every filename occurs exactly once
```

```text
Given a cited source or policy
When the final review is performed
Then the reference is opened and checked
And the review date is recorded
```

```text
Given a record marked permitted
When its supporting evidence is inspected
Then the conclusion is supported by asset-specific terms
```

```text
Given a record with a pending release decision
When completion is evaluated
Then Subphase 1.1 remains incomplete
```

## Acceptance Criteria

- `third-party-icons.json` parses as valid JSON.
- `reviewStatus` is `complete`.
- The asset filename set exactly equals the inventory’s non-Phosphor set.
- Every export name matches the frozen inventory.
- Every local asset has a SHA-256 digest.
- The Phosphor count equals 1,512.
- The Phosphor source lineage is established and documented.
- Every external source and policy reference has been reviewed.
- Every review records its date.
- Every record has an evidence status.
- Every record has a redistribution conclusion.
- Every record has a non-pending release decision.
- Every required risk acceptance has a rationale and traceability reference.
- No unresolved placeholder language remains.
- No record claims that a software license automatically covers its logo.
- No SVG, export name, source path, or consumer file changes.

## Non-goals

- Adding the JSON to the package tarball.
- Adding schema validation code.
- Generating `THIRD_PARTY.md`.
- Creating license-text files.
- Editing `package.json`.
- Running package publication checks.
- Publishing the package.

## Suggested Execution Order

1. Sort and normalize records.
2. Compare the asset set with the inventory.
3. Verify every source reference.
4. Apply the DDT completion matrix.
5. Resolve or document every inconsistency.
6. Change `reviewStatus` to `complete`.
7. Update the traceability record.
8. Inspect the final Git diff for prohibited changes.

---

## End-to-End Acceptance Criteria

Subphase 1.1 is complete only when:

1. The committed manifest is structurally complete.
2. It contains one record for every non-Phosphor inventory entry.
3. Each record is tied to the exact local SVG through a digest.
4. Provenance evidence and rights conclusions are clearly separated.
5. Copyright licensing and trademark policies are modeled separately.
6. Every source and policy reference has been reviewed, not sampled.
7. The Phosphor corpus is tied to its actual source lineage.
8. Every redistribution conclusion is explicit.
9. Every asset has an explicit include or exclude decision.
10. Every unsupported inclusion has documented risk acceptance.
11. No placeholders or speculative license claims remain.
12. The BSD holder is recorded as `Ignacio Slater-Muñoz`.
13. No production behavior or SVG content changes.

---

## Deferred Work

### Subphase 1.2

- JSON-schema or programmatic validation;
- coverage tests against the frozen inventory;
- deterministic generation of `THIRD_PARTY.md`;
- check and update commands.

### Subphase 1.3

- `LICENSE`;
- `LICENSES/PHOSPHOR.txt`;
- additional required notice texts;
- README and maintainer documentation;
- package metadata.

### Subphase 1.4

- package `files` integration;
- tarball assertions;
- publication-gate enforcement.

### Outside Phase 1

- legal advice;
- permission requests;
- replacement artwork;
- source-directory restructuring;
- version or changelog changes;
- publication.
