## [DONE] Centre Icon And Text In Shared Headings

Apply vertical centring for icon + text pairs in lesson headings through a single global change in `Heading.astro`.

The goal is to improve visual consistency for headings that render an icon next to text, while avoiding mass edits
across lessons. The main risk is multiline heading readability: centred icons usually look better for one-line and short
two-line headings, but very long headings may still read better with top alignment. The implementation should therefore
make `items-center` the default and preserve a local escape hatch for exceptional headings.

## Scope

### Included

- Change the default icon/text alignment in `Heading.astro`.
- Verify the reported Python support-scripts heading.
- Inspect representative short and multiline headings.
- Confirm related heading components remain visually coherent.
- Apply local overrides only if a specific heading demonstrably reads worse.

### Excluded

- Mass-editing every lesson heading.
- Changing heading typography, spacing, icon size, or semantic heading levels.
- Introducing a new public prop unless the global default proves insufficient.
- Refactoring unrelated callout or layout components.

## Steps

1. **Confirm the current `Heading.astro` contract**

   Inspect `Heading.astro` before editing:

   - current wrapper element;
   - default classes;
   - how `class` or `Astro.props` are merged;
   - whether consumers can already override alignment;
   - whether the component is used with icon slots, `Icon` props, or both.

   Outcome: confirm that changing `items-start` to `items-center` is an internal presentation change, not a public API
   change.

2. **Inventory representative usage**

   Use the Discovery inventory as the baseline, but classify examples into a small visual-review matrix:

   - short heading with icon;
   - medium heading with icon;
   - multiline heading with icon;
   - heading without icon;
   - heading inside lesson sections;
   - heading inside layouts or reusable wrappers.

   This keeps validation targeted without requiring a full manual review of every lesson.

3. **Change the default alignment in `Heading.astro`**

   Replace the base container alignment:

   ```diff
   - items-start
   + items-center
   ```

   Keep the existing gap, typography, icon sizing, heading levels, and slot behaviour unchanged.

4. **Verify override behaviour**

   Confirm that a consumer can still pass an override such as:

   ```astro
   <Heading class="items-start" ...>
       ...
   </Heading>
   ```

   Only rely on this if the class merge order means the consumer class wins. If the base class always wins, record that
   as a limitation and avoid introducing a new prop in this cycle unless a real regression appears.

5. **Check related heading components**

   Review wrappers or peer components that render icon + text headings:

   - `CalloutHeading.astro`;
   - any lesson heading wrappers;
   - any layout-level title components.

   Confirm that the new `Heading.astro` default is visually consistent with components that already use centred
   alignment.

6. **Run technical validation**

   Run the narrowest available check first:

   - Astro/type check for the site;
   - then the project’s broader check only if needed.

   The goal is to catch broken class composition, invalid props, or component syntax errors. This change should not
   require test fixture updates unless a snapshot or rendered markup assertion intentionally checks the exact class
   string.

7. **Perform targeted visual inspection**

   Inspect at least:

   - `support-scripts/py.astro`, the reported case;
   - `notes/installation.astro`, because it has dense icon-heading usage;
   - one lesson with a long or wrapping heading;
   - one page using `Heading` without an icon.

   Check desktop and a narrow viewport. The narrow viewport matters because wrapping is the likely regression mode.

8. **Apply local fallback only if needed**

   If a specific multiline heading becomes harder to read, add a local alignment override only for that heading:

   ```astro
   <Heading class="items-start" ...>
       ...
   </Heading>
   ```

   Do not revert the global default unless several representative headings regress.

9. **Document the decision if overrides are needed**

   If any local override is added, leave a short code-adjacent comment only if the reason is not obvious. Prefer no
   comment for straightforward visual overrides.

## Relevant Files

- `astro-website/src/components/semantics/Heading.astro`

  Main change: default icon/text alignment.

- `astro-website/src/components/ui/callouts/CalloutHeading.astro`

  Peer component for comparison because it already uses centred alignment.

- `astro-website/src/pages/notes/scripting/support-scripts/py.astro`

  Reported case and first visual verification target.

- `astro-website/src/pages/notes/installation.astro`

  Dense heading sample for visual regression review.

## Verification

1. **Technical verification**

   - Run the narrowest Astro/type check available.
   - Confirm no invalid component props or class merge errors.
   - Confirm no tests fail because of intentional class-string snapshots.

2. **Visual verification**

   Confirm that:

   - icon and text are vertically centred in short headings;
   - icons do not float too high in medium headings;
   - long headings remain readable when they wrap;
   - headings without icons are unchanged or visually equivalent;
   - callout headings and lesson headings now feel consistent.

3. **Regression verification**

   Confirm that:

   - semantic heading levels are unchanged;
   - icon rendering is unchanged;
   - spacing and typography are unchanged;
   - no educational content changed;
   - no broad lesson edits were introduced.

## Decisions

- Use a global `Heading.astro` default change instead of lesson-by-lesson edits.
- Change only alignment: `items-start` → `items-center`.
- Keep `CalloutHeading.astro` unchanged unless inspection reveals inconsistency.
- Prefer local `class="items-start"` overrides for exceptional multiline cases.
- Defer a public `align="start|center"` prop until there is demonstrated need.

## Further Considerations

1. If several multiline headings need overrides, introduce a dedicated `align="start|center"` prop in a later cycle
   instead of relying on class precedence.

2. If class merge order is unclear, consider a future `cn(...)`/class composition cleanup so component defaults and
   consumer overrides are predictable.

3. If visual regressions are difficult to catch manually, add a small Playwright visual smoke target for representative
   lesson headings in a separate cycle.
