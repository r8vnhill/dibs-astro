# Companion code for the ``support-scripts/nushell`` lesson

## Goal

Make every reusable/file-based artifact shown by `astro-website/src/pages/notes/scripting/support-scripts/nushell.astro` available as runnable companion code in `scripts-nushell`, while preserving the lesson's existing observable behavior and keeping the website and companion repository aligned.

The finished vertical slice should establish this contract:

```text
lesson example
    ↓ identifies
companion source path
    ↓ executes under
supported Nushell version
    ↓ verified by
automated behavioral + artifact tests
```

This is intentionally a **small, cross-repository integration change**, so organize it as short Red-Green-Refactor cycles rather than introducing milestones or a larger architectural layer. That matches the project's planning guidance.

## Compatibility and tooling contract

Before changing the lesson, inspect the version policy already used by `scripts-nushell`.

The implementation should use **Nushell 0.114.1 as the primary validation target**. If the repository currently promises compatibility with earlier versions, explicitly establish `0.114.0` as the minimum for this lesson because `run` first appears there. ([GitHub][1])

Do not introduce a third-party Nushell testing framework for this task. Nushell already provides `std assert`, and its official guidance explicitly recommends standalone test scripts invoked with `nu tests.nu` for projects that are not Nupm packages. ([Nushell][2])

Add static parsing/type validation using `nu-check`; the command is intended to validate and parse Nushell source without executing it. ([Nushell][3])

---

# TDD cycle 1 — Establish runnable companion artifacts

## Goal

A clean checkout of `scripts-nushell` contains executable versions of all four durable artifacts used by the lesson:

```text
support-scripts/
├── check-expected-files.nu
├── check-library-layout.nu
└── album-title-module.nu

resources/
└── album.json
```

Only examples that the lesson presents as reusable files become repository artifacts. One-liners, illustrative invocations, and pseudocode remain embedded in the lesson.

## Scope

Create:

* `support-scripts/check-expected-files.nu`
* `support-scripts/check-library-layout.nu`
* `support-scripts/album-title-module.nu`
* `resources/album.json`
* `tests/support-scripts.nu` or the equivalent location already used by the repository

Do not introduce shared helper modules merely to make the examples easier to test. The companion code exists to represent the pedagogical examples faithfully, so production examples should stay small and direct.

### Red

First add BDD-style executable tests using `std assert`.

The core behavioral cases should be:

```text
given all expected files exist
when check-expected-files.nu executes
then complete is true and missing is empty

given one or more expected files are absent
when check-expected-files.nu executes
then missing contains exactly those expected paths

given a project-layout record
when check-library-layout.nu executes through run
then it produces the record shown by the lesson contract

given the canonical album fixture
when it is piped through album-title
then the result is "Powerslave"
```

Use real temporary directories rather than mocks. Filesystem behavior is the behavior being taught here, so a real scratch filesystem is both simpler and more representative.

### Green

Implement the three Nushell files and JSON fixture.

#### `check-expected-files.nu`

Keep the lesson implementation unchanged:

```nu
let expected_paths = [
    "README.md"
    "LICENSE"
    "CODE_OF_CONDUCT.md"
]

let present_paths = (
    ls
    | get name
    | path basename
)

let missing_paths = (
    $expected_paths
    | where {|expected| $expected not-in $present_paths}
)

{
    project: "powerslave"
    complete: ($missing_paths | is-empty)
    missing: $missing_paths
}
```

Keep this as a standalone script rather than introducing `def main`; the lesson deliberately demonstrates normal script execution with `nu check-expected-files.nu`. Current Nushell documentation explicitly supports passing a script directly to `nu`. ([Nushell][4])

#### `check-library-layout.nu`

Use the exact `def main []: record -> record` transformation taught by the lesson.

Add only the documentation needed by maintainers, for example:

```nu
# Checks a library-layout record as a reusable pipeline stage.
#
# Example: {project_root: "."} | run check-library-layout.nu
def main []: record -> record {
    ...
}
```

Do not wrap it in another module or adapter. `run` is specifically intended to execute a script in an isolated scope as part of a pipeline and invokes a top-level `def main` when one exists. ([Nushell][5])

#### `album-title-module.nu`

Keep the module deliberately minimal:

```nu
# Commands used by the reusable support-scripts lesson.

# Returns the title stored in an album record.
#
# Example: open resources/album.json | album-title
export def album-title []: record -> string {
    get title
}
```

This matches Nushell's current module model, where `export def` exposes commands from a module. ([Nushell][6])

