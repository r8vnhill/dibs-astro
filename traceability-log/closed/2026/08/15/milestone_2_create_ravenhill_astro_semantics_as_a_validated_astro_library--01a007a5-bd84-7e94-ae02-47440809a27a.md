# Milestone 2 — Create `@ravenhill/astro-semantics` as a validated Astro library

## Goal

Create `E:\teaching\DIBS\projects\astro-semantics` as an independent, reproducible Astro library repository whose first
public API consists exclusively of `Paragraph`.

At the end of this milestone, the project must be able to produce a **self-contained, validated `.tgz` candidate
artifact** that:

- exposes the intended public API;
- preserves the observable paragraph behavior established in Milestone 1;
- does not depend on Tailwind or website-local aliases;
- contains no unexpected runtime dependencies;
- can be installed into and built by a clean Astro consumer;
- is reproducible from a clean checkout;
- is suitable for publication in Milestone 3 without redesigning the package structure.

This milestone **does not publish or configure registry authorization**.

---

# Architectural decisions

## Public API

The initial API is intentionally minimal:

```ts
import { Paragraph } from "@ravenhill/astro-semantics";
```

Only `Paragraph` is public.

Do not expose:

- `P` as a package-level compatibility alias;
- internal helpers;
- source-directory deep imports;
- `Heading`;
- `Enquote`.

The existing website-local `P` compatibility alias belongs to the later website migration, not to the new package API.

## Distribution model

Publish Astro source directly rather than introducing a compilation/bundling layer without a concrete requirement.

Expected source layout:

```text
src/
├── Paragraph.astro
└── index.ts
```

with:

```ts
export { default as Paragraph } from "./Paragraph.astro";
```

and an explicit root export in `package.json`.

Avoid a build tool such as tsup unless later requirements demonstrate that source distribution is insufficient.

## Runtime dependency policy

The package should have:

- `astro` as a peer dependency;
- `astro` as a development dependency for local verification;
- no package runtime dependencies unless a concrete requirement emerges.

Bun, dprint, test libraries, HTML validators, and package-analysis tools remain development-only.

Do not constrain package consumers to Bun merely because Bun is used to develop the repository.

## Styling contract

The package must not expose Tailwind as part of its contract.

The current `my-2` implementation is replaced by package-owned scoped CSS with equivalent **computed vertical spacing**,
using the Milestone 1 browser baseline as the oracle.

Expose one deliberate customization seam:

```css
--ravenhill-paragraph-margin-block
```

with a default equivalent to the existing `0.5rem` spacing.

The compatibility contract is therefore:

```text
current P                  packaged Paragraph

my-2                 →     scoped package CSS
0.5rem computed      =     0.5rem computed
consumer class       =     consumer class
HTML attributes      =     HTML attributes
slot contents        =     slot contents
```

The literal presence of `my-2` is **not** preserved because that class was explicitly characterized in Milestone 1 as a
migration anchor rather than a future package API.

## Version scope

Reserve `0.1.0` as the first package release candidate.

Support Astro 7 only for the initial release:

```text
>=7 <8
```

The compatibility claim must be backed by tests against:

- the minimum supported Astro 7 version;
- the current Astro 7 line used for ordinary development/CI.

Do not broaden the peer range until another version has executable compatibility evidence.

---

# Phase 1 — Bootstrap the repository and package contract

## Goal

Establish the repository, metadata, dependency boundaries, formatting, static analysis, and explicit public-package
shape before implementing behavior.

## Scope

Create:

```text
astro-semantics/
├── src/
│   ├── Paragraph.astro
│   └── index.ts
├── tests/
├── fixtures/
│   └── consumer/
├── scripts/
├── package.json
├── bun.lock
├── tsconfig.json
├── astro.config.mjs
├── dprint.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitlab-ci.yml
```

Do not mechanically copy version pins from `astro-icons`. Resolve and pin the appropriate current stable tool versions
when bootstrapping the repository.

Confirm the intended software license explicitly before the first package candidate; do not assume that the sibling
repository's license is automatically appropriate.

## TDD cycle 1 — Public package surface

### Red

Add package-contract tests asserting that the eventual package exposes exactly:

```text
@ravenhill/astro-semantics
    └── Paragraph
```

and does not declare unintended public subpaths.

Also specify expected package metadata:

