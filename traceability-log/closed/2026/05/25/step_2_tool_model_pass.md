# [DONE] Step 2: Tool Model Pass

## Summary

Rewrite the “Herramientas esenciales” and “Herramientas adicionales recomendadas” sections in
`astro-website/src/pages/notes/installation.astro` so they define the course’s tool model before the OS-specific
installation instructions.

This pass should establish the conceptual contract:

```text
Git -> JDK 21 -> Kotlin CLI -> Gradle Wrapper -> editor
```

The goal is to clarify **what each tool is for** in the course, not to change installation commands yet.

## Scope

### In scope

- Rewrite the essential tools section.
- Rewrite the recommended tools section.
- Add Git as an essential tool.
- Reframe Kotlin as **Kotlin CLI** where the course needs command-line execution.
- Distinguish Gradle from the **Gradle Wrapper**.
- Move `StudentPack` so it appears once in the recommended tools area.
- Remove `StudentPack` duplicates from OS tabs only as a targeted cleanup required by this step.

### Out of scope

- Do not rewrite Windows/macOS/Linux installation commands.
- Do not decide the final package-manager strategy.
- Do not add verification commands.
- Do not add `.main.kts` smoke tests.
- Do not clean unrelated imports.
- Do not remove PowerShell installation blocks yet unless they are inside the edited tool-model sections.

## Key Changes

### 1. Replace the essential tools list

Replace the current essential-tools list with a role-based model.

Recommended tools:

| Tool           | Course role                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| Git            | Clonar repositorios del curso y registrar cambios.                                   |
| JDK 21         | Ejecutar Kotlin, Gradle y herramientas del ecosistema JVM.                           |
| Kotlin CLI     | Ejecutar scripts de apoyo `.kts` / `.main.kts`.                                      |
| Gradle Wrapper | Ejecutar tareas del proyecto con la versión de Gradle definida por cada repositorio. |
| Editor / IDE   | Editar, inspeccionar, ejecutar y refactorizar código.                                |

Avoid presenting global Gradle as the normal project path. The wording should make clear that repositories are expected
to be used through `./gradlew` or `gradlew.bat`.

Suggested phrasing:

```text
Gradle y Gradle Wrapper: Gradle es la herramienta de construcción usada por los proyectos Kotlin del curso. En los repositorios del curso, el camino normal será usar el Gradle Wrapper incluido en el proyecto, mediante `./gradlew` o `gradlew.bat`, para ejecutar tareas con la versión esperada por ese repositorio.
```

### 2. Reframe Kotlin as Kotlin CLI

Avoid describing Kotlin only as “the course’s main programming language.” That is true, but too broad for an
installation lesson.

Prefer:

```text
Kotlin CLI: herramienta de línea de comandos que permite ejecutar scripts de apoyo `.kts` / `.main.kts` y comprobar que el entorno Kotlin está disponible fuera del IDE.
```

This makes the connection with the new workflow explicit.

### 3. Add Git as essential

Git should be treated as part of the course baseline, not as an optional tool.

Suggested phrasing:

```text
Git: sistema de control de versiones que usaremos para clonar repositorios del curso, registrar cambios y trabajar con proyectos de forma reproducible.
```

### 4. Rewrite recommended tools

Keep this section focused on tools that improve the student workflow without becoming requirements.

Recommended content:

- **IntelliJ IDEA**: recommended Kotlin IDE.
- **Visual Studio Code**: lighter editor, useful for general editing, but with more limited Kotlin support.
- **JetBrains Student Pack**: optional benefit, shown once.

Avoid mentioning:

- PowerShell;
- Oh My Posh;
- terminal themes;
- shell profiles;
- package managers;
- aesthetic customization.

### 5. Move `StudentPack` once

Place `<StudentPack />` in the recommended tools section, preferably under IntelliJ IDEA or after the editor comparison.

Then remove duplicated `<StudentPack />` calls from OS tabs.

