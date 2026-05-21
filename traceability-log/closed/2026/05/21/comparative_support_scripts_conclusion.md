# [PLAN] Comparative Support Scripts Conclusion

## Summary

Add a `ConclusionsLayout` block to `src/pages/notes/scripting/support-scripts/py.astro` as the closing step for the
Python comparative lesson.

The conclusion should synthesize the comparison developed in the body: Python makes the support-script workflow concise
through direct execution, `argparse`, `pathlib`, and lightweight function extraction, while Kotlin keeps an advantage
when stronger compiler feedback and closer JVM/project integration are more important.

The conclusion must remain tied to the lesson’s concrete script design decisions, not become a generic Python-vs-Kotlin
comparison.

## Scope

### Included

- Import `ConclusionsLayout`.
- Verify the current slot contract of `ConclusionsLayout` before writing.
- Add the conclusion after the final body section and before `Footnotes`.
- Summarize the exact topics covered in the lesson:
  - executing the local script;
  - declaring the input contract;
  - modelling paths;
  - naming responsibilities;
  - communicating or preparing to communicate results;
  - comparing Python’s lower ceremony with Kotlin’s stronger static feedback.

### Excluded

- Adding or rewriting the `Abstract`.
- Fixing the placeholder `description`.
- Adding `ReferencesFromCatalog`.
- Adding link wiring from `index.astro`.
- Introducing packaging, virtual environments, subprocess orchestration, JSON, result objects, or broader Python
  tooling.
- Modifying generated metadata or unrelated traceability files.

## Implementation Steps

1. **Inspect `ConclusionsLayout` usage**

   Before editing `py.astro`, inspect:

   ```text
   src/layouts/ConclusionsLayout.astro
   ```

   and at least one nearby lesson that already uses it.

   Confirm the exact slot names and expected child structure:

   - `conclusions`;
   - `key-points`;
   - `closing-reflection`.

   If the component uses different names or conventions, follow the component instead of the plan.

2. **Import `ConclusionsLayout`**

   Add the import to `py.astro`:

   ```astro
   import ConclusionsLayout from "~/layouts/ConclusionsLayout.astro";
   ```

   Keep the import grouped with the other layout imports.

3. **Place the conclusion near the end**

   Insert the `ConclusionsLayout` after the final body section and before:

   ```astro
   <Footnotes>
   ```

   If the “Ventajas y límites” section has already been implemented, place the conclusion after it. If not, place it
   after the current last body section and ensure the wording only summarizes sections that already exist.

4. **Write the `conclusions` slot**

   The prose synthesis should state that the criteria for reusable support scripts remain stable across languages:

   - explicit input contract;
   - clear filesystem checks;
   - named responsibilities;
   - readable output;
   - maintainability as the script grows.

   Then contrast the local lesson result:

   - Python lowers ceremony for a small project-local tool.
   - Kotlin gives stronger static feedback and can fit better in a Kotlin/JVM codebase.

   Keep the comparison grounded in the specific script, not in general language preference.

5. **Write the `key-points` slot**

   Use focused `ListItem`s. Cover only ideas already developed in the lesson:

   - Python starts the script with little ceremony.
   - `argparse` turns a positional terminal value into a declared CLI contract.
   - `pathlib.Path` keeps filesystem path composition and existence checks readable.
   - Small functions still matter, even in a concise scripting language.
   - Python annotations improve readability and tooling feedback, but are not enforced by the interpreter alone.
   - Kotlin remains valuable when compiler feedback and refactoring safety matter more.

6. **Write the `closing-reflection` slot**

   End with a design-oriented reflection:

   - The choice is not winner-takes-all.
   - Python is attractive when the script should remain small, local, and easy to execute.
   - Kotlin is attractive when the support script should evolve close to the JVM project and benefit from compile-time
     checks.
   - Lightweight Python scripts remain maintainable when paired with explicit conventions, annotations, tests, linters,
     and type-checking tools.

   Mention tests, linters, and type checking only as maintainability conditions, not as a new setup topic.

## Draft Content Requirements

The conclusion must:

- be in Spanish formal-técnico;
- use inclusive wording;
- compare Python and Kotlin only through this lesson’s support-script concerns;
- avoid new code blocks;
- avoid new technical topics;
- avoid broad claims such as “Python is better for scripting”;
- avoid repeating the full content of each section.

## Suggested Structure

```astro
<ConclusionsLayout>
    <Fragment slot="conclusions">
        <!-- Short comparative synthesis. -->
    </Fragment>

    <List slot="key-points">
        <ListItem icon={icons.TerminalWindow}>...</ListItem>
        <ListItem icon={icons.FileCode}>...</ListItem>
        <ListItem icon={icons.Path}>...</ListItem>
        <ListItem icon={icons.BracketsCurly}>...</ListItem>
        <ListItem icon={icons.WarningCircle}>...</ListItem>
    </List>

    <Fragment slot="closing-reflection">
        <!-- Final design-oriented reflection. -->
    </Fragment>
</ConclusionsLayout>
```

Adjust the exact wrapper elements after checking the real `ConclusionsLayout.astro` API.

## Verification

1. **Component contract verification**

   Confirm that the chosen slot names and wrappers match existing `ConclusionsLayout` usage.

2. **Editorial verification**

   Confirm that the conclusion:

   - summarizes the actual body sections;
   - does not introduce packaging, subprocesses, virtual environments, JSON, or structured-output design;
   - frames Python/Kotlin as a contextual design trade-off;
   - avoids generic language comparison.

3. **Astro validation**

   Run the narrowest available check:

   - focused render test for this page, if it exists;
   - otherwise the closest Astro/content check for the site.

4. **Rendered review**

   Confirm that:

   - the conclusion appears before footnotes;
   - list items render correctly;
   - icons are valid;
   - spacing matches nearby lessons;
   - footnotes still render after the conclusion.

## Decisions

- Use `ConclusionsLayout` rather than another `NotesSection`.
- Keep the conclusion grounded in the support-script example.
- Do not add new examples or code.
- Defer `Abstract`, page description cleanup, references, and link wiring to separate steps.
- Leave generated metadata and unrelated worktree changes untouched.