- name;
- version;
- license;
- peer dependency;
- explicit `exports`;
- explicit package file allowlist.

### Green

Create `package.json` and `src/index.ts`.

Prefer a package allowlist such as:

```json
{
    "files": [
        "src",
        "README.md",
        "CHANGELOG.md",
        "LICENSE"
    ]
}
```

rather than relying on implicit packaging exclusions.

### Refactor

Keep the export map minimal. Do not add speculative subpath exports for future semantic components.

## TDD cycle 2 — Static repository contract

Configure:

- strict TypeScript;
- `astro check`;
- dprint;
- tests;
- Bun scripts;
- frozen-lockfile CI installation.

Do not weaken strictness to accommodate the component.

### Acceptance criteria

- a clean checkout installs deterministically;
- formatting and static analysis succeed;
- package metadata is explicit;
- the root export is the only package entry point;
- no registry URL, publication credential, or registry-specific CI action exists yet.

---

# Phase 2 — Implement `Paragraph` from the Milestone 1 contract

## Goal

Reimplement the paragraph abstraction without carrying website-specific Tailwind assumptions into the library.

## TDD cycle 1 — Semantic rendering

### Red

Add BDD tests such as:

```text
given Paragraph with phrasing content
when it is rendered
then exactly one p element contains that content
```

Cover:

- exactly one `<p>`;
- empty and non-empty slot contents;
- preservation of text and inline markup;
- no wrapper element.

### Green

Implement the smallest component:

```astro
---
import type { HTMLAttributes } from "astro/types";

type Props = HTMLAttributes<"p">;

const { class: className, ...rest } = Astro.props;
---

<p class={className} {...rest}>
    <slot />
</p>
```

### Refactor

Keep the component source small and declarative.

No general-purpose element wrapper or polymorphic `as` abstraction is justified at this stage.

---

## TDD cycle 2 — Native HTML attribute forwarding

### Red

Use DDT for representative attributes:

| Category             | Examples                         |
| -------------------- | -------------------------------- |
| identity             | `id`, `title`                    |
| language             | `lang`, `dir`                    |
| accessibility        | `aria-label`, `aria-describedby` |
| application metadata | `data-project`, `data-section`   |
| styling              | `class`, `style`                 |

Assert exact forwarding to the resulting `<p>`.

Add compile-time fixtures demonstrating:

- accepted valid paragraph/global attributes;
- at least one incompatible attribute rejected by TypeScript.

### Green

Keep `HTMLAttributes<"p">` as the complete prop basis.

Do not reintroduce:

- `any`;
- broad index signatures;
- hand-maintained HTML attribute unions.

### Refactor

Extract DDT helpers only when they reduce duplication without hiding the behavior being tested.

---

## TDD cycle 3 — Lightweight metamorphic invariants

Use ordinary tests rather than introducing special infrastructure.

For example:

```text
given a rendered Paragraph
when an unrelated data-* attribute is added
then its element type, slot contents, and default spacing remain unchanged
```

and:

```text
given two Paragraph instances with different consumer classes
when they are rendered
then each preserves its own class without changing the other's output
```

These provide useful invariants around forwarding behavior at very low complexity.

---

# Phase 3 — Establish package-owned styling

## Goal

Preserve visual behavior without making Tailwind part of the new library's implementation or dependency graph.

## TDD cycle 1 — Default spacing

### Red

Use the Milestone 1 computed-style baseline:

```text
given Paragraph with default styling
when rendered in a real browser
then its computed block-start and block-end margins equal the established baseline
```

Do **not** assert the presence of `my-2`.

### Green

Implement scoped CSS:

```astro
<style>
    p {
        margin-block: var(--ravenhill-paragraph-margin-block, 0.5rem);
    }
</style>
```

### Refactor

Keep styling local to the component.

Do not introduce:

- Tailwind;
- a package-wide design system;
- generated utility classes;
- CSS-in-JS;
- a runtime styling dependency.

---

## TDD cycle 2 — Public spacing token

### Red

Test:

```text
given a consumer that sets --ravenhill-paragraph-margin-block
when Paragraph is rendered
then its computed vertical margin uses the consumer value
```

Prefer testing the token through normal CSS inheritance, because that demonstrates its usefulness as a theming contract
rather than merely proving that inline styles work.

