# [PLAN] Phase 2 --- Research, Match, and Classify the Nine Non-Phosphor Assets

## Scope Classification

**Recommended structure:** medium-scope **phases**.

**Why not milestones:** there is no broad delivery roadmap or architectural split. This is one research deliverable.

**Why not only direct cycles:** each asset needs source discovery, comparison, rights analysis, and classification;
grouping by research risk is more readable than a flat list of 9 independent cycles.

**Primary output:** updated Phase 2 sections in:

```text
traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

**Behavior-preserving constraint:** no manifest, SVG, inventory, source-code, package metadata, or generated-output
changes.

---

# Phase 0 — Establish the Research Baseline

## Goal

Freeze the starting evidence before web research begins, so later conclusions are traceable to either local SVG evidence
or fetched upstream evidence.

## Scope

Read-only inputs:

- `packages/astro-icons/src/{bash,csv,json,kotlin,nushell-logo,powershell,python,scala,xml}.svg`
- `packages/astro-icons/LICENSES/third-party-icons.json`
- `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md`

Capture the known local evidence:

| Asset          | Local evidence                                     | Planning consequence                                                      |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| `bash`         | `SVG Repo` upload comment                          | Treat as confirmed aggregator fingerprint; find exact SVG Repo page.      |
| `scala`        | `SVG Repo` upload comment                          | Treat as confirmed aggregator fingerprint; expect cross-batch correction. |
| `nushell-logo` | `visioncortex VTracer` generator comment           | Evidence ceiling is likely `visual-match`; do not overstate.              |
| `python`       | Inkscape metadata naming `python-logo-only.svg`    | Strong lead toward PSF logo source.                                       |
| `kotlin`       | Illustrator metadata and official-looking gradient | Strong lead toward JetBrains/Kotlin brand source.                         |
| `powershell`   | `id="PowerShell"`, no source comment               | Needs open research; no starting provenance claim.                        |
| `json`         | `<title>JSON logo</title>`                         | Needs canonical-source research.                                          |
| `csv`          | Generic folded-corner file icon                    | Treat as generic/aggregator candidate.                                    |
| `xml`          | Generic folded-corner file icon                    | Treat as generic/aggregator candidate.                                    |

## Red

```gherkin
Feature: Research baseline lock

Scenario: Phase 2 starts from local evidence without editing package artifacts
  Given the nine local non-Phosphor SVG files
  When Phase 2 research begins
  Then every local fingerprint must be recorded before web research
  And no SVG, manifest, inventory, source, or package metadata file may be changed
```

Gherkin is appropriate here because its `Given`/`When`/`Then` structure is designed to express expected behavior as
readable scenarios. ([Cucumber][1])

## Green

Add a short `## Current Status` note under Phase 2 explaining:

- Phase 1 vocabulary lock is done;
- local SVGs and manifest defaults were read;
- `bash` and `scala` already contain SVG Repo fingerprints;
- `nushell-logo` already shows VTracer auto-trace evidence;
- manifest writes are deferred to Phase 3.

## Refactor

Keep this baseline concise. The detailed evidence should live in the batch sections and final table, not in repeated
prose.

## Acceptance Criteria

- Local evidence is recorded before external research.
- No asset is classified from web evidence yet.
- The document clearly distinguishes local fingerprints from fetched source evidence.
- No package artifact changes occur.

## Non-Goals

- Do not edit the manifest.
- Do not edit SVG files.
- Do not decide release inclusion.
- Do not mark Phase 2 complete yet.

## Suggested Execution Order

Run first.

---

# Phase 1 — Research High-Confidence and Brand-Controlled Leads

## Goal

Investigate official or brand-controlled sources first, while immediately reclassifying assets whose local evidence
already proves aggregator origin.

## Scope

Assets:

- `python`
- `kotlin`
- `powershell`
- `scala`

## Research Strategy

Prioritize sources in this order:

1. official project or foundation source;
2. official brand/media asset page;
3. project repository asset;
4. reputable mirror with provenance metadata;
5. aggregator source only when local or upstream evidence points there.

For `scala`, do not spend unnecessary time trying to force an official-source match. The local SVG Repo header is
already a strong cross-batch signal; the research target should be the exact SVG Repo page and page-specific license.

## Red

```gherkin
Feature: Brand-controlled asset research

Scenario Outline: Brand-controlled assets require source-specific evidence
  Given the local <asset> SVG
  When candidate upstream sources are investigated
  Then the final evidence row must record the strongest supportable source
  And the match method must not be stronger than the comparison evidence supports
  And copyright, trademark, redistribution, and release action must remain separate

Examples:
  | asset      |
  | python     |
  | kotlin     |
  | powershell |
  | scala      |
```

## Green

For each asset, record:

| Field                     | Required evidence                                                      |
| ------------------------- | ---------------------------------------------------------------------- |
| Candidate URLs            | Exact source pages or raw SVG URLs investigated                        |
| Source kind               | Official, semi-official, repository, mirror, aggregator, or unresolved |
| Match method              | One of the Phase 1 controlled values                                   |
| Evidence status           | `verified`, `partially-verified`, or `unresolved`                      |
| Copyright conclusion      | License or `NOASSERTION`                                               |
| Trademark conclusion      | Mark restrictions or undetermined                                      |
| Redistribution conclusion | `permitted`, `restricted`, `permission-required`, or `undetermined`    |
| Release action            | `pending`, unless Phase 3 later supports another action                |

Use `NOASSERTION` when the available evidence is insufficient to make an objective license conclusion. SPDX uses
`NOASSERTION` for cases where a creator cannot or does not provide a reasonable objective license determination.
([SPDX][2])

## Refactor

Separate the starting batch from the final classification. For example:

```text
scala: initially reviewed with brand-controlled assets, but final classification follows SVG Repo evidence.
```

## Acceptance Criteria

- `python` is checked against the strongest official PSF logo lead.
- `kotlin` is checked against the strongest official JetBrains/Kotlin brand lead.
- `powershell` has at least one official or repository-source attempt before fallback sources.
- `scala` is explicitly routed to cross-batch correction if SVG Repo evidence is confirmed.
- No asset receives `include` merely because it has an official-looking logo.

## Non-Goals

- Do not replace local SVGs with official versions.
- Do not infer trademark permission from public logo availability.
- Do not edit the manifest.
- Do not make maintainer-owned release decisions.

## Suggested Execution Order

Run after Phase 0. Complete before community/generic batches so cross-batch corrections are explicit.

---

# Phase 2 — Research Community Marks and Project-Level Sources

## Goal

Investigate project/community marks without overstating provenance or redistribution rights.

## Scope

Assets:

- `nushell-logo`
- `json`
- `bash`

## Research Strategy

- `nushell-logo`: find an official Nushell source if possible, but cap match strength at `visual-match` unless the
  traced SVG can be matched structurally.
- `json`: search for the canonical JSON logo source, distinguishing original source, mirror, and aggregator.
- `bash`: treat as an aggregator-origin candidate immediately because of the local SVG Repo header; find exact SVG Repo
  page and page-specific license.

## Red

```gherkin
Feature: Community and project mark research

Scenario Outline: Community-source evidence must not overstate rights
  Given the local <asset> SVG
  When only visual, metadata, or aggregator evidence is available
  Then the evidence status must not be stronger than the match supports
  And releaseDecision.action must remain pending unless rights are cleanly supportable

Examples:
  | asset        |
  | nushell-logo |
  | json         |
  | bash         |
```

## Green

For each asset:

- record exact candidate source URLs;
- compare fetched SVG or page evidence to local SVG;
- classify source kind;
- record the strongest honest match method;
- record unresolved or undetermined outcomes where evidence is weak.

## Refactor

Move `bash` into the cross-batch correction list if exact SVG Repo evidence is found. Keep `json` separate from generic
file-type icons; it is a recognizable logo/mark, not merely a JSON file icon.

## Acceptance Criteria

- `nushell-logo` is not claimed above `visual-match` unless strong structural evidence exists.
- `json` identifies whether the evidence is original, mirror, or aggregator.
- `bash` cites the local SVG Repo fingerprint and the exact matching source page if found.
- Every inconclusive result remains `unresolved`, `undetermined`, or `NOASSERTION`.

## Non-Goals

- Do not infer that community usage equals redistribution permission.
- Do not treat Wikimedia or aggregators as original rights holders unless the page evidence supports it.
- Do not edit manifest or asset files.

## Suggested Execution Order

Run after Phase 1.

---

# Phase 3 — Research Generic and Aggregator-Style File Icons

## Goal

Find exact source pages for generic file-format icons and avoid generic homepage-level evidence.

## Scope

Assets:

- `csv`
- `xml`

Potentially also:

- `bash`
- `scala`

if SVG Repo evidence confirms cross-batch reclassification.

## Research Strategy

For aggregator-like assets, require page-specific evidence:

- exact icon page URL;
- collection or pack name;
- author or contributor if available;
- page-specific license;
- raw SVG or page content sufficient for comparison.

## Red

```gherkin
Feature: Aggregator-sourced icon research

Scenario Outline: Aggregator icons require exact-page evidence
  Given the local <asset> SVG
  When an aggregator source is used as provenance evidence
  Then the source must identify the exact asset page
  And the rights basis must identify the page-specific license
  And a generic aggregator homepage is insufficient

Examples:
  | asset |
  | csv   |
  | xml   |
  | bash  |
  | scala |
```

## Green

For each aggregator-style asset:

- search by visual details, SVG comments, path features, colors, titles, and viewBox;
- fetch candidate page/raw SVG where available;
- compare content against local SVG;
- record exact page, collection, author, license, and match method;
- leave license as `NOASSERTION` where page-specific evidence is missing or ambiguous.

## Refactor

Use one consistent aggregator evidence pattern:

```text
Exact page → collection/author → raw-SVG comparison → page-specific license → redistribution conclusion.
```

## Acceptance Criteria

- `csv` and `xml` have either exact-page evidence or explicit unresolved status.
- `bash` and `scala` are included here if SVG Repo evidence is confirmed.
- No aggregator result cites only a homepage.
- Page-specific license is recorded, or the license remains `NOASSERTION`.
- Redistribution conclusion is not stronger than the license evidence.

## Non-Goals

- Do not scrape or store downloaded source files inside the repository.
- Do not normalize local SVGs.
- Do not change source assets.

## Suggested Execution Order

Run after Phase 2.

---

# Phase 4 — Final Classification and Cross-Batch Correction

## Goal

Produce the final 9-row evidence table using the corrected Phase 1 vocabulary and research results.

## Scope

Edit only Phase 2.4 of:

```text
traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

Fill the final table for:

- `bash`
- `csv`
- `json`
- `kotlin`
- `nushell-logo`
- `powershell`
- `python`
- `scala`
- `xml`

## Red

```gherkin
Feature: Final Phase 2 evidence table

Scenario: Final classification follows evidence rather than the initial batch label
  Given the completed batch research notes
  When the final evidence table is populated
  Then every asset must have a final source kind
  And every value must use the corrected Phase 1 vocabulary
  And every pending release action must have exactly one primary blocking reason
  And no unsupported release inclusion or risk acceptance may be recorded
```

## Green

Replace all `TBD` entries in the final table.

Use this final table shape:

| Asset          | Final source kind | Match method | Evidence status | Copyright conclusion | Trademark conclusion | Redistribution conclusion | Release action                   | Primary blocker |
| -------------- | ----------------- | ------------ | --------------- | -------------------- | -------------------- | ------------------------- | -------------------------------- | --------------- |
| `bash`         | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `csv`          | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `json`         | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `kotlin`       | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `nushell-logo` | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `powershell`   | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `python`       | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `scala`        | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |
| `xml`          | filled            | filled       | filled          | filled               | filled               | filled                    | `pending` unless later justified | exactly one     |

## Refactor

Normalize the table vocabulary:

- `verified`, `partially-verified`, `unresolved`;
- `permitted`, `restricted`, `permission-required`, `undetermined`;
- `include`, `exclude`, `pending`;
- `NOASSERTION` where no objective copyright conclusion is supportable.

Also add a short cross-batch note explaining why `bash` and `scala` moved to aggregator-source handling.

## Acceptance Criteria

- No `TBD` remains in the final table.
- Every row uses corrected Phase 1 vocabulary.
- `bash` and `scala` include explicit SVG Repo cross-batch rationale.
- `nushell-logo` is not stronger than `visual-match` unless evidence supports it.
- Every `pending` row has exactly one primary blocker.
- No `riskAcceptance` or maintainer decision is invented.

## Non-Goals

- Do not write manifest JSON.
- Do not decide final inclusion/exclusion unless the existing plan explicitly delegates that authority.
- Do not collapse copyright, trademark, and redistribution into one field.

## Suggested Execution Order

Run after Phases 1–3.

---

# Phase 5 — Mark Phase 2 Subsections Done

## Goal

Record research completion status without implying that manifest writing has occurred.

## Scope

In `phase_3_verify_the_nine_non_phosphor_assets.md`, mark only these Phase 2 headings as `[DONE]` when their evidence is
complete:

- `Phase 2`
- `Phase 2.1`
- `Phase 2.2`
- `Phase 2.3`
- `Phase 2.4`

Add short `## Current Status` notes under each completed subsection.

## Red

```gherkin
Feature: Phase 2 status updates

Scenario: Research sections are marked done without claiming manifest changes
  Given the Phase 2 research table is complete
  When Phase 2 status markers are updated
  Then the notes must summarize research evidence only
  And they must not claim manifest edits, release decisions, or asset changes
```

## Green

Status notes should summarize:

- sources found;
- match-method distribution;
- unresolved cases;
- cross-batch corrections;
- count of `pending` rows;
- confirmation that manifest updates are deferred to Phase 3.

## Refactor

Keep each status note short. Avoid duplicating the final 9-row table.

## Acceptance Criteria

- Phase 2 research status is clear.
- Phase 3 remains future work.
- Manifest writing is explicitly deferred.
- No headings outside Phase 2 are changed.

## Non-Goals

- Do not mark Phase 3 or Phase 4 done.
- Do not update the final acceptance matrix unless it contains stale vocabulary.
- Do not archive the file.

