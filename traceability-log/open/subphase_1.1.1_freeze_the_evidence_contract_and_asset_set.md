# [PLAN] Subphase 1.1.1 --- Freeze the Evidence Contract and Asset Set

Status: Cycle 1 complete. `packages/astro-icons/LICENSES/third-party-icons.json` exists with the nine non-Phosphor
asset records derived from `migration/icon-inventory.json` (sorted lexically by `file`, export names copied verbatim,
`phosphor.inventoryCount` = 1512). All SHA-256 fields remain `null`, deferred to Cycle 2. Verified with a temporary,
uncommitted Node check (not part of the diff). Cycles 2 and 3 remain open.

## Summary

Create the initial `third-party-icons.json` evidence manifest directly from the frozen Phase 0 icon inventory.

The artifact freezes:

- the exact non-Phosphor asset set;
- the existing public export names;
- the current SVG byte identities;
- the current Phosphor-group count;
- the neutral evidence-state structure required by later research phases.

The artifact must remain explicitly incomplete:

```json
{
    "reviewStatus": "in-progress"
}
```

This phase performs no external research, source attribution, license determination, trademark analysis, redistribution
decision, or release decision.

No SVG, export, source layout, package configuration, or consumer behavior may change.

---

## Scope Classification

This is a **small change** and should be implemented as three direct red–green–refactor cycles:

1. Freeze the inventory-derived record set.
2. Bind each record to the current local SVG bytes.
3. Normalize the artifact and verify repository purity.

The frozen inventory is the test oracle. Synthetic fixtures, PBT, and committed validation infrastructure are
unnecessary.

A temporary Node-based check harness may be used during execution, but it must not remain in the final diff.

---

## Deliverable

Create:

```text
packages/astro-icons/LICENSES/third-party-icons.json
```

The final Git diff for this phase should contain only this new file.

---

## Sources of Truth

### Frozen inventory

```text
packages/astro-icons/migration/icon-inventory.json
```

It is authoritative for:

- `file`;
- `exportName`;
- `group`;
- the current custom/non-Phosphor asset set;
- the current Phosphor asset count.

Do not modify it.

### Local SVG bytes

```text
packages/astro-icons/src/<file>
```

These files are authoritative for `localArtifact.sha256`.

Do not modify them.

### Parent evidence contract

```text
traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
```

It defines the three independent dimensions used later:

- evidence status;
- redistribution conclusion;
- release decision.

---

## Neutral Skeleton Rules

Unknown research values must use explicit neutral representations.

### Required defaults

| Field                                  |    Initial value | Reason                                          |
| -------------------------------------- | ---------------: | ----------------------------------------------- |
| `reviewStatus`                         |  `"in-progress"` | Research is not complete                        |
| `phosphor.source.evidenceStatus`       |   `"unresolved"` | Lineage has not been investigated               |
| `phosphor.copyright.concludedLicense`  |  `"NOASSERTION"` | Applicable revision has not been established    |
| `phosphor.copyright.licenseFile`       |           `null` | Notice file is created only after verification  |
| `displayName`                          |           `null` | Deferred to asset investigation                 |
| `assetType`                            |           `null` | Deferred to asset investigation                 |
| `retrievalSource.url`                  |           `null` | No source is recorded in this phase             |
| `retrievalSource.revision`             |           `null` | No source revision is recorded                  |
| `retrievalSource.suppliedByMaintainer` |          `false` | No supplied source has yet been entered         |
| `upstreamSource.project`               |           `null` | Deferred to investigation                       |
| `upstreamSource.url`                   |           `null` | Deferred to investigation                       |
| `upstreamSource.revision`              |           `null` | Deferred to investigation                       |
| `match.method`                         |           `null` | No source comparison has occurred               |
| `match.evidenceStatus`                 |   `"unresolved"` | Provenance is not established                   |
| `rights.copyright.concludedLicense`    |  `"NOASSERTION"` | No asset license conclusion has been made       |
| `rights.copyright.sourceUrl`           |           `null` | No license source has been reviewed             |
| `rights.copyright.verifiedAt`          |           `null` | No verification has occurred                    |
| `rights.copyright.basis`               |           `null` | No conclusion exists                            |
| `rights.copyright.licenseFile`         |           `null` | No notice requirement has been established      |
| `rights.trademark.owner`               |           `null` | Deferred to investigation                       |
| `rights.trademark.policyUrl`           |           `null` | Deferred to investigation                       |
| `rights.trademark.verifiedAt`          |           `null` | No policy has been reviewed                     |
| `rights.trademark.applies`             |      `"unknown"` | No trademark conclusion has been made           |
| `rights.trademark.notes`               |           `null` | No analysis has been recorded                   |
| `redistribution.conclusion`            | `"undetermined"` | Rights investigation has not occurred           |
| `redistribution.rationale`             |           `null` | No conclusion exists                            |
| `releaseDecision.action`               |      `"pending"` | No inclusion or exclusion decision is made here |
| `releaseDecision.riskAcceptance`       |           `null` | Risk acceptance would be premature              |
| `notes`                                |             `[]` | No findings have been recorded                  |