### Green

Ensure the scoped rule consumes the custom property with the documented fallback.

### Refactor

Document the token as part of the supported API.

Do not expose implementation-specific Astro scope selectors.

## Acceptance criteria

- default computed spacing matches Milestone 1;
- the package contains no Tailwind dependency;
- a project without Tailwind gets correct styling;
- the custom property overrides the default through ordinary CSS cascading/inheritance;
- consumer `class` and `style` remain available.

---

# Phase 4 — Validate HTML semantics and zero-runtime behavior

## Goal

Verify the behavior at the generated-document boundary rather than assuming correctness from the `.astro` source.

## TDD cycle 1 — HTML content model

Create a minimal Astro consumer fixture containing valid paragraph content.

Build it and validate the resulting HTML with `html-validate`.

Required case:

```text
given Paragraph containing phrasing content
when the consumer is built
then its generated HTML conforms to the paragraph content model
```

Retain one deliberately invalid test fixture or validator fixture proving that the chosen validation rule actually
detects a block element placed inside `<p>`.

Do not publish that invalid fixture in the package artifact.

---

## TDD cycle 2 — No client runtime

At the production build boundary, assert that using `Paragraph` alone produces:

- ordinary `<p>` markup;
- no Astro island metadata;
- no hydration directive;
- no component-specific browser JavaScript.

Do not infer this solely from the absence of `client:*` in source.

---

# Phase 5 — Make the packed tarball the canonical consumer boundary

## Goal

Ensure the repository source and the package consumers receive are not accidentally different systems.

This is the most important package-level assurance phase.

## TDD cycle 1 — Pack artifact contract

### Red

Define the exact expected contents of the `.tgz`.

Required categories:

```text
package.json
src/Paragraph.astro
src/index.ts
README.md
CHANGELOG.md
LICENSE
```

Reject:

- tests;
- fixtures;
- CI configuration;
- local tooling configuration;
- repository scripts;
- caches;
- unexpected generated files.

### Green

Configure package allowlisting and implement `package:check`.

Use package-analysis tooling where useful, such as:

- `publint`;
- Are the Types Wrong;
- an explicit project-local tarball file-contract check.

The local file-contract check remains authoritative for this project's intended package contents; external tools
complement it.

### Refactor

Keep package validation pure where practical:

```text
tarball metadata/files
        ↓
package contract
        ↓
structured diagnostics
```

Filesystem/process orchestration should remain a thin outer layer.

---

## TDD cycle 2 — Clean packed consumer

The required sequence is:

```text
source repository
      ↓
pack
      ↓
.tgz
      ↓
fresh consumer fixture
      ↓
install .tgz
      ↓
astro check
      ↓
astro build
      ↓
HTML/browser validation
```

The fixture must **not**:

- use workspace linking;
- use filesystem aliases into `src/`;
- import from the repository checkout;
- install Tailwind;
- rely on DIBS website configuration.

This ensures the tarball itself is the tested unit of distribution.

---

## TDD cycle 3 — Astro 7 compatibility matrix

Run the packed-consumer contract against at least:

1. the minimum supported Astro 7 version;
2. the current supported Astro 7 development line.

Both must consume the same packed candidate.

If the minimum version cannot satisfy the tests, either:

- correct the package while preserving intended behavior; or
- deliberately raise the peer dependency floor.

Do not retain an unsupported version merely because it fits the declared range syntactically.

---

# Phase 6 — Produce a reproducible publication candidate

## Goal

Make Milestone 3 a publication/authorization concern rather than a second packaging implementation.

## Package candidate

Introduce one canonical preparation command, for example:

```text
bun run package:prepare
```

producing:

```text
release/
├── ravenhill-astro-semantics-0.1.0.tgz
├── SHA256SUMS
└── package-manifest.json
```

The manifest should minimally identify:

- schema/version of the manifest format;
- package name;
- package version;
- tarball filename;
- SHA-256 digest.

Do not put environment-specific paths or timestamps into the canonical contract unless they are demonstrably needed.

## TDD cycle — Deterministic candidate validation

### Red

Tests should detect:

- renamed or missing tarball;
- package/version disagreement;
- stale digest;
- unexpected package contents;
- manifest/archive mismatch.

### Green

Implement:

```text
package:prepare
package:check
```

