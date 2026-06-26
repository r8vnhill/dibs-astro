# [PLAN] Subphase 1.1.2 --- Resolve the Phosphor Corpus Lineage

## Summary

Determine the strongest supportable provenance conclusion for the 1,512 local Phosphor-group SVGs.

The investigation must distinguish between:

- confirming the upstream project;
- confirming a range or equivalence class of candidate revisions;
- confirming one exact immutable revision;
- confirming that the local corpus is mixed or modified;
- failing to resolve the lineage.

The phase must not promote a plausible candidate into a verified revision without complete corpus evidence.

Regardless of whether the exact revision is resolved, record the independently supported MIT license conclusion based on
the license notice committed alongside the original import.

No SVG bytes, export names, inventory records, package configuration, or consumer behavior may change.

---

## Scope Classification

This is a **medium-sized evidence investigation**, organized into three phases:

1. Build the bounded candidate universe and comparison contract.
2. Compare complete candidate corpora and classify the lineage.
3. Record the conclusion and verify repository purity.

This is not primarily a production-code change, so permanent TDD infrastructure is unnecessary. Use a temporary
comparison harness and BDD-style evidence scenarios.

DDT is appropriate for the lineage-outcome matrix. PBT adds no value because the investigation concerns a finite set of
upstream revisions and a fixed corpus of 1,512 files.

---

## Established Inputs

Treat the following repository findings as prior evidence rather than repeating the historical investigation:

- Import commit:

  ```text
  1833b9e65a91917b565da9dae0df29c1642448a2
  ```

- Import date:

  ```text
  2026-03-19
  ```

- The import documentation identifies:

  - the Phosphor `regular` variant;
  - the `phosphor-icons/core` repository;
  - a manual copy from `B:\Downloads\phosphor-icons`.

- The license notice committed with the import contains:

  ```text
  Copyright (c) 2020-2024 Phosphor Icons
  ```

- Repository and lockfile history contain no pinned `@phosphor-icons/core` dependency.

- Subsequent commits moved or renamed the package assets but did not alter Phosphor SVG contents.

- The frozen inventory contains 1,512 records whose group is `phosphor`.

- The current manifest remains:

  ```json
  {
      "reviewStatus": "in-progress"
  }
  ```

These findings must still be cited in the final traceability narrative, but they do not need to be rediscovered.

---

## Files Modified

Only:

