# [PLAN] Subphase 1.4 — Complete and Verify the Publishable Artifact Contract

## Scope Classification

**Recommended structure:** medium-scope **phases**.

The original classification is correct, but the remaining work should be reduced to four phases:

1. harden and characterize the CLI shell;
2. integrate the contract into package workflows and documentation;
3. verify the contract against the real publishable artifact;
4. close traceability and prove repository purity.

Phases 1.4.1 and 1.4.2 are already complete and form the behavioral baseline.

---

# Architectural Direction

Use a **functional core, imperative shell**:

```text
pack file list ─┐
manifest ───────┼─> pure pack-contract evaluator ─> structured findings
SVG count ──────┘                                  │
                                                   v
                                      CLI diagnostic formatter
                                                   │
                                                   v
                                             exit status
```

The pure core owns:

- required-file derivation;
- blocked-file detection;
- SVG parity;
- redistribution-policy evaluation;
- aggregation of findings.

The imperative shell owns:

- reading the attribution manifest;
- obtaining the actual pack file list;
- counting source SVGs;
- formatting output;
- setting `process.exitCode`.

Do not introduce services, microservices, or framework abstractions. This is a package-local verification utility;
additional deployment boundaries would increase complexity without improving modularity.

Prefer dependency injection at the `main()` boundary over mocking Node modules.

If `assert-pack-files.mjs` approaches the repository's 500-line source-file limit after the remaining work, extract the
pure core to:

```text
packages/astro-icons/scripts/lib/pack-contract.mjs
```

and leave:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

as the thin shell.

Do **not** split the file merely to create additional modules if it remains small and cohesive.

---

# Completed Baseline

## Phase 1.4.1 — Characterize the Existing Pack Contract [DONE]

Established characterization coverage for:

- required runtime files;
- blocked internals;
- SVG parity;
- synthetic, filesystem-independent fixtures.

No further work is required unless a remaining phase discovers an uncharacterized behavior.

---

## Phase 1.4.2 — Extract Pure Pack-Contract Logic [DONE]

Established:

```js
deriveRequiredLicenseFiles(manifest);
findMissingFiles(files, requiredFiles);
findBlockedFiles(files, blockedPatterns);
checkSvgParity(files, srcSvgCount);
findIncludedAssetsWithoutPermittedRedistribution(manifest);
evaluatePackContents({ files, manifest, srcSvgCount });
```

and:

- import-safe module behavior;
- guarded CLI execution;
- required legal-file derivation;
- `package/migration/` blocking;
- `include => redistribution.conclusion === "permitted"`;
- grouped diagnostics;
- preservation of existing runtime-file, blocked-file, and SVG-parity behavior.

These semantics are now the baseline for the remaining phases.

---

# Phase 1.4.3 — Harden the CLI as a Thin, Testable Shell

## Goal

Prove that the existing guarded CLI correctly adapts external I/O to the pure evaluator without duplicating contract
logic.

This **replaces** the previous plan to "add" a main-module guard: that guard already exists after Phase 1.4.2.

## Scope

Modify as necessary:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Optionally create only if needed for cohesion or the 500-line limit:

```text
packages/astro-icons/scripts/lib/pack-contract.mjs
```

---

## Cycle 3.1 — Characterize Import and Entry-Point Safety

### Red

```gherkin
Feature: assert-pack-files module boundary

Scenario: Importing the module has no observable CLI side effects
  Given assert-pack-files.mjs is imported by another module
  When module evaluation completes
  Then no pack command is executed
  And no filesystem input is consumed
  And no diagnostics are written
  And process.exitCode is unchanged
```

### Green

Add a regression test for the guard established during Phase 1.4.2.

Do not reimplement the guard if the existing implementation already satisfies the test.

### Refactor

Keep the existing portable ESM entry-point guard.

Do not migrate solely to:

```js
if (import.meta.main) {
    ...
}
```

within this subphase.

`import.meta.main` is available in recent Node versions but remains an early-development API, so adopting it would add
compatibility risk without improving this contract.

