# [PLAN] Tighten the Installation Lesson Workflow

## Summary

Refine `astro-website/src/pages/notes/installation.astro` so the lesson ends with a clearer immediate transition,
presents Gradle/global Gradle/Gradle Wrapper without ambiguity, and reduces repeated verification burden.

The change is intentionally local: the page should remain an installation lesson, not become an introduction to software
artifacts or a scripting tutorial. The final learner journey should be:

```text
Prepare tools -> verify the course workflow -> continue to Unit 1
```

The Gradle distinction should remain technically accurate: global `gradle` may be useful for installation verification
or creating projects, but repository work should emphasize the Gradle Wrapper because Gradle officially recommends
executing builds with the Wrapper for reliable, controlled, standardized execution, and the Wrapper can run a project
without requiring a separately installed Gradle runtime. ([Gradle][1])

---

# Phase 1 — Align the Ending with the Immediate Course Sequence

## Goal

Adjust the final handoff so the page transitions naturally into Unit 1, where the course starts asking what kind of
software artifact a library is.

## Scope

In scope:

- Update the final paragraph of `installation.astro`.
- Link to `/notes/software-libraries/` or `/notes/software-libraries/artifacts-taxonomy/`.
- Keep the support-scripts link only as a secondary “later tooling” pointer, if still useful.

Out of scope:

- Do not rewrite the support-scripts lesson.
- Do not move the installation lesson in the course structure.
- Do not turn the conclusion into a conceptual explanation of software artifacts.

## Red / Green / Refactor

### Red

Add or perform a BDD-style content check:

```text
Given the learner finishes the installation lesson
When they reach the final section
Then the primary next step should point to Unit 1, not Unit 2 tooling.
```

### Green

Rewrite the final bridge so it says, in Spanish, that after checking the environment, the next step is to understand
what kind of artifact the course is building.

Suggested direction:

```text
Con el entorno listo, el siguiente paso no es profundizar todavía en las herramientas, sino entender qué vamos a construir: una biblioteca de software como artefacto reutilizable.
```

Then link to the software-libraries page.

### Refactor

If the support-scripts link remains, demote it:

```text
Más adelante volveremos a Kotlin CLI en la lección sobre scripts de apoyo.
```

## Acceptance Criteria

- The primary CTA points to Unit 1.
- The support-scripts lesson is not presented as the immediate next lesson.
- The ending remains short and instrumental.
- The page does not explain artifact taxonomy in detail.

## Suggested Execution Order

Do this first, because it fixes the largest pedagogical sequencing issue with the smallest edit.

---

# Phase 2 — Clarify Global Gradle vs Gradle Wrapper

## Goal

Remove ambiguity between installing/checking global Gradle and using the Gradle Wrapper inside course repositories.

## Scope

In scope:

- Adjust the “Herramientas esenciales” wording.
- Adjust any Gradle-related prose near installation or verification.
- Keep `gradle --version` as a global tool check.
- Keep `./gradlew --version` and `.\gradlew.bat --version` as repository-level checks.

Out of scope:

- Do not remove global Gradle installation commands in this phase unless the course has decided to stop installing it.
- Do not rewrite every OS tab.
- Do not change project build behavior.

## Red / Green / Refactor

### Red

Use BDD-style content checks:

```text
Given the essential tools section describes Gradle
When a learner reads it before the OS tabs
Then they should understand that global Gradle and Gradle Wrapper have different roles.
```

```text
Given a course repository includes Gradle Wrapper
When the learner wants to run project tasks
Then the lesson should point them to the Wrapper, not global Gradle.
```

### Green

Rewrite the Gradle tool entry around two roles:

```text
Gradle global: herramienta útil para comprobar la instalación local y crear o inicializar proyectos cuando sea necesario.

Gradle Wrapper: camino normal para ejecutar tareas dentro de los repositorios del curso, porque usa la versión de Gradle definida por cada proyecto.
```

In the final verification, keep both:

```bash
gradle --version
```

and:

```bash
./gradlew --version
```

For Windows:

```bat
.\gradlew.bat --version
```

### Refactor

Ensure the same distinction appears only once or twice, not repeatedly in every OS tab.

## Acceptance Criteria

