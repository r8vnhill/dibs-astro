# [PLAN] Reorient Installation Around the Kotlin Course Workflow

## Summary

Refactor `astro-website/src/pages/notes/installation.astro` so the page prepares one coherent course workflow:

```text
Git -> JDK 21 -> Kotlin CLI -> Gradle Wrapper -> editor
```

The lesson should stop behaving like a package-manager tutorial or terminal-customisation guide. Its purpose is to help
learners verify that their machine is ready to clone course projects, run Kotlin-based support scripts, and work with
Kotlin projects through the repository Gradle Wrapper.

This change also removes PowerShell from the main course path and eliminates Oh My Posh / terminal profile customisation
from the installation lesson.

## Goals

- Make the installation page shorter, clearer, and workflow-driven.
- Add Git as an essential tool.
- Present Kotlin CLI as the support-script execution baseline.
- Present the Gradle Wrapper as the project execution baseline.
- Keep package managers as installation helpers, not as the conceptual centre of the lesson.
- Keep `.kts` / `.main.kts` validation minimal.
- Link to the support-scripts lesson for the full scripting explanation.

## Non-goals

- Do not teach Kotlin scripting in this page.
- Do not introduce PowerShell as optional main-path tooling.
- Do not require global Gradle if course repositories already provide `gradlew` / `gradlew.bat`.
- Do not turn the lesson into a Scoop, Homebrew, or Nix tutorial.
- Do not move or redesign the dedicated scripting lesson.

## Key Changes

### 1. Reframe the opening contract

Replace the current “herramientas y personalización del entorno” framing with a narrower promise:

```text
Al terminar esta lección, deberías poder clonar proyectos del curso,
ejecutar scripts de apoyo con Kotlin CLI y trabajar con proyectos Kotlin
mediante el Gradle Wrapper incluido en cada repositorio.
```

### 2. Replace the essential tools section

Use a compact tool responsibility model instead of a long prose list.

| Tool                     | Role in the course                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Git                      | Clone repositories and track project changes                                           |
| JDK 21                   | Provide the JVM runtime used by Kotlin and Gradle                                      |
| Kotlin CLI               | Run small `.kts` / `.main.kts` support scripts                                         |
| Gradle Wrapper           | Build, test, document, and run project tasks with the repository-pinned Gradle version |
| IntelliJ IDEA or VS Code | Write, inspect, and refactor code                                                      |

Use **Gradle Wrapper** rather than global Gradle as the main concept. Gradle’s documentation describes the Wrapper as
the recommended way to execute builds because it invokes the project-declared Gradle version and can provision it
automatically through `gradlew` or `gradlew.bat`. ([Gradle Documentation][1])

### 3. Simplify the recommended tools section

Keep only tools that directly improve the course workflow:

- IntelliJ IDEA as the recommended Kotlin IDE.
- VS Code as a lighter alternative with more limited Kotlin support.
- Student Pack as a single reusable recommendation, not repeated inside every OS tab.

Remove or postpone anything related to:

- Oh My Posh;
- terminal themes;
- PowerShell profiles;
- aesthetic customisation;
- shell-specific productivity modules.

Those are not wrong, but they dilute the installation lesson’s purpose.

### 4. Normalize the OS tabs

Each OS tab should follow the same internal structure:

```text
1. Install or choose an installation route.
2. Install Git, JDK 21, Kotlin CLI, and an editor.
3. Verify the tools.
4. Continue with the course workflow.
```

Keep Scoop, Homebrew, and Nix as routes, but reduce their explanation to the minimum needed. The goal is not to teach
the package manager; it is to install the course tools.

### 5. Add a focused final verification section

Replace the current conclusion-oriented ending with a concrete workflow check.

Recommended checks:

```bash
git --version
java --version
kotlin -version
gradle --version
```

Optionally include one minimal Kotlin script smoke test:

```kotlin
println("DIBS Kotlin CLI environment is ready.")
```

Run it with:

```bash
kotlin hello.main.kts
```

