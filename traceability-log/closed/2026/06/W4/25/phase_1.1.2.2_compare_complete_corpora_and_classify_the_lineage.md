# [DONE] Phase 1.1.2.2 --- Compare Complete Corpora and Classify the Lineage

## Summary

Compare every discovered upstream Phosphor corpus variant with the frozen local 1,512-file Phosphor corpus and derive
the strongest lineage conclusion supported by complete evidence.

The comparison has three logical stages:

1. Validate the Phase 1.1.2.1 handoff and compare complete normalized filename sets.
2. Compare every byte of every exact-set candidate corpus.
3. Apply a deterministic lineage-classification matrix.

This phase produces a temporary, reproducible `comparison-report.json` and a committed traceability plan/status
document.

It does not update the evidence manifest, select a preferred revision, modify SVGs, or change package behavior.

---

## Scope Classification

This is a **small scope** suitable for four direct red–green–refactor cycles:

1. Validate the handoff and perform complete filename-set comparison.
2. Perform complete byte comparison for exact-set candidates.
3. Classify the lineage and generate the comparison report.
4. Prove reproducibility and close the traceability record.

DDT is appropriate for lineage classification.

PBT is not appropriate because the work concerns a fixed local corpus and ten finite upstream corpus variants.

---

## Established Inputs

### Closed discovery phase

```text
traceability-log/closed/2026/06/W4/25/
phase_1.1.2.1_build_the_candidate_universe_and_comparison_contract.md
```

### Existing scratch run

```text
C:\Users\usuario\AppData\Local\Temp\
astro-icons-phosphor-lineage\
20260625T151250699\
```

### Required scratch inputs

```text
candidate-report.json
local-filenames.json
corpora/*.json
upstream-core/
discover-candidates.ps1
```

### Read-only repository inputs

```text
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/*.svg
```

### Characterized current baseline

The following are characterization expectations, not construction inputs:

```text
Local files:             1512
Corpus variants:         10
Exact filename variants: 2
Eligible variant IDs:
  a2a0bfd7cb66d08a
  a5e861b1bd29ab95
```

Both exact-set variants currently reference the same six candidate commits, but that fact must be re-derived and checked
by the extended script.

---

## Deliverables

### Repository deliverable

Create:

```text
traceability-log/open/
phase_1.1.2.2_compare_complete_corpora_and_classify_the_lineage.md
```

The document begins as a `[PLAN]` record.

After each cycle passes, append a concise `Current Status` paragraph beneath that cycle and mark that cycle `[DONE]`. Do
not record expected comparison results as completed findings before execution.

### Scratch deliverables

Extend:

```text
discover-candidates.ps1
```

Create:

```text
comparison-report.json
```

Optional deterministic sidecars may be created under:

```text
comparison/
```

only when they materially reduce duplication in the main report.

All scratch artifacts remain outside the repository.

---

## Comparison Contract

### Input integrity

Before performing any comparison, validate:

- `candidate-report.json` parses successfully;
- `local-filenames.json` parses successfully;
- their declared schema versions are supported;
- every referenced corpus filename report exists;
- every corpus ID is unique;
- every commit SHA is a full hexadecimal SHA;
- every corpus variant has a non-empty commit set;
- every corpus variant’s declared tree object and path are internally consistent;
- every normalized filename is unique within its corpus;
- every declared filename-set digest can be recomputed;
- the local filename-set digest can be recomputed;
- the frozen inventory still produces the same local filename set.

Record the exact input bytes:

```json
{
    "inputs": {
        "candidateReportSha256": "<sha256>",
        "localFilenamesReportSha256": "<sha256>",
        "inventoryFilenameSetSha256": "<sha256>"
    }
}
```

This binds the comparison result to the precise Phase 1.1.2.1 handoff.

### Deterministic serialization

All generated JSON must use:

- ordered object properties;
- ordinally sorted arrays where order is not semantically inherited;
- four-space indentation;
- LF line endings;
- UTF-8 without BOM;
- exactly one trailing line feed;
- no timestamps;
- no absolute paths;
- no execution durations;
- no machine or username information.

---