- `gradle --version` remains as a global installation check.
- Wrapper commands remain as the repository-level project check.
- The text does not imply that global Gradle is the normal way to run course repositories.
- The text does not imply that Gradle Wrapper is globally installed.
- The distinction appears before learners reach the final verification.

## Suggested Execution Order

Do this after Phase 1, because it affects both the tool model and the final verification wording.

---

# Phase 3 — Reduce Verification Duplication

## Goal

Keep OS-specific checks useful but lightweight, and make the final verification the only full workflow check.

## Scope

In scope:

- Keep minimal per-OS post-install checks.
- Move full workflow verification to the final section.
- Avoid repeating the same explanation after every OS installation path.

Out of scope:

- Do not remove all OS-specific checks.
- Do not add a troubleshooting matrix unless the lesson already has that pattern.
- Do not add deep `.main.kts` teaching.

## Red / Green / Refactor

### Red

Use a BDD-style check:

```text
Given a learner follows one OS tab
When they finish installing tools
Then they should get a quick local sanity check, not a second full workflow tutorial.
```

```text
Given the learner reaches the final verification
When they run the listed commands
Then they should verify the complete course workflow once.
```

### Green

Use a two-level verification model:

| Location      | Purpose                          | Example                                                 |
| ------------- | -------------------------------- | ------------------------------------------------------- |
| OS tab        | Confirm installed tools respond  | `java --version`, `kotlin -version`                     |
| Final section | Confirm complete course workflow | `git`, `java`, `kotlin`, `gradle`, Wrapper, `.main.kts` |

The final section should include:

```bash
git --version
java --version
kotlin -version
gradle --version
```

Then, inside a course repository:

```bash
./gradlew --version
```

Windows:

```bat
.\gradlew.bat --version
```

Then the minimal Kotlin script smoke test.

### Refactor

Remove duplicate explanatory paragraphs. Keep repeated commands only when they serve a different learner moment.

## Acceptance Criteria

- OS tabs still let learners confirm installation quickly.
- The final section is the only complete workflow verification.
- The lesson no longer feels like it verifies the same tools twice with the same purpose.
- `.main.kts` remains a smoke test, not a scripting lesson.

## Suggested Execution Order

Do this after the Gradle wording is clarified, because the verification model depends on that distinction.

---

# Phase 4 — Validate and Editorially Polish

## Goal

Confirm the page still compiles, scans cleanly, and preserves the intended lesson scope.

## Scope

In scope:

- Run Astro checks.
- Search for stale wording.
- Manually review the final flow.
- Check links.

Out of scope:

- Do not broaden the refactor to unrelated installation pages.
- Do not redesign components.
- Do not restructure the whole course navigation.

## Red / Green / Refactor

### Red

Expected checks before cleanup may reveal stale wording such as:

```text
terminal personalizada
personalización
Oh My Posh
PowerShell
```

### Green

Run the narrow Astro validation first:

```bash
pnpm astro check
```

Astro documents `astro check` as part of its CLI command set for validating Astro projects, so it is the right first
check before broader builds. ([Astro Docs][2])

Then run the broader project check if required:

```bash
pnpm build
```

### Refactor

Clean only leftovers caused by this plan:

- stale conclusion wording;
- duplicated verification prose;
- ambiguous Gradle wording;
- dead links or wrong CTAs.

## Acceptance Criteria

- `pnpm astro check` passes.
- Final CTA points primarily to Unit 1.
- Gradle global vs Wrapper wording is consistent.
- Verification duplication is reduced.
- The lesson remains instrumental.
- No unrelated sections were rewritten.

## Suggested Execution Order

Run this last, after all content changes.

---

# Final Suggested Execution Order

1. **Phase 1:** Fix final transition to Unit 1.
2. **Phase 2:** Clarify Gradle global vs Gradle Wrapper.
3. **Phase 3:** Reduce verification duplication.
4. **Phase 4:** Validate and polish.

This is enough structure for the scope. I would not split it into milestones, because the work is localized to one
lesson; I also would not go directly to tiny cycles, because the concerns are pedagogical and cross-sectional rather
than isolated line edits.

[1]: https://docs.gradle.org/current/userguide/gradle_wrapper.html?utm_source=chatgpt.com "Gradle Wrapper"
[2]: https://docs.astro.build/en/reference/cli-reference/?utm_source=chatgpt.com "CLI Commands - Astro Docs"
