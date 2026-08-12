# [PLAN] Align `@ravenhill/astro-icons` Publication with the Recorded Release Policy

## Scope Classification

**Recommended structure:** medium-scope **phases**.

The recent pure-core refactor is a strong foundation, but the implementation currently validates source/package SVG
**counts** rather than the actual release-policy-approved asset set.

The correction therefore spans:

1. the pure publication-policy model;
2. generated/public package surfaces;
3. the pack-contract verifier and CLI safety boundary;
4. artifact-level integration verification and traceability.

Toolchain modernization is explicitly deferred to a separate change set.

---

# Architectural Target

Adopt a functional-core, imperative-shell architecture:

```text
       icon inventory
             +
     attribution manifest
             |
             v
  +----------------------+
  |   release-policy     |
  |      pure core       |
  +----------------------+
       |            |
       |            |
       v            v
 build plan      pack contract
       |            |
       v            v
imperative      imperative
build shell     verification shell
```

The release-policy core should answer:

```text
Which assets are eligible for publication?
Which legal files does publication require?
```

Neither the build nor the pack checker should independently reinterpret these rules.

---

# Phase 1 — Establish an Exact Publishable-Asset Policy

## Goal

Replace source-SVG-count reasoning with an explicit, deterministic publishable-asset model derived from the frozen
inventory and attribution manifest.

## Scope

Create or extract:

```text
packages/astro-icons/scripts/lib/release-policy.mjs
```

Create:

```text
packages/astro-icons/scripts/test/release-policy.test.mjs
```

Modify only as needed:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

