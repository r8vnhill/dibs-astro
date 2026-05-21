# [PLAN] Comparative `support-scripts` Lesson With Python

Create an independent Spanish technical comparative lesson at
`astro-website/src/pages/notes/scripting/support-scripts/py.astro`, assuming the audience has already studied the
Kotlin-based `support-scripts` lesson.

The implementation must add a discoverable link from the base lesson through `LinksLayout` and `PythonLink`, while
leaving the existing pedagogical content in `index.astro` unchanged.

## Current Status

The comparative lesson file already exists at `astro-website/src/pages/notes/scripting/support-scripts/py.astro`,
and `PythonLink` is already exported. The base lesson still needs the comparative link block, the lesson still has a
placeholder description, and the bibliography work is still pending.

## Scope

### Included

- Create `support-scripts/py.astro` as a new comparative lesson.
- Compare Python scripting explicitly against the existing Kotlin lesson.
- Use only Python examples in the comparative lesson.
- Add or update the final comparative-link block in `support-scripts/index.astro`.
- Reuse the existing `PythonLink` component.

### Excluded

- Rewriting the Kotlin base lesson.
- Adding Kotlin snippets to the Python comparative lesson.
- Creating a new language-link component.
- Changing unrelated lessons in the scripting unit.

## Implementation Steps

1. **Inspect the local lesson conventions** _(completed)_

   Review:

   - `astro-website/src/pages/notes/scripting/support-scripts/index.astro`
   - nearby comparative lessons, if any;
   - existing imports for `NotesLayout`, `NotesSection`, `Abstract`, `ConclusionsLayout`, `LinksLayout`, and link
     components.

   Confirm where comparative links are normally placed, preferably near the end of the lesson before references or
   closing material.

2. **Verify Python link support** _(completed)_

   Confirm that `PythonLink` already exists and is exported from:

   - `astro-website/src/components/ui/links/PythonLink.astro`
   - `astro-website/src/components/ui/links/index.ts`

   No new `XxxLink.astro` should be created unless this verification fails.

3. **Design the comparative lesson outline** _(completed)_

   Draft the structure for `py.astro` before writing full prose. The outline should include:

   - a focused `Abstract` explaining that the lesson builds on the Kotlin version;
   - sections comparing Python and Kotlin scripting around practical support scripts;
   - examples only in Python;
   - at least one clear Python advantage;
   - at least one real trade-off against Kotlin scripting;
   - a comparative `ConclusionsLayout`, not a generic summary.

   Suggested section focus:

   - script startup and execution model;
   - argument parsing and command-line ergonomics;
   - file-system operations;
   - process execution;
   - structured output;
   - packaging a script into a reusable tool;
   - trade-offs around typing, refactoring safety, and dependency management.

4. **Create `py.astro`** _(completed)_

   Add:

   ```text
   astro-website/src/pages/notes/scripting/support-scripts/py.astro
   ```

   The lesson must:

   - use Spanish formal-technical prose;
   - maintain inclusive language;
   - avoid re-explaining Kotlin fundamentals;
   - compare against Kotlin explicitly;
   - include only Python code;
   - use short, maintainable examples;
   - prefer examples that scale from ad-hoc scripts to reusable support tooling.

5. **Add the comparative link from the base lesson** _(pending)_

   Update only the import section and the final link block in:

   ```text
   astro-website/src/pages/notes/scripting/support-scripts/index.astro
   ```

   Add `LinksLayout` and `PythonLink` imports if they are not already present.

   Then add or update a `LinksLayout` block that links to the Python comparison. Keep the route consistent with the `py`
   slug and ensure the internal href ends with `/`.

6. **Run lightweight validation** _(pending)_

   Prefer the narrowest available check that catches Astro import and typing errors. Use one of the following, depending
   on what the project exposes:

   - a targeted Astro check for the site;
   - the subproject check command;
   - `pnpm check` only if the narrower command is unavailable or too unreliable.

7. **Perform editorial and structural review** _(pending)_

   Confirm that:

   - `py.astro` lives next to `index.astro`;
   - the file name is lowercase;
   - the base lesson links to the comparison through `LinksLayout`;
   - `PythonLink` is reused rather than recreated;
   - all internal routes use trailing `/`;
   - the comparative lesson includes no Kotlin code blocks;
   - the base lesson’s educational content was not modified.

8. **Add bibliography** _(pending)_

   Add or update the bibliography references needed to support the comparative lesson, keeping the existing lesson
   structure intact and using the project bibliography flow rather than ad hoc citations.

9. **Replace the placeholder description** _(pending)_

   Update the `description` in `py.astro` so it states the actual lesson purpose instead of the temporary placeholder
   text.

## Relevant Files

- `astro-website/src/pages/notes/scripting/support-scripts/index.astro`

  Base lesson. Only add imports and the `LinksLayout` block needed to expose the Python comparison.

- `astro-website/src/pages/notes/scripting/support-scripts/py.astro`

  New independent comparative lesson.

- `astro-website/src/layouts/LinksLayout.astro`

  Reference for the visual and compositional contract of comparative links.

- `astro-website/src/components/ui/links/PythonLink.astro`

  Existing specialised language link for Python.

- `astro-website/src/components/ui/links/index.ts`

  Barrel export to verify that `PythonLink` is already publicly available.

## Verification

1. **Editorial verification**

   In `py.astro`, confirm:

   - Spanish formal-technical prose;
   - inclusive language;
   - comparison against Kotlin is explicit;
   - no Kotlin code is included;
   - Python examples are realistic support-script examples.

2. **Astro structure verification**

   In `index.astro`, confirm:

   - `LinksLayout` is imported if needed;
   - `PythonLink` is imported from the links barrel;
   - the comparative link is placed near the end of the lesson;
   - existing pedagogical sections remain unchanged.

3. **Routing verification**

   Confirm:

   - the route points to the Python comparative lesson;
   - internal hrefs end with `/`;
   - the file name `py.astro` matches the existing `PythonLink`/slug convention.

4. **Technical verification**

   Run the narrowest available project check that validates Astro imports, component usage, and route compilation.

## Decisions

- Base lesson: `support-scripts/index.astro`.
- Target language: Python.
- Comparative file: `support-scripts/py.astro`.
- Link component: reuse existing `PythonLink`.
- Link layout: use `LinksLayout` from the base lesson.
- Base lesson edits: imports and link block only.
- Comparative examples: Python only.

## Further Considerations

- Keep the comparison focused on software-library support tooling, not generic Python scripting.
- Emphasise where Python is faster for small operational scripts.
- Be explicit about the cost: weaker static guarantees than Kotlin, unless the script adopts typing, linters, and
  stricter project conventions.
- Optionally close by connecting Python scripts to the next step in the unit: turning one-off automation into
  maintainable project tooling.
