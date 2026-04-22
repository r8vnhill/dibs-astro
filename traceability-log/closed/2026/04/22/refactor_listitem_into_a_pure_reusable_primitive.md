# Refactor `ListItem` into a Pure, Reusable Primitive

## Summary

Refactor `src/components/ui/list/ListItem.astro` so it behaves as a genuine UI primitive rather than a callout-aware special case.

This change should simplify the component structure, remove presentation-specific policy from the primitive, strengthen prop typing through Astro-native `<li>` attributes, and make the icon contract easier to reason about and test. The result should be a smaller, flatter component with a clearer public API, better reuse potential, and less hidden coupling to callout styling.

This refactor intentionally changes one behavior: `iconColor="currentColor"` should now mean literal `currentColor`, not “inherit callout accent if present”. That styling responsibility moves to the parent component that owns the visual context.

## Goals

* Make `ListItem` context-agnostic and reusable across non-callout surfaces.
* Reduce render-tree and expression complexity.
* Improve type-safety for forwarded native `<li>` attributes.
* Keep the component small, predictable, and easy to test.
* Preserve extensibility without introducing premature abstractions.

## Non-Goals

* Do not introduce a variant system, CVA, or a broader styling abstraction.
* Do not add `tailwind-merge` unless the repo already has a reusable primitive-level class-conflict problem.
* Do not generalize icon handling beyond what the current use cases require.
* Do not extract shared test helpers unless multiple suites already need them.

## Design Direction

Treat `ListItem` as a pure primitive:

* layout ownership stays in `ListItem`;
* contextual color policy belongs to the parent surface;
* icons remain optional and decorative by default;
* native `<li>` attributes are forwarded transparently and in a typed way.

That means callout-specific accent behavior must be owned by callout components such as `CalloutShell`, not encoded in `ListItem`.

## Key Changes

### 1. Strengthen the prop model

Replace the current narrow prop type with a composed type that combines Astro-native `<li>` attributes with `ListItem`’s custom props.

Custom props remain intentionally small:

* `icon?: AstroComponentFactory`
* `iconSize?: string`
* `iconColor?: string`
* `class?: string`

Implementation note: use the repo-consistent Astro typing utility for native HTML attributes rather than hard-coding a local approximation.

### 2. Flatten the render tree

Remove the redundant inner layout wrapper and render the horizontal flex layout directly on the `<li>`.

This should leave the component with only the structure it actually needs:

* optional icon wrapper
* content wrapper
* forwarded native attributes on the root `<li>`

That makes the DOM easier to inspect, easier to test structurally, and less likely to accumulate layout noise over time.

### 3. Simplify icon rendering

Replace the current icon branch with a single, straightforward conditional expression.

Requirements:

* no nested parentheses;
* no inline comment blocks inside JSX-like expressions;
* no duplicated wrapper structure.

The icon branch should read as a normal render decision, not as a special-case subtree.

### 4. Remove primitive-level callout color policy

Keep:

* `iconColor = "currentColor"` as the default;
* `.listitem__icon` as the styling hook for parents.

Remove:

* the fallback to `var(--callout-title-color, var(--color-primary, currentColor))`;
* any assumption that the primitive knows about callout CSS variables.

This is the most important architectural change in the refactor: `ListItem` should not embed parent-specific theming rules.

### 5. Keep icon styling minimal and explicit

Build the icon wrapper style from a small object containing only the values the primitive owns:

* `fontSize`
* `color`
* `lineHeight: 1`

Do not preserve the current pixel nudge via `marginTop: "3px"`.

If visual alignment later proves necessary, solve it through a deliberate, reusable layout decision rather than a one-off hard-coded offset.

### 6. Harden flex behavior for real content

Apply `min-w-0 flex-1` to the content wrapper so long slotted content can shrink correctly inside flex layouts.

This protects the primitive against common overflow problems and is a good default for reusable list-like layout components.

### 7. Decide the icon sizing contract explicitly

Keep `<Icon width="1em" height="1em" />` only if that is an intentional internal contract of the icon components used in the repo.

Otherwise:

* drop width and height props;
* size the icon through the wrapper and CSS targeting the nested SVG.

This should be decided deliberately, not left as an implicit assumption.

### 8. Move callout ownership where it belongs

Verify that callout surfaces still style `.listitem__icon` correctly through `CalloutShell.astro` or equivalent parent-owned styling.

If that parent styling is already sufficient, remove the extra override in `Explanation.astro`:

* `bodyClass="[&_.listitem__icon]:text-[var(--callout-title-color)]"`

Only remove it after behavior is verified by test or inspection.

