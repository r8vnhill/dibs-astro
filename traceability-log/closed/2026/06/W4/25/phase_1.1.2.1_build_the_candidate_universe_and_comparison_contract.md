# [PLAN] Phase 1.1.2.1 — Build the Candidate Universe and Comparison Contract

## Summary

Build a temporary, reproducible candidate universe for resolving the upstream provenance of the 1,512 local
Phosphor-group SVGs.

This phase must produce:

- the exact local Phosphor filename set derived from the frozen inventory;
- every currently reachable upstream commit that could have existed by the local import cutoff;
- current tag and branch aliases for those commits;
- every plausible regular-weight SVG corpus present in each candidate tree;
- deterministic filename normalization metadata;
- explicit rejection and ambiguity records;
- a machine-readable report for Phase 1.1.2.2.

This phase does **not** compare local and upstream SVG bytes, choose a winning revision, or modify any repository file.

---

## Current Status

Cycle 1 is complete: a temporary `discover-candidates.ps1` (outside the project repository, under the system temporary
directory) resolved `astro-website` as the repository root via `git rev-parse --show-toplevel`, captured the baseline
`git status --porcelain=v1 -z` bytes before reading any inventory data, derived the import cutoff from
`1833b9e65a91917b565da9dae0df29c1642448a2` as `2026-03-19T10:04:05-03:00`, and read
`packages/astro-icons/migration/icon-inventory.json`. Selecting `group === "phosphor"` yielded exactly 1,512 unique
filenames, each a basename ending in `.svg` with no directory component. The set was sorted ordinally and written to
`local-filenames.json` with `filenameSetSha256` `439415e264a1086cd03fbd01c9b5a99fd9059906595ec4658efb55c2a1a5a4a6`.
Running the script twice in separate scratch run directories produced an identical hash, and `git status` after
execution matched the captured baseline byte-for-byte, confirming the investigation read the repository without
modifying it. No repository file was added, removed, or changed by this cycle.

Cycle 2 is complete: the same script extended `discover-candidates.ps1` with a blobless, no-checkout clone of
`https://github.com/phosphor-icons/core.git` into `upstream-core/` beneath the scratch run directory, then refreshed
branches and tags with `git fetch --force --prune --tags origin`. `git rev-list --all` found 66 reachable commits, all
66 of which (no rejections) precede the import cutoff `2026-03-19T10:04:05-03:00` derived in Cycle 1. Each commit was
recorded once by its full 40-character SHA with `committerDate`, `authorDate`, peeled tag aliases (5 tags resolved
across the universe: `v2.0.0`, `v2.0.1`, `v2.0.2`, `v2.0.6`, `v2.0.8`), `origin/*` branch aliases, and
`tagAvailabilityAtImport: "unknown"` to avoid implying historical proof. Commits were deduplicated by SHA and sorted by
parsed committer timestamp, then SHA. The reachable-history limitation is recorded verbatim in the report. The result
was written to `upstream-commits.json` and reproduced byte-for-byte on a second run. `git status` after execution again
matched the Cycle 1 baseline byte-for-byte; the temporary clone and report remain outside the project repository.

Cycle 3 is complete: the same script extended `discover-candidates.ps1` with `git ls-tree -r --name-only` inspection of
each of the 66 eligible commits (no checkout). For each commit it located candidate regular-weight directories using the
documented rules — exact matches on `assets/regular` and `raw/regular` first, then any other directory whose basename is
exactly `regular`, then a fallback rule recognizing directories containing at least 50 `*-regular.svg` files — and
preserved every plausible corpus rather than choosing one. Filenames were normalized by stripping one literal `-regular`
suffix immediately before `.svg`, validated as plain `.svg` basenames, and checked for normalization collisions per
corpus. The two commits containing no plausible regular-weight directory (the import-only initial commit and one
near-empty later commit) were recorded with `rejectionReason: "NO_REGULAR_CORPUS"`; the remaining 64 commits each
resolved to one or more valid corpora, with 47 commits found ambiguous (containing both an `assets/regular` and a
`raw/regular` corpus). Equivalent corpus variants were grouped by directory path plus the corpus's underlying Git tree
object ID (via `git rev-parse <commit>:<path>`), yielding exactly 10 distinct corpus variants across the universe, each
retaining every commit SHA that contains it. Each variant's normalized filename mapping was written to its own
`corpora/<corpusVariantId>-filenames.json` file, referenced by path from the new `corpus-discovery.json` index. No
local/upstream byte comparison and no candidate selection occurred. The result was reproduced byte-for-byte — both
`corpus-discovery.json` and every `corpora/*.json` file — across two independent runs, and `git status` after execution
again matched the Cycle 1 baseline byte-for-byte.

