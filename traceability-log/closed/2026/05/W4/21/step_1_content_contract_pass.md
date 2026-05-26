# [DONE] Step 1 — Content Contract Pass

## Summary

Reframe only the opening contract of `astro-website/src/pages/notes/installation.astro` so the lesson promise matches
the new course workflow:

```text
Git -> JDK 21 -> Kotlin CLI -> Gradle Wrapper -> editor
```

This step should change only the learner-facing introduction: the abstract, the first visible introduction copy, and one
short opening note that clarifies the new main path. Do not change the essential tools list, OS installation tabs,
package-manager commands, verification section, imports, or later conclusion yet.

The goal is to make the page promise clear before changing the implementation details.

## Scope

### In scope

- Rewrite `<Fragment slot="abstract">`.
- Rewrite the first visible introductory paragraph under the installation guide.
- Add or rewrite one short opening `Info` callout explaining the main path.
- State that PowerShell is not required for the main course path.
- State that package managers and shell customisation are secondary details.

### Out of scope

- Do not edit the essential tools list.
- Do not edit Windows/macOS/Linux tabs.
- Do not remove `PowerShellBlock` imports yet.
- Do not change installation commands yet.
- Do not rewrite the final verification section yet.
- Do not remove the existing “do not run commands immediately” warning unless it is being replaced later in a dedicated
  cleanup step.

## Steps

### 1. Rewrite the abstract slot

Update the existing `<Fragment slot="abstract">` so it no longer frames the page as broad environment preparation or
terminal customisation.

The new abstract should say, in Spanish, that the lesson prepares the environment to:

- clone course projects with Git;
- run Kotlin CLI support scripts;
- work with Kotlin projects through the repository Gradle Wrapper;
- use an editor or IDE comfortably during the course.

Keep it short: two compact `<P>` blocks are enough.

Suggested contract language:

```astro
<Fragment slot="abstract">
    <P>
        Antes de comenzar a construir bibliotecas de software, necesitamos preparar un entorno de trabajo alineado con
        el flujo del curso: clonar proyectos, ejecutar scripts de apoyo con Kotlin CLI y trabajar con proyectos Kotlin
        mediante el Gradle Wrapper incluido en cada repositorio.
    </P>
    <P>
        Esta lección se concentra en dejar listas las herramientas necesarias para ese recorrido. Los gestores de
        paquetes y las preferencias de terminal pueden ayudarte a instalar o ajustar tu entorno, pero no son el centro
        del flujo principal.
    </P>
</Fragment>
```

### 2. Rewrite the first visible introduction

In the opening copy of the installation section, replace wording such as:

```text
instalar las herramientas necesarias en tu sistema operativo y personalizar tu entorno de desarrollo
```

with wording focused on the course workflow.

Suggested replacement:

```astro
<P>
    En esta sección encontrarás una guía para preparar tu sistema operativo con las herramientas que usaremos durante el
    curso. El objetivo no es personalizar la terminal, sino verificar que puedas trabajar con Git, JDK 21, Kotlin CLI,
    el Gradle Wrapper y un editor adecuado.
</P>
```

### 3. Add or rewrite one opening note

Add a short `Info` callout near the beginning of the installation guide.

Do **not** use this step to delete the safety warning about checking whether tools are already installed. That warning
still belongs to the installation flow and can be reviewed later.

Suggested callout:

```astro
<Info>
    PowerShell no es un requisito del recorrido principal del curso. Los scripts de apoyo se ejecutarán con Kotlin CLI y
    los proyectos se trabajarán mediante el Gradle Wrapper del repositorio.
</Info>
```

### 4. Preserve all later content unchanged

Leave the rest of the page as-is, even if it still contains old assumptions. Those inconsistencies are expected until
the later passes.

This step should produce a small, reviewable diff that only changes the lesson’s opening promise.

## Relevant Files

- `e:\teaching\DIBS\projects\astro-website\src\pages\notes\installation.astro` Owns the abstract slot, introduction
  copy, and opening callouts.

- `e:\teaching\DIBS\projects\astro-website\AGENTS.md` Repository guidance for educational tone, Spanish lesson content,
  and careful pedagogical changes.

## Verification

### Content checks

- The abstract mentions the course workflow.
- The opening copy no longer promises terminal customisation.
- The opening note explicitly says PowerShell is not required for the main path.
- The opening note distinguishes the main workflow from package-manager or shell-specific details.
- The text remains in Spanish and keeps the lesson’s educational tone.

### Scope checks

Confirm the diff does **not** change:

- essential tools;
- recommended tools;
- Windows/macOS/Linux tabs;
- installation commands;
- final verification;
- imports;
- conclusion;
- code-block components.

Suggested diff review:

```bash
git diff -- astro-website/src/pages/notes/installation.astro
```

## Acceptance Criteria

- The top of the lesson now promises one workflow: Git, JDK 21, Kotlin CLI, Gradle Wrapper, and editor.
- PowerShell is clearly outside the main course path.
- Terminal customisation is no longer part of the page promise.
- No later section has been edited in this step.
- Any remaining PowerShell or package-manager-heavy content is left for later passes, not partially cleaned here.

## Decisions

- This step is a **contract pass**, not a full content migration.
- Keep the current educational tone in Spanish.
- Prefer adding a short `Info` callout over overloading the existing safety `Warning`.
- Do not clean imports yet, even if the opening edit makes future cleanup obvious.
- Do not solve inconsistencies outside the opening; those belong to the tool-model and OS-installation passes.
