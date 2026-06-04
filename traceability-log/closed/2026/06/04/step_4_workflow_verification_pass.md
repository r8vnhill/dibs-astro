# [DONE] Step 4: Workflow Verification Pass

## Summary

Replace the current conclusion in `astro-website/src/pages/notes/installation.astro` with a single workflow-verification
section that confirms learners can follow the actual course path:

```text
Git -> JDK 21 -> Kotlin CLI -> Gradle -> Gradle Wrapper -> support scripts
```

The final section should verify both:

1. the globally available tools: `git`, `java`, `kotlin`, and `gradle`;
2. the repository-level Gradle Wrapper path through `./gradlew` or `gradlew.bat`.

This keeps `gradle --version` as a useful global installation check while still making clear that course repositories
should normally be executed through the Gradle Wrapper.

## Scope

### In scope

- Replace the current `h2-conclusion` section with a workflow-verification section.
- Remove conclusion wording about terminal customization, themes, modules, or aesthetic setup.
- Add final verification for:

  - `git --version`;
  - `java --version`;
  - `kotlin -version`;
  - `gradle --version`;
  - `./gradlew --version`;
  - `gradlew.bat --version`.
- Explain the difference between global Gradle and the Gradle Wrapper.
- Add a tiny `.main.kts` smoke test.
- Add a short bridge to the support-scripts lesson.

### Out of scope

- Do not rewrite Windows/macOS/Linux installation instructions.
- Do not change package-manager commands.
- Do not teach `.main.kts` in depth.
- Do not modify the support-scripts lesson.
- Do not add troubleshooting tables unless already required by the page structure.

## Key Changes

### 1. Replace the old conclusion

Replace:

```astro
<NotesSection id="h2-conclusion">
```

with a more meaningful final section, for example:

```astro
<NotesSection id="workflow-verification">
```

Use a heading such as:

```text
Verificación final
```

or:

```text
Comprobando el flujo del curso
```

Before renaming the anchor, search for existing links to `#h2-conclusion`. If there are references, either update them
or keep the old ID temporarily.

### 2. Add global tool checks

Add a compact verification block for globally available commands:

```bash
git --version
java --version
kotlin -version
gradle --version
```

The surrounding prose should explain:

- `git --version` confirms Git is available.
- `java --version` should report JDK 21.
- `kotlin -version` confirms Kotlin CLI is available.
- `gradle --version` confirms the global Gradle command is available.

Suggested Spanish copy:

```text
Primero, verifica que las herramientas principales estén disponibles desde la terminal:
Git, Java, Kotlin CLI y Gradle. En el caso de Java, revisa que la versión principal sea 21.
```

### 3. Add Gradle Wrapper checks

After the global checks, add a separate repository-level verification.

Unix-like shells:

```bash
./gradlew --version
```

Windows:

```bat
gradlew.bat --version
```

Suggested Spanish copy:

```text
Luego, entra a un repositorio del curso que incluya Gradle Wrapper y verifica que el proyecto
pueda ejecutar tareas con la versión de Gradle definida por el propio repositorio.
Aunque `gradle --version` confirma la instalación global, el flujo normal del curso usará
`./gradlew` o `gradlew.bat` dentro de cada proyecto.
```

This distinction is the core content requirement for this pass.

### 4. Add a minimal `.main.kts` smoke test

Keep this as validation only, not as a scripting explanation.

Script:

```kotlin
println("DIBS Kotlin CLI environment is ready.")
```

Command:

```bash
kotlin hello.main.kts
```

Suggested Spanish copy:

```text
Finalmente, puedes comprobar que Kotlin CLI ejecuta scripts creando un archivo pequeño llamado
`hello.main.kts` y ejecutándolo desde la terminal.
```

Do not explain script dependencies, shebangs, script templates, or support-script architecture here. Link to the
dedicated lesson instead.

### 5. Add bridge to support scripts

Add a short handoff paragraph after the verification blocks:

```text
Esta verificación solo confirma que el entorno está listo. En la lección sobre scripts de apoyo
veremos cómo usar archivos `.main.kts` en contexto, qué responsabilidades deberían tener y cómo
integrarlos al flujo de trabajo del curso.
```

Use the project’s `<Link>` component to point to:

```text
astro-website/src/pages/notes/scripting/support-scripts/index.astro
```

## Implementation Steps

1. Locate the current `NotesSection` with `id="h2-conclusion"`.

2. Replace it with a new workflow-verification section.

3. Add an opening paragraph explaining that this final section checks readiness for the course workflow.

4. Add the global tool verification block:

   ```bash
   git --version
   java --version
   kotlin -version
   gradle --version
   ```

5. Add a short explanation that `gradle --version` checks global Gradle availability.

6. Add the Gradle Wrapper verification block:

   ```bash
   ./gradlew --version
   ```

   and:

   ```bat
   gradlew.bat --version
   ```

7. Explain that the Wrapper check must be run inside a course repository.

8. Add the minimal `hello.main.kts` smoke test.

9. Add the support-scripts bridge and link.

10. Remove stale conclusion wording about terminal customization and aesthetic setup.

## Verification

### Automated checks

From `astro-website`:

```bash
pnpm astro check
```

Then, if the repository normally requires it:

```bash
pnpm build
```

### Search checks

Search for stale conclusion wording:

```bash
rg "terminal personalizada|personalización|Oh My Posh|\\$PROFILE|temas|módulos" src/pages/notes/installation.astro
```

Search for the expected Gradle checks:

```bash
rg "gradle --version|gradlew --version|gradlew.bat --version|Gradle Wrapper" src/pages/notes/installation.astro
```

Expected result:

- `gradle --version` appears as a global tool check.
- `./gradlew --version` appears as the Unix-like Wrapper check.
- `gradlew.bat --version` appears as the Windows Wrapper check.
- The lesson distinguishes global Gradle from repository-level Gradle Wrapper execution.

## Acceptance Criteria

- The old conclusion is replaced by a final workflow-verification section.
- The section checks Git, Java/JDK 21, Kotlin CLI, global Gradle, and Gradle Wrapper.
- `gradle --version` is preserved as a global tool verification.
- `./gradlew --version` and `gradlew.bat --version` are included as repository-level checks.
- The text clearly says that course projects normally use the Gradle Wrapper.
- The `.main.kts` example remains minimal.
- The section links to the support-scripts lesson for the full scripting explanation.
- The ending no longer discusses terminal customization, themes, profiles, or aesthetics.
- `pnpm astro check` passes.

## Decisions

- Keep verification centralized at the end of the installation lesson.
- Preserve `gradle --version` as a global installation check.
- Keep Gradle Wrapper as the normal course project-execution path.
- Keep `.main.kts` validation minimal.
- Link to the support-scripts lesson instead of duplicating its content.
- Rename `h2-conclusion` only if no existing links depend on that anchor.
