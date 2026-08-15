# [DONE] Phase 1.1.2.3 --- Record Phosphor Evidence

## Cycle 1 — Lock the Evidence Contract [DONE]

### Current Status

The evidence contract was extracted from the closed Phase 1.1.2.2 report and the Subphase 1.1.2 plan without re-running
any comparison: import commit `1833b9e65a91917b565da9dae0df29c1642448a2` (2026-03-19), 10 candidates with 2 exact-set
candidates (`a2a0bfd7cb66d08a`, `a5e861b1bd29ab95`), representative commit `036f8574bbfc7b74bb9220ee6c8e8a02103e9dc4`,
byte-match counts 0/1,512 and 1,365/1,512, final classification `unresolved` / `BYTE_MISMATCHES_UNEXPLAINED`, and the
MIT notice `Copyright (c) 2020-2024 Phosphor Icons`. No new comparison, package version, or commit was introduced; the
MIT conclusion was kept independent of exact lineage.

### Goal

Define the exact evidence that Phase 1.1.2.3 is allowed to assert before editing any target file.

### Scope

Read only:

- `traceability-log/closed/2026/06/W4/25/phase_1.1.2.2_compare_complete_corpora_and_classify_the_lineage.md`
- `traceability-log/open/subphase_1.1.2_resolve_the_phosphor_corpus_lineage.md`

Extract a compact evidence contract containing:

- import commit and import date;
- candidate count;
- exact-set candidate IDs;
- byte-match or byte-mismatch counts;
- final classification;
- `evidenceStatus: unresolved`;
- `reasonCode: BYTE_MISMATCHES_UNEXPLAINED`;
- reproducibility hash;
- MIT notice text;
- Phase 1.1.2.3 acceptance constraints.

### Red step

Write the expected evidence assertions before editing the manifest:

```gherkin
Given the closed Phase 1.1.2.2 comparison report
When Phase 1.1.2.3 records Phosphor provenance
Then it must not assert an exact upstream package version or immutable commit
And it must preserve the unresolved lineage classification
And it must record the MIT conclusion independently from exact corpus lineage
```

### Green step

Create a temporary working note outside the repository, or keep an in-memory checklist, with only the extracted facts
needed for the manifest and traceability section.

### Refactor step

Normalize wording that will be reused in both targets:

- one compact evidence sentence for JSON;
- one fuller audit narrative for Markdown;
- one shared phrase for the unresolved conclusion.

### Acceptance criteria

- Every intended claim in later edits is traceable to the closed Phase 1.1.2.2 report or the Phase 1.1.2.3 execution
  contract.
- No new comparison, inference, package version, or commit is introduced.
- MIT licensing is treated as a separate conclusion from exact corpus lineage.

### Non-goals

- Do not re-run corpus comparison.
- Do not fetch upstream Phosphor data.
- Do not create new artifacts inside the repository.

### Suggested execution order

Run this cycle first. It blocks all later cycles.

---

## Cycle 2 — Update the Manifest Semantics [DONE]

### Current Status

`packages/astro-icons/LICENSES/third-party-icons.json` was updated so `phosphor.source` and `phosphor.copyright` carry
the unresolved-lineage contract: `package`, `version`, and `commit` remain `null`; `url` points to
`https://github.com/phosphor-icons/core`; `evidenceStatus` is `"unresolved"`; `verifiedAt` is `2026-07-05T00:00:00Z`;
`evidence` summarizes the ten candidates, two exact-set candidates, and byte-mismatch counts.
`copyright.concludedLicense` is `"MIT"` with `copyrightNotice` `"Copyright (c) 2020-2024 Phosphor Icons"`,
`licenseSourceUrl` and `licenseFile` remain `null`. `reviewStatus` stayed `"in-progress"`, `inventoryCount` stayed 1512,
the JSON parses, and no other field or asset record changed.

### Goal

Update only the Phosphor provenance and copyright fields in:

- `packages/astro-icons/LICENSES/third-party-icons.json`

### Scope

Modify only:

- `phosphor.source`
- `phosphor.copyright`

Preserve:

- `project`;
- `reviewStatus`;
- `inventoryCount`;
- asset entries;
- non-Phosphor records.

### Red step

Before editing, define a failing manifest expectation:

```gherkin
Given the Phosphor manifest entry
When the Phase 1.1.2.3 evidence is recorded
Then source.package must be null
And source.version must be null
And source.commit must be null
And source.evidenceStatus must be "unresolved"
And source.url must point to the Phosphor core repository
And the copyright conclusion must remain independent from source lineage
```

### Green step

Set the manifest values as follows:

| Field                                 | Expected value                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `phosphor.source.package`             | `null`                                                                                                                       |
| `phosphor.source.version`             | `null`                                                                                                                       |
| `phosphor.source.commit`              | `null`                                                                                                                       |
| `phosphor.source.url`                 | `https://github.com/phosphor-icons/core`                                                                                     |
| `phosphor.source.evidenceStatus`      | `"unresolved"`                                                                                                               |
| `phosphor.source.verifiedAt`          | current execution date as an ISO-8601/RFC 3339-style timestamp                                                               |
| `phosphor.source.evidence`            | compact summary of repository evidence, ten candidates, two exact-set candidates, byte mismatches, and unresolved conclusion |
| `phosphor.copyright.concludedLicense` | `"MIT"`                                                                                                                      |
| `phosphor.copyright.copyrightNotice`  | `"Copyright (c) 2020-2024 Phosphor Icons"`                                                                                   |
| `phosphor.copyright.licenseSourceUrl` | `null`                                                                                                                       |
| `phosphor.copyright.licenseFile`      | `null`                                                                                                                       |

Using a machine-parseable timestamp format is appropriate because RFC 3339 defines an Internet timestamp profile of ISO
8601, which fits provenance metadata better than informal dates. ([RFC Editor][1])

### Refactor step

Keep `source.evidence` concise enough for JSON, but audit-useful. Prefer one paragraph, not a dense embedded report. The
Markdown traceability file should carry the fuller explanation.

### Acceptance criteria

- JSON still parses.
- Only `phosphor.source` and `phosphor.copyright` changed.
- `reviewStatus === "in-progress"`.
- `phosphor.inventoryCount === 1512`.
- No placeholder wording remains.
- No exact version or commit is guessed.

### Non-goals

- Do not create `LICENSES/PHOSPHOR.txt`.
- Do not change `reviewStatus`.
- Do not edit package metadata.
- Do not touch SVG bytes or inventory records.

### Suggested execution order

Run after Cycle 1. It can be verified independently before the traceability narrative is edited.

---

## Cycle 3 — Add the Traceability Findings [DONE]

### Current Status

A new `## Findings — Phosphor Corpus Lineage` section was appended to
`traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md` (inserted after Subphase 1.1's
Non-goals), covering established repository evidence, the external comparison method, candidates investigated, the
unresolved conclusion with its downstream consequence for Phase 1 and Subphase 1.3, the independent MIT conclusion, and
the package-code holder `Ignacio Slater-Muñoz`. The section mirrors the manifest's evidence wording without reproducing
the full MIT license text and does not claim any SVG, inventory, or package-metadata change.

### Goal

Append an auditable Phosphor findings section to:

- `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`

### Scope

Add one new section:

```markdown
# Findings — Phosphor Corpus Lineage
```

The section should cover, in this order:

1. established repository evidence;
2. external comparison method;
3. candidates investigated;
4. unresolved conclusion;
5. downstream consequence for Phase 1 and Subphase 1.3;
6. independent MIT conclusion;
7. package-code holder: `Ignacio Slater-Muñoz`.

### Red step

Define the documentation expectations first:

```gherkin
Given the Phase 1 traceability record
When the Phosphor findings are appended
Then the section must explain why lineage remains unresolved
And it must identify the evidence used without reproducing the full license text
And it must make the MIT conclusion independent from exact source revision
And it must not imply that SVG bytes, inventory, or package metadata changed
```

### Green step

Append the findings section using wording aligned with the manifest evidence summary. The JSON should be compact; the
Markdown should be audit-complete.

### Refactor step

Remove duplicated phrasing that could become inconsistent later. The traceability section should expand the manifest
summary, not contradict or restate it with different facts.

### Acceptance criteria

- The new section is easy to audit without reopening every source file.
- The unresolved status and `BYTE_MISMATCHES_UNEXPLAINED` rationale are explicit.
- The downstream consequence is clear: Phase 1 can record provenance as unresolved, while Subphase 1.3 must not depend
  on a guessed exact upstream revision.
- The MIT conclusion is documented separately from exact lineage.
- No full license text is copied into the traceability file.

### Non-goals

- Do not rewrite unrelated Phase 1 sections.
- Do not add a generic reference section.
- Do not change non-Phosphor provenance narratives.

### Suggested execution order

Run after Cycle 2 so the Markdown narrative mirrors the final manifest wording.

---

## Cycle 4 — Verify Manifest Contract and Repository Purity [DONE]

### Current Status

All eleven field-level assertions passed against the live manifest (`reviewStatus === "in-progress"`,
`inventoryCount === 1512`, `evidenceStatus === "unresolved"`, `package`/`version`/`commit === null`,
`source.url === "https://github.com/phosphor-icons/core"`, `concludedLicense === "MIT"`, the exact copyright notice, and
`licenseSourceUrl`/`licenseFile === null`). `git status --short` showed exactly the two expected modified files (plus
this untracked plan document); `git diff --stat` against `packages/astro-icons/src`,
`packages/astro-icons/migration/icon-inventory.json`, and `packages/astro-icons/package.json` was empty. No scratch
checker or temporary artifact was left in the repository.

### Goal

Prove that the work is documentation/provenance-only and behavior-preserving.

### Scope