Cycle 4 is complete: the same script extended `discover-candidates.ps1` with a final handoff stage that consolidates the
outputs of Cycles 1–3 into `candidate-report.json` without repeating discovery. For each of the 66 eligible commits, it
read the root `package.json` and `LICENSE` blobs directly from the blobless clone (`git cat-file -e`/`-p`, permitted in
this cycle), recording `package.name`/`package.version` when the blob parsed as valid JSON, the license blob's path and
SHA-256, and every line beginning with `Copyright` extracted from it; commits missing either blob, or with an unparsable
`package.json`, recorded a `MISSING_PACKAGE_JSON`, `INVALID_PACKAGE_JSON`, or `MISSING_LICENSE` warning rather than
being rejected. The report's `corpusVariants` projection reuses the Cycle 3 grouping (omitting the internal per-file
mapping in favor of the `corpora/<id>-filenames.json` pointer), and a `rejections` array records every Cycle 3
per-corpus rejection alongside the two commit-level `NO_REGULAR_CORPUS` rejections, each tagged with its `commitSha` and
a stable reason code. A handoff-validation pass (`Test-CandidateReportHandoff`) confirmed every referenced `filesReport`
file exists, all `commitSha` and `corpusVariantId` values are unique, every commit's `corpusVariantIds` resolve to a
known variant, and every eligible commit is represented by either at least one corpus variant or a `NO_REGULAR_CORPUS`
rejection — full coverage held for all 66 commits. `candidate-report.json` was reproduced byte-for-byte across two
independent runs, and `git status` after execution again matched the Cycle 1 baseline byte-for-byte, confirmed both via
an in-script `Test-RepositoryPurity` check and an external rerun. No repository file was added, removed, or changed by
this cycle.

---

## Scope Classification

This is a **small scope** suitable for four direct red–green–refactor cycles:

1. Freeze the local corpus and repository baseline.
2. Build the upstream commit universe.
3. Discover and normalize candidate corpora.
4. Produce and validate the comparison handoff.

PBT is not useful because the investigation concerns two finite repositories and a fixed inventory.

DDT is useful for corpus discovery and normalization outcomes.

---

## Key Design Decision

Use one temporary blobless clone:

```powershell
git clone `
    --filter=blob:none `
    --no-checkout `
    https://github.com/phosphor-icons/core.git `
    $UpstreamRepository
```

Then explicitly refresh current branches and tags:

```powershell
git -C $UpstreamRepository fetch `
    --force `
    --prune `
    --tags `
    origin
```

Use Git tree inspection rather than downloading and extracting one archive per tag.

Benefits:

- includes reachable untagged commits;
- deduplicates multiple tags pointing to one commit;
- avoids GitHub REST rate-limit dependence;
- avoids repeated ZIP downloads and extraction;
- avoids Windows archive-root and path-length complications;
- gives Phase 1.1.2.2 direct access to immutable commit trees and blobs;
- keeps all external material outside the project repository.

The current refs visible in the clone do not prove that every ref existed on the import date. Tags and branches are
therefore recorded as **present-day aliases**, not as historical proof of how the local folder was obtained.

---

## Temporary Workspace

Do not hardcode a username-specific or application-specific path.

Accept an optional scratch-directory parameter. Otherwise create a short path under the system temporary directory:

```powershell
$ScratchRoot = Join-Path `
    ([System.IO.Path]::GetTempPath()) `
    "astro-icons-phosphor-lineage"
```

Create a unique run directory beneath it.

Recommended contents:

```text
astro-icons-phosphor-lineage/
└── <run-id>/
    ├── discover-candidates.ps1
    ├── upstream-core/
    ├── local-filenames.json
    ├── candidate-report.json
    └── console-summary.txt
```

These files remain available for Phase 1.1.2.2 but must never be created inside the project repository.

---

## Import Cutoff

Do not use the date `2026-03-19` without a time zone or assume the entire calendar day.

Derive the exact cutoff instant from the local import commit:

```text
1833b9e65a91917b565da9dae0df29c1642448a2
```

Use its committer timestamp:

```powershell
git show `
    --no-patch `
    --format=%cI `
    1833b9e65a91917b565da9dae0df29c1642448a2
```