# Cycle 1 — Validate the Handoff and Compare Complete Filename Sets [DONE]

## Current Status

Cycle 1 is complete. `discover-candidates.ps1` was extended with a handoff-integrity gate
(`Test-ComparisonHandoffIntegrity`) that recomputes both filename-set digests, re-derives the local corpus from
`icon-inventory.json`, re-checks every corpus variant's declared tree object against `git rev-parse <sha>:<path>` for
every one of its associated commits, and rejects duplicate corpus IDs, non-full-hex commit SHAs, empty commit sets,
duplicate normalized filenames, and stale digests with a single grouped diagnostic. Validation passed on the existing
Phase 1.1.2.1 handoff with no issues.

Stage A (`Invoke-StageAComparison`) then performed a complete normalized filename-set comparison for all 10 corpus
variants against the frozen 1,512-file local corpus. The script-derived result reproduced the characterized baseline
exactly: 2 eligible variants (`a2a0bfd7cb66d08a`, `a5e861b1bd29ab95`, both `STAGE_A_EXACT_SET`) and 8 variants rejected
as `STAGE_A_FILENAME_SET_MISMATCH` with complete sorted local-only/candidate-only deltas retained. The script throws if
the computed eligible set ever diverges from this characterization, rather than assuming it.

The script wrote `comparison-report.json` (schema version 1, `comparisonContractVersion` 1) containing the exact input
hashes (`candidateReportSha256`, `localFilenamesReportSha256`, `inventoryFilenameSetSha256`), the local corpus
descriptor, and the complete Stage A results for all 10 variants. Two independent executions of the full script produced
byte-identical `comparison-report.json` files (SHA-256
`c29a599ed9d8d757bda31252372adb4e1f9886047b85f5b450d5204129b40e8d`), and the in-script `Test-RepositoryPurity` check
passed after both runs — no SVG, inventory, or repository file was modified. `stageB` and `classification` are not yet
populated; they are deferred to Cycles 2 and 3.

## Goal

Prove that the discovery report is internally consistent and compare all ten candidate filename sets with the frozen
local corpus.

## Scope

### Handoff validation

Validate the complete Phase 1.1.2.1 report before consuming it.

Do not silently repair:

- stale hashes;
- missing sidecars;
- duplicate IDs;
- malformed mappings;
- unknown corpus references;
- inconsistent tree IDs.

Fail with a grouped diagnostic.

### Local corpus reconstruction

Reconstruct the local corpus from:

```text
packages/astro-icons/migration/icon-inventory.json
```

Use:

```text
group === "phosphor"
```

Read `sourceDirectory` from the inventory when preparing later local paths.

Each inventory `file` already includes `.svg`; never append another extension.

### Stage A comparison

For each corpus variant, derive:

```text
localOnly
candidateOnly
intersectionSize
setEqual
```

Both difference lists must be complete and sorted ordinally.

Add a stable result code:

```text
STAGE_A_EXACT_SET
STAGE_A_FILENAME_SET_MISMATCH
```

A filename mismatch excludes that variant from Stage B.

## Red

Add failing checks for these behaviors:

```text
Given a candidate report whose declared filename digest is stale
When the comparison begins
Then execution fails before Stage A
And no comparison report is accepted
```

```text
Given the frozen inventory and local-filenames report
When their filename sets are compared
Then they are exactly equal
And their canonical digests match
```

```text
Given the ten corpus variants
When Stage A runs
Then every variant receives exactly one Stage A result
```

```text
Given a candidate filename set
When it differs from the local set
Then the complete local-only and candidate-only lists are recorded
And the variant is excluded from Stage B
```

```text
Given the current candidate handoff
When Stage A completes
Then exactly the characterized two variant IDs have setEqual = true
```

The final assertion is a regression characterization. Eligibility must still be computed rather than assigned from the
expected IDs.

## Green

Implement:

1. Input-report hashing.
2. Schema and reference validation.
3. Local inventory reconstruction.
4. Canonical filename-set hashing.
5. Complete set comparison for all ten variants.
6. Stable result and rejection codes.

Recommended Stage A record:

```json
{
    "variantId": "a2a0bfd7cb66d08a",
    "candidateCount": 1512,
    "localCount": 1512,
    "intersectionSize": 1512,
    "localOnlyCount": 0,
    "candidateOnlyCount": 0,
    "localOnly": [],
    "candidateOnly": [],
    "setEqual": true,
    "resultCode": "STAGE_A_EXACT_SET",
    "eligibleForStageB": true
}
```

## Refactor

- Separate report validation from comparison.
- Use one canonical set-difference helper.
- Sort all difference lists ordinally.
- Derive counts from arrays rather than maintaining parallel counters.
- Keep report loading, validation, and Stage A calculation independently testable.
- Do not write `comparison-report.json` until the complete in-memory result is valid.

## Acceptance Criteria

- Both handoff reports pass integrity validation.
- The frozen inventory and local report describe the same 1,512 filenames.
- All ten variants receive Stage A results.
- Exact-set eligibility is derived from complete set equality.
- The current baseline yields exactly two eligible variants.
- All eight mismatching variants contain complete sorted deltas.
- No SVG bytes are read during Stage A.
- No repository file changes during script execution.
- A rerun produces the same Stage A structure.

## Non-goals

- Hashing local or upstream SVG bytes.
- Choosing between exact-set variants.
- Inferring lineage from counts alone.
- Updating the evidence manifest.
- Treating the characterized eligible IDs as configuration.

## Suggested Execution Order

1. Hash and load the two input reports.
2. Validate schemas and references.
3. Reconstruct the local inventory set.
4. Validate canonical set hashes.
5. Compare all ten variants.
6. Confirm the characterized two-variant result.
7. Record Cycle 1 status only after all checks pass.

---

# Cycle 2 — Compare Every Byte of Every Exact-Set Corpus [DONE]

## Current Status

The byte-exact extraction characterization passed: a `going-merry.bin` fixture containing `0x00`, CR, LF, `0xFF`, and
other non-text byte sequences was committed to a temporary scratch Git repository and extracted via the established
`git cat-file` redirection path with exact byte equality confirmed.

All 1,512 local SVGs were hashed once into a single local SHA-256 map keyed by normalized filename. For each of the two
Stage-A-eligible corpus variants, a validated bijective mapping from normalized filename to upstream source path was
built, every associated commit was reconfirmed to resolve the variant's declared path to its declared tree object, and a
deterministic representative commit was selected (earliest committer date, then lexically smallest SHA) — both variants
resolved to the same representative commit `036f8574bbfc7b74bb9220ee6c8e8a02103e9dc4`. Complete byte comparison was then
performed for all 1,512 filename pairs per variant (3,024 logical comparisons total, no sampling, no early exit):

- `a2a0bfd7cb66d08a` (`assets/regular`): 1,512 compared, **0 matched, 1,512 mismatched**. A manual inspection of one
  mismatch (`acorn.svg`) confirmed this is a genuine content difference: the upstream blob at this commit is a bold
  filled-icon rendering, while the local file is a thinner line-art rendering of the same subject — different SVG path
  geometry entirely, not a formatting or whitespace difference. This is real evidence that the local corpus does not
  correspond to the `regular`-weight style published at this candidate commit's `assets/regular` path, despite the
  directory's identical normalized filename set.
- `a5e861b1bd29ab95` (`raw/regular`): 1,512 compared, **1,365 matched, 147 mismatched**. Both variants share the same
  representative commit, so the partial match here indicates the `raw/regular` directory at this commit is closer to,
  but not identical to, the local corpus.

Every upstream blob was extracted and hashed at most once (a per-object-ID cache was shared across both variants, so
content-identical blobs already fetched for one variant were not re-extracted for the other). No local SVG was written
or normalized; comparison was strictly byte-for-byte with no XML canonicalization.

The full script was re-run independently and produced a byte-identical `comparison-report.json` (SHA-256
`fdd10c62df6dc40d3c9d06dc7186201267dc2bf303e8978900b21a6f1271ccfc`), and `Test-RepositoryPurity` passed on both runs —
no repository file besides this traceability document changed.