with the second command validating an already-produced candidate without rebuilding it.

### Refactor

Separate:

```text
pure metadata/digest validation
```

from:

```text
filesystem + Bun process orchestration
```

This prepares the same artifact for Milestone 3's registry publication.

## Acceptance criteria

- candidate preparation succeeds from a clean checkout;
- `package:check` validates without repacking;
- consumer tests use the same candidate archive;
- the candidate digest is stable for identical inputs/environment assumptions;
- publication can later reuse the exact `.tgz`.

---

# Phase 7 — CI as package evidence, not publication machinery

## Goal

Make every branch/MR prove that the repository could produce a valid package, while introducing **no external writes**
yet.

## Branch and merge-request pipeline

Required stages should cover:

```text
format
    ↓
static analysis
    ↓
component tests
    ↓
package candidate
    ↓
package contract
    ↓
clean consumer matrix
    ↓
HTML + browser contract
```

Run, at minimum:

- dprint check;
- TypeScript/Astro checks;
- BDD/DDT/metamorphic tests;
- package preparation;
- tarball validation;
- `publint` / package metadata checks;
- clean consumer tests;
- Astro compatibility matrix;
- HTML conformance;
- browser-computed styling contract.

Cache dependencies where useful, but do not make correctness depend on the cache.

Use frozen dependency installation in CI.

## Tags

Do **not** create a separate privileged tag pipeline in this milestone.

Tags may run the same read-only verification pipeline, but:

- no registry credentials are configured;
- no Package Registry writes occur;
- no GitLab Release is created.

Protected-tag authorization, publication idempotence, and release recovery states belong to Milestone 3.

This keeps the current milestone aligned with the project's smallest-scope planning rule.

---

# Testing-strategy disposition

All testing styles from the project guidelines should be considered, but not all should be introduced. The expected
value of a technique must justify its maintenance cost.

| Technique                   | Decision                      | Application in Milestone 2                                                                      |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Example-based / BDD         | **Required**                  | Rendering, slots, CSS defaults, token override, regressions                                     |
| DDT                         | **Required**                  | Native/global/ARIA/data attribute matrix                                                        |
| PBT                         | **Deferred**                  | Little additional value for a thin HTML-forwarding component; reconsider as the library grows   |
| Differential testing        | **Prepared, completed in M4** | M1 baseline is the oracle; direct old-vs-new execution occurs when both implementations coexist |
| Metamorphic testing         | **Required, lightweight**     | Adding unrelated attributes does not change tag/content/spacing                                 |
| Mutation testing            | **Deferred**                  | Too little behavioral logic to justify infrastructure initially                                 |
| Fuzz testing                | **Not justified**             | No parser, decoder, protocol, or hostile byte/input boundary                                    |
| Mock testing                | **Avoid**                     | Render real Astro components and use real packaged consumers                                    |
| Model-based testing         | **Not applicable**            | No behavioral state model                                                                       |
| State-machine testing       | **Deferred to M3**            | Appropriate for registry/release retry and reconciliation states                                |
| Contract testing            | **Required**                  | Public exports, HTML semantics, tarball contents, consumer compatibility                        |
| Snapshot/golden             | **Selective**                 | Small normalized HTML/package manifests only; avoid broad snapshots                             |
| Concurrency testing         | **Deferred to M3**            | Relevant when multiple publication jobs can target one package/version                          |
| Deterministic simulation    | **Not applicable**            | No clock/randomness/concurrent domain behavior                                                  |
| Static analysis             | **Required**                  | Strict TS, `astro check`, package metadata analysis                                             |
| Symbolic execution          | **Not justified**             | No complex branching or arithmetic state space                                                  |
| Formal specification/proof  | **Not justified**             | Native HTML/Astro contracts plus executable tests are sufficient                                |
| Runtime assertions          | **Boundary-only**             | Package manifest/tarball consistency; not inside `Paragraph`                                    |
| Sanitizer-style tooling     | **Not applicable**            | No native-memory boundary                                                                       |
| Cross-version compatibility | **Required**                  | Peer-dependency floor plus current Astro 7 consumer                                             |
| HTML validation             | **Required**                  | Generated paragraph content model                                                               |
| Browser E2E                 | **Required, focused**         | Computed default margin, CSS token, absence of hydration/runtime                                |

