# [PLAN] Comparative Support Scripts Abstract

## Summary

Add the opening abstract to:

```text
astro-website/src/pages/notes/scripting/support-scripts/py.astro
```

The abstract should introduce the comparative lesson after the body and conclusion have already been drafted. It should
preview the lesson’s actual through-line: revisiting the Kotlin support-script example from Python, using lower startup
ceremony and standard-library support for CLI input and filesystem paths, while preserving the same design criteria for
reusable support tooling.

The abstract should orient the reader, not re-teach what support scripts are.

## Scope

### Included

- Add a `<Fragment slot="abstract">` immediately inside `NotesLayout`.
- Use 1–2 short `<P>` blocks.
- State that the lesson assumes the Kotlin base lesson already introduced reusable support scripts.
- Preview only topics already covered in the page:
  - executing the Python script as a local tool;
  - declaring the CLI contract with `argparse`;
  - reviewing paths with `pathlib`;
  - keeping responsibilities small as the script grows;
  - understanding Python/Kotlin trade-offs for this specific script.

### Excluded

- Changing the `NotesLayout` `description` placeholder.
- Adding references, footnotes, links, or code blocks.
- Rewriting existing body sections.
- Changing the conclusion.
- Adding link wiring from the base `index.astro`.
- Updating generated metadata.
- Editing traceability logs.

## Implementation Steps

1. **Verify the local abstract slot pattern**

   Inspect the base lesson and nearby notes to confirm the preferred shape:

   ```astro
   <Fragment slot="abstract">
       <P>...</P>
   </Fragment>
   ```

   Follow the local pattern if it differs.

2. **Insert the abstract immediately inside `NotesLayout`**

   Place the block after the opening `NotesLayout` tag and before the first `NotesSection`.

3. **Write the first paragraph as orientation**

   The paragraph should say that this page revisits the Kotlin support-script example from Python and assumes the base
   lesson already introduced the motivation for reusable support scripts.

   Avoid explaining again what a support script is.

4. **Write the second paragraph as a topic preview**

   Mention the concrete design decisions covered in the lesson:

   - starting from `check_library_layout.py`;
   - declaring input with `argparse`;
   - modelling paths with `pathlib.Path`;
   - separating responsibilities into small functions;
   - comparing Python’s lower ceremony with Kotlin’s stronger static feedback.

5. **Keep the abstract short**

   Target length:

   - 1 paragraph if the existing lesson style favours compact abstracts;
   - 2 short paragraphs if nearby comparative lessons use a fuller preview.

   Do not duplicate the conclusion.

## Suggested Draft

```astro
<Fragment slot="abstract">
    <P>
        Esta lección revisita desde Python el script de apoyo desarrollado en la versión base con Kotlin. Partimos de la
        misma premisa: el estudiantado ya conoce el propósito de una herramienta local para revisar archivos esperados
        en una biblioteca reusable, por lo que aquí nos concentramos en cómo cambia la forma de expresar ese diseño.
    </P>

    <P>
        La comparación sigue el recorrido del script: ejecutar <Mono>check_library_layout.py</Mono> como herramienta
        local, declarar su contrato de entrada con <PythonInline code="argparse" />, modelar rutas con
        <PythonInline code="pathlib.Path" /> y separar responsabilidades pequeñas. El foco no es declarar una opción
        ganadora, sino entender cuándo la baja ceremonia de Python ayuda y cuándo las garantías estáticas de Kotlin
        siguen siendo relevantes.
    </P>
</Fragment>
```

## Acceptance Criteria

The abstract is acceptable when it:

- appears before the first `NotesSection`;
- uses the existing `NotesLayout` abstract slot pattern;
- is written in Spanish formal-técnico;
- uses inclusive wording;
- states that the Kotlin base lesson is assumed knowledge;
- previews only implemented lesson topics;
- mentions `argparse` and `pathlib.Path`;
- frames Python/Kotlin as a contextual trade-off;
- does not include code blocks;
- does not introduce packaging, virtual environments, subprocesses, JSON, or broader Python tooling.

## Test Plan

1. **Render coverage**

   Extend the focused render test for the Python comparative page if one exists.

   Assert one stable abstract signal, such as:

   - the page states that it revisits the Kotlin example from Python;
   - or the rendered text includes the `argparse`/`pathlib` framing.

2. **Focused validation**

   Run the narrowest support-scripts Astro render test after the edit.

3. **Manual review**

   Confirm that:

   - the abstract appears before the first section;
   - the abstract does not duplicate the conclusion;
   - the page still renders footnotes and conclusion correctly;
   - no unrelated metadata or generated files changed.

## Decisions

- Keep this step abstract-only.
- Do not fix the placeholder `description` yet.
- Do not add references, links, footnotes, or code examples.
- Do not introduce new topics not already covered in the body.
- Use the existing body and conclusion as the source of truth for the abstract.

## Further Considerations

After this step, the `NotesLayout` `description` should still be cleaned up in a separate, metadata-focused change so
the page has an accurate summary for previews, search, and exports.
