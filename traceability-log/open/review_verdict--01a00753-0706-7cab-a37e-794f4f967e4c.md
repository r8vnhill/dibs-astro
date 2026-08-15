## Review verdict

`P.astro` is a good extraction candidate because it is small and conceptually reusable, but I would **not move the
current file verbatim into a package**. The current implementation has three issues that become more important at a
library boundary: it weakens type safety with `any`, embeds a site-specific Tailwind assumption, and has no direct
semantic/render contract tests. There is also evidence that the abstraction can obscure HTML content-model constraints.

The broader repository is already on **Astro 7.2.2, which is the current stable Astro release**, so there is no
framework upgrade to perform as part of this work. The plan below follows the project's emphasis on explicit contracts,
TDD, behavior preservation, package reproducibility, and deliberate testing-technique selection.

# Code review

### P1 — The prop type discards Astro's native HTML type safety

The main implementation concern is:

```ts
const { class: className = "", ...rest } = Astro.props as Props & Record<string, any>;
```

`Props` only declares `class`, and the `Record<string, any>` intersection effectively permits arbitrary properties. That
undermines the repository's `astro/tsconfigs/strictest` configuration precisely at the component boundary.

Astro provides `HTMLAttributes` specifically for components that mirror native HTML elements. A paragraph wrapper should
therefore derive its public contract from `HTMLAttributes<"p">`, not duplicate or weaken the HTML API. ([Astro Docs][1])

The target should be approximately:

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

That change is behavior-preserving at the HTML-attribute level while making unsupported attributes visible to
`astro check`.

### P1 — `my-2` is a hidden Tailwind dependency

The component currently hardcodes:

```astro
<p class:list={["my-2", className]} {...rest}>
```

That is safe while `P.astro` lives under the website's `src/`, because the site's Tailwind configuration explicitly
scans that source tree. The global stylesheet uses `source(none)` followed by a local `@source ".."`, so a class
appearing only inside a separately installed package is no longer guaranteed to participate in the website's utility
generation.

I would **not make Tailwind a peer dependency merely for one margin utility**. Astro components support automatically
scoped CSS, including low-specificity element selectors, which gives the library a self-contained styling boundary.
([Astro Docs][2])

A better long-term contract is:

```astro
<p class={className} {...rest}>
    <slot />
</p>

<style>
    p {
        margin-block: var(--ravenhill-paragraph-margin-block, 0.5rem);
    }
</style>
```

The CSS custom property provides a deliberate theme seam while keeping Tailwind out of the package API.

Because `my-2` is currently observable styling, do **not** assume `0.5rem` is equivalent. First capture the current
computed margin in a browser fixture, then reproduce that value through the library token. That turns the styling
migration into an evidence-backed behavior change rather than an approximation.

### P1 — There is no direct contract test for `P`

The `semantics` directory contains only `Enquote.astro`, `Heading.astro`, `P.astro`, and its barrel; there is no
colocated `__tests__` suite for these components.

The repository already has suitable infrastructure: Astro render tests run under a Node environment, and existing
components use a reusable wrapper around Astro's Container API plus JSDOM.

That means the extraction should begin with **characterization tests in the website**, not with copying the file into
another repository.

One caveat: Astro still documents the Container API as experimental. It is suitable for focused render tests, but I
would supplement it with a real fixture-app build as the package-level oracle instead of making all package assurance
depend on the experimental API. ([Astro Docs][3])

### P1 — The abstraction can hide invalid paragraph contents

This is the most interesting semantic issue.

The HTML Standard restricts a `<p>` element to **phrasing content**. A `<ul>` or `<ol>` is not permitted inside it; HTML
parsing closes the paragraph around such block content. ([HTML Living Standard][4])

The repository has already had at least one `P` usage wrapping the site's `List` component:

```astro
<P>
    Hoy aprenderemos a:
    <List>
        ...
    </List>
</P>
```

