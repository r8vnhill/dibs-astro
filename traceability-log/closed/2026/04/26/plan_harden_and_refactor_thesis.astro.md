# [PLAN] Harden and Refactor `Thesis.astro`

## Implementation status

Implemented in this cycle.

- Added a pure `resolveThesisReference(...)` view-model resolver and typed thesis slot list.
- Added required href validation for `Thesis` URLs.
- Replaced DEV-only `institutionUrl` validation with deterministic resolved-field validation.
- Shared external reference link attributes through a typed UI reference constant.
- Added resolver-level tests and expanded structural render tests for the hardened contracts.
- Updated the layer-separation architecture note with the new UI resolver boundary.

## Summary

Refactor `Thesis.astro` in small TDD cycles so runtime policies move out of
the template, invalid reference metadata fails deterministically, and the
component becomes easier to test without changing its public API.

The public API remains stable:

- props: `title`, `url`, `institution`, `institutionUrl`, `author`
- slots: `title`, `institution`, `author`, `description`

This cycle is intentionally limited to `Thesis.astro` and the minimum shared
helpers needed to make the refactor safe. Broader migration of the reference
family is a follow-up, not part of this plan.

## Goals

- Fix the `institutionUrl` contract so slot-backed institution markup is valid.
- Validate `url` at runtime, not only through TypeScript props.
- Remove DEV-only validation for metadata that should fail in build/test.
- Move runtime policy into a pure resolver that can be tested without Astro
  rendering.
- Keep the `.astro` template focused on structure.
- Prepare reusable rendering abstractions without forcing premature migration
  across all reference components.

## Non-goals

- Do not change the public component API.
- Do not migrate `Video`, `WebPage`, `ScholarlyArticle`, or other references in
  this cycle.
- Do not introduce `fast-check` or a new test dependency yet.
- Do not replace the current slot-first content model.
- Do not remove `set:html` unless the slot resolution design changes
  substantially.

## Design Direction

### New resolver

Create a TypeScript resolver close to the component, for example:

```ts
src / components / ui / references / thesis - reference.ts;
```

It should expose:

```ts
export const THESIS_REFERENCE_SLOTS = [
    "title",
    "institution",
    "author",
    "description",
] as const;

export type ThesisReferenceProps = {
    title?: string;
    url: string;
    institution?: string;
    institutionUrl?: string;
    author?: string;
};

export function resolveThesisReference(
    props: ThesisReferenceProps,
    slots: ThesisReferenceSlots,
): ThesisReferenceViewModel {
    // Resolve and validate the component-facing view model.
}
```

The resolver should own:

- title resolution;
- required `url` validation;
- institution resolution;
- `institutionUrl` validation;
- author resolution;
- description forwarding.

The `.astro` component should only:

1. read `Astro.props`;
2. resolve slots;
3. call `resolveThesisReference(...)`;
4. render the resulting view model.

### Required href validation

Add a reusable helper in the UI reference layer:

```ts
export function resolveRequiredHref(fieldName: string, href: string): string {
    const trimmed = href.trim();

    if (trimmed.length === 0) {
        throw new ReferenceContractError(`${fieldName} must be a non-empty URL.`);
    }

    return trimmed;
}
```

Use it as:

```ts
const url = resolveRequiredHref("Thesis `url`", props.url);
```

This should reject:

```ts
url: "";
url: "   ";
```

### Linked inline field validation

Replace the raw-prop validation:

```ts
if (import.meta.env.DEV && institutionUrl && !institution) {
    throw new ReferenceContractError("Thesis `institutionUrl` requires `institution`.");
}
```

with validation based on the resolved field.

The desired contract is:

| Case                                                                | Expected result                                   |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `institution` prop + `institutionUrl`                               | render linked institution                         |
| meaningful `institution` slot + `institutionUrl`                    | valid; slot is caller-authored and URL is ignored |
| `institutionUrl` without prop or meaningful slot                    | throw `ReferenceContractError`                    |
| blank `institution` prop + `institutionUrl` without meaningful slot | throw `ReferenceContractError`                    |

Suggested helper:

```ts
export function assertLinkedFallbackHasLabel(input: {
    componentName: string;
    fieldName: string;
    fallbackHref?: string;
    resolvedField: ResolvedLinkedInlineField;
}): void {
    if (!input.fallbackHref) return;
    if (input.resolvedField.kind !== "missing") return;

    throw new ReferenceContractError(
        `${input.componentName} \`${input.fieldName}Url\` requires a meaningful \`${input.fieldName}\`.`,
    );
}
```

### Shared external link attributes

Move external link attributes to a shared reference UI module only when the first
`Thesis` refactor needs them.

```ts
import type { HTMLAttributes } from "astro/types";