Run focused checks against:

- JSON parseability;
- Phosphor manifest fields;
- changed-file set;
- untouched source, inventory, and package metadata paths;
- absence of scratch artifacts.

Git’s own documentation distinguishes `git status` as a working-tree/index state view and `git diff` as a way to inspect
content-level changes, so using both is appropriate here: status proves file scope, while diff proves semantic scope.
([Kernel.org][2])

### Red step

Define the expected verification contract:

```gherkin
Given the repository after Phase 1.1.2.3 edits
When verification runs
Then only the manifest and Phase 1 traceability record may be modified
And the Phosphor JSON fields must match the unresolved-lineage contract
And source code, SVG inventory, and package metadata must have no diff
```

### Green step

Run the focused checks:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

$manifestPath = "packages\astro-icons\LICENSES\third-party-icons.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$phosphor = $manifest.phosphor

@(
    $manifest.reviewStatus -eq "in-progress"
    $phosphor.inventoryCount -eq 1512
    $phosphor.source.evidenceStatus -eq "unresolved"
    $null -eq $phosphor.source.package
    $null -eq $phosphor.source.version
    $null -eq $phosphor.source.commit
    $phosphor.source.url -eq "https://github.com/phosphor-icons/core"
    $phosphor.copyright.concludedLicense -eq "MIT"
    $phosphor.copyright.copyrightNotice -eq "Copyright (c) 2020-2024 Phosphor Icons"
    $null -eq $phosphor.copyright.licenseSourceUrl
    $null -eq $phosphor.copyright.licenseFile
) -notcontains $false
```

Then inspect repository purity:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md

git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

### Refactor step

Delete any temporary checker, scratch note, archive, extracted corpus, or comparison output that was created during
validation.

### Acceptance criteria

- The JSON manifest parses successfully.
- Field-level assertions pass.
- `git status --short` shows only:

```text
M packages/astro-icons/LICENSES/third-party-icons.json
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

- Diffs for `packages/astro-icons/src`, `packages/astro-icons/migration/icon-inventory.json`, and
  `packages/astro-icons/package.json` are empty.
- No temporary validation files remain in the repository.

### Non-goals

- Do not introduce a permanent test script unless the repository already has a provenance-check test harness.
- Do not update generated outputs.
- Do not normalize unrelated JSON formatting.

### Suggested execution order

Run after Cycles 2 and 3. Repeat after any wording adjustment.

---

# Final Acceptance Matrix

| Area               | Acceptance criterion                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Scope              | Only two files modified                                                                                                  |
| Behavior           | No SVG, inventory, source, or package metadata changes                                                                   |
| Manifest source    | `package`, `version`, and `commit` remain `null`                                                                         |
| Manifest status    | `evidenceStatus === "unresolved"`                                                                                        |
| Manifest rationale | Evidence mentions repository basis, ten candidates, two exact-set candidates, byte mismatches, and unresolved conclusion |
| Copyright          | `concludedLicense === "MIT"`                                                                                             |
| Independence       | MIT conclusion is explicitly separate from exact corpus lineage                                                          |
| Traceability       | New findings section is auditable and aligned with the manifest                                                          |
| Cleanup            | No scratch scripts, corpora, archives, or comparison outputs remain                                                      |
| Deferred work      | No upstream comparison rerun, no `PHOSPHOR.txt`, no package metadata changes                                             |

# Why This Structure Is Better

This is a **finite metadata-and-documentation change**, so milestones would over-plan it. Short red-green-refactor
cycles are enough: each cycle starts with the expected failure condition, applies the minimum edit, and then tightens
wording or cleanup. This follows the practical TDD style of writing the check before the implementation, and the
BDD-style scenarios make the acceptance criteria readable as behavior rather than implementation trivia.
([Google Books][3])

DDT is useful only for the manifest field matrix because the expected values are finite and tabular. PBT is not
warranted here: there is no broad input domain to explore, only a fixed provenance contract and repository diff
boundary.

# Consolidated Non-Goals

- Re-running the upstream Phosphor corpus comparison.
- Asserting a package version, tag, or commit not supported by Phase 1.1.2.2.
- Changing the 1,512 SVG corpus.
- Editing icon inventory.
- Updating package metadata.
- Creating `LICENSES/PHOSPHOR.txt`.
- Changing `reviewStatus`.
- Editing non-Phosphor records.
- Leaving temporary checkers or scratch artifacts in the repository.

[1]: https://www.rfc-editor.org/rfc/rfc3339.html?utm_source=chatgpt.com "RFC 3339: Date and Time on the Internet: Timestamps"
[2]: https://www.kernel.org/pub/software/scm/git/docs/git-status.html?utm_source=chatgpt.com "git-status(1) Manual Page"
[3]: https://books.google.com/books/about/Test_driven_Development.html?id=CUlsAQAAQBAJ&utm_source=chatgpt.com "Test-driven Development: By Example - Kent Beck"