---

## Cycle 3.2 — Inject Imperative Dependencies

### Red

```gherkin
Feature: Pack-contract CLI orchestration

Scenario: Successful evaluation returns success
  Given manifest loading succeeds
  And the source SVG count is available
  And the packed file list satisfies the contract
  When main executes
  Then the evaluator receives those values exactly once
  And the CLI completes successfully

Scenario: Contract violations return failure
  Given the evaluator reports one or more findings
  When main executes
  Then all findings are rendered
  And the CLI reports failure

Scenario: Independent contract failures are not fail-fast
  Given missing-file and redistribution findings exist
  When main executes
  Then both categories are reported
```

### Green

Prefer:

```js
export const main = async (dependencies = defaultDependencies) => {
    // orchestration only
};
```

with a small dependency object representing only the shell operations that genuinely require effects, for example:

```js
{
    readManifest, readPackFiles, countSourceSvgs, writeDiagnostic;
}
```

The exact names should follow the existing script vocabulary.

`main()` should return an exit-status value or result rather than calling `process.exit()`.

The entry-point wrapper may translate that result to:

```js
process.exitCode = ...
```

to preserve existing external behavior.

### Refactor

Keep `main()` below approximately 25 lines by delegating:

- I/O acquisition;
- pure evaluation;
- diagnostic formatting.

Do not mock `node:fs`, `node:child_process`, or entire ESM modules if simple dependency injection makes those effects
explicit.

---

## Cycle 3.3 — Characterize CLI Input Compatibility

### Red

```gherkin
Feature: Existing pack-file acquisition

Scenario: Existing invocation mode remains supported
  Given pack:check is invoked through the package script
  When assert-pack-files obtains the packed file list
  Then the existing supported input mechanism still works
  And the resulting file names are passed to evaluatePackContents unchanged
```

If both stdin and command-driven acquisition are currently supported, use DDT:

```text
mode           expected
-------------  ------------------------
stdin          preserved
pack command   preserved
```

### Green

Characterize, rather than redesign, the existing acquisition modes.

### Refactor

Normalize external data at one boundary.

The pure evaluator should receive only:

```js
{
    files, manifest, srcSvgCount;
}
```

and know nothing about stdin, package managers, JSON serialization, or the filesystem.

---

## Cycle 3.4 — Keep Diagnostics Deterministic

### Red

```gherkin
Feature: Deterministic diagnostics

Scenario: The same contract violations produce the same diagnostic ordering
  Given identical semantic inputs
  When the evaluator is invoked repeatedly
  Then findings are reported deterministically
```

Use DDT for multiple simultaneous finding categories.

### Green

Preserve the existing grouped diagnostic representation.

If ordering is currently unspecified, establish one at the formatter boundary rather than coupling individual detection
functions to presentation order.

### Refactor

Keep semantic detection separate from textual presentation:

```text
evaluatePackContents()
        |
        v
structured findings
        |
        v
formatPackFindings()
```

Only introduce `formatPackFindings()` if it materially reduces duplication.

---

## Acceptance Criteria

- Importing `assert-pack-files.mjs` has no side effects.
- The existing main-module guard has explicit regression coverage.
- `main()` is a thin imperative shell.
- External effects can be replaced with test doubles without module mocking.
- Pure functions perform no filesystem, process, stdin, or child-process access.
- Existing CLI invocation modes remain compatible.
- All independent findings are reported together.
- `process.exit()` is not used for normal validation failure.
- Any new or modified function remains small and focused.
- No source file exceeds 500 lines.

## Non-Goals

- Do not change pack-contract semantics.
- Do not add new license rules.
- Do not add a `risk-accepted` action.
- Do not change publication contents.
- Do not migrate runtime or package-manager versions here.
- Do not introduce a CLI framework.
- Do not add a mocking dependency.
- Do not adopt experimental module mocking.
- Do not adopt `import.meta.main` merely for novelty.

## Suggested Execution Order