Keep this as a verification, not as a teaching section.

### 6. Add the next-step bridge

After verification, add a short pointer:

```text
El siguiente paso es usar estas herramientas en contexto:
primero para entender qué artefactos produce una biblioteca de software
y luego para automatizar tareas mediante scripts de apoyo.
```

Then link to the support-scripts lesson where the `.main.kts` workflow is explained properly.

### 7. Clean up Astro and content leftovers

After the content rewrite, remove or adjust:

- `PowerShellBlock` import;
- `InlineBash` if only used for removed `--cask` explanations;
- `Warning` or `Info` callouts that only made sense for PowerShell/customisation;
- orphaned headings and anchors;
- duplicated `StudentPack`;
- code blocks mentioning `pwsh`;
- visible references to `$PROFILE`, Oh My Posh, terminal themes, or PowerShell modules.

Also replace any remaining plain `<p>` elements with the project’s semantic `<P>` component where that is the local
convention.

## Suggested Implementation Order

### ~~Step 1 — Content contract pass~~

Edit only the abstract, introduction, and opening note.

Acceptance criteria:

- The page promise mentions the course workflow.
- PowerShell is explicitly not required for the main path.
- The page no longer promises terminal customisation.

### ~~Step 2 — Tool model pass~~

Rewrite essential and recommended tools.

Acceptance criteria:

- Git is essential.
- Kotlin CLI is essential.
- Gradle is essential (we will use it to create projects and wrappers).
- Student Pack appears once.

### Step 3 — OS installation pass

Refactor Windows, macOS, and Linux tabs to use the same structure.

Acceptance criteria:

- Each OS path installs or points to Git, JDK 21, Kotlin CLI, and an editor.
- Windows Kotlin CLI is not Scoop-only.
- Scoop/Homebrew/Nix are helpers, not the lesson’s main topic.
- No OS tab requires PowerShell as course tooling.

### Step 4 — Verification pass

Replace the old conclusion with a workflow verification section and short bridge.

Acceptance criteria:

- Git, Java, Kotlin CLI, and Gradle Wrapper are verified.
- `.main.kts` smoke test is minimal.
- The support-scripts lesson is linked as the deeper next step.

### Step 5 — Cleanup pass

Remove unused imports, stale components, duplicated fragments, and obsolete wording.

Acceptance criteria:

- No `PowerShellBlock` remains unless there is a deliberate complementary aside, which this plan currently excludes.
- No visible Oh My Posh or terminal-personalisation content remains.
- No global Gradle installation remains in the main path.
- The page renders cleanly.

## Verification Plan

Run the narrowest available checks first:

```bash
pnpm astro check
```

Then run the site-level validation used by the project, for example:

```bash
pnpm build
```

Also search the edited file for stale terms:

```bash
PowerShell
pwsh
Oh My Posh
$PROFILE
terminal personalizada
gradle install
scoop install gradle
brew install gradle
nixpkgs#gradle
```

Manual review checklist:

- The lesson has one clear workflow.
- Package managers do not dominate the lesson.
- Windows instructions are not PowerShell-dependent.
- Gradle Wrapper is clearly separated from global Gradle.
- Kotlin CLI verification is present but not overexplained.
- The conclusion points forward to the course, not to terminal customisation.

## Final Decisions

- Remove PowerShell from the main installation lesson.
- Remove Oh My Posh and terminal-profile customisation entirely from this page.
- Add Git as an essential tool.
- Prefer Gradle Wrapper over global Gradle.
- Keep package managers as optional installation routes.
- Keep Kotlin script verification small.
- Link deeper scripting content instead of duplicating it here.

[1]: https://docs.gradle.org/current/userguide/gradle_wrapper.html "Gradle Wrapper"
[2]: https://kotlinlang.org/docs/command-line.html "Kotlin command-line compiler | Kotlin Documentation"
[3]: https://docs.gradle.org/current/userguide/gradle_wrapper_basics.html "Wrapper Basics"