Do not add a fixture-path constant. The command's contract is `record -> string`; coupling it to the filesystem would weaken that abstraction and make the teaching example less composable.

#### `resources/album.json`

Copy the lesson fixture exactly.

Treat this fixture as test data as well as documentation data. It should remain valid standalone JSON and should not contain repository-specific metadata that is absent from the lesson.

### Refactor

After all tests pass:

* extract **test-only** helpers for scratch-directory creation and script invocation if repeated setup becomes noisy;
* keep those helpers private to `tests/support-scripts.nu`;
* do not refactor the pedagogical scripts merely to reduce duplication in tests;
* keep functions/blocks short and comments within the project's approximate 120-column guideline.

## Acceptance criteria

* all three `.nu` files pass `nu-check`;
* `album-title-module.nu` also passes module parsing where appropriate;
* all behavioral tests pass under Nushell 0.114.1;
* `check-expected-files.nu` runs successfully using `nu <file>`;
* `check-library-layout.nu` runs successfully through `run`;
* `album-title` returns `"Powerslave"` for `resources/album.json`;
* no companion artifact has been created for lesson snippets that are intended to remain inline.

---

# TDD cycle 2 — Cover the behavioral state space, not only the happy path

## Goal

The tests demonstrate that the companion examples teach the intended semantics across meaningful boundary cases rather than merely proving that one demonstration happens to work.

## Scope

Extend `tests/support-scripts.nu`; production files should normally remain unchanged during this cycle.

### Red

### Exhaustive DDT for `check-expected-files.nu`

There are only three expected files, so instead of introducing property-based tooling, exhaustively test the **entire finite state space**:

```text
README  LICENSE  CODE_OF_CONDUCT  expected missing
yes     yes      yes              []
yes     yes      no               [CODE_OF_CONDUCT.md]
yes     no       yes              [LICENSE]
yes     no       no               [LICENSE, CODE_OF_CONDUCT.md]
no      yes      yes              [README.md]
no      yes      no               [README.md, CODE_OF_CONDUCT.md]
no      no       yes              [README.md, LICENSE]
no      no       no               [README.md, LICENSE, CODE_OF_CONDUCT.md]
```

This gives stronger coverage than random generation for this particular domain and keeps failures trivial to diagnose.

The output should additionally preserve the expected-file declaration order rather than depending on filesystem enumeration order.

### Metamorphic cases

Add relationships that should remain true under harmless transformations:

```text
given a project with a known missing-file result
when an unrelated file is added
then the missing-file result does not change

given an album record with additional unrelated fields
when album-title executes
then the returned title does not change
```

If the layout checker intentionally ignores unrelated files/directories, apply the same metamorphic relation there.

### Boundary examples

Exercise at least:

* complete expected layout;
* one missing item;
* several missing items;
* all expected items missing;
* unrelated extra files;
* normal album fixture.

Do not invent failure semantics that the lesson does not teach. For example, only add a missing-`title` test if the lesson or existing module contract intentionally defines what that condition means.

### Green

Make only corrections required to satisfy the stated lesson contract.

If a test exposes a genuine discrepancy between the lesson and companion implementation, first determine which representation reflects the intended pedagogy and update both together. Do not silently make the companion "better" than the lesson.

### Refactor

Consolidate the eight layout combinations into data-driven cases rather than eight almost-identical test functions.

Nushell's own testing documentation demonstrates this table-driven style with `std assert`, making it a natural fit without new infrastructure. ([Nushell][2])

## Acceptance criteria

* all eight expected-file presence combinations pass;
* unrelated filesystem entries do not affect results;
* result ordering is deterministic;
* the album-title transformation remains independent of unrelated record fields;
* tests leave no scratch state behind after execution.

---

# TDD cycle 3 — Establish the website ↔ companion contract

## Goal

Every source link in the lesson resolves conceptually to the canonical companion location, and README navigation exposes the new lesson without changing unrelated pedagogical content.

## Scope

Modify:

* `astro-website/src/pages/notes/scripting/support-scripts/nushell.astro`
* `scripts-nushell/README.md`
* existing website tests only where there is already an appropriate source-link or page-rendering test seam

### Red

If the Astro project already has tests around `DibsSourceLink`, add cases asserting that the support-scripts examples produce links for:

```text
scripts-nushell/support-scripts/check-expected-files.nu
scripts-nushell/support-scripts/check-library-layout.nu
```

Test the rendered `href` or observable link target, not private component implementation details.

If there is **no existing suitable test seam**, do not introduce a new framework solely for these two attributes. In that case, make `astro check`/the existing site test suite plus a page-render smoke test the integration gate.