The site's `List` renders either `<ul>` or `<ol>`.

This is important because `P` visually looks like an arbitrary content wrapper, while the native `<p>` name makes the
HTML restriction more obvious.

Astro cannot currently express “default slot must contain only phrasing content” through ordinary TypeScript props, so I
would handle this at three levels:

1. make `Paragraph` the canonical public name;
2. document the phrasing-content contract explicitly;
3. validate built fixture HTML with an HTML content-model checker.

`html-validate` is a reasonable dev-only dependency here: version 11.6.2 was published recently, and its built-in
`element-permitted-content` rule is specifically designed to check HTML content models. ([npm][5])

### P2 — `P` is too terse for a new public library API

Inside a local DSL-like component set, `P` is understandable. For a separately versioned package, I would expose:

```ts
import { Paragraph } from "@ravenhill/astro-semantics";
```

rather than making `P` the canonical public name.

The website can initially retain its existing source syntax through its barrel:

```ts
export { Paragraph as P } from "@ravenhill/astro-semantics";
```

This lets the extraction proceed independently from a site-wide naming migration. The current barrel already centralizes
`P`, `Heading`, and `Enquote`, so it is a natural compatibility seam.

---

# Target library design

I recommend a new repository:

```text
r8vnhill/astro-semantics
```

with package:

```text
@ravenhill/astro-semantics
```

and initially **one public component**:

```text
Paragraph
```

Do not move `Heading` or `Enquote` merely because they currently share a directory. `Heading` already depends on
website-local types, utilities, and `FilledIcon`, making its extraction a different architectural problem.

Astro officially supports publishing `.astro`, `.ts`, and CSS source directly without a compilation step. For this
package, I would therefore prefer a **source package**, not tsup or a custom Astro compiler pipeline. ([Astro Docs][6])

A compact repository could look like:

```text
astro-semantics/
├── src/
│   ├── Paragraph.astro
│   └── index.ts
├── tests/
│   ├── Paragraph.render.test.ts
│   ├── fixtures/
│   │   └── consumer/
│   └── package-contract.test.ts
├── scripts/
│   ├── assert-pack-files.mjs
│   └── check-packed-consumer.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── html-validate.config.mjs
├── CHANGELOG.md
├── README.md
├── LICENSE
└── .gitlab-ci.yml
```

For `0.1.0`, I would support **Astro 7 only**, e.g. `>=7.0.0 <8`, unless there is an identified Astro 5/6 consumer.
Astro 7 is the maintained current generation, while the Astro documentation now describes the v6 snapshot as
unmaintained. ([Astro Docs][7]) Broad compatibility should be an evidence-backed promise, not an optimistic peer range.

The new repository should use current pnpm 11.x rather than copying the website's `11.8.0`; the current pnpm release is
`11.22.0`. The DIBS-site package-manager upgrade can remain a separate maintenance change.

# Milestone 1 — Establish the paragraph contract before extraction [DONE]

### Goal

Produce executable evidence of everything the current component must preserve, and remove semantically invalid usages
before changing repository boundaries.

### Scope

Website:

```text
src/components/semantics/P.astro
src/components/semantics/index.ts
src/components/semantics/__tests__/
relevant P consumers
vitest.astro.config.ts
```

### TDD cycles

**Cycle 1 — Native paragraph attributes**

Red:

```text
given the Paragraph component
when native paragraph/global attributes are provided
then they are forwarded to the rendered p element
```

Use DDT for `id`, `title`, `lang`, `dir`, `aria-*`, `data-*`, `style`, and consumer classes.

Add type fixtures showing that valid `<p>` attributes compile and a paragraph-inapplicable attribute does not.

Green: replace `Record<string, any>` with `HTMLAttributes<"p">`.

Refactor: eliminate the unnecessary empty-string default and keep the prop surface identical to native HTML wherever
possible.

**Cycle 2 — Rendering contract**

Characterize:

- exactly one `<p>`;
- default slot preservation;
- consumer class forwarding;
- existing default vertical spacing;
- no client-side JavaScript;
- arbitrary forwarded global attributes.

Astro components render to HTML without client hydration by default, so this component should remain zero-runtime.
([Astro Docs][8])

**Cycle 3 — HTML semantics**

Audit all `P` consumers for block children such as lists, code blocks, sections, figures, tables, or nested paragraphs.

For every such case, restructure:

```astro
<P>Hoy aprenderemos a:</P>
<List>...</List>
```

rather than placing `List` inside `P`.

Add built-fixture HTML validation with `html-validate:recommended`, especially `element-permitted-content`.
([HTML-validate][9])

### Acceptance criteria

- `P` no longer contains an `any` escape hatch.
- native paragraph attributes remain accepted and forwarded;
- unsupported prop usage is rejected by type checking;
- all checked `P` consumers generate conforming paragraph structure;
- current visual spacing is captured as an explicit baseline;
- existing site checks remain green.

### Non-goals

- extracting `Heading`;
- redesigning typography globally;
- renaming every `<P>` use immediately.

---

# Milestone 2 — Create `@ravenhill/astro-semantics` [DONE]

### Goal

Publish a framework-native, Tailwind-independent Astro component package with a deliberately small API.

### Scope

New `astro-semantics` repository and its package, CI, documentation, fixtures, and release metadata.

### TDD cycles

**Cycle 1 — Public component contract**

Red:

```text
given Paragraph
when it renders ordinary phrasing content
then it produces one semantic p element and preserves its content
```

Green:

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

Refactor: expose the component publicly as `Paragraph`.

**Cycle 2 — Styling independence**

Red:

```text
given a consumer with no Tailwind installation
when Paragraph is rendered
then its default vertical rhythm matches the documented package default
```

Green: implement scoped CSS and an explicit customization token such as:

```css
--ravenhill-paragraph-margin-block
```

Astro's scoped styles are automatically isolated from unrelated page content, so no CSS framework peer dependency is
required. ([Astro Docs][2])

Refactor: keep all website-specific design tokens out of the package.

**Cycle 3 — Packed consumer**

Pack the package first, install the resulting `.tgz` into a clean Astro fixture, and build that fixture.

The test must consume the **packed artifact**, never the repository source through aliases or workspace links.

Astro explicitly supports distributing `.astro` source directly, so the package artifact itself should remain simple.
([Astro Docs][6])

### Acceptance criteria

- `@ravenhill/astro-semantics` contains only intended source, README, changelog, and license files;
- `Paragraph` imports successfully from the packed artifact;
- a clean Astro consumer builds without Tailwind;
- `astro check` passes;
- HTML fixture validation passes;
- no package runtime dependency other than the Astro peer is introduced;
- `Paragraph` emits no client JavaScript.

### Non-goals

- React/Vue/Svelte wrappers;
- generalized typography system;
- polymorphic `as=` rendering;
- automatic runtime slot validation.

Those would add abstraction without a demonstrated requirement.

---

# Milestone 3 — Establish a correct GitLab registry topology

This is a **required architectural step**, not release polish.