Do not modify:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/*.svg
```

---

## Cycle 1.1 — Characterize the Current Publication Contradiction

### Red

```gherkin
Feature: Release decisions constrain publication

Scenario: An excluded custom asset cannot appear in a publishable artifact
  Given an inventory containing a custom icon
  And its release decision is exclude
  When the publishable asset set is derived
  Then that icon is absent

Scenario: A baseline Phosphor asset remains publishable
  Given an inventory icon classified as phosphor
  When the publishable asset set is derived
  Then that icon is present
```

Add a regression case that demonstrates why plain source/package count parity is insufficient:

```gherkin
Scenario: Equal SVG counts do not imply equal publication sets
  Given two different SVG sets with the same cardinality
  When publication parity is evaluated
  Then the differing asset names are reported
```

### Green

Implement a pure function such as:

```js
derivePublishableIcons({
    inventory,
    manifest,
});
```

Current policy:

```text
Phosphor inventory member
    -> publishable baseline

custom asset with action=include
AND redistribution.conclusion=permitted
    -> publishable

custom asset with action=exclude
    -> not publishable

custom asset with action=include
BUT redistribution not permitted
    -> policy violation
```

Return a stable representation, preferably records containing at least:

```js
{
    file,
    exportName,
}
```

rather than only filenames.

### Refactor

Keep policy vocabulary centralized.

Do not scatter checks such as:

```js
asset.releaseDecision.action === "include";
```

across multiple scripts when they express the same publication rule.

Keep individual functions below approximately 25 lines.

---

## Cycle 1.2 — Validate Inventory/Manifest Correspondence

### Red

```gherkin
Feature: Publication evidence consistency

Scenario: Every custom inventory asset has release metadata
  Given a custom icon in the inventory
  When release policy is derived
  Then matching manifest evidence exists

Scenario: Manifest evidence references a known inventory asset
  Given an asset in the attribution manifest
  When release policy is derived
  Then its file exists in the inventory
```

Use DDT for:

```text
inventory group    manifest state             result
-----------------  -------------------------  --------------------
phosphor           no custom record required  publish
custom             include/permitted          publish
custom             include/undetermined       policy error
custom             include/restricted         policy error
custom             permission-required        policy error
custom             exclude/*                  exclude
```

### Green

Return structured policy findings rather than silently dropping inconsistent metadata.

Example:

```js
{
    code: "releasePolicy.missingManifestAsset",
    file: "example.svg",
}
```

### Refactor

Prefer machine-readable findings internally.

Translate them to human-readable diagnostics only in the CLI layer.

---

## Cycle 1.3 — Add Metamorphic Policy Checks

### Red

```gherkin
Feature: Release-policy invariants

Scenario: Input ordering does not change publication policy
  Given equivalent inventory and manifest records in different orders
  When the publishable asset set is derived
  Then the same semantic result is produced

Scenario: An unrelated non-asset manifest property does not change publication policy
  Given a valid release manifest
  When unrelated metadata is added
  Then the publishable asset set remains unchanged
```

### Green

Make output deterministic, preferably sorted by filename.

### Refactor

Do not add a framework for these transformations.

Small explicit metamorphic tests are sufficient.

---

## Acceptance Criteria

- Publishability is derived from inventory classification and release metadata.
- An excluded custom asset is never classified as publishable.
- `include` still requires `redistribution.conclusion === "permitted"`.
- Equal-count/different-set cases are rejected.
- Manifest/inventory inconsistencies produce structured findings.
- Output ordering is deterministic.
- Pure tests use synthetic fixtures as the behavioral oracle.
- Frozen repository evidence remains unchanged.

## Non-Goals

- Do not alter any release decision.
- Do not add `risk-accepted`.
- Do not contact rights holders.
- Do not generate or copy files yet.
- Do not migrate Node, pnpm, Astro, TypeScript, or the test framework.

## Suggested Execution Order

Run first.

No build behavior should change until the release-policy model is independently tested.

---

# Phase 2 — Separate Internal and Publishable Asset Surfaces

## Goal

Keep all repository-local icons available to the website while ensuring only release-approved assets enter the
standalone package.

This is the intentional production behavior correction required by the recorded release policy.

## Scope

Modify as required:

```text
generate-icons-index.js
packages/astro-icons/tsup.config.ts
packages/astro-icons/scripts/copy-assets.mjs
packages/astro-icons/package.json
```

Generate explicit internal and publishable entry surfaces.

Suggested shape:

```text
packages/astro-icons/src/index.ts
packages/astro-icons/src/publishable.ts
packages/astro-icons/src/generated/internal/
packages/astro-icons/src/generated/publishable/
```

The exact names may be adjusted to fit existing project conventions.

---

## Cycle 2.1 — Characterize the Two API Surfaces

### Red

```gherkin
Feature: Internal and publishable icon surfaces

Scenario: An excluded custom icon remains available internally
  Given Bash is present in the source inventory
  And its release decision is exclude
  When internal exports are generated
  Then Bash remains available to repository consumers

Scenario: An excluded custom icon is absent from the package API
  Given Bash has release decision exclude
  When publishable exports are generated
  Then Bash is absent

Scenario: A publishable Phosphor icon appears in both surfaces
  Given Acorn is classified as publishable
  When exports are generated
  Then Acorn is available internally
  And Acorn is available from the publishable API
```

### Green

Have the generator consume records rather than independently scanning/reclassifying files.

Prefer the audited `exportName` from inventory records for the publishable surface.

Conceptually:

```js
generateInternalExports(inventory.icons);
generatePublishableExports(publishableIcons);
```

### Refactor

Keep text rendering pure:

```js
renderExport(...)
renderBarrel(...)
```

Filesystem writing belongs in the generator shell.

---

## Cycle 2.2 — Build from the Publishable Entry Point

### Red

```gherkin
Feature: Standalone package entry point

Scenario: tsup builds only release-approved exports
  Given the publishable barrel has been generated
  When the package is built
  Then dist/index.js represents the publishable API
  And excluded custom exports are absent
```

### Green

Point `tsup` at the publishable generated entry while preserving the published output contract:

```text
dist/index.js
dist/index.d.ts
dist/index.js.map
```

Do not change the package import specifier.

Consumers should continue importing:

```js
import { Acorn } from "@ravenhill/astro-icons";
```

### Refactor

Keep `tsup.config.ts` declarative and small.

Do not introduce a custom bundler.

---

## Cycle 2.3 — Copy Only Publishable SVG Assets

### Red

```gherkin
Feature: Publishable SVG copying

Scenario: Release-approved assets are copied
  Given Acorn is publishable
  When package assets are copied
  Then dist/acorn.svg exists

Scenario: Excluded assets are not copied
  Given Bash is excluded
  When package assets are copied
  Then dist/bash.svg does not exist
```

### Green

Replace:

```text
readdir(src) -> copy every SVG
```

with:

```text
derive publication plan
        ->
copy only publishable filenames
```

The shell should receive an already-derived collection rather than deciding eligibility itself.

### Refactor

Extract a reusable, testable operation:

```js
copyFiles({
    files,
    sourceDirectory,
    destinationDirectory,
});
```

only if doing so reduces complexity.

Do not create abstraction merely for its own sake.

---

## Cycle 2.4 — Keep Generated Files Below the Size Limit

### Red

```gherkin
Feature: Generated source modularity

Scenario: Generated barrels respect the repository source-size policy
  Given more exports than fit in one generated module
  When export files are generated
  Then no generated source module exceeds the configured shard size
  And the public API remains unchanged
```

### Green

Shard generated exports deterministically.

For example:

```text
generated/internal/part-001.ts
generated/internal/part-002.ts
...
generated/publishable/part-001.ts
...
```

with small top-level barrels using `export *`.

Choose a shard size comfortably below 500 lines rather than targeting exactly 500.

### Refactor

Make partitioning deterministic so regeneration does not cause unnecessary diff churn.

---

## Acceptance Criteria

- Internal consumers retain all currently required local icons.
- Standalone package exports contain only publishable icons.
- `dist/*.svg` contains exactly publishable assets.
- Excluded assets are absent from package build output.
- Existing package import path remains unchanged.
- Generated source modules stay below 500 lines.
- Generator functions remain small and independently testable.
- Frozen asset files and evidence are unchanged.

## Non-Goals

- Do not remove excluded SVGs from repository source.
- Do not alter website-visible behavior.
- Do not rename existing publishable exports.
- Do not alter release decisions.
- Do not add a new bundler.
- Do not create another npm package solely for the policy module.

## Suggested Execution Order

Run after Phase 1.

First generate the surfaces, then switch `tsup`, then constrain asset copying.

---

# Phase 3 — Replace SVG Count Parity with Set-Based Contract Enforcement and Harden the CLI

## Goal

Make `assert-pack-files.mjs` enforce the actual publication surface and remove unsafe or obsolete shell behavior.

## Scope

Modify:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Prefer splitting tests into:

```text
scripts/test/pack-contract.test.mjs
scripts/test/assert-pack-files-cli.test.mjs
```

Extract additional pure logic into `scripts/lib/` where appropriate.

---

## Cycle 3.1 — Replace Count Parity with Exact Set Parity

### Red

```gherkin
Feature: Exact packaged SVG contract

Scenario: Exact publishable set passes
  Given the tarball contains every publishable SVG
  And contains no non-publishable SVG
  When pack contents are evaluated
  Then SVG publication findings are empty

Scenario: A publishable SVG is missing
  Given one expected SVG is absent
  When pack contents are evaluated
  Then the missing asset is named

Scenario: An excluded SVG is packaged
  Given bash.svg is excluded
  And package/dist/bash.svg is present
  When pack contents are evaluated
  Then bash.svg is reported as non-publishable

Scenario: Equal counts with different names fail
  Given expected and actual SVG sets have equal size
  But contain different filenames
  When pack contents are evaluated
  Then both set differences are reported
```

### Green

Replace `checkSvgParity(files, srcSvgCount)` with a semantic operation such as:

```js
comparePublishedSvgSet({
    files,
    publishableIcons,
});
```

Return separate collections:

```js
{
    missingAssets: [],
    unexpectedAssets: [],
}
```

### Refactor

Use set operations conceptually rather than count arithmetic.

Do not keep count parity as an independent rule after exact-set equality exists.

Counts may remain as diagnostic summary data only.

---

## Cycle 3.2 — Simplify the Evaluator Boundary

### Red

```gherkin
Feature: Pack evaluator domain boundary

Scenario: The evaluator requires publication policy, not source-directory knowledge
  Given an expected publishable asset collection
  And a tarball file list
  When pack contents are evaluated
  Then no source filesystem information is required
```

### Green

Move away from:

```js
evaluatePackContents({
    files,
    manifest,
    srcSvgCount,
});
```

toward:

```js
evaluatePackContents({
    files,
    manifest,
    publishableIcons,
});
```

or a similarly explicit immutable contract.

### Refactor

Delete `countSourceSvgs()` from the pack-check shell when no longer needed.

The verifier should not inspect source assets merely to infer publication policy.

---

## Cycle 3.3 — Remove Redundant Dry-Run Cleanup

### Red

```gherkin
Feature: Dry-run package inspection

Scenario: --pack performs no artifact cleanup
  Given npm pack is invoked with --dry-run
  When package inspection succeeds
  Then no tarball deletion is attempted
```

### Green

Remove `removePackedTarballs` from the `--pack` path.

If stdin compatibility does not represent a real generated tarball, remove cleanup entirely.

### Refactor

Reduce the dependency surface of `main()` accordingly.

---

## Cycle 3.4 — Harden Any Remaining Artifact Path Handling

Only execute this cycle if artifact cleanup remains necessary.

### Red

Use DDT:

```text
filename                    expected
--------------------------  ------------------
package-0.1.0.tgz           allowed
./package-0.1.0.tgz         allowed/normalized
../victim.txt               rejected
../../victim.txt            rejected
/path/file.tgz              rejected
C:\outside\file.tgz         rejected
subdir/file.tgz             rejected unless explicitly supported
```

BDD:

```gherkin
Feature: Package artifact path containment

Scenario: A cleanup path cannot escape the package root
  Given an untrusted package-entry filename
  When its cleanup path is resolved
  Then the result is either inside the package root
  Or it is rejected before filesystem access
```

### Green

Implement the containment check as a pure function.

Filesystem deletion must receive only validated paths.

### Refactor

Keep parsing, validation, and deletion separate.

---

## Cycle 3.5 — Add Property-Based Path Safety Testing

Because the repository already uses mature `fast-check`, PBT adds meaningful value specifically at this boundary.

### Red

Property:

```text
For every accepted generated filename,
relative(packageRoot, resolvedPath)

must not:
- begin with ".."
- be absolute
```

Also generate:

- repeated `../`;
- mixed `/` and `\`;
- dot segments;
- empty segments;
- Unicode filenames;
- unusually long names.

### Green

Add a focused property test around the pure path resolver.

### Refactor

Keep example-based DDT tests in addition to PBT.

PBT should supplement understandable attack examples, not replace them.

---

## Cycle 3.6 — Split and Normalize Tests

### Red

```gherkin
Feature: Pack-contract test organization

Scenario: Pure policy tests do not require shell doubles
Scenario: CLI orchestration tests do not duplicate policy matrices
Scenario: Integration tests do not serve as the pure unit-test oracle
```

### Green

Split by responsibility:

```text
release-policy.test.mjs
pack-contract.test.mjs
assert-pack-files-cli.test.mjs
```

Use ordinary `node:test` DDT loops/subtests instead of extending the built-in test API.

### Refactor

Keep each test source below 500 lines.

Prefer fixtures/builders only where they remove genuine duplication.

---

## Acceptance Criteria

- SVG validation compares exact expected and actual sets.
- Excluded packaged assets are explicitly rejected.
- Missing publishable assets are explicitly reported.
- Source SVG count is no longer a policy input.
- `--pack` performs no redundant cleanup.
- Any remaining filesystem cleanup is root-contained.
- Path-containment behavior has DDT plus PBT coverage.
- CLI and pure policy tests are separated.
- No test file exceeds 500 lines.
- Existing required runtime/legal-file behavior remains intact.
- Grouped diagnostics remain intact.

## Non-Goals

- Do not change manifest semantics.
- Do not introduce experimental Node module mocking.
- Do not migrate all tests to Vitest.
- Do not add a separate fuzzing engine when PBT adequately exercises the path parser.
- Do not add Stryker solely for this phase.

## Suggested Execution Order

Run after Phase 2 so the verifier can characterize the corrected package surface.

---

# Phase 4 — Prove the Real Publishable Artifact and Close Traceability

## Goal

Verify that the actual package-manager-produced artifact matches the exact release policy, then close Subphase 1.4 only
after the evidence is clean.

## Scope

Modify as needed:

```text
packages/astro-icons/package.json
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Verification should use the actual structured dry-run package output.

---

## Cycle 4.1 — Add Artifact-Level Integration Coverage

### Red

```gherkin
Feature: Actual npm publication surface

Scenario: Real package dry-run contains exactly the releasable SVG set
  Given @ravenhill/astro-icons has been built
  When npm computes the publication file list
  Then every expected publishable SVG is present
  And no excluded SVG is present

Scenario: Required legal evidence is packaged
  Given the actual npm file list
  Then LICENSE is present
  And required LICENSES files are present

Scenario: Development internals are excluded
  Given the actual npm file list
  Then src is absent
  And scripts is absent
  And migration is absent
  And tsconfig.json is absent
  And tsup.config.ts is absent
```

### Green

Use the existing machine-readable:

```text
npm pack --dry-run --json
```

adapter.

Feed its result through the same pure pack-contract evaluator.

Do not implement a second integration-only definition of valid package contents.

---

## Cycle 4.2 — Verify Public Export Surface

### Red

```gherkin
Feature: Published API corresponds to published assets

Scenario: Every public SVG export has a packaged asset
  Given the generated publishable entry point
  And the actual packed file list
  When their asset names are compared
  Then no public export references a missing SVG

Scenario: Excluded custom exports are absent
  Given a custom asset is excluded by policy
  When the package API is inspected
  Then its export is absent
```

### Green

Compare generated publication metadata with the pack file set.

Avoid fragile whole-file snapshots of `dist/index.js`.

### Refactor

Test semantic export names/asset paths rather than bundler formatting.

---

## Cycle 4.3 — Run the Verification Ladder

Run:

```powershell
pnpm --filter @ravenhill/astro-icons test:audit-icons
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons test:pack-files
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons build
pnpm --filter @ravenhill/astro-icons typecheck
pnpm --filter @ravenhill/astro-icons pack:check
pnpm --filter @ravenhill/astro-icons pack:dry-run
pnpm --filter @ravenhill/astro-icons lint
```

Prefer executing `pack:check` independently of `publint` so one failing tool does not prevent collection of
artifact-contract evidence.

The aggregate `check` command may remain fail-fast as the release gate.

---

## Cycle 4.4 — Targeted Mutation Assessment

Mutation testing has particularly high value for these predicates:

```text
group === "phosphor"
action === "include"
conclusion === "permitted"
expected.has(actual)
actual.has(expected)
path containment
```

If mutation-testing infrastructure already exists in the repository, verify that mutations of those predicates are
killed.

Otherwise, defer introducing StrykerJS to a repository-wide testing-hardening initiative.

Do not add a substantial dependency solely for this small verifier.

---

## Cycle 4.5 — Update Maintainer Documentation

Document the distinction:

```text
Source/internal availability != permission to publish
```

`AGENTS.md` should state:

- custom source assets may remain available to the monorepo;
- the standalone artifact is generated from release policy;
- `exclude` means absent from the standalone package;
- `include` requires permitted redistribution;
- there is no `risk-accepted` path yet.

README should remain consumer-oriented and concise.

---

## Cycle 4.6 — Repository Purity and Traceability Closure

### Red

```gherkin
Feature: Licensing evidence remains immutable during enforcement

Scenario: Publication enforcement does not rewrite the evidence
  Then third-party-icons.json is unchanged
  And THIRD_PARTY.md is unchanged
  And icon-inventory.json is unchanged
  And source SVG bytes are unchanged
```

### Green

Verify:

```powershell
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src -- "*.svg"

git diff --check
git status --short
```

Only after these checks and the verification ladder pass:

- mark Subphase 1.4 `[DONE]`;
- close Phase 1 if all previous subphases remain complete;
- record the intentional publication-surface correction;
- record exact verification commands and outcomes.

### Refactor

Keep traceability factual.

Do not rewrite historical evidence or previously closed phases unnecessarily.

---

## Acceptance Criteria

- Actual npm dry-run contains exactly the policy-approved SVG set.
- None of the nine currently excluded custom assets appears in the standalone artifact.
- Public exports correspond exactly to packaged SVG assets.
- Internal repository use of excluded assets remains available.
- All required legal files are packaged.
- Development internals remain excluded.
- Build, typecheck, contract tests, and pack checks pass.
- Any unrelated lint/tooling caveat is separately identified rather than hidden.
- Frozen provenance evidence remains byte-for-byte untouched.
- `git diff --check` passes.
- Traceability closes only after artifact verification.

## Non-Goals

- Do not publish.
- Do not alter release decisions.
- Do not regenerate licensing evidence unless an independent evidence change requires it.
- Do not add `risk-accepted`.
- Do not migrate the whole monorepo's toolchain here.
- Do not stage or commit.
- Do not archive the phase.

## Suggested Execution Order

Run last.

Artifact verification precedes documentation closure.

---

# Testing-Technique Decision

## BDD

Use throughout.

The contract is policy-oriented and maps naturally to scenarios readable by maintainers and reviewers.

## DDT

Strong fit.

Use for:

- inventory groups;
- release actions;
- redistribution conclusions;
- required files;
- blocked paths;
- path-containment examples.

## PBT

Use selectively.

The strongest target is path containment because the input space is large and `fast-check` is already used by the
repository.

Do not use PBT merely to generate random manifest records for a finite release-decision matrix.

## Mock Testing

Use only at imperative boundaries.

Inject:

```text
read file
run npm
write output
copy file
delete file
```

Do not mock pure policy functions.

## Metamorphic Testing

Use for:

- input-order invariance;
- irrelevant-file additions;
- equal-cardinality/different-set cases;
- repeated policy derivation.

## Differential Testing

Not currently justified.

There is no independent implementation of the same release policy that would provide a meaningful differential oracle.

Do not compare npm and pnpm merely to manufacture a differential test.

## Mutation Testing

High-value for critical policy predicates, but add infrastructure only if it is reusable beyond this subphase.

## Fuzz Testing

A separate fuzzing dependency is unnecessary.

Property-based generation adequately exercises the small path-normalization boundary.

---

# Deferred Toolchain Modernization

Do not mix these upgrades with the licensing correction.

After Subphase 1.4 closes, create a separate modernization plan in this order:

```text
1. Node 20 -> Node 24 LTS
2. pnpm 9.15.9 -> pnpm 11 stable
3. Astro 5 -> Astro 6
4. Astro 6 -> Astro 7
5. TypeScript 5.9 -> TypeScript 6
6. migrate other test/build dependencies independently where justified
```

Each major migration should have characterization coverage before the upgrade and its own CI evidence.

Do not adopt pnpm 12 while it remains a release candidate.

---

# Final Acceptance Matrix

| Area              | Required result                                                   |
| ----------------- | ----------------------------------------------------------------- |
| Release policy    | Publishability is derived from inventory + manifest               |
| Phosphor assets   | Approved baseline remains publishable                             |
| Custom assets     | `exclude` assets cannot enter the standalone artifact             |
| Include rule      | `include` requires `redistribution.conclusion === "permitted"`    |
| SVG verification  | Exact set equality replaces count parity                          |
| Internal API      | Repository can retain excluded local icons                        |
| Public API        | Only publishable icons are exported                               |
| Build             | Only publishable SVGs enter `dist`                                |
| Generated code    | No generated source module exceeds 500 lines                      |
| CLI               | Functional core / imperative shell remains explicit               |
| Cleanup safety    | Dry-run cleanup removed; any remaining path deletion is contained |
| BDD               | Policy behavior expressed as scenarios                            |
| DDT               | Fixed policy matrices are table-driven                            |
| PBT               | Focused on path-containment invariants                            |
| Metamorphic tests | Ordering and set invariants covered                               |
| Mutation testing  | Critical predicates assessed if infrastructure is available       |
| Integration       | Actual npm dry-run is evaluated                                   |
| Legal artifacts   | Required license/notice files are present                         |
| Repository purity | Frozen evidence and SVG source bytes remain unchanged             |
| Traceability      | Subphase closes only after real artifact verification             |

# Consolidated Non-Goals

- Do not change frozen licensing decisions.
- Do not add a `risk-accepted` policy.
- Do not remove excluded assets from repository source merely because they cannot be published.
- Do not contact rights holders.
- Do not publish the package.
- Do not introduce microservices.
- Do not introduce a new bundler.
- Do not replace `node:test` solely to obtain table-driven syntax.
- Do not add dependencies without a demonstrated reusable benefit.
- Do not combine major Node/pnpm/Astro/TypeScript upgrades with this corrective patch.
- Do not stage or commit.