## Public Interface

After the refactor, `ListItem` should expose this contract:

* it accepts native `<li>` attributes in a typed way;
* it forwards those attributes to the root `<li>`;
* it accepts an optional decorative icon;
* `iconColor="currentColor"` means literal `currentColor`;
* it includes `.listitem__icon` as a stable styling hook for parent-owned theming;
* it does not expose variants or extra styling APIs yet.

## Accessibility Contract

Keep the icon decorative by default:

* wrapper remains `aria-hidden="true"` unless a future use case requires semantic icons.

The component should not introduce additional semantics beyond those of a normal `<li>` with slotted content.

## Test Strategy

Reshape `src/components/ui/list/__tests__/ListItem.render.test.ts` around behavioral SSR assertions, not snapshots.

Prefer parsed structural assertions that validate the rendered contract directly.

### Core scenarios

Add or keep BDD-style scenarios for:

* renders a root `<li>` with base layout classes;
* renders without an icon when `icon` is absent;
* renders the icon wrapper and icon component when `icon` is present;
* applies default icon size and literal `currentColor`;
* applies custom icon size and custom icon color;
* forwards native `<li>` attributes such as `id`, `role`, `aria-*`, and `data-*`;
* includes consumer-supplied classes on the root `<li>`;
* renders the content wrapper with `min-w-0 flex-1`;
* does not include the old callout CSS-variable fallback string.

### Integration coverage

Add or adjust callout-focused coverage only if needed to prove the ownership shift:

* callout styling reaches `.listitem__icon` through the parent surface, not through `ListItem`.

Do not duplicate `ListItem`’s own contract assertions inside callout suites.

### DDT and PBT

Use DDT only where it improves readability, especially for:

* default vs custom size/color combinations;
* forwarded native attributes.

Do not add PBT unless this refactor extracts a pure helper for style or class resolution. That is unnecessary unless the implementation naturally evolves in that direction.

## Recommended TDD Sequence

### 1. Lock the new primitive contract in tests

Start by updating `ListItem` render tests to describe the intended post-refactor behavior:

* flat root structure;
* literal `currentColor`;
* native `<li>` attribute forwarding;
* content wrapper shrink behavior.

This makes the intentional contract change explicit before implementation.

### 2. Refactor typing and root structure

Update the prop typing and flatten the DOM structure so the `<li>` directly owns the layout and forwarded attributes.

Keep the change narrow: structure and typing first, without introducing new styling abstractions.

### 3. Simplify the icon branch and style object

Replace the fragile icon render path with the simplified conditional and minimal style object.

At this point, remove the pixel nudge and confirm the tests still describe the desired visual contract.

### 4. Remove callout-specific fallback logic

Delete the callout CSS-variable fallback from `ListItem` and make the default color literal `currentColor`.

Update tests so they assert the new generic behavior rather than the old embedded theming behavior.

### 5. Verify callout integration

Run or add only the minimum callout-focused coverage needed to prove that callout surfaces still color the icon through parent ownership.

If parent-owned styling is sufficient, remove the redundant `Explanation.astro` override.

### 6. Stop at the primitive boundary

Do not expand the scope into variant systems, shared styling helpers, or broader primitive refactors.

## Acceptance Criteria

The refactor is complete when all of the following are true:

* `ListItem` no longer references callout-specific CSS variables;
* the root `<li>` accepts and forwards native attributes in a typed way;
* the DOM structure is flatter and free of redundant wrappers;
* the icon branch is a single straightforward conditional;
* the content wrapper uses `min-w-0 flex-1`;
* the old `marginTop: "3px"` adjustment is gone;
* tests assert the new literal `currentColor` behavior;
* callout surfaces, if applicable, still color `.listitem__icon` through parent-owned styling;
* no new abstraction layer or dependency is introduced without a broader demonstrated need.

## Assumptions and Decision Checks

* The correct direction is to make `ListItem` a pure primitive now, even though this changes an existing tested color contract.
* The repo already has, or should adopt, a consistent Astro-native typing pattern for HTML attributes.
* `.listitem__icon` is a sufficient and stable hook for context-owned styling.
* Width/height props on the icon component should only remain if they reflect an intentional internal icon contract.
* `tailwind-merge` remains out of scope unless the same class-merging problem already exists across several primitives.

## Risks

* Existing callout tests may implicitly depend on `ListItem` owning accent-color behavior.
* Some icon components may rely on the current width/height prop behavior.
* Removing the pixel nudge may surface a real alignment issue that was being masked rather than solved.

Those are good reasons to add focused contract tests, not reasons to keep the current coupling.