export const EXTERNAL_REFERENCE_LINK_ATTRS = {
    target: "_blank",
    rel: "noopener noreferrer",
    class: "hover:underline underline-offset-2",
} satisfies HTMLAttributes<"a">;
```

This keeps the shared constant type-checked without changing rendering behavior.

### Slot HTML trust boundary

Keep `set:html`, but avoid letting arbitrary strings look equivalent to
rendered slot HTML.

If the field model is touched, introduce a branded or wrapper type:

```ts
export type TrustedSlotHtml = {
    readonly kind: "trusted-slot-html";
    readonly html: string;
};
```

Then slot-backed fields should carry:

```ts
{
    kind: "slot";
    html: TrustedSlotHtml;
}
```

Do not introduce this wrapper if it causes a large cross-component refactor.
It is valuable, but optional for this cycle.

## TDD Cycles

### Cycle 1: Lock the current `institutionUrl` bug

Add focused failing tests before implementation.

#### New tests

```ts
describe("Thesis institution URL contract", () => {
    test("accepts institutionUrl when institution is provided by a meaningful slot", async () => {
        // Render Thesis with:
        // - title prop
        // - url prop
        // - institutionUrl prop
        // - institution slot containing its own anchor/markup
        //
        // Expect:
        // - no ReferenceContractError
        // - slot markup is rendered
        // - institutionUrl is not auto-applied to slot-backed content
    });

    test("rejects institutionUrl when no meaningful institution label exists", async () => {
        // Render Thesis with:
        // - title prop
        // - url prop
        // - institutionUrl prop
        // - no institution prop
        // - no meaningful institution slot
        //
        // Expect ReferenceContractError.
    });
});
```

#### Implementation

- Replace the raw `institutionUrl && !institution` condition.
- Validate against the resolved institution field.
- Remove `import.meta.env.DEV`.

#### Gate

This cycle is complete when:

- slot-backed institution with `institutionUrl` no longer fails;
- unlabeled `institutionUrl` fails in test/build mode;
- no unrelated render output changes are introduced.

### Cycle 2: Add runtime validation for `url`

#### New tests

```ts
describe("Thesis required URL contract", () => {
    test("rejects an empty URL", async () => {
        // url: ""
    });

    test("rejects a whitespace-only URL", async () => {
        // url: "   "
    });

    test("uses the normalized URL for the title link", async () => {
        // url: " https://example.test/thesis "
        // href should be "https://example.test/thesis"
    });
});
```

#### Implementation

- Add `resolveRequiredHref(...)`.
- Use the normalized URL in the title anchor.
- Keep the helper in the UI references layer, not in the domain layer, unless
  URL validation is already a domain-wide reference invariant.

#### Gate

This cycle is complete when:

- invalid `url` values fail before rendering broken anchors;
- valid URLs keep existing observable behavior;
- the title link uses the normalized URL.

### Cycle 3: Extract `resolveThesisReference(...)`

#### New pure tests

Create a dedicated resolver test file, for example:

```ts
src / components / ui / references / __tests__ / thesis - reference.test.ts;
```

BDD-style test cases:

```ts
describe("resolveThesisReference", () => {
    test("resolves title from a meaningful slot before the title prop", () => {
        // ...
    });

    test("falls back to the title prop when the title slot is not meaningful", () => {
        // ...
    });

    test("uses institutionUrl only for prop-backed institution text", () => {
        // ...
    });

    test("keeps slot-backed institution content unwrapped", () => {
        // ...
    });

    test("rejects institutionUrl when no meaningful institution label exists", () => {
        // ...
    });

    test("rejects blank URLs", () => {
        // ...
    });

    test("preserves the description slot as optional block content", () => {
        // ...
    });
});
```

#### Implementation

Move this logic from `Thesis.astro` to the resolver:

- `resolveRequiredTitleField(...)`
- `resolveRequiredHref(...)`
- `resolveLinkedInlineField(...)`
- `resolveInlineField(...)`
- linked fallback validation
- description forwarding

#### Gate

This cycle is complete when:

- resolver tests cover the policy matrix;
- existing render tests still pass;
- `Thesis.astro` has no direct contract validation except calling the resolver.

### Cycle 4: Thin the `.astro` component

#### Implementation target

`Thesis.astro` frontmatter should look approximately like this:

```ts
const slots = await resolveOptionalSlots(Astro.slots, THESIS_REFERENCE_SLOTS);
const reference = resolveThesisReference(Astro.props, slots);
```

The template should consume:

```ts
reference.title;
reference.url;
reference.institution;
reference.author;
reference.description;
```

Do not extract render subcomponents yet unless the template remains hard to read
after the resolver extraction.

#### Render tests

Keep structural SSR tests with Cheerio for:

- title link text;
- title link `href`;
- title link external attributes;
- institution metadata label and content;
- author metadata label and content;
- description rendering;
- metadata order.

Avoid full HTML snapshots.

#### Gate

This cycle is complete when:

- `Thesis.astro` is visibly thinner;
- render tests assert public HTML behavior;
- policy tests live mostly at resolver level.

### Cycle 5: Share external link attributes

#### New tests

Add or update render assertions so external links consistently include:

```html
target="_blank"
rel="noopener noreferrer"
```

#### Implementation

- Add `EXTERNAL_REFERENCE_LINK_ATTRS`.
- Type it with `satisfies HTMLAttributes<"a">`.
- Use it in `Thesis.astro`.

#### Gate

This cycle is complete when:

- title link and prop-backed institution link use the shared attrs;
- no duplicated local `externalLinkAttrs` remains in `Thesis.astro`;
- `astro check`/TypeScript validation accepts the shared object.

### Cycle 6: Extract render helpers only if duplication remains

This cycle is conditional.

Do this only if the branch pattern is still repeated enough to justify the
abstraction, or if another reference component is migrated immediately after
`Thesis`.

Potential components:

```txt
ReferenceInlineContent.astro
ReferenceMetaField.astro
ReferenceDescription.astro
```

Suggested extraction order:

1. `ReferenceInlineContent.astro`
2. `ReferenceMetaField.astro`
3. `ReferenceDescription.astro`, only if it removes meaningful duplication

Do not introduce these components just because they are theoretically reusable.
They should make `Thesis.astro` simpler now or make the next component migration
substantially safer.

#### Gate

This cycle is complete when:

- extracted components reduce branching in `Thesis.astro`;
- render tests still cover the same observable behavior;
- no generic abstraction requires special thesis-only exceptions.

### Cycle 7: Clean up test structure

#### DDT candidates

Use `test.each` for repeated slot/prop precedence cases:

```ts
describe.each([
    ["title", "title prop", "title slot"],
    ["institution", "institution prop", "institution slot"],
    ["author", "author prop", "author slot"],
])("%s precedence", (fieldName, propValue, slotValue) => {
    test("prefers meaningful slot content over prop fallback", () => {
        // ...
    });

    test("falls back to prop content when the slot is not meaningful", () => {
        // ...
    });
});
```

Keep explicit tests for special cases:

- `title` is required;
- `url` is required;
- `institutionUrl` is only meaningful with prop-backed institution text;
- slot-backed institution content is not wrapped.

#### PBT decision

Do not add PBT in this cycle.

Reconsider `fast-check` later only if shared normalization helpers become a
small library with invariants such as:

- blank-like input always resolves to missing;
- non-blank normalized text is stable;
- whitespace normalization is idempotent;
- HTML entity whitespace is handled consistently.

## Test Plan

Run the narrow tests first:

```sh
pnpm exec vitest run src/components/ui/references/__tests__/thesis-reference.test.ts
pnpm exec vitest run src/components/ui/references/__tests__/Thesis.render.test.ts
pnpm exec vitest run src/components/ui/references/__tests__/reference-content.test.ts
```

If shared reference helpers or link attrs are touched, also run:

```sh
pnpm exec vitest run src/components/ui/references/__tests__/Video.render.test.ts
pnpm exec vitest run src/components/ui/references/__tests__/WebPage.render.test.ts
pnpm exec vitest run src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts
```

Final project gates:

```sh
pnpm test:unit
pnpm test:astro
pnpm exec tsc --noEmit
pnpm run check
```

## Acceptance Criteria

- `institutionUrl` with meaningful slot-backed `institution` is valid.
- `institutionUrl` without any meaningful institution label throws
  `ReferenceContractError`.
- `url: ""` and `url: "   "` throw `ReferenceContractError`.
- Valid `url` values are trimmed before rendering.
- Slots still take precedence over prop fallbacks.
- Slot-backed institution content is not auto-wrapped with `institutionUrl`.
- Prop-backed institution content is linked when `institutionUrl` is provided.
- External reference links use the shared external-link attributes.
- `Thesis.astro` no longer owns resolver policy directly.
- Full HTML snapshots are avoided; tests use structural assertions.
- Observable valid HTML remains stable except for insignificant whitespace.

## Assumptions

- Invalid metadata should fail in tests/build, not only during development.
- Slot-rendered HTML is trusted because it comes from caller-authored Astro
  markup, but the trust boundary should remain explicit.
- The resolver belongs near the UI reference components unless the same
  invariant is later needed by non-UI bibliography code.
- This cycle improves `Thesis.astro` first; other reference components migrate
  later, one at a time.

## Follow-up Work

After this plan lands, consider a second refactor cycle for the reference family:

1. Move `Video`, `WebPage`, and `ScholarlyArticle` to the same resolver pattern.
2. Generalize repeated metadata rendering only after two or more components share
   the same shape.
3. Add PBT for shared normalization helpers if they become central enough.
4. Review whether `$domain/reference-content` is truly domain logic or whether
   rendered slot/content resolution should live entirely in the UI reference
   layer.