```text
packages/astro-icons/LICENSES/third-party-icons.json
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Temporary downloaded archives, extracted candidate directories, comparison reports, and scripts must remain outside the
repository or be removed before completion.

---

# Phase 1.1.2.1 — Build the Candidate Universe and Comparison Contract [DONE]

## Goal

Construct a bounded, reproducible set of upstream candidate commits without arbitrarily selecting two or three releases.

## Scope

### Candidate discovery

Enumerate official `phosphor-icons/core` tags whose commits:

- existed no later than the local import date;
- contain the regular-weight SVG corpus;
- are plausibly related to the imported 2020–2024 notice.

The copyright window may guide ordering, but it must not be the sole inclusion rule.

Resolve every candidate tag to its immutable commit SHA before comparison.

Record for each candidate:

```text
tag
commit SHA
commit date
package version, when present
regular-assets path
license notice
normalized regular-icon count
```

Do not rely only on GitHub releases. Include relevant tags even when no release entry exists.

### Candidate acquisition

Download source archives addressed by commit SHA.

Do not enumerate `assets/regular` through the ordinary directory Contents endpoint.

Extract archives to an ignored or external temporary directory.

### Filename normalization

Define one explicit candidate-name normalization rule.

For the current upstream naming convention:

```text
acorn-regular.svg → acorn.svg
file-csv-regular.svg → file-csv.svg
```

The comparison harness must also detect older candidate layouts rather than assuming all revisions use
`assets/regular/`.

For each candidate, record the actual directory used, such as:

```text
assets/regular/
raw/regular/
<another candidate-specific regular directory>
```

Do not normalize anything except the weight suffix and directory layout needed to compare the same logical icon names.

### Local corpus

Derive local filenames exclusively from:

```text
migration/icon-inventory.json
```

Select:

```text
group === "phosphor"
```

Do not enumerate the local directory independently as the primary oracle.

## Evidence Scenarios

```text
Given an official upstream tag
When it is admitted as a candidate
Then its tag is resolved to an immutable commit SHA
And the archive comparison uses that commit SHA
```

```text
Given a regular upstream file named acorn-regular.svg
When its logical filename is normalized
Then it is compared with local acorn.svg
```

```text
Given a candidate archive with no identifiable regular-weight corpus
When candidates are prepared
Then that candidate is rejected with a recorded reason
```

```text
Given the frozen local inventory
When the comparison corpus is constructed
Then it contains exactly the 1,512 phosphor-group filenames
```

## Acceptance Criteria

- Candidate discovery is rule-based, not an arbitrary shortlist.
- Every tag is resolved to a commit SHA.
- Every candidate has a recorded asset path and normalized count.
- The normalization rule is explicit and applied consistently.
- The local corpus is derived from the frozen inventory.
- Candidate archives do not modify the repository.
- Rejected candidates and their rejection reasons are retained in the temporary report.

## Non-goals

- Comparing SVG content.
- Choosing a winning revision.
- Updating the evidence manifest.
- Copying the upstream license.
- Committing the temporary comparison harness.

## Suggested Execution Order

1. Derive the local Phosphor filename set.
2. Enumerate eligible upstream tags.
3. Resolve tags to commit SHAs.
4. Download commit-addressed archives.
5. Detect each candidate’s regular-asset directory.
6. Normalize candidate filenames.
7. Record candidate metadata and rejection reasons.

---

# Phase 1.1.2.2 — Compare Complete Corpora and Classify the Lineage [DONE]

## Current Status

Phase 1.1.2.2 has completed its lineage classification cycle, while its independent reproducibility closure remains
pending. The complete comparison report currently classifies the Phosphor corpus as `unresolved` with
`evidenceStatus: unresolved` and `reasonCode: BYTE_MISMATCHES_UNEXPLAINED`: both exact filename-set candidates were
byte-compared, neither fully matched, and 147 local filenames remain unexplained by the exact-set candidates. No exact
revision, equivalent revision set, or mixed-corpus conclusion has been asserted.

## Goal

Determine whether one immutable upstream revision, several equivalent revisions, or no candidate explains the complete
local corpus.

## Scope

Use a two-stage comparison.

### Stage A — Complete normalized filename-set comparison

For every candidate, calculate:

```text
local-only filenames
candidate-only filenames
intersection size
set equality
```

Do not advance a candidate to byte comparison unless the normalized sets are exactly equal, except when investigating an
explicitly documented omission or transformation.

An exact filename-set match is necessary but not sufficient for verified lineage.

### Stage B — Complete byte comparison

For every candidate with an exact normalized filename set:

1. Map every local filename to its upstream regular-weight filename.
2. Hash all 1,512 local SVGs.
3. Hash all 1,512 corresponding upstream SVGs.
4. Compare every pair.
5. Record the complete mismatch set.

Do not use a 30–50-file sample to establish exact lineage.

Sampling may be used only as an early rejection optimization. A candidate cannot be accepted until the complete corpus
matches.

### Optional structural investigation

When filename sets match but byte hashes differ, inspect the complete mismatch report to determine whether differences
are caused by:

- meaningful SVG content differences;
- systematic formatting changes;
- local transformations;
- evidence of assets drawn from multiple upstream revisions.

Do not automatically label byte differences as mixed lineage.

A mixed-lineage conclusion requires positive evidence that different local files correspond to different upstream
revisions.

## DDT Lineage Matrix

| Filename result | Complete byte result                          | Candidate situation                               | Evidence conclusion                                                                                    |
| --------------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Exact           | All 1,512 match                               | One unique commit                                 | `verified` exact lineage                                                                               |
| Exact           | All 1,512 match                               | Multiple commits contain identical corpus         | `partially-verified`; exact revision unresolved within an equivalent range                             |
| Exact           | Some differ                                   | No proven transformation                          | `unresolved`                                                                                           |
| Exact           | Files map demonstrably to different revisions | Composite provenance established                  | mixed lineage; represent as unresolved in the current single-source schema and explain in traceability |
| Non-exact       | N/A                                           | No documented import filtering                    | `unresolved`                                                                                           |
| Non-exact       | N/A                                           | Difference explained by recorded import operation | Continue only with documented adjusted comparison                                                      |

### Unique candidate rule

A revision is uniquely verified only when:

- its normalized filename set matches;
- all corresponding SVG bytes match;
- no other candidate commit under investigation contains the same complete corpus.

A tag name alone is not the provenance identity. Record the immutable commit SHA.

## Evidence Scenarios

```text
Given one candidate commit whose normalized filename set and all SVG bytes match
When no other candidate contains the same corpus
Then the exact commit lineage is verified
```

```text
Given multiple tags whose commit archives contain an identical complete corpus
When the local corpus matches all of them
Then no preferred version is guessed
And the evidence is recorded as partially verified
```

```text
Given an exact filename-set match with one or more byte mismatches
When lineage is classified
Then the revision is not marked verified
And the complete mismatch set is recorded
```

```text
Given no candidate with an exact normalized filename set
When the investigation closes
Then the lineage remains unresolved
And the nearest candidates and their deltas are documented
```

## Acceptance Criteria

- Every eligible candidate receives a complete filename-set comparison.
- Every exact-set candidate receives a complete 1,512-file byte comparison.
- No sampled match is described as exact lineage.
- The final outcome follows the DDT matrix.
- Multiple equivalent candidates are not collapsed into an arbitrary preferred version.
- Mixed lineage is claimed only with positive file-level evidence.
- The temporary report contains enough detail to reproduce the conclusion:

  - candidate tags;
  - commit SHAs;
  - counts;
  - set differences;
  - byte mismatch counts;
  - final classification.

## Non-goals

- XML canonicalization.
- Modifying local SVG formatting to make candidates match.
- Choosing the newest candidate as a fallback.
- Treating a filename match as content verification.
- Expanding the permanent manifest schema for mixed-source corpora.

## Suggested Execution Order

1. Compare normalized filename sets for all candidates.
2. Reject nonmatching candidates with recorded deltas.
3. Hash complete exact-set candidates.
4. Identify unique or equivalent complete matches.
5. Investigate mismatches only where they could change the conclusion.
6. Apply the lineage matrix.
7. Preserve a concise research summary for the traceability record.

---

# Phase 1.1.2.3 — Record the Evidence and Preserve Repository Purity

## Goal

Update the evidence manifest and traceability record with the strongest supportable conclusion while leaving all
unrelated fields and files unchanged.

## Scope

## Manifest update: exact lineage verified

When one immutable candidate commit is uniquely established, set:

```json
{
    "source": {
        "package": "@phosphor-icons/core",
        "version": "<confirmed-package-version-or-null>",
        "commit": "<full-commit-sha>",
        "url": "<immutable-commit-url>",
        "evidenceStatus": "verified",
        "verifiedAt": "<execution-date-in-ISO-8601>",
        "evidence": "<complete filename and byte-match summary>"
    }
}
```

Use the package name only when the evidence establishes that the candidate corresponds to the published
`@phosphor-icons/core` package. A repository checkout alone does not prove that the files were obtained from the npm
tarball.

## Manifest update: equivalent candidate range

When several candidate commits contain the same complete corpus:

```json
{
    "source": {
        "package": null,
        "version": null,
        "commit": null,
        "url": "https://github.com/phosphor-icons/core",
        "evidenceStatus": "partially-verified",
        "verifiedAt": "<execution-date-in-ISO-8601>",
        "evidence": "<project and corpus confirmed; exact revision unresolved among listed commits>"
    }
}
```

List candidate tags and immutable commit SHAs in the evidence narrative and traceability section.

Do not choose one representative tag.

## Manifest update: unresolved

When no candidate fully explains the corpus:

```json
{
    "source": {
        "package": null,
        "version": null,
        "commit": null,
        "url": "https://github.com/phosphor-icons/core",
        "evidenceStatus": "unresolved",
        "verifiedAt": "<execution-date-in-ISO-8601>",
        "evidence": "<repository evidence, candidates checked, comparison results, and unresolved cause>"
    }
}
```

The evidence narrative must include:

- import commit;
- local-copy statement;
- absence of a pinned dependency;
- candidates checked;
- normalized filename deltas;
- byte-comparison results where applicable;
- why no exact revision can be asserted.

## MIT license conclusion

The license conclusion may be recorded independently of exact revision resolution because the repository committed an
MIT text and Phosphor attribution alongside the original asset import.

Set:

```json
{
    "copyright": {
        "concludedLicense": "MIT",
        "licenseSourceUrl": null,
        "copyrightNotice": "Copyright (c) 2020-2024 Phosphor Icons",
        "licenseFile": null
    }
}
```

### `licenseSourceUrl` rule

Do not place a repository-relative path such as:

```text
docs/licenses/phosphor-icons-MIT.txt
```

in a field named `licenseSourceUrl`.

Instead:

- if an exact upstream revision is verified, set `licenseSourceUrl` to the immutable upstream `LICENSE` URL at that
  commit;
- if the exact revision remains unresolved, leave `licenseSourceUrl` null and cite the local evidence file in
  `source.evidence` and the traceability record.

Keep `licenseFile` null because `LICENSES/PHOSPHOR.txt` is deferred to Subphase 1.3.

## Traceability update

Add:

```markdown
## Findings — Phosphor Corpus Lineage
```

Include:

1. **Established repository evidence**

   - import commit;
   - local-copy documentation;
   - bundled MIT notice;
   - absence of a package pin;
   - unchanged bytes after import.

2. **External comparison method**

   - candidate-selection rules;
   - filename normalization;
   - commit-addressed archives;
   - complete filename and byte comparisons.

3. **Candidates investigated**

   - tag;
   - commit SHA;
   - normalized count;
   - filename delta;
   - byte mismatch count.

4. **Conclusion**

   - verified exact revision;
   - partially verified equivalent range;
   - mixed lineage;
   - or unresolved.

5. **Downstream consequence**

   - whether exact lineage remains a Phase 1 blocker;
   - what Subphase 1.3 may safely copy as the applicable license notice.

6. **Independent license conclusion**

   - MIT rationale based on the contemporaneous import evidence.

7. **Package-code holder**

   - `Ignacio Slater-Muñoz`.

Do not reproduce the entire MIT license in the traceability record.

## Repository Verification Scenarios

```text
Given the Phase 2 changes
When the manifest diff is inspected
Then only phosphor.source and phosphor.copyright changed
And reviewStatus remains in-progress
And all nine asset records remain byte-identical
```

```text
Given the completed investigation
When repository status is inspected
Then only the manifest and traceability record are modified
And no archive, scratch script, comparison output, or extracted upstream file remains
```

```text
Given an unresolved exact revision
When the manifest is reviewed
Then no version or commit is guessed
And the downstream blocker is explicit
```

## Acceptance Criteria

- The manifest remains valid JSON.
- `phosphor.inventoryCount` remains 1,512.
- `reviewStatus` remains `"in-progress"`.
- Only `phosphor.source` and `phosphor.copyright` change in the manifest.
- All nine non-Phosphor asset records remain unchanged.
- The evidence status follows the lineage matrix.
- A verified status requires a complete, unique corpus match.
- MIT is recorded with its independent repository-evidence rationale.
- `licenseSourceUrl` is either an actual immutable URL or null.
- `licenseFile` remains null.
- The traceability record contains the method, candidates, outcome, and downstream consequence.
- No placeholder text remains in the newly populated Phosphor fields.
- No temporary research artifacts remain.
- No SVG, inventory, package metadata, source path, export, or consumer file changes.

## Non-goals

- Creating `LICENSES/PHOSPHOR.txt`.
- Changing `reviewStatus` to `"complete"`.
- Investigating the nine non-Phosphor assets.
- Editing package metadata or publication files.
- Replacing the Phosphor corpus with a known upstream version.
- Publishing the package.
- Resolving an uncertain lineage by maintainer preference.

## Suggested Execution Order

1. Apply the DDT lineage matrix to the comparison report.
2. Update `phosphor.source`.
3. Record the MIT conclusion separately.
4. Add the traceability findings section.
5. Compare the nine asset records against `HEAD`.
6. Run repository-purity checks.
7. Remove all temporary files.
8. Review the final two-file diff.

---

## Verification

Use a temporary Node or PowerShell checker to verify:

- manifest JSON validity;
- `reviewStatus === "in-progress"`;
- `phosphor.inventoryCount === 1512`;
- allowed evidence status;
- required fields for that status;
- MIT conclusion and exact notice text;
- `licenseFile === null`;
- no mutation of `assets`;
- no placeholder strings in the newly populated Phosphor fields.

Inspect repository state:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json

git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md

git diff -- packages/astro-icons/src

git diff -- packages/astro-icons/migration/icon-inventory.json

git diff -- packages/astro-icons/package.json
```

Expected changed files:

```text
packages/astro-icons/LICENSES/third-party-icons.json
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

---

## End-to-End Acceptance Criteria

Phase 2 is complete when:

1. Candidate discovery is bounded and reproducible.
2. Every candidate ref is resolved to an immutable commit.
3. Upstream regular filenames are normalized explicitly.
4. Every candidate receives a complete filename-set comparison.
5. Every exact-set candidate receives a complete byte comparison.
6. The evidence classification follows the documented matrix.
7. No exact revision is guessed.
8. The MIT conclusion is supported independently of exact revision resolution.
9. The manifest and traceability record contain sufficient evidence to audit the conclusion.
10. Only the two expected files change.
11. All production behavior and asset bytes remain unchanged.