Record this value in the report as:

```json
{
    "importCommit": "1833b9e65a91917b565da9dae0df29c1642448a2",
    "importCutoff": "<ISO-8601 timestamp>"
}
```

An upstream commit after this instant cannot explain the local import and is excluded.

An upstream commit before the cutoff remains a candidate even when its current tag alias may have been created later.
The investigation is resolving commit content first, not proving historical tag availability.

---

# Cycle 1 — Freeze the Local Corpus and Repository Baseline [DONE]

## Goal

Establish the exact local comparison corpus and prove that the investigation does not alter the existing repository
state.

## Scope

- Resolve the project repository root explicitly.
- Capture the initial repository status.
- Read `migration/icon-inventory.json`.
- Select every record with `group === "phosphor"`.
- Validate and sort the filenames.
- Produce `local-filenames.json` outside the repository.
- Derive the import cutoff timestamp.

## Red

Create temporary assertions for the following behavior:

```text
Given the frozen icon inventory
When the local comparison corpus is derived
Then only phosphor-group entries are selected
And every filename is copied unchanged
And no filename is duplicated
```

```text
Given the current Phase 0 inventory
When the selected entries are characterized
Then the corpus contains 1512 filenames
```

```text
Given a filename selected for comparison
When it is validated
Then it is a basename ending in .svg
And it contains no directory traversal or path separator
```

```text
Given the repository already has unrelated pending changes
When the investigation starts
Then those changes are captured as the baseline
And they are not mistaken for changes introduced by this phase
```

The current count of 1,512 is a characterization assertion, not the source used to construct the corpus.

## Green

Derive the corpus directly from:

```text
packages/astro-icons/migration/icon-inventory.json
```

Produce deterministic `local-filenames.json`:

```json
{
    "schemaVersion": 1,
    "inventoryFile": "packages/astro-icons/migration/icon-inventory.json",
    "group": "phosphor",
    "count": 1512,
    "filenameSetSha256": "<sha256-of-canonical-filename-list>",
    "files": [
        "acorn.svg",
        "address-book.svg"
    ]
}
```

Calculate `filenameSetSha256` over:

```text
sorted filenames joined by "\n", followed by one final "\n"
```

Capture the initial repository status using a machine-safe format, for example:

```powershell
git status --porcelain=v1 -z
```

Store the baseline bytes in the scratch directory.

## Refactor

- Resolve paths independently of the current working directory.
- Sort using ordinal comparison.
- Reject duplicate filenames rather than silently deduplicating them.
- Keep the canonical filename-list hashing rule explicit.
- Avoid reading SVG contents in this cycle.

## Acceptance Criteria

- The local corpus is derived only from the frozen inventory.
- The corpus currently contains 1,512 unique filenames.
- Every filename ends in `.svg`.
- No filename contains a directory component.
- The list is sorted ordinally.
- `filenameSetSha256` is reproducible.
- The exact import cutoff timestamp is recorded.
- The initial Git status is captured without requiring a clean repository.

## Non-goals

- Reading local SVG bytes.
- Querying upstream history.
- Comparing candidate names.
- Requiring `git status` to be empty.

## Suggested Execution Order

1. Resolve the repository root.
2. Capture baseline status.
3. Derive the import cutoff.
4. Read the inventory.
5. Validate and sort filenames.
6. Write `local-filenames.json`.

---

# Cycle 2 — Build the Upstream Commit Universe [DONE]

## Goal

Create a bounded set of immutable upstream commits that could explain the local import.

## Scope

- Create a temporary blobless clone.
- Enumerate commits reachable from current upstream branches and tags.
- Exclude commits after the import cutoff.
- Resolve tag aliases to commits.
- Record branch and tag aliases without treating them as historical availability proof.
- Deduplicate candidates by commit SHA.

## Red

Add temporary behavior checks:

```text
Given the upstream repository
When candidate history is enumerated
Then each candidate is identified by a full immutable commit SHA
```

```text
Given multiple tags that resolve to the same commit
When candidates are normalized
Then one commit candidate is produced
And all tag aliases are retained
```

```text
Given an upstream commit after the import cutoff
When eligibility is evaluated
Then it is excluded with reason commit-after-import
```

```text
Given an untagged commit reachable from an upstream branch
When candidates are enumerated
Then it is retained as a candidate
```

## Green