Per the DDT lineage matrix, neither variant qualifies as `verified` (matches are not all-1,512), so Cycle 3's
classification will need to record at least one of these as `unresolved` given the present evidence; no preferred
revision has been guessed. The complete mismatch list for each variant is retained in `comparison-report.json` for Cycle
3's classification step. The formal two-independent-output-directory reproducibility proof remains for Cycle 4.

## Goal

Compare all 1,512 local SVGs with the corresponding upstream blobs for every Stage-A-eligible corpus variant.

## Scope

### Local hashing

Build the local path as:

```text
<repository root>/<inventory.sourceDirectory>/<inventory file>
```

Hash every local file once.

Store one local hash map keyed by normalized filename:

```text
normalized filename → SHA-256
```

Validate:

- every expected file exists;
- every path remains beneath `sourceDirectory`;
- no file is written;
- all 1,512 files are hashed.

### Upstream mapping

For every eligible corpus variant, load its filename sidecar and establish a bijection:

```text
normalized filename → upstream source path
```

Reject:

- missing normalized names;
- duplicate normalized names;
- duplicate source paths;
- source paths outside the declared corpus path;
- mappings that do not cover the complete exact filename set.

### Variant representative

Because each corpus variant is grouped by path and tree object ID:

1. Assert every associated commit resolves the declared corpus path to the same tree object.
2. Choose one deterministic representative commit:

   - earliest committer date;
   - then lexically smallest SHA.
3. Record the representative commit.
4. Read each unique blob through that representative.

Do not assume the candidate report grouping is correct without checking it.

### Blob-level caching

For each upstream source path:

1. Resolve:

   ```text
   <representative commit>:<source path>
   ```

   to a Git blob object ID.

2. Cache the SHA-256 by blob object ID.

3. Extract and hash each unique blob only once.

Different variants may refer to the same blob object. Reuse the cached digest.

### Byte-exact extraction characterization

Before hashing the corpus, create a temporary binary fixture named:

```text
going-merry.bin
```

The fixture must include:

- `0x00`;
- carriage return;
- line feed;
- `0xFF`;
- non-text byte sequences.

Store it as a blob in a temporary scratch Git repository, extract it through the chosen `git cat-file` redirection path,
and verify byte equality.

This test establishes that the PowerShell 7.6 extraction path preserves arbitrary bytes.

## Red

Add failing checks:

```text
Given a filename already ending in .svg
When its local path is resolved
Then no second extension is appended
```

```text
Given an eligible corpus variant
When its mapping is validated
Then every local filename maps to exactly one upstream source path
```

```text
Given several commits associated with one corpus variant
When their corpus tree is checked
Then every commit resolves to the declared shared tree object
```

```text
Given the going-merry binary fixture
When it is extracted through git cat-file
Then the extracted bytes are exactly equal to the original bytes
```

```text
Given an exact-set candidate
When Stage B completes
Then all 1512 filename pairs are compared
And no early exit occurs after the first mismatch
```

```text
Given two references to the same upstream blob object
When their hashes are requested
Then the blob is extracted and hashed once
```

## Green

Implement:

- one local SHA-256 map;
- one validated mapping per eligible variant;
- representative-commit selection;
- corpus tree assertions;
- blob-object resolution;
- blob SHA-256 caching;
- complete per-variant comparison.

Recommended Stage B result:

```json
{
    "variantId": "a2a0bfd7cb66d08a",
    "representativeCommitSha": "<full-sha>",
    "treeObjectId": "<tree-id>",
    "totalCompared": 1512,
    "matchCount": 1512,
    "mismatchCount": 0,
    "allBytesMatch": true,
    "uniqueBlobCount": 1512,
    "mismatches": []
}
```

A mismatch record should contain:

```json
{
    "normalizedFilename": "acorn.svg",
    "sourcePath": "assets/regular/acorn-regular.svg",
    "upstreamBlobObjectId": "<git-object-id>",
    "localSha256": "<sha256>",
    "upstreamSha256": "<sha256>"
}
```

Record the complete mismatch list. Do not truncate it.

## Refactor