### Why PBT and mutation testing are not mandatory here

The guidelines explicitly recommend matching assurance techniques to the problem rather than maximizing technique count.
`Paragraph` deliberately contains almost no domain logic. Adding a property-testing or mutation framework for a handful
of forwarding and styling rules would add substantially more infrastructure than assurance.

If `astro-semantics` later develops:

- prop normalization;
- variants;
- compositional rules;
- semantic dispatch;
- parsing or transformation logic;

those decisions should be revisited.

---

# Milestone acceptance criteria

Milestone 2 is complete when all of the following hold.

### Repository and architecture

- `astro-semantics` is an independent Git repository.
- `Paragraph` is the only public component.
- no website-local import or alias is required;
- no Tailwind dependency exists;
- no unexpected runtime dependency exists;
- Astro is declared as a peer dependency with an evidence-backed Astro 7 range.

### Component contract

- exactly one `<p>` is rendered;
- slot content is preserved;
- props derive from `HTMLAttributes<"p">`;
- native/global/ARIA/data attributes are forwarded;
- consumer classes and styles remain supported;
- no unsafe `any` escape hatch exists;
- default computed vertical spacing matches the Milestone 1 baseline;
- `--ravenhill-paragraph-margin-block` overrides that spacing;
- the component introduces no client hydration or component-specific JavaScript.

### Semantic assurance

- valid consumer output passes HTML validation;
- the validation suite contains evidence that invalid paragraph content is detected;
- the package documentation states that `Paragraph` expects valid paragraph/phrasing content.

### Package contract

- `bun run package:prepare` creates one canonical `.tgz`;
- its contents match an explicit allowlist;
- package metadata and exports pass validation;
- no tests, fixtures, CI files, or development configuration leak into the tarball;
- `package:check` validates the candidate without rebuilding it;
- SHA-256 evidence matches the archive.

### Consumer assurance

- a clean fixture installs **only the `.tgz`**;
- it contains no Tailwind dependency;
- `astro check` succeeds;
- production build succeeds;
- HTML validation succeeds;
- focused browser tests succeed;
- minimum and current supported Astro 7 consumers succeed.

### CI and reproducibility

- the complete assurance pipeline succeeds from a clean checkout;
- dependency installation is lockfile-controlled;
- branch and MR CI produces and validates the same package candidate;
- CI performs no registry or release writes;
- no publication secret is required.

---

# Non-goals / deferred work

This milestone intentionally does **not**:

- publish `@ravenhill/astro-semantics`;
- configure GitLab Package Registry routing;
- create GitLab Releases;
- configure protected publication tags;
- implement publication retry/reconciliation state machines;
- migrate `astro-website`;
- change website aliases;
- remove its local `P.astro`;
- expose `P` from the library;
- extract `Heading` or `Enquote`;
- design a generalized typography system;
- introduce polymorphic semantic components;
- support Astro 5, 6, or 8;
- add React/Vue/Svelte wrappers;
- add Tailwind integration;
- guarantee arbitrary block content inside `Paragraph`.

Registry publication, exact-artifact reuse, authorization, concurrency controls, and release recovery belong to
**Milestone 3**. Differential old-vs-packaged component testing and deletion of the website-local implementation belong
to **Milestone 4**.

---

# Suggested execution order

```text
bootstrap repository
        ↓
define package/export contract
        ↓
implement semantic Paragraph
        ↓
add HTML attribute/type contract
        ↓
replace Tailwind with scoped CSS
        ↓
verify computed spacing + CSS token
        ↓
validate HTML + zero-runtime behavior
        ↓
pack canonical .tgz
        ↓
validate tarball contract
        ↓
install .tgz in clean consumer
        ↓
run Astro 7 compatibility matrix
        ↓
produce SHA-256 + package manifest
        ↓
wire complete read-only CI
```

The minimum useful vertical slice is therefore **not** “`Paragraph.astro` exists in a new repository.” It is:

> **A clean external Astro application can install the exact tarball produced by `astro-semantics`, render `Paragraph`
> with the behavior established in Milestone 1, and build successfully without Tailwind or repository-local knowledge.**

That gives Milestone 3 a much cleaner responsibility: authorize and publish an artifact whose semantics, contents,
compatibility, and reproducibility are already established, rather than mixing package design with deployment concerns.