## Suggested Execution Order

Run after Phase 4.

---

# Phase 6 — Verify Single-File Research Scope and Protected Paths

## Goal

Prove that Phase 2 changed only the research plan/documentation file and did not alter package artifacts.

## Scope

Verify:

- changed-file scope;
- protected-path diffs;
- final table completeness;
- vocabulary correctness.

Git’s documentation supports using `git status` for working-tree scope and `git diff` for content-level inspection, so
both checks are appropriate here. ([Git SCM][3])

## Red

```gherkin
Feature: Phase 2 repository purity

Scenario: Research classification changes only the Phase 3 plan document
  Given the repository after Phase 2 research
  When verification runs
  Then the only edited path should be phase_3_verify_the_nine_non_phosphor_assets.md
  And manifest, SVG, inventory, and package metadata diffs must be empty
```

## Green

Run from `astro-website/`:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short

git diff -- traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Also manually verify:

- no `TBD` remains in the Phase 2.4 table;
- every row uses corrected Phase 1 vocabulary;
- every `pending` row has exactly one blocker;
- no `riskAcceptance` object or maintainer-owned decision is introduced;
- `bash` and `scala` have cross-batch rationale;
- `nushell-logo` is not overclaimed.

## Refactor

Remove any temporary downloads, scratch files, fetched SVG copies, or comparison notes from inside the repository.

If temporary files are useful during research, keep them outside `astro-website/`.

## Acceptance Criteria

- Only `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md` is modified.
- Manifest diff is empty.
- SVG diff is empty.
- Inventory diff is empty.
- Package metadata diff is empty.
- Phase 2.4 has no `TBD`.
- All release actions remain within the corrected vocabulary.
- No unsupported `include`, `exclude`, or risk acceptance is recorded.
- No temporary artifacts remain.

## Non-Goals

- Do not run Phase 3 manifest write checks yet.
- Do not create permanent verification scripts.
- Do not modify generated outputs.

## Suggested Execution Order

Run last. Repeat after every research-table correction.

---

# Final Acceptance Matrix

| Area                   | Acceptance criterion                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Research coverage      | All nine assets have investigated source evidence or explicit unresolved rationale          |
| Local evidence         | SVG comments and metadata are recorded as starting evidence, not final proof by themselves  |
| Source precision       | Official/project sources preferred; aggregator sources use exact asset pages                |
| Cross-batch correction | `bash` and `scala` are reclassified if SVG Repo evidence is confirmed                       |
| Match honesty          | `nushell-logo` is capped at `visual-match` unless stronger evidence exists                  |
| Vocabulary             | All rows use corrected Phase 1 values                                                       |
| Incomplete evidence    | Missing or weak evidence maps to `unresolved`, `undetermined`, `NOASSERTION`, and `pending` |
| Release authority      | No maintainer-owned `riskAcceptance` or release decision is invented                        |
| Final table            | No `TBD` remains                                                                            |
| Edit scope             | Only `phase_3_verify_the_nine_non_phosphor_assets.md` changes                               |
| Protected paths        | Manifest, SVGs, inventory, source, and package metadata remain unchanged                    |
| Cleanup                | No temporary web-fetch or comparison artifacts remain in the repository                     |

---

# Consolidated Non-Goals

- Do not edit `packages/astro-icons/LICENSES/third-party-icons.json`.
- Do not edit any SVG.
- Do not edit `packages/astro-icons/migration/icon-inventory.json`.
- Do not edit `packages/astro-icons/package.json`.
- Do not edit package source code.
- Do not replace local assets with upstream assets.
- Do not make release inclusion/exclusion decisions.
- Do not create or fill `riskAcceptance`.
- Do not assume redistribution from open-source project status.
- Do not infer trademark permission from copyright license.
- Do not archive the phase.
- Do not mark Phase 3 or Phase 4 done.

---

# Main Improvements Over the Original Plan

The original plan has the right instincts, especially using local SVG fingerprints to steer research. The improved
version strengthens it in four ways:

1. **Adds Phase 0** to freeze local evidence before web research, preventing later source claims from becoming detached
   from the actual local SVGs.
2. **Separates research from final classification**, so each batch can collect evidence before the 9-row table is
   normalized.
3. **Uses exact-page evidence as a hard rule for aggregators**, which prevents weak source claims based only on generic
   homepages.
4. **Keeps Phase 2 strictly documentation-only**, preserving the manifest write for Phase 3 and making repository-purity
   verification simple.

[1]: https://cucumber.io/docs/gherkin/reference/?utm_source=chatgpt.com "Reference"
[2]: https://spdx.org/rdf/spdx-terms-v2.0/objectproperties/licenseConcluded___-571936219.html?utm_source=chatgpt.com "Object Property: licenseConcluded"
[3]: https://git-scm.com/?utm_source=chatgpt.com "Git"