- Hash local files once outside the variant loop.
- Cache upstream digests by blob object ID.
- Keep blob resolution separate from blob extraction.
- Delete temporary extracted blobs after their hashes are computed.
- Do not store temporary file paths in the report.
- Record counts derived from the final comparison collection.
- Keep byte comparison independent of lineage classification.

## Acceptance Criteria

- The binary extraction characterization passes.
- Every eligible mapping is bijective.
- Every associated commit agrees with the variant’s declared tree object.
- Every eligible variant compares all 1,512 files.
- The current baseline performs 3,024 logical file comparisons.
- Each local SVG is read and hashed once.
- Each unique upstream blob is extracted and hashed at most once.
- Every mismatch is retained.
- No local SVG is written or normalized.
- No XML parsing or canonicalization occurs.
- Stage B results are deterministic.

## Non-goals

- Comparing filename-mismatching variants.
- Treating Git object IDs as SHA-256 content hashes.
- XML canonicalization.
- Ignoring whitespace or metadata differences.
- Selecting a winning variant.
- Claiming mixed lineage from mismatches alone.

## Suggested Execution Order

1. Characterize byte-exact Git extraction.
2. Resolve and validate local source paths.
3. Hash all local files.
4. Validate eligible variant mappings.
5. Verify shared tree objects.
6. Select representatives.
7. Resolve and cache blob hashes.
8. Compare all pairs.
9. Record Cycle 2 status only after complete comparison.

---

# Cycle 3 — Apply the Lineage Matrix and Generate the Report [DONE]

## Current Status

Cycle 3 is complete. `discover-candidates.ps1` now includes a pure lineage classifier over the Stage A and Stage B
result objects, plus synthetic DDT checks for every documented matrix row: unique complete match, equivalent complete
matches across six commits, full-match filtering that excludes mismatching variants from the candidate revision set,
positive complete mixed-corpus coverage, and unresolved evidence with unexplained files. The DDT matrix passed during
the full harness run before the real comparison report was accepted.

The regenerated `comparison-report.json` now contains the structured Stage B summary (`eligibleVariantCount: 2`,
`logicalComparisonCount: 3024`, `uniqueUpstreamBlobCount: 3024`) and a deterministic `classification` object. Applying
the matrix to the real comparison produced:

```json
{
    "kind": "unresolved",
    "evidenceStatus": "unresolved",
    "reasonCode": "BYTE_MISMATCHES_UNEXPLAINED"
}
```

No variant fully matched all 1,512 local SVGs, so no commit SHA or equivalent revision set was retained as a verified
candidate. The classifier also did not claim mixed-corpus evidence: only `a5e861b1bd29ab95` contributes byte matches,
and 147 local filenames remain unexplained by the exact-set candidates. The final Cycle 3 report SHA-256 is
`89204e3fb9669f611056e9df7664262a3b956a2b111721e263451ba0cd834cd5`. `Test-RepositoryPurity` passed after serialization;
the permanent manifest and `third-party-icons.json` remain untouched.

## Goal

Derive one deterministic lineage classification from Stage A and Stage B without guessing a preferred commit.

## Scope

Separate two concepts:

### Classification kind

```text
exact-revision
equivalent-revision-set
mixed-corpus
unresolved
```

### Evidence status

```text
verified
partially-verified
unresolved
```

This prevents a descriptive lineage shape from being confused with the strength of the evidence.

## Classification Rules

### Rule A — Exact revision

Use:

```text
kind: exact-revision
evidenceStatus: verified
```

only when:

- at least one variant fully matches;
- the union of commits associated with all fully matching variants contains exactly one SHA.

Path ambiguity within the same commit may be recorded separately but does not prevent revision verification.

### Rule B — Equivalent revision set

Use:

```text
kind: equivalent-revision-set
evidenceStatus: partially-verified
```

when:

- at least one variant fully matches;
- the union of commits associated with all fully matching variants contains more than one SHA.

List every matching variant, corpus path, tree object, and commit SHA.

Do not choose a representative revision.

If one variant fully matches and another exact-set variant has mismatches, classify using only the fully matching
variants. Retain the mismatching evidence, but do not call the corpus mixed.

### Rule C — Positive mixed-corpus evidence

Use:

```text
kind: mixed-corpus
evidenceStatus: unresolved
```

only when all of these hold:

1. No eligible variant fully matches.
2. Every local filename matches at least one eligible variant.
3. At least two distinct corpus variants contribute exclusive matches.
4. Each contributing variant has at least one filename not matched by the other contributing variants.
5. The contributing variants represent distinct tree objects or source corpora.
6. No local filename remains unexplained.

This establishes that the local files can be composed from multiple candidate corpora.

The evidence status remains `unresolved` because the current manifest schema cannot represent a complete multi-source
provenance assertion.

### Rule D — Unresolved

Use:

```text
kind: unresolved
evidenceStatus: unresolved
```

for every other result, including:

- no exact filename candidate;
- exact filename candidates with unexplained byte mismatches;
- partial combined coverage;
- ambiguous evidence that does not satisfy the mixed-corpus rule.

## DDT Matrix

| Full-byte matching variants |                                       Candidate commit union | Combined mixed coverage | Classification                                   |
| --------------------------- | -----------------------------------------------------------: | ----------------------- | ------------------------------------------------ |
| One or more                 |                                                     1 commit | Not relevant            | `exact-revision` / `verified`                    |
| One or more                 |                                           More than 1 commit | Not relevant            | `equivalent-revision-set` / `partially-verified` |
| None                        | Complete, with exclusive contribution from multiple variants | Yes                     | `mixed-corpus` / `unresolved`                    |
| None                        |                                  Incomplete or non-exclusive | No                      | `unresolved` / `unresolved`                      |

## Red

Add DDT-driven checks for every row:

```text
Given one fully matching variant associated with one commit
When classification runs
Then the result is exact-revision and verified
```

```text
Given fully matching variants associated with six commits
When classification runs
Then all six commits are retained
And the result is equivalent-revision-set and partially-verified
```

```text
Given one fully matching variant and one mismatching variant
When classification runs
Then only the matching variant contributes candidate commits
And the result is not mixed-corpus
```

```text
Given no fully matching variant
And every filename is covered through exclusive matches from two corpora
When classification runs
Then the result is mixed-corpus and unresolved
```

```text
Given no fully matching variant and unexplained files
When classification runs
Then the result is unresolved
```

## Green

Build `comparison-report.json` from validated input and calculated output only.

Recommended top-level shape:

```json
{
    "schemaVersion": 1,
    "comparisonContractVersion": 1,
    "inputs": {
        "candidateReportSha256": "<sha256>",
        "localFilenamesReportSha256": "<sha256>",
        "inventoryFilenameSetSha256": "<sha256>"
    },
    "localCorpus": {
        "count": 1512,
        "filenameSetSha256": "<sha256>"
    },
    "stageA": {
        "variantCount": 10,
        "eligibleVariantIds": [],
        "results": []
    },
    "stageB": {
        "eligibleVariantCount": 0,
        "logicalComparisonCount": 0,
        "uniqueUpstreamBlobCount": 0,
        "results": []
    },
    "classification": {
        "kind": "equivalent-revision-set",
        "evidenceStatus": "partially-verified",
        "matchingVariantIds": [],
        "candidateCommitShas": [],
        "candidateCorpusPaths": [],
        "reasonCode": "MULTIPLE_COMMITS_SHARE_COMPLETE_MATCH",
        "evidence": {
            "exactFilenameVariantCount": 0,
            "fullByteMatchVariantCount": 0,
            "unexplainedFilenameCount": 0
        }
    }
}
```

Use stable reason codes rather than relying only on prose:

```text
UNIQUE_COMMIT_COMPLETE_MATCH
MULTIPLE_COMMITS_SHARE_COMPLETE_MATCH
COMPLETE_MIXED_CORPUS_COVERAGE
NO_EXACT_FILENAME_VARIANT
BYTE_MISMATCHES_UNEXPLAINED
INCOMPLETE_MIXED_CORPUS_COVERAGE
```

A concise human-readable summary may be printed to stdout, but the JSON evidence should remain structured.

## Refactor