Run immediately after the completed pure-core phase.

---

# Phase 1.4.4 — Integrate the Contract into Package Workflows and Maintainer Documentation

## Goal

Make pack-contract verification a first-class package quality gate and clearly document its ownership and legal
limitations.

## Scope

Modify:

```text
packages/astro-icons/package.json
packages/astro-icons/AGENTS.md
packages/astro-icons/README.md
```

---

## Cycle 4.1 — Add the Package-Local Unit-Test Command

### Red

```gherkin
Feature: Package-local pack-contract tests

Scenario: Maintainers can execute pack-contract tests independently
  Given the astro-icons package
  When test:pack-files is executed
  Then only the pack-contract unit tests are run
  And their exit status is propagated
```

### Green

Add:

```json
"test:pack-files": "node --test scripts/test/assert-pack-files.test.mjs"
```

Wire it into the package's existing quality workflow.

Prefer composition of named scripts rather than repeating the underlying command.

For example, conceptually:

```text
check
├── test:licenses
├── test:pack-files
├── licenses:check
├── build
└── pack:check
```

Preserve the actual repository ordering where ordering has semantic consequences.

### Refactor

Do not duplicate long command strings across scripts.

Do not alter unrelated package scripts.

---

## Cycle 4.2 — Strengthen the DDT Contract Matrix

## Goal

Make the pack-contract tests easier to audit and extend.

### Red

Express matrix-shaped behavior as data rather than nearly identical tests.

Required-file matrix:

```text
README.md
package.json
dist/index.js
dist/index.d.ts
dist/index.js.map
LICENSE
LICENSES/README.md
LICENSES/PHOSPHOR.txt
LICENSES/THIRD_PARTY.md
LICENSES/third-party-icons.json
```

Blocked-path matrix:

```text
AGENTS.md
migration/
scripts/
src/
tsup.config.ts
tsconfig.json
```

Redistribution matrix:

```text
release action  conclusion           expected
--------------  -------------------  --------
include         permitted            pass
include         restricted           fail
include         permission-required  fail
include         undetermined         fail
exclude         any                  no include finding
```

Asset-reference matrix:

```text
licenseFile
permissionFile
policyFile
```

### Green

Use table-driven subtests with descriptive BDD names.

Avoid opaque numeric case identifiers.

### Refactor

Keep each matrix close to the behavior it specifies.

Do not create a generic test-data framework.

---

## Cycle 4.3 — Add High-Value Metamorphic Checks Where Already Semantically True

### Red

Check relationships rather than enumerating additional arbitrary examples.

Candidate properties:

```gherkin
Scenario: Reordering the packed file list does not change the semantic findings
  Given a packed file list
  When the same entries are supplied in a different order
  Then the same semantic contract violations are detected

Scenario: Adding an unrelated permitted file does not remove an existing violation
  Given a file list that violates the contract
  When an unrelated publishable file is added
  Then the existing violation remains
```

### Green

Implement only properties that are already implied by the characterized contract.

Compare semantic findings rather than presentation ordering where appropriate.

### Refactor

Keep these as a handful of explicit transformations.

Do not add a PBT dependency solely for two or three finite invariants.

---

## Cycle 4.4 — Update Maintainer Guidance

Update `AGENTS.md` to state explicitly:

- `releaseDecision.action: "include"` requires `redistribution.conclusion: "permitted"`;
- `pack:check` rejects an included asset that does not satisfy that implication;
- included asset-specific `licenseFile`, `permissionFile`, and `policyFile` references become publishable-artifact
  requirements;
- there is no `risk-accepted` override;
- adding such an exception in the future requires an explicit policy and traceability decision rather than an ad hoc
  enum extension.

Keep legal evidence and software policy conceptually separate:

```text
manifest evidence
        ↓
release decision
        ↓
pack contract
```

The checker enforces recorded policy; it does not determine legal rights.

---

## Cycle 4.5 — Update Consumer-Facing README Documentation

Add a concise statement to the attribution/licensing section, for example:

```text
`pack:check` verifies that the publishable package contains `LICENSE`, the required
`LICENSES/*` notices, and the referenced licensing evidence required by included assets.
```

Also state, if needed in the surrounding wording, that this is a package integrity check and not legal advice.

Detailed workflow remains in `AGENTS.md`.

---

## Acceptance Criteria

- `test:pack-files` exists.
- The package-level `check` workflow executes it.
- Existing quality scripts are composed rather than duplicated.
- Required, blocked, asset-reference, and redistribution matrices use DDT.
- High-value metamorphic relations are tested only where behavior is already established.
- README documentation remains concise.
- `AGENTS.md` contains the detailed maintainer contract.
- No manifest or generated notice changes occur.

## Non-Goals

- Do not run `licenses:update`.
- Do not edit `third-party-icons.json`.
- Do not regenerate `THIRD_PARTY.md`.
- Do not introduce PBT solely for this finite contract.
- Do not add a test framework.
- Do not introduce snapshot testing for the entire CLI output.
- Do not add `risk-accepted`.

## Suggested Execution Order

Run after Phase 1.4.3.

---

# Phase 1.4.5 — Verify the Contract Against the Real Publishable Artifact

## Goal

Prove that the pure contract and CLI shell correctly validate the actual package contents generated by the repository's
publication toolchain.

This should be **machine-verifiable**, not primarily a manual dry-run inspection.

## Scope

Verification from the repository root.

Potentially modify only the existing pack-check wiring if needed to consume the actual packer's machine-readable file
list.

---

## Cycle 5.1 — Make the Real Pack File List the Integration Oracle

### Red

```gherkin
Feature: Real publishable artifact integration

Scenario: The actual dry-run package satisfies the pack contract
  Given the package has been built
  When the package manager computes the files that would be packed
  And that file list is evaluated by assert-pack-files
  Then the contract passes
```

### Green

Prefer machine-readable dry-run output from the package manager actually used by the repository.

For supported pnpm versions, the intended primitive is conceptually:

```powershell
pnpm pack --dry-run --json
```

rather than parsing human-oriented terminal output.

`pnpm pack --dry-run` is specifically intended to verify the files that would enter the package, and `--json` provides
structured output.

If the repository's pinned pnpm version does not support this combination, preserve the existing pack mechanism rather
than upgrading the toolchain inside this subphase.

### Refactor

Have exactly one adapter convert packer output into:

```js
string[]
```

of tarball-relative filenames.

Do not duplicate npm/pnpm JSON parsing inside the pure evaluator.

---

## Cycle 5.2 — Verify Required Legal Artifacts

### Red

```gherkin
Feature: Legal files in the publishable artifact

Scenario: Fixed legal files are present
  Given the actual dry-run package file list
  Then package/LICENSE is present
  And package/LICENSES/README.md is present
  And package/LICENSES/PHOSPHOR.txt is present
  And package/LICENSES/THIRD_PARTY.md is present
  And package/LICENSES/third-party-icons.json is present

Scenario: Included asset references are present
  Given an included asset references an additional licensing file
  Then that referenced file exists in the actual package file list
```

### Green

Use `pack:check` as the machine assertion.

Do not infer publication solely from the source tree or `package.json.files`.

The publishable-artifact file list is the authoritative integration evidence.

npm's package rules automatically include certain files such as `package.json`, README, and LICENSE, while other files
are governed by packaging rules, which further supports checking the actual generated pack list rather than assuming
source-tree presence implies publication.

---

## Cycle 5.3 — Verify Internal Files Remain Excluded

### Red

```gherkin
Feature: Development internals are absent from the publishable artifact

Scenario Outline: Development-only paths are excluded
  Given the real package dry-run
  Then <path> is absent

Examples:
  | path           |
  | migration/     |
  | scripts/       |
  | src/           |
  | tsconfig.json  |
  | tsup.config.ts |
```

### Green

Enforce through the existing blocked-file contract.

### Refactor

Do not reproduce these exclusions in a second integration-specific implementation.

The pure blocked-file rule remains the single semantic source of truth.

---

## Cycle 5.4 — Execute the Verification Ladder

Run in increasing integration scope:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons test:pack-files
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons build
pnpm --filter @ravenhill/astro-icons pack:check
pnpm --filter @ravenhill/astro-icons pack:dry-run
pnpm --filter @ravenhill/astro-icons lint
```

Interpretation:

1. pure/unit tests;
2. metadata consistency;
3. build;
4. real artifact contract;
5. independent dry-run evidence;
6. broader package tooling.

Do **not** encode "`lint` is expected to fail" as acceptance behavior.

Instead:

```text
lint passes
    -> record pass

lint fails only with the previously known publint issue
    -> demonstrate it is pre-existing and record it as a non-blocking external caveat

lint introduces any new failure
    -> block completion
```

---

## Cycle 5.5 — Optional Targeted Mutation Validation

Mutation testing has unusually good leverage on a few rules:

```js
action === "include"
conclusion === "permitted"
blockedPatterns.some(...)
missingFiles.length === 0
svgCount === srcSvgCount
```

If the repository **already has mutation-testing infrastructure**, run it against the pure pack-contract core and verify
that changing these predicates is killed by the tests.

If no mutation-testing framework already exists, defer adding one. Installing and maintaining an additional framework
solely for this small verifier is not justified by this subphase.

A future repository-wide mutation-testing initiative would be a better location.

---

## Testing-Technique Decision

### BDD

**Use extensively.**

It describes the package policy clearly and maps well to traceability.

### DDT

**Use extensively.**

Best fit for:

- fixed required files;
- blocked path prefixes;
- redistribution conclusions;
- referenced license fields.

### Mock Testing

**Use narrowly.**

Mock only imperative boundary functions through dependency injection.

Avoid mocking pure functions or implementation details.

### PBT

**Do not add.**

The core domain is a finite, policy-defined matrix rather than a broad generative input space.

If future path-normalization or arbitrary manifest-validation logic becomes substantially more complex, reconsider a
mature PBT library then.

### Metamorphic Testing

**Use selectively.**

Good candidates are order/permutation and irrelevant-file transformations, provided characterization confirms those
relations.

### Mutation Testing

**High-value but optional.**

Use existing infrastructure if available; otherwise defer.

### Differential Testing

**Not warranted for the contract evaluator itself.**

There is no second independent implementation of the same policy that would constitute a meaningful differential oracle.

Do not compare npm and pnpm merely to manufacture a differential test unless the project genuinely supports publishing
through both.

### Fuzz Testing

**Not warranted in this subphase.**

The evaluator consumes internally controlled manifest structures and package-manager-generated file lists rather than an
exposed untrusted parser surface.

Path traversal, malformed manifests, and hostile input hardening would constitute a separate security-hardening scope.

---

## Acceptance Criteria

- Real package contents are evaluated automatically.
- The integration path uses structured packer output where supported.
- `test:licenses` passes.
- `test:pack-files` passes.
- `licenses:check` passes.
- `build` passes.
- `pack:check` passes.
- Required legal files are present in the real publishable artifact.
- Included asset-specific references are present.
- Development internals are absent.
- Any lint failure is demonstrated to be pre-existing before being accepted as a caveat.
- No contract assertion is weakened merely to make the real pack pass.

## Non-Goals

- Do not publish.
- Do not add a second packaging implementation.
- Do not migrate to pnpm 12.
- Do not move to Node Current merely because it is newer.
- Do not fix unrelated `publint` behavior.
- Do not introduce a mutation-testing dependency solely for this script.
- Do not alter source assets or licensing evidence.

## Suggested Execution Order

Run after package scripts and documentation are wired.

---

# Phase 1.4.6 — Close Traceability and Prove Repository Purity

## Goal

Close Subphase 1.4 and Phase 1 only after implementation, real-artifact verification, and protected-file checks all
succeed.

This combines the original traceability and repository-purity phases because they form a single closure operation.

## Scope

Inspect:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/
```

Modify:

```text
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

---

## Cycle 6.1 — Prove Protected Evidence Is Unchanged

### Red

```gherkin
Feature: Licensing-evidence preservation

Scenario: Pack-contract enforcement does not alter provenance evidence
  Given Subphase 1.4 implementation is complete
  When protected repository paths are compared with the baseline
  Then third-party-icons.json is unchanged
  And THIRD_PARTY.md is unchanged
  And icon-inventory.json is unchanged
  And src is unchanged
```

### Green

Run:

```powershell
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src
```

All must be empty.

### Refactor

If any protected path changed, stop closure and determine whether the change is accidental.

Do not normalize, regenerate, or "clean up" protected evidence as part of this phase.

---

## Cycle 6.2 — Close Subphase 1.4

### Red

```gherkin
Feature: Subphase 1.4 traceability closure

Scenario: The traceability log records implemented artifact enforcement
  Given all Subphase 1.4 acceptance criteria pass
  When its status is closed
  Then the log records the enforced policy
  And the verification commands
  And their outcomes
  And any accepted pre-existing tooling caveat
  And explicitly deferred policy work
```

### Green

Mark the subphase `[DONE]` using the document's established style.

Record concisely:

- pure contract tests;
- CLI-shell characterization;
- required legal files;
- manifest-derived asset references;
- blocked `migration/`;
- `include => permitted`;
- actual pack verification;
- package-script integration;
- relevant documentation changes;
- exact verification results;
- any demonstrated pre-existing `publint` caveat;
- deferred `risk-accepted` process.

Do not describe the checker as legal approval.

---

## Cycle 6.3 — Close Phase 1

### Red

```gherkin
Feature: Phase 1 completion

Scenario: Phase 1 closes only after every subphase is complete
  Given Subphases 1.1 through 1.4 are DONE
  And their acceptance criteria are satisfied
  When the Phase 1 status is updated
  Then Phase 1 is marked complete
  And deferred work remains explicit
```

### Green

Record:

- all four subphases complete;
- end-to-end acceptance criteria satisfied;
- unresolved work remains outside Phase 1.

Explicit deferrals should include, where still applicable:

- a future `risk-accepted` policy;
- future rights-holder permission work;
- unrelated publication-tooling issues.

### Refactor

Avoid rewriting already-closed historical sections.

Traceability should describe evidence, not duplicate implementation documentation.

---

## Cycle 6.4 — Final Repository Purity Check

Run:

```powershell
git status --short
git diff --check
```

Expected in-scope changes should be limited to the implementation actually required by the final design, approximately:

```text
M packages/astro-icons/scripts/assert-pack-files.mjs
A packages/astro-icons/scripts/test/assert-pack-files.test.mjs
M packages/astro-icons/package.json
M packages/astro-icons/AGENTS.md
M packages/astro-icons/README.md
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

If the size/cohesion gate required pure-core extraction, also allow:

```text
A packages/astro-icons/scripts/lib/pack-contract.mjs
```

and corresponding moves/edits.

Do not treat this expected list as an oracle if Git reports an unexplained additional change; investigate it.

---

## Acceptance Criteria

- Protected manifest is unchanged.
- Generated third-party notice is unchanged.
- Inventory is unchanged.
- Source assets are unchanged.
- `git diff --check` passes.
- Subphase 1.4 is `[DONE]`.
- Phase 1 is complete.
- Verification commands and outcomes are recorded.
- Any accepted tooling caveat is explicitly demonstrated as pre-existing.
- Deferred policy work remains explicit.
- No staging, commit, publication, or archival occurs.

## Non-Goals

- Do not regenerate evidence.
- Do not run `licenses:update`.
- Do not archive Phase 1.
- Do not stage.
- Do not commit.
- Do not publish.
- Do not claim legal approval.

## Suggested Execution Order

Run last.

The protected-file check must occur **before** marking the traceability entries complete.

---

# Final Acceptance Matrix

| Area                 | Acceptance criterion                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Characterization     | Previously established runtime, blocked-file, SVG-parity, licensing, and redistribution behavior remains covered |
| Architecture         | Pure contract logic is isolated from I/O                                                                         |
| CLI                  | CLI is a thin imperative shell with testable injected effects                                                    |
| Import safety        | Importing the script performs no CLI work                                                                        |
| Main guard           | Existing ESM entry-point guard has regression coverage                                                           |
| Required notices     | Actual package contains `LICENSE` and required `LICENSES/*` files                                                |
| Asset references     | Included asset-specific licensing references are required in the real artifact                                   |
| Redistribution       | `include` requires `redistribution.conclusion === "permitted"`                                                   |
| Internals            | `migration/`, `scripts/`, `src/`, `tsconfig.json`, and `tsup.config.ts` are rejected                             |
| Diagnostics          | Independent violations are aggregated and reported deterministically                                             |
| DDT                  | Fixed policy matrices use table-driven tests                                                                     |
| Metamorphic testing  | High-value invariant transformations are covered where characterization supports them                            |
| PBT                  | No unnecessary property-testing dependency is introduced                                                         |
| Mocking              | Only imperative shell boundaries are mocked/injected                                                             |
| Mutation testing     | Existing mutation infrastructure is used if available; otherwise deferred                                        |
| Differential testing | Not artificially introduced without an independent equivalent implementation                                     |
| Fuzzing              | Deferred unless an untrusted parsing boundary is introduced                                                      |
| Package scripts      | `test:pack-files` is package-local and incorporated into quality checks                                          |
| Real artifact        | Contract is exercised against the package manager's actual dry-run file list                                     |
| Documentation        | README explains the artifact check; AGENTS documents maintainer policy                                           |
| Verification         | Unit, license, build, pack-contract, and dry-run checks pass                                                     |
| Lint caveat          | Any accepted failure is explicitly proven pre-existing rather than assumed                                       |
| Traceability         | Subphase 1.4 and Phase 1 are closed only after verification                                                      |
| Frozen evidence      | `third-party-icons.json` remains unchanged                                                                       |
| Generated evidence   | `THIRD_PARTY.md` remains unchanged                                                                               |
| Assets/inventory     | `src/` and `icon-inventory.json` remain unchanged                                                                |
| Repository purity    | `git diff --check` passes and only intended files changed                                                        |

---

# Consolidated Non-Goals

- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not run `licenses:update`.
- Do not change asset `releaseDecision` records.
- Do not add `risk-accepted`.
- Do not contact rights holders.
- Do not publish.
- Do not stage or commit.
- Do not archive traceability files.
- Do not modify `migration/icon-inventory.json`.
- Do not modify `src/`.
- Do not weaken SVG parity.
- Do not treat `publint` as legal verification.
- Do not fix unrelated `publint` issues.
- Do not introduce microservices or a CLI framework.
- Do not add dependencies without demonstrated value.
- Do not adopt experimental Node APIs solely because they are newer.
- Do not upgrade to pnpm 12 while it remains a release candidate.
- Do not move to Node Current merely to satisfy a "latest version" policy.

---

# Toolchain Follow-Up Recommendation

Keep runtime/package-manager modernization **outside this behavior-preserving subphase**.

As of August 2026:

- Node 24 is an LTS release suitable for production use; Node 26 remains Current.
- pnpm 11 is the stable production line; pnpm 12 is still a release candidate.
- pnpm 11.20 includes relevant security hardening and is worth evaluating separately if the workspace currently pins an
  older pnpm 11 release.
- pnpm supports structured `pack --dry-run --json` output suitable for artifact-contract integration testing.
- Node's ordinary `node:test` mocking facilities are sufficient for shell test doubles, while ESM module mocking remains
  experimental.

Any runtime or package-manager upgrade should therefore be its own traceable change with its own characterization and CI
verification rather than being hidden inside the licensing-contract refactor.