This is the only permitted OS-tab edit in Step 2, because it directly enforces the “Student Pack appears once” contract.
Do not otherwise rewrite OS instructions.

## Content Shape

Prefer a compact semantic structure over long paragraphs.

A good shape would be:

```astro
<NotesSection id="essential-tools">
    ...
    <List>
        <ListItem>Git...</ListItem>
        <ListItem>JDK 21...</ListItem>
        <ListItem>Kotlin CLI...</ListItem>
        <ListItem>Gradle Wrapper...</ListItem>
        <ListItem>Editor / IDE...</ListItem>
    </List>
</NotesSection>
```

For recommended tools:

```astro
<NotesSection id="recommended-tools">
    ...
    <List>
        <ListItem>IntelliJ IDEA...</ListItem>
        <ListItem>Visual Studio Code...</ListItem>
    </List>

    <StudentPack />
</NotesSection>
```

This keeps the lesson easy to scan and avoids introducing a new table component unless the project already has one.

## Implementation Steps

1. Rewrite `essential-tools` around the five course roles:

   - Git;
   - JDK 21;
   - Kotlin CLI;
   - Gradle Wrapper;
   - editor / IDE.

2. Rewrite `recommended-tools` so it only compares IntelliJ IDEA and VS Code.

3. Move `<StudentPack />` into `recommended-tools`.

4. Remove duplicated `<StudentPack />` instances from OS tabs.

5. Leave OS installation commands unchanged, even if they still install global Gradle or mention old assumptions. Those
   belong to Step 3.

6. Review the diff to confirm no unrelated sections changed.

## Verification

### Content checks

- Git appears in essential tools.
- Kotlin CLI appears in essential tools.
- JDK 21 remains essential.
- Gradle and Gradle Wrapper are distinguished.
- The normal repository workflow points to `./gradlew` / `gradlew.bat`.
- IntelliJ IDEA is recommended as the strongest Kotlin option.
- VS Code is presented as a lighter alternative with more limited Kotlin support.
- `StudentPack` appears once.
- No new PowerShell, Oh My Posh, terminal theme, or profile-customization guidance is introduced.

### Scope checks

Confirm the diff does not change:

- Windows installation commands;
- macOS installation commands;
- Linux installation commands;
- final verification;
- conclusion;
- package-manager explanations.

The only acceptable OS-tab edit is removing duplicated `<StudentPack />`.

Suggested check:

```bash
git diff -- astro-website/src/pages/notes/installation.astro
```

Optional grep check:

```bash
rg "<StudentPack" astro-website/src/pages/notes/installation.astro
```

Expected result: one match.

## Acceptance Criteria

- The page now has a clear tool model before the OS-specific instructions.
- The model matches the course workflow: Git, JDK 21, Kotlin CLI, Gradle Wrapper, editor.
- The section does not imply that global Gradle is required for normal repository work.
- Recommended tools are limited to editor/IDE support and the student license benefit.
- `StudentPack` is no longer duplicated.
- OS-specific installation logic remains otherwise untouched.

## Decisions

- Step 2 is a **tool-model pass**, not an installation rewrite.
- The course-facing wording stays in Spanish.
- The implementation may move `StudentPack` once, even though OS tabs are otherwise out of scope.
- Global Gradle installation details are intentionally deferred to Step 3.
- Verification commands and Kotlin script smoke tests remain Step 4 work.

## Implementation Notes

- `installation.astro` now presents the course tool model as Git, JDK 21, Kotlin CLI, Gradle Wrapper, and editor/IDE.
- Kotlin is framed through the CLI role needed for `.kts` / `.main.kts` support scripts.
- Gradle is framed through the repository Gradle Wrapper path using `./gradlew` or `gradlew.bat`.
- `StudentPack` now appears once in the recommended tools section.
- Duplicated `StudentPack` instances were removed from OS tabs without otherwise rewriting installation commands.