Do not use empty strings for unknown data. `null` distinguishes missing research from a deliberately empty textual
value.

Do not set `MIT` as the Phosphor license merely because MIT is the expected candidate. Phase 2 must establish the actual
asset lineage before recording the applicable license conclusion and notice file.

---

# Cycle 1 — Freeze the Inventory-Derived Record Set [DONE]

## Goal

Create the manifest skeleton from the exact current inventory without independently reproducing filenames, export names,
or counts.

## Scope

- Create `LICENSES/`.
- Read `migration/icon-inventory.json`.
- Derive the Phosphor and non-Phosphor groups.
- Create one neutral asset record for every inventory entry whose `group` is `custom`.
- Copy `file` and `exportName` verbatim.
- Sort records lexically by `file`.
- Add the top-level and Phosphor skeletons.
- Leave SHA-256 fields temporarily null until Cycle 2.

Read the frozen JSON directly unless `icon-inventory.mjs` already exposes a stable, side-effect-free read API. Do not
add or modify reusable code merely for this one-time artifact construction.

## Red

Create a temporary executable check expressing the initial contract:

```text
Given the frozen icon inventory
When the evidence manifest is inspected
Then the manifest exists
And its custom-asset filename set equals the inventory custom-group filename set
And every export name equals the corresponding frozen export name
And no unknown or duplicate asset record exists
```

Initially, the check must fail because the manifest does not exist.

Additional characterization assertions:

```text
Given the current frozen inventory
When its groups are counted
Then the total is 1521
And the Phosphor group contains 1512 records
And the custom group contains 9 records
```

These numbers characterize the frozen baseline. They must not be used to construct the collections.

## Green

Create the manifest skeleton with:

```json
{
    "schemaVersion": 1,
    "reviewStatus": "in-progress",
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
            "evidenceStatus": "unresolved",
            "verifiedAt": null,
            "evidence": null
        },
        "copyright": {
            "concludedLicense": "NOASSERTION",
            "licenseSourceUrl": null,
            "copyrightNotice": null,
            "licenseFile": null
        }
    },
    "assets": []
}
```

Populate `assets` from the inventory-derived custom group.

Each asset record must contain the complete neutral structure, even though most research fields remain null or
unresolved.

## Refactor

- Replace any empty unknown strings with `null`.
- Ensure every unresolved status uses an allowed explicit enum value.
- Remove duplicated source-derived data.
- Confirm all asset records have the same property order.
- Confirm asset ordering depends only on `file`.

## Acceptance Criteria

- The manifest exists and parses as JSON.
- `reviewStatus` is `"in-progress"`.
- The asset filename set exactly equals the inventory custom-group filename set.
- Every asset occurs exactly once.
- Every `exportName` is copied unchanged from the inventory.
- Asset records are sorted lexically by `file`.
- `phosphor.inventoryCount` is derived from the inventory.
- The current baseline assertions produce 1,512 Phosphor and nine non-Phosphor records.
- No rights, provenance, redistribution, or release conclusion has been invented.

## Non-goals

- Computing hashes.
- External research.
- Determining Phosphor’s source revision.
- Recording an MIT conclusion.
- Creating permanent scripts or tests.

---