- Keep classification as a pure function over Stage A and Stage B results.
- Derive candidate commit unions rather than maintaining them incrementally.
- Sort variant IDs, corpus paths, and commit SHAs.
- Remove generated free-form narratives from the JSON.
- Keep mismatch data in Stage B rather than duplicating it in classification.
- Validate the final report before writing it.

## Acceptance Criteria

- Every DDT row has a passing test.
- Classification is fully data-derived.
- Fully matching variants determine the revision candidate set.
- Mismatching variants do not broaden that set.
- Mixed lineage requires positive complete coverage.
- No preferred commit is selected from an equivalent set.
- `kind` and `evidenceStatus` are separate.
- All six current candidate commits are retained if the observed complete-match result supports them.
- The report contains exact input hashes.
- The report contains no timestamps or absolute paths.
- `third-party-icons.json` remains unchanged.

## Non-goals

- Updating the manifest.
- Selecting the newest or highest-version commit.
- Treating package version as stronger than byte evidence.
- Calling a corpus mixed merely because two variants differ.
- Writing the final prose conclusion for Phase 2.3.

## Suggested Execution Order

1. Implement the pure classification function.
2. Exercise every DDT row with synthetic result objects.
3. Classify the real comparison.
4. Build the ordered report.
5. Validate and serialize it.
6. Record Cycle 3 status only after report inspection.

---

# Cycle 4 — Prove Reproducibility and Close the Phase [DONE]

## Current Status

The full extended script was executed twice into two independent scratch output directories (`cycle4-runA`,
`cycle4-runB`), each reusing the same immutable blobless upstream clone but otherwise rebuilding every artifact (local
filename hashing, candidate discovery, Stage A, Stage B, classification) from scratch. Both runs produced a
`comparison-report.json` with identical SHA-256 `89204e3fb9669f611056e9df7664262a3b956a2b111721e263451ba0cd834cd5`,
confirming full reproducibility. Both runs reported identical observed results: Stage A found 10 corpus variants with 2
eligible for Stage B (`a2a0bfd7cb66d08a`, `a5e861b1bd29ab95`); Stage B compared 1,512 files per variant (3,024 total)
against representative commit `036f8574bbfc7b74bb9220ee6c8e8a02103e9dc4`, with variant `a2a0bfd7cb66d08a` matching
0/1,512 and variant `a5e861b1bd29ab95` matching 1,365/1,512; the DDT lineage matrix classified the corpus as
`kind: unresolved`, `evidenceStatus: unresolved`, `reasonCode: BYTE_MISMATCHES_UNEXPLAINED`. Repository status
(`git status --porcelain=v1 -z`) was captured immediately before and after each of the two script executions and was
byte-identical in both cases, and identical to the pre-existing baseline established in Cycle 1 — the only
repository-visible change attributable to this entire phase is this traceability document itself. No SVG, inventory,
package metadata, or `third-party-icons.json` file was read for writing or modified; the evidence-manifest update (Phase
2.3) has not been performed and is not claimed here. The scratch evidence (discovery reports, corpus variant data, the
extended script, and `comparison-report.json`) is retained outside the repository and is ready to support Phase 1.1.2.3.

## Goal

Prove that the comparison is reproducible, that the script does not mutate the repository, and that the traceability
document accurately records completed work.

## Scope

### Independent rerun

Run the completed comparison twice using:

- the same immutable upstream clone;
- the same candidate report;
- the same local filename report;
- the same repository inputs;
- two separate output directories.

Do not overwrite the first report during the second run.

Compare:

```text
SHA-256(comparison-report-A.json)
SHA-256(comparison-report-B.json)
```

They must match exactly.

An entirely separate clone is unnecessary because the comparison is bound to immutable Git object IDs and input-report
hashes.

### Repository purity

The traceability document is an intentional repository change.

Capture repository status:

1. after creating or updating the traceability document;
2. immediately before each script execution;
3. immediately after each script execution.

The pre-run and post-run status must be byte-identical.

At overall phase completion, the only repository change attributable to this phase is the traceability document.

### Traceability status

For each completed cycle:

- change its heading to `[DONE]`;
- append a short `Current Status` paragraph;
- include observed counts and result codes;
- avoid copying large mismatch lists into the Markdown document;
- reference `comparison-report.json` as temporary supporting evidence;
- do not present Phase 2.3 manifest work as completed.

## Red

Add closure checks:

```text
Given two independent output directories
When the full comparison runs with the same inputs
Then the resulting comparison-report.json files are byte-identical
```

```text
Given the repository status immediately before script execution
When the script completes
Then repository status is byte-identical
```

```text
Given a completed cycle
When its traceability section is inspected
Then it has a Current Status paragraph
And its stated counts match comparison-report.json
```

```text
Given the completed Phase 1.1.2.2 document
When scope is reviewed
Then it does not claim that third-party-icons.json was updated
```

## Green

- Run the full script into output directory A.
- Run it again into output directory B.
- Compare the report bytes.
- Compare repository status before and after both runs.
- Update each cycle’s execution status.
- Add a concise final phase summary.

## Refactor

- Remove stale temporary extracted blobs.
- Retain only the original discovery artifacts, extended script, and comparison reports needed by Phase 2.3.
- Ensure no report contains credentials or machine-specific paths.
- Confirm the script has no accidental repository write paths.
- Review the traceability document against the final report.
- Keep execution findings separate from planned acceptance criteria.

## Acceptance Criteria

- Two independent executions produce byte-identical reports.
- Both reports have the same SHA-256.
- Input-report hashes in both reports match.
- Repository status is unchanged by each script execution.
- No SVG, inventory, package metadata, or evidence-manifest file changes.
- Every cycle is marked `[DONE]` only after passing.
- Every `Current Status` statement agrees with the report.
- The final document records the actual classification without choosing an unsupported revision.
- The scratch evidence is ready for Phase 1.1.2.3.

## Non-goals

- Re-cloning upstream for every reproducibility run.
- Committing `comparison-report.json`.
- Copying complete mismatch evidence into Markdown.
- Updating `third-party-icons.json`.
- Updating the broader Phase 1 findings section.
- Publishing or packaging.

## Suggested Execution Order

1. Run output A.
2. Run output B.
3. Compare report digests and bytes.
4. Re-run repository-purity checks.
5. Update cycle status paragraphs.
6. Review the final traceability document.
7. Preserve the scratch handoff for Phase 1.1.2.3.

---

## Critical Files

### Repository file created or updated

```text
traceability-log/open/
phase_1.1.2.2_compare_complete_corpora_and_classify_the_lineage.md
```

### Scratch script extended

```text
C:\Users\usuario\AppData\Local\Temp\
astro-icons-phosphor-lineage\
20260625T151250699\
discover-candidates.ps1
```

### Scratch inputs

```text
candidate-report.json
local-filenames.json
corpora/*.json
upstream-core/
```

### Scratch outputs

```text
comparison-report.json
comparison-report-reproduction.json
```

### Read-only repository inputs

```text
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/
```

### Explicitly untouched

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/package.json
packages/astro-icons/src/index.ts
```

---

## End-to-End Acceptance Criteria

Phase 1.1.2.2 is complete when:

1. The Phase 1.1.2.1 handoff is validated before use.
2. The comparison is bound to exact input-report hashes.
3. All ten corpus variants receive complete Stage A results.
4. Every exact-set variant receives a complete 1,512-file byte comparison.
5. Local files are hashed once.
6. Upstream blobs are cached and hashed once per unique object.
7. Complete mismatch evidence is retained.
8. Classification follows the DDT matrix.
9. `kind` and `evidenceStatus` are modeled separately.
10. Equivalent commits are preserved without a preferred pick.
11. Mixed lineage is reported only from positive complete evidence.
12. Two independent runs produce byte-identical reports.
13. Script execution leaves repository state unchanged.
14. Only the traceability document changes in the repository.
15. The evidence manifest remains untouched for Phase 1.1.2.3.

---

## Explicitly Deferred to Phase 1.1.2.3

- Update `phosphor.source`.
- Update `phosphor.copyright`.
- Record the MIT conclusion.
- Add the broader Phase 1 findings section.
- Translate the temporary classification into the permanent manifest schema.
- Decide and document the downstream blocker status.