### Green

Change the existing link from:

```astro
repo="nushell-companion"
```

to:

```astro
repo="scripts-nushell"
file="support-scripts/check-expected-files.nu"
```

Add the corresponding source link to the `check-library-layout.nu` block:

```astro
<DibsSourceLink
    slot="source"
    file="support-scripts/check-library-layout.nu"
    repo="scripts-nushell"
/>
```

Do not add links to:

* `album-title-module.nu` unless the displayed module block is itself intended to expose a companion source;
* the raw `album.json` pipeline;
* terminal invocations;
* `each` examples;
* external-command pseudocode.

That keeps the distinction between **runnable companion artifacts** and **inline teaching examples** explicit.

### README

Add the Lesson 5 row to "Lessons at a glance":

```markdown
| **Lesson 5** | Reusable support scripts (structured pipelines) | [Notes](https://dibs.ravenhill.cl/notes/scripting/support-scripts/nushell/) • `support-scripts/check-expected-files.nu`, `support-scripts/check-library-layout.nu`, `support-scripts/album-title-module.nu`, `resources/album.json` |
```

Add the corresponding concise `support-scripts/` bullet under "What you'll find in this repo".

Also make the Nushell compatibility requirement discoverable **once**, at the repository's existing version/tooling documentation point. Do not repeat `>=0.114.0` beside individual files if the README already has a central prerequisites section.

### Refactor

Check terminology across:

* lesson;
* source-link paths;
* companion directories;
* README;
* tests.

Use `support-scripts`, `script`, `module`, `fixture`, and `pipeline stage` consistently.

Do not reorganize unrelated README sections.

## Acceptance criteria

* both file-based lesson examples link to `repo="scripts-nushell"`;
* both paths use `support-scripts/...`;
* the referenced files exist at those exact paths;
* the README exposes Lesson 5 and all four durable artifacts;
* the Astro project passes its existing checks/build/tests;
* the lesson page renders both source links successfully;
* no unrelated prose or page structure changes.

---

# TDD cycle 4 — Make synchronization and clean-checkout verification explicit

## Goal

The companion examples can be verified mechanically from a fresh checkout, and the exact lesson fixture/code relationship is checked without introducing fragile runtime coupling between the two repositories.

## Scope

Add or update the repository's normal verification command/CI configuration if such infrastructure already exists.

### Red

Ensure verification fails when any of these conditions are introduced deliberately:

```text
a Nushell file no longer parses
album.json is malformed
album-title stops returning the title
an expected-file combination returns the wrong set
check-library-layout.nu no longer works through run
```

For the duplicated lesson/companion source text, perform an **implementation-time golden comparison** while both repositories are available in the DIBS workspace:

* `album.json` versus the corresponding `JsonBlock`;
* `check-expected-files.nu` versus its displayed `NushellBlock`;
* the `def main` body versus the corresponding lesson block.

Do not make either repository's CI clone or fetch the other repository merely to enforce byte equality. That would create an unnecessary network and lifecycle dependency between two otherwise independently buildable projects.

Instead, treat:

* companion behavior as the executable contract;
* website links as the integration contract;
* exact displayed-source synchronization as a review-time/golden check.

If the wider DIBS workspace later gains a canonical multi-repository validation job, this comparison is a good candidate to move there.

### Green

Make the companion repository's normal verification path run, at minimum:

```text
nu-check <scripts>
nu-check --as-module support-scripts/album-title-module.nu
nu tests/support-scripts.nu
```

plus its existing repository checks.

For the website, run its established:

```text
format/lint
type or Astro checks
tests
production build
```

rather than adding a support-scripts-specific build path.

### Refactor

Document a single local verification command if the repository already has a task runner or script convention. Avoid creating several parallel ways to execute the same checks.

## Acceptance criteria

* clean checkout verification requires no manually created fixture directories;
* test fixtures are created deterministically and cleaned up;
* all companion code parses under the supported Nushell version;
* the website builds without requiring a local `scripts-nushell` checkout;
* a local two-repository review can prove the intentionally duplicated snippets are synchronized;
* no network request is required by either repository's ordinary test suite.

---

# Testing-style disposition

The project guidelines ask that every testing style be **considered**, not that every technique be forced into every change.  For this task I would make the disposition explicit:

| Technique                        | Decision                       | Application                                                                                                                                                           |
| -------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Example-based / BDD**          | **Use**                        | Primary specification for each script/module behavior                                                                                                                 |
| **Data-driven testing**          | **Use heavily**                | Exhaust all 8 presence/absence states for the three expected files                                                                                                    |
| **Property-based testing**       | **Do not add**                 | The relevant domain is finite and exhaustively enumerable; no mature additional PBT dependency is justified                                                           |
| **Differential testing**         | **Do not add**                 | Comparing the lesson copy with the companion copy would compare essentially the same implementation, not independent implementations                                  |
| **Metamorphic testing**          | **Use**                        | Adding unrelated files or record fields must not change relevant results                                                                                              |
| **Mutation testing**             | **Defer**                      | No mature Nushell-specific mutation infrastructure is warranted for three tiny examples; if introduced later, target predicates such as `not-in` and completion logic |
| **Fuzz testing**                 | **Do not add**                 | The code does not implement an untrusted parser/protocol; JSON parsing is delegated to Nushell                                                                        |
| **Mocks**                        | **Avoid**                      | Use real temporary directories, real JSON, and a real Nushell process                                                                                                 |
| **Model-based testing**          | **Not applicable**             | There is no meaningful behavioral model beyond the finite file-layout matrix                                                                                          |
| **State-machine testing**        | **Not applicable**             | No persistent state machine or stateful protocol                                                                                                                      |
| **Contract testing**             | **Use**                        | Script invocation, pipeline `run`, module input/output, and website source-link contracts                                                                             |
| **Snapshot/golden testing**      | **Use selectively**            | Exact `album.json` and lesson/companion source synchronization                                                                                                        |
| **Concurrency testing**          | **Not applicable**             | No concurrent behavior or shared mutable state                                                                                                                        |
| **Deterministic simulation**     | **Use in lightweight form**    | Controlled scratch-directory fixtures make filesystem state reproducible                                                                                              |
| **Static analysis**              | **Use**                        | `nu-check` for every script/module; official Nushell provides it for parsing/validation. ([Nushell][3])                                                               |
| **Symbolic execution**           | **Not justified**              | No sufficiently complex domain logic                                                                                                                                  |
| **Formal specification / proof** | **Not justified**              | The behavioral contracts are tiny and exhaustively testable                                                                                                           |
| **Runtime assertions**           | **Use in tests, not examples** | `std assert` expresses expected behavior without complicating pedagogical code. ([Nushell][2])                                                                        |
| **Sanitizer-style tooling**      | **Not applicable**             | No memory-unsafe/native code is being introduced                                                                                                                      |
| **Cross-version compatibility**  | **Use narrowly**               | Validate current stable 0.114.1; retain an older lane only if the repository already promises it, with `0.114.0` as the minimum for `run`. ([Nushell][7])             |

## Suggested execution order

1. **Establish the Nushell version contract first.** This determines whether `run` can legitimately be part of the companion.
2. **Write the behavioral tests before companion files.**
3. **Create the four companion artifacts.**
4. **Expand to the complete DDT/metamorphic matrix.**
5. **Wire the Astro source links.**
6. **Update the companion README.**
7. **Add `nu-check` and companion tests to the normal verification path.**
8. **Run the local two-repository golden comparison and the website production build.**

The minimum useful vertical slice is cycles 1–3: a student can click from the lesson to real code and execute it successfully. Cycle 4 makes that relationship durable for maintainers.

## Non-goals / deferred work

Keep these explicitly outside this task:

* turning terminal one-liners into companion files;
* rewriting the pedagogical prose;
* adding a general-purpose Nushell library abstraction;
* converting `scripts-nushell` into a Nupm package solely to obtain a test runner;
* introducing PBT/fuzz/mutation dependencies for these small examples;
* adding a cross-repository network dependency to CI;
* adding a separate README walkthrough for Lesson 5;
* restructuring existing `scaffolding/`, `structured-output/`, or `pipelines/` companions.

This keeps the change focused while giving it substantially stronger assurance than the original manual-verification-heavy plan.

[1]: https://github.com/nushell/nushell/releases "Releases · nushell/nushell · GitHub"
[2]: https://www.nushell.sh/book/testing.html "Testing your Nushell Code | Nushell"
[3]: https://www.nushell.sh/commands/docs/nu-check.html?utm_source=chatgpt.com "nu-check"
[4]: https://www.nushell.sh/book/scripts.html "Scripts | Nushell"
[5]: https://www.nushell.sh/commands/docs/run.html?utm_source=chatgpt.com "run"
[6]: https://www.nushell.sh/book/modules/creating_modules.html "Creating Modules | Nushell"
[7]: https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html?utm_source=chatgpt.com "Nushell 0.114.0"