# Cycle 2 — Bind Records to the Current SVG Bytes

## Goal

Associate every non-Phosphor evidence record with the exact current local SVG through a SHA-256 digest.

## Scope

For each manifest asset:

1. Resolve `src/<file>` relative to the package directory.
2. Read the file as raw bytes.
3. Compute SHA-256.
4. Store the lowercase hexadecimal digest in:

   ```text
   localArtifact.sha256
   ```

Do not normalize line endings, parse XML, serialize SVGs, or hash text-decoded content.

## Red

Extend the temporary check:

```text
Given every non-Phosphor manifest record
When its local artifact binding is inspected
Then localArtifact.sha256 is a lowercase 64-character hexadecimal string
And it equals the SHA-256 of the current raw SVG bytes
```

The check must fail while digest fields are null.

Also require:

```text
Given an inventory file whose corresponding SVG is missing
When the binding step runs
Then the operation fails clearly
And no partial final manifest is accepted
```

Do not simulate this by renaming a real source file. The condition can be expressed in the temporary checker or reviewed
through path-existence handling.

## Green

Compute each digest using the raw `Buffer` read from the SVG.

Populate only:

```json
{
    "localArtifact": {
        "sha256": "<64-lowercase-hex-characters>"
    }
}
```

Do not change any other evidence field.

## Refactor

- Ensure path resolution is independent of the caller’s working directory.
- Ensure hashing reads each file once.
- Keep hashing order deterministic by processing the already sorted asset records.
- Regenerate the JSON only after all files have been read and hashed successfully.
- Avoid platform-specific commands such as relying solely on `sha256sum`.

## Acceptance Criteria

- Every asset has one SHA-256 digest.
- Every digest matches the current raw SVG bytes.
- Every digest is lowercase hexadecimal with length 64.
- No SVG has changed.
- No hash is derived from a filename, decoded string, or normalized representation.
- Failure to read any expected SVG prevents accepting a complete artifact.

## Non-goals

- Hashing all 1,512 Phosphor files.
- Comparing SVGs with upstream assets.
- Treating a digest as provenance evidence.
- Recording any source-match method.
- Adding a reusable hashing library.

---

# Cycle 3 — Normalize and Verify the Frozen Skeleton

## Goal

Produce the final deterministic in-progress manifest and prove that this phase changed nothing else.

## Scope

- Normalize property ordering.
- Serialize with four-space indentation.
- Add exactly one trailing line feed.
- Run the complete temporary contract check.
- Inspect repository changes.
- Remove all temporary check or generation files.

## Red

Run a final temporary check covering all phase invariants:

```text
Given the completed Phase 1 skeleton
When it is compared with the frozen inventory and local SVG files
Then every expected record is present exactly once
And no unexpected record exists
And every export name matches
And every digest matches
And the records are lexically ordered
And all research fields retain neutral defaults
And reviewStatus remains in-progress
```

The check should also reject:

- duplicate asset filenames;
- duplicate records for one inventory item;
- missing custom-group assets;
- unknown asset records;
- non-null source URLs;
- evidence status other than `unresolved`;
- redistribution conclusion other than `undetermined`;
- release action other than `pending`;
- non-null risk acceptance;
- a premature Phosphor license conclusion;
- missing or malformed digests.

## Green

Correct any inconsistency until the complete check passes.

Write the final artifact using:

```text
JSON.stringify(manifest, null, 4) + "\n"
```

Run the same check again without rewriting the file.

## Refactor

- Remove temporary scripts and scratch files.
- Confirm no construction-only metadata remains.
- Confirm no comments were added to JSON.
- Confirm there are no timestamps or absolute paths.
- Confirm unknown values are consistently represented.
- Confirm the manifest remains explicitly incomplete.

## Acceptance Criteria

- `third-party-icons.json` parses successfully.
- Serialization uses stable property order.
- Indentation is four spaces.
- The file ends with exactly one line feed.
- The asset set exactly equals the inventory custom-group set.
- Every asset record contains the correct frozen export name.
- Every local digest matches.
- Asset records are sorted by filename.
- `phosphor.inventoryCount` equals the inventory-derived count.
- `phosphor.source.evidenceStatus` is `"unresolved"`.
- `phosphor.copyright.concludedLicense` is `"NOASSERTION"`.
- Every asset has:

  - unresolved provenance;
  - `NOASSERTION` copyright;
  - unknown trademark applicability;
  - undetermined redistribution;
  - pending release action;
  - no risk acceptance.