Enumerate candidate commits with Git rather than the GitHub REST API.

Conceptually:

```powershell
git -C $UpstreamRepository rev-list `
    --all `
    --before=$ImportCutoff
```

For each unique commit, record:

```json
{
    "commitSha": "<40-character-sha>",
    "committerDate": "<ISO-8601>",
    "authorDate": "<ISO-8601>",
    "tags": [],
    "branches": []
}
```

Collect current tag aliases through Git refs and peel them to commits.

Collect current remote-branch aliases separately.

Tag aliases must be descriptive only:

```json
{
    "tagAvailabilityAtImport": "unknown"
}
```

Do not infer that a current tag existed at the import cutoff merely because its target commit predates the cutoff.

Record the investigation limitation:

```text
Only commits reachable from the upstream repository's currently advertised refs can be discovered.
Deleted or rewritten unreachable history cannot be ruled out.
```

## Refactor

- Deduplicate by commit SHA before inspecting trees.
- Keep tag and branch aliases as arrays on the commit record.
- Use full SHAs everywhere.
- Sort commits deterministically by committer timestamp, then SHA.
- Keep ref enumeration separate from commit eligibility.
- Remove all GitHub REST authentication and rate-limit logic.

## Acceptance Criteria

- Every candidate has a full commit SHA.
- No candidate commit is later than the import cutoff.
- Untagged reachable commits are included.
- Multiple refs pointing to one commit do not create duplicate candidates.
- Tag aliases are not presented as historical availability evidence.
- Candidate ordering is deterministic.
- The report states the reachable-history limitation.
- The temporary clone resides outside the repository.

## Non-goals

- Proving that a tag existed at import time.
- Searching deleted upstream refs.
- Reading SVG blobs.
- Downloading one archive per commit or tag.
- Selecting a likely revision.

## Suggested Execution Order

1. Create the blobless clone.
2. Refresh branches and tags.
3. Enumerate pre-cutoff commits.
4. Resolve tag aliases.
5. Resolve branch aliases.
6. Deduplicate and order commit records.

---

# Cycle 3 — Discover and Normalize Candidate Corpora [DONE]

## Goal

Identify every plausible regular-weight SVG corpus in each candidate tree without silently choosing between ambiguous
layouts.

## Scope

For every candidate commit:

- inspect the complete tree;
- identify plausible regular-weight directories;
- enumerate direct or recursive SVG paths as required by the layout;
- normalize logical filenames;
- detect collisions and invalid entries;
- group equivalent corpus variants;
- record rejected candidates and ambiguous layouts.

No local/upstream SVG byte comparison occurs.

## Corpus Discovery Rules

Inspect known layouts first:

```text
assets/regular/
raw/regular/
```

Then inspect directories whose basename is exactly:

```text
regular
```

A fallback corpus may also be recognized when a directory contains a substantial collection of filenames ending in:

```text
-regular.svg
```

Do not select the first directory whose path merely contains the substring `regular`.

If one commit contains multiple plausible corpora, retain all of them:

```json
{
    "corpora": [
        {
            "path": "assets/regular",
            "layout": "weighted-assets"
        },
        {
            "path": "raw/regular",
            "layout": "raw-regular"
        }
    ]
}
```

Phase 1.1.2.2 determines which, if any, matches the local set.

## Filename Normalization Contract

For each SVG basename:

1. Preserve case.
2. Preserve all punctuation except the weight suffix.
3. If the basename ends exactly in `-regular.svg`, remove that suffix and append `.svg`.
4. Otherwise retain the basename unchanged.
5. Apply no additional substitutions.

Examples:

```text
acorn-regular.svg   → acorn.svg
file-csv-regular.svg → file-csv.svg
acorn.svg           → acorn.svg
```

Reject a corpus when two different source paths normalize to the same logical filename.

## DDT Discovery Matrix

| Discovered state                           | Result                                            |
| ------------------------------------------ | ------------------------------------------------- |
| One valid known corpus                     | Record it                                         |
| Multiple valid corpora                     | Record all; mark commit ambiguous                 |
| Directory exists but contains no SVGs      | Reject that corpus                                |
| Normalization collision                    | Reject that corpus                                |
| No plausible regular corpus                | Reject commit with reason                         |
| Corpus contains invalid filenames          | Reject corpus with details                        |
| Several commits share the same corpus tree | Group as one corpus variant with multiple commits |

## Red

Add temporary behavior checks:

```text
Given a candidate containing assets/regular
When its corpus is discovered
Then the actual relative path is recorded
And its SVG filenames are normalized by the declared rule
```

```text
Given a candidate containing both assets/regular and raw/regular
When discovery runs
Then both corpora are retained
And neither is selected implicitly
```

```text
Given two upstream paths that normalize to the same filename
When the corpus is validated
Then that corpus is rejected with a collision diagnostic
```

```text
Given no identifiable regular-weight corpus
When the candidate is inspected
Then the candidate is retained in the report
And its rejection reason is recorded
```

## Green

Use Git tree operations such as:

```text
git ls-tree -r --name-only <commit>
```

Do not check out every candidate commit.

For each valid corpus record:

```json
{
    "path": "assets/regular",
    "layout": "weighted-assets",
    "sourceFilenamePattern": "*-regular.svg",
    "normalizedIconCount": 1512,
    "normalizedFilenameSetSha256": "<sha256>",
    "normalizationCollisions": [],
    "filesReport": "corpora/<corpus-id>-filenames.json"
}
```

Group equivalent corpus variants using at least:

- discovered relative path;
- normalized filename-set digest;
- underlying Git tree identity where available.

Keep all commit aliases for a shared corpus variant.

## Refactor

- Separate discovery, normalization, validation, and grouping.
- Keep the normalization function pure.
- Use deterministic corpus identifiers.
- Sort paths and filenames ordinally.
- Do not read SVG blobs merely to discover filenames.
- Avoid absolute scratch paths in report records.
- Record all rejected corpora, not only rejected commits.

## Acceptance Criteria

- Every candidate commit has either:

  - at least one valid corpus record; or
  - an explicit rejection reason.
- Multiple plausible corpora are preserved.
- The actual relative path is recorded.
- Filename normalization follows one explicit rule.
- Normalization collisions fail the affected corpus.
- Equivalent corpus variants are grouped.
- No local/upstream content comparison occurs.
- All output order is deterministic.

## Non-goals

- Selecting between `assets/regular` and `raw/regular`.
- Hashing SVG contents.
- Comparing upstream filename sets with the local set.
- Treating icon count alone as a match.
- Reading or interpreting SVG XML.

## Suggested Execution Order

1. Enumerate candidate trees.
2. Detect known corpus paths.
3. Detect controlled fallback layouts.
4. Normalize filenames.
5. Reject collisions and invalid corpora.
6. Group equivalent corpus variants.
7. Retain all ambiguity and rejection records.

---

# Cycle 4 — Produce and Validate the Phase 2.2 Handoff [DONE]

## Goal

Write a complete, deterministic candidate report that Phase 1.1.2.2 can consume without repeating discovery.

## Scope

Write:

```text
candidate-report.json
```

and any referenced filename-set files beneath the same scratch directory.

## Recommended Report Shape

```json
{
    "schemaVersion": 1,
    "upstream": {
        "repository": "phosphor-icons/core",
        "remote": "https://github.com/phosphor-icons/core.git"
    },
    "localImport": {
        "commit": "1833b9e65a91917b565da9dae0df29c1642448a2",
        "cutoff": "<ISO-8601>",
        "inventoryFile": "packages/astro-icons/migration/icon-inventory.json"
    },
    "localCorpus": {
        "count": 1512,
        "filenameSetSha256": "<sha256>",
        "filesReport": "local-filenames.json"
    },
    "normalization": {
        "version": 1,
        "rule": "Strip one literal -regular suffix immediately before .svg; otherwise preserve the basename."
    },
    "candidateUniverse": {
        "reachableCommitCount": 0,
        "eligibleCommitCount": 0,
        "rejectedCommitCount": 0,
        "limitations": []
    },
    "commits": [],
    "corpusVariants": [],
    "rejections": []
}
```

### Commit records

Each candidate commit should include:

```json
{
    "commitSha": "<full-sha>",
    "committerDate": "<ISO-8601>",
    "tags": [],
    "branches": [],
    "tagAvailabilityAtImport": "unknown",
    "package": {
        "name": null,
        "version": null
    },
    "license": {
        "path": null,
        "sha256": null,
        "copyrightLines": []
    },
    "corpusVariantIds": []
}
```

Reading the small `package.json` and `LICENSE` blobs is permitted in this phase.

Do not store “the first lines” of the license as an unstructured approximation. Record:

- actual license path;
- SHA-256 of the license bytes;
- extracted copyright lines;
- package name and version, when valid.

### Rejection records

Use stable reason codes, for example:

```text
COMMIT_AFTER_IMPORT
NO_REGULAR_CORPUS
AMBIGUOUS_CORPUS
NORMALIZATION_COLLISION
INVALID_FILENAME
INVALID_PACKAGE_JSON
MISSING_LICENSE
```

Warnings such as a missing package file or missing license need not reject an otherwise valid corpus, but they must be
recorded.

## Red

Add final temporary checks:

```text
Given the candidate report
When it is loaded by a downstream consumer
Then every referenced filename report exists
And every commit and corpus identifier resolves uniquely
```

```text
Given the same upstream refs and local inventory
When discovery runs twice
Then the semantic report content is identical
```

```text
Given a dirty repository before execution
When discovery finishes
Then the final repository status exactly matches the captured baseline
```

```text
Given the completed report
When candidate coverage is inspected
Then every eligible commit is represented by a valid corpus or a rejection
```

## Green

Serialize all JSON with:

- fixed property order;
- stable array ordering;
- four-space indentation;
- one trailing line feed;
- no absolute scratch paths;
- no volatile generation timestamp.

Print a concise summary:

```text
Local corpus: 1512 filenames
Reachable pre-cutoff commits: <n>
Valid corpus variants: <n>
Rejected commits: <n>
Ambiguous commits: <n>
Report: <absolute scratch path>
```

The absolute path may appear in console output, but not inside the report.

## Refactor

- Remove transient download or diagnostic files not needed by Phase 2.2.
- Keep the harness beside the report for immediate reproducibility.
- Ensure the report contains no credentials or environment details.
- Confirm the clone remains read-only with respect to the project repository.
- Compare final Git status bytes with the captured baseline rather than assuming the repository was initially clean.

## Acceptance Criteria

- `local-filenames.json` contains exactly the inventory-derived Phosphor set.
- Every reachable pre-cutoff commit is accounted for.
- Untagged commits are not omitted.
- Every candidate is represented by valid corpora or explicit rejection records.
- All tag aliases resolve to immutable commit SHAs.
- Every corpus has an explicit path and normalization result.
- Multiple corpora are preserved rather than selected implicitly.
- All referenced report files exist.
- Report ordering and semantic content are reproducible.
- No REST token is required or read.
- No absolute scratch path is persisted in report JSON.
- Final repository status exactly equals the initial baseline.
- No repository file is created, deleted, or modified.

## Non-goals

- Comparing candidate filenames with the local filename set.
- Comparing SVG hashes or bytes.
- Selecting a candidate commit.
- Updating `third-party-icons.json`.
- Updating the traceability log.
- Preserving the scratch directory beyond the completion of Phase 1.1.2.2.
- Adding permanent tooling or dependencies.

## Suggested Execution Order

1. Assemble commit and corpus records.
2. Read package and license metadata where available.
3. Write referenced filename-set reports.
4. Write `candidate-report.json`.
5. Run complete handoff validation.
6. Compare final repository status with the baseline.
7. Print the report location for Phase 1.1.2.2.

---

## Repository Purity Verification

Capture status before and after:

```powershell
$Before = git status --porcelain=v1 -z

# Run investigation.

$After = git status --porcelain=v1 -z

if ($Before -cne $After) {
    throw "Repository state changed during candidate discovery."
}
```

Also inspect scoped diffs:

```powershell
git diff -- packages/astro-icons
git diff -- traceability-log
```

The expected result is not necessarily an empty repository. The requirement is:

```text
final repository state == initial repository state
```

---

## End-to-End Acceptance Criteria

Phase 1.1.2.1 is complete when:

1. The local corpus is derived exclusively from the frozen inventory.
2. The exact import cutoff timestamp is recorded.
3. Candidate discovery includes reachable tagged and untagged commits.
4. Commits after the import cutoff are excluded.
5. Every commit is identified by a full immutable SHA.
6. Tags and branches are recorded only as present-day aliases.
7. Every plausible regular-weight corpus is retained.
8. Filename normalization is explicit and collision-safe.
9. Equivalent corpus variants are grouped without losing commit aliases.
10. Every rejected candidate or corpus has a stable reason.
11. The handoff report is deterministic and self-consistent.
12. Phase 1.1.2.2 can consume the report without repeating discovery.
13. The project repository is unchanged relative to its initial state.