The DIBS website currently contains:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/projects/85350050/packages/npm/
```

That maps the entire `@ravenhill` scope to the `astro-icons` project registry.

npm registry selection is scope-based, while GitLab supports project-, group-, and instance-level npm endpoints. A
second `@ravenhill/*` package in another project cannot be cleanly reached by assigning the same scope to another
project endpoint at the same time. ([GitLab Docs][10])

### Recommended topology

Create a dedicated package-registry project, for example:

```text
r8vnhill/npm-packages
```

or, preferably if a `ravenhill` GitLab group is available:

```text
ravenhill/npm-packages
```

Then make it the canonical registry for all `@ravenhill/*` npm packages.

Source remains modular:

```text
astro-icons       ─┐
astro-semantics    ├──> canonical @ravenhill npm registry project
future libraries  ─┘
```

This keeps source repositories independent while giving the npm scope a single registry endpoint.

GitLab supports CI job tokens for package publication, and cross-project job-token access should be constrained with the
registry project's allowlist. ([GitLab Docs][10]) Package protection rules can additionally restrict publication of the
namespace to Maintainers or another selected role. ([GitLab Docs][11])

### Release contract

For `astro-semantics`:

1. branch/MR pipelines only test and package;
2. protected version tags authorize publication;
3. package once;
4. validate the `.tgz`;
5. publish that exact artifact;
6. install the published version into a clean consumer;
7. only then consider the release complete.

The recently strengthened `astro-icons` release architecture is a good precedent for artifact-first validation rather
than rebuilding during publication.

### Acceptance criteria

- one canonical registry endpoint resolves both `@ravenhill/astro-icons` and `@ravenhill/astro-semantics`;
- publishing credentials exist only inside CI;
- source-project CI tokens are explicitly authorized by the registry project;
- branch pipelines cannot publish;
- duplicate version publication is rejected;
- the exact packed candidate is the artifact published to GitLab;
- an isolated post-publication consumer installs the published version successfully.

### Deferred

Migrating every existing `@ravenhill` package to the central registry can be a separate rollout, but the registry
endpoint must be solved before the website depends on packages stored in multiple project registries.

I would **not** solve this by giving every library a new npm scope. That would optimize around the current registry
configuration at the expense of a coherent package taxonomy.

---

# Milestone 4 — Migrate DIBS to the published library

### Goal

Make the website consume the same artifact other projects would consume, then remove its local implementation.

### TDD cycles

**Cycle 1 — Compatibility seam**

After publishing `0.1.0`, add:

```json
"@ravenhill/astro-semantics": "0.1.0"
```

Then change the local barrel to:

```ts
export { Paragraph as P } from "@ravenhill/astro-semantics";
```

Delete `P.astro`.

This keeps all existing `$semantics` consumers operational while moving ownership to the package.

**Cycle 2 — Differential migration**

During the migration branch, retain an old `P` fixture and render both implementations using identical:

- slots;
- global attributes;
- consumer classes;
- language/direction attributes;
- styling environment.

Compare normalized DOM and browser-computed spacing.

Once equivalence is demonstrated, remove the old fixture.

**Cycle 3 — Full website assurance**

Run the existing website assurance stack:

- Astro/type checks;
- unit tests;
- Astro render tests;
- Playwright tests;
- container HTTP contract;
- container browser contract;
- production build.

The current GitLab pipeline already separates these concerns, so the package migration should pass through the same
evidence chain rather than adding a special deployment path.

### Acceptance criteria

- no local `P.astro` remains;
- the website imports the published package version, not a workspace path;
- rendering and spacing remain equivalent for existing content;
- all invalid paragraph/list combinations have been corrected;
- the full DIBS pipeline remains green;
- a clean checkout can authenticate to and install the package registry dependency in CI.

---

# Testing-technique disposition

Considering **all** testing techniques listed in the project guidelines:

| Technique                    | Decision                           | Application                                                                           |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Example-based / BDD          | **Required**                       | HTML element, slot, classes, forwarded attributes, styling                            |
| DDT                          | **Required**                       | Matrix of native/global attributes and class combinations                             |
| PBT                          | **Useful but secondary**           | Generate safe `data-*`/`aria-*` values and ensure forwarding/escaping invariants      |
| Differential testing         | **Required for migration**         | Old site component vs packaged `Paragraph`, including computed style                  |
| Metamorphic testing          | **Useful, low priority**           | Adding an unrelated global attribute must not alter content/tag/style                 |
| Mutation testing             | **Optional**                       | Very low expected value for a ~10-line component; reconsider when package logic grows |
| Fuzz testing                 | **Not justified initially**        | No parser, protocol, or complex external-input boundary                               |
| Mock testing                 | **Avoid**                          | Render real Astro components; no collaborators need mocking                           |
| Model-based testing          | **Not applicable to component**    | No state model                                                                        |
| State-machine testing        | **Useful for publication only**    | Retry/idempotence states if adopting the `astro-icons` release-asset model            |
| Contract testing             | **Required**                       | Public exports, tarball contents, peer range, clean consumer                          |
| Snapshot/golden              | **Selective**                      | Built fixture HTML only; avoid large implementation-sensitive snapshots               |
| Concurrency testing          | **Publication concern**            | Protect simultaneous tag/package writers using CI serialization                       |
| Deterministic simulation     | **Not applicable**                 | No nondeterminism                                                                     |
| Static analysis              | **Required**                       | `astro check`, strict TypeScript, package/export validation                           |
| Symbolic execution           | **Not justified**                  | No algorithmic state space                                                            |
| Formal specification / proof | **Not justified**                  | HTML Standard + executable conformance tests are sufficient                           |
| Runtime assertions           | **Avoid in component**             | Invalid slot content cannot be reliably typed or cheaply inspected at runtime         |
| Sanitizer-style tooling      | **Not applicable**                 | No native-memory/runtime boundary                                                     |
| Cross-version compatibility  | **Required**                       | Minimum supported Astro 7 and latest Astro 7                                          |
| HTML conformance validation  | **Required**                       | Built fixture validation, particularly paragraph content models                       |
| Browser E2E                  | **Required at migration boundary** | Computed margins and real DOM behavior                                                |

This deliberately **does not force every testing style into the implementation**. The guidelines call for considering
them all and selecting those whose assurance value exceeds their complexity.

## Suggested execution order

The minimum safe vertical slice is:

```text
characterize current P
        ↓
repair semantic misuse
        ↓
create astro-semantics package
        ↓
pack + clean-consumer test
        ↓
solve @ravenhill registry routing
        ↓
publish 0.1.0
        ↓
consume 0.1.0 from DIBS
        ↓
differential + full-site verification
        ↓
delete local P.astro
```

I would treat **typed HTML props, Tailwind independence, direct characterization tests, semantic-content auditing, and
the registry-scope topology as required before the extraction is considered complete**. The `Paragraph` rename, PBT,
release-state modeling, and later migration of `Heading`/`Enquote` are valuable but should not expand the first package
beyond a focused `0.1.0`.

[1]: https://docs.astro.build/en/guides/typescript/?utm_source=chatgpt.com "TypeScript - Astro Docs"
[2]: https://docs.astro.build/en/guides/styling/?utm_source=chatgpt.com "Styles and CSS - Astro Docs"
[3]: https://docs.astro.build/en/reference/container-reference/?utm_source=chatgpt.com "Astro Container API (experimental) | Docs"
[4]: https://html.spec.whatwg.org/multipage/grouping-content.html?utm_source=chatgpt.com "4.4.1 The p element"
[5]: https://www.npmjs.com/package/html-validate?utm_source=chatgpt.com "html-validate"
[6]: https://docs.astro.build/en/guides/integrations/?utm_source=chatgpt.com "Working with integrations - Astro Docs"
[7]: https://docs.astro.build/en/guides/upgrade-to/v7/?utm_source=chatgpt.com "Upgrade to Astro v7 | Docs"
[8]: https://docs.astro.build/en/basics/astro-components/?utm_source=chatgpt.com "Components - Astro Docs"
[9]: https://html-validate.org/rules/?utm_source=chatgpt.com "Available rules - HTML-validate"
[10]: https://docs.gitlab.com/user/packages/npm_registry/?utm_source=chatgpt.com "npm packages in the package registry"
[11]: https://docs.gitlab.com/user/packages/package_registry/package_protection_rules/?utm_source=chatgpt.com "Protected packages"