- `reviewStatus` remains `"in-progress"`.
- No temporary script or test remains in the repository.
- The final diff contains only:

  ```text
  packages/astro-icons/LICENSES/third-party-icons.json
  ```

## Non-goals

- Changing `reviewStatus` to `"complete"`.
- Adding schema or validator code.
- Committing a manifest generator.
- Adding license texts.
- Editing package metadata.
- Adding the manifest to the tarball.
- Conducting any provenance or legal investigation.

---

## Final Manifest Record Shape

Each asset record should initially follow this structure:

```json
{
    "file": "python.svg",
    "exportName": "Python",
    "displayName": null,
    "assetType": null,
    "localArtifact": {
        "sha256": "<computed-digest>"
    },
    "provenance": {
        "retrievalSource": {
            "url": null,
            "revision": null,
            "suppliedByMaintainer": false
        },
        "upstreamSource": {
            "project": null,
            "url": null,
            "revision": null
        },
        "match": {
            "method": null,
            "evidenceStatus": "unresolved",
            "details": null
        }
    },
    "rights": {
        "copyright": {
            "concludedLicense": "NOASSERTION",
            "sourceUrl": null,
            "verifiedAt": null,
            "basis": null,
            "licenseFile": null
        },
        "trademark": {
            "owner": null,
            "policyUrl": null,
            "verifiedAt": null,
            "applies": "unknown",
            "notes": null
        }
    },
    "redistribution": {
        "conclusion": "undetermined",
        "rationale": null
    },
    "releaseDecision": {
        "action": "pending",
        "riskAcceptance": null
    },
    "notes": []
}
```

No descriptive values should be inferred from filenames during this phase.

---

## Verification Commands

Use temporary Node checks rather than permanent validation code.

At minimum, verify:

```powershell
node -e "JSON.parse(require('node:fs').readFileSync('packages/astro-icons/LICENSES/third-party-icons.json', 'utf8'))"
```

The full temporary checker should additionally verify:

- exact set equality with the inventory custom group;
- exact export-name equality;
- uniqueness;
- lexical ordering;
- inventory-derived Phosphor count;
- neutral field defaults;
- every SHA-256 digest against the current source bytes;
- deterministic formatting.

Repository-purity checks:

```powershell
git status --short
git diff --stat
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected final status:

```text
?? packages/astro-icons/LICENSES/third-party-icons.json
```

No other tracked or untracked execution artifact should remain.

---

## End-to-End Acceptance Criteria

This phase is complete when:

1. The manifest skeleton is derived entirely from the frozen inventory.
2. The nine-record baseline is confirmed but not used as a construction list.
3. The Phosphor count is derived and currently equals 1,512.
4. Every export name is copied from the inventory.
5. Every non-Phosphor asset is bound to its current raw SVG bytes.
6. Unknown research values use explicit neutral defaults.
7. No Phosphor license or lineage conclusion is recorded prematurely.
8. Copyright and trademark fields remain separate.
9. Redistribution remains undetermined.
10. Release decisions remain pending.
11. The artifact is deterministic and explicitly in progress.
12. No permanent validator, generator, test, configuration change, or source modification is introduced.

---

## Deferred Work

### Subphase 1.1 · Phase 2

- establish the Phosphor source package, version, tag, or commit;
- verify the applicable MIT notice;
- replace `NOASSERTION` only after lineage verification.

### Subphase 1.1 · Phase 3

- enter maintainer-supplied retrieval sources;
- establish source matches;
- research copyright and trademark policies;
- determine redistribution conclusions;
- record release decisions and risk acceptance.

### Subphase 1.1 · Phase 4

- review every cited reference;
- normalize completed evidence;
- enforce the completion matrix;
- set `reviewStatus` to `"complete"`.

### Later Subphases

- committed validators and generated notices;
- license and attribution text files;
- package metadata and tarball inclusion;
- publication checks.
