# [DONE] Reorient the Installation Lesson Around Kotlin CLI

## Summary

Refactor `astro-website/src/pages/notes/installation.astro` so the installation lesson prepares learners for the
course’s current execution model: Kotlin-first local tooling, with `.kts` / `.main.kts` scripts executed through the
Kotlin command-line tools.

This is an integral content migration, not a minor edit. PowerShell must disappear as a required or central tool from
this lesson, and the final verification must validate the Kotlin/JDK/Gradle environment instead. Kotlin’s command-line
compiler distribution includes scripts for compiling and running Kotlin on Windows, macOS, and Linux, while `main-kts`
is specifically intended for small command-line utility scripts. ([Kotlin][1])

## Scope

### In scope

- Reframe the lesson around:

  - Git;
  - JDK 21;
  - Kotlin CLI;
  - Gradle / Gradle Wrapper;
  - editor or IDE setup.
- Remove PowerShell as a course requirement from this page.
- Remove Oh My Posh and PowerShell profile customisation from this lesson.
- Keep the page focused on installation and environment verification.
- Add only a minimal `.kts` / `.main.kts` sanity check, not a full scripting lesson.

### Out of scope

- Teaching Kotlin scripting in depth.
- Rewriting the support-scripts lesson.
- Changing the course’s scripting architecture.
- Reworking PowerShell complementary material elsewhere.

## Proposed Page Structure

1. **Purpose of the environment setup**

   - Explain that this page prepares the tools needed for the Kotlin-based course workflow.
   - State that support scripts are executed through Kotlin CLI, while project builds use Gradle.

2. **Essential tools**

   - Git.
   - JDK 21.
   - Kotlin CLI.
   - Gradle Wrapper / Gradle.
   - Recommended editor or IDE.

3. **Recommended tools**

   - Terminal emulator.
   - Package manager per OS.
   - Optional editor extensions.

4. **Installation by operating system**

   - Windows.
   - macOS.
   - Linux.
   - Keep examples shell-neutral where possible.
   - Avoid `pwsh`, PowerShell profile setup, and Oh My Posh.

5. **Final verification**

   - Verify Git.
   - Verify Java/JDK.
   - Verify Kotlin CLI.
   - Verify Gradle through the project wrapper when available.
   - Run one minimal Kotlin script check.

6. **Next step**

   - Link to the lesson that actually teaches the support-script workflow.

## Implementation Steps

### 1. Audit the existing lesson before editing

Review `installation.astro` and classify each section as:

- **Keep**: still relevant to Kotlin CLI setup.
- **Rewrite**: useful idea, but PowerShell-centred wording.
- **Remove**: PowerShell, Oh My Posh, profile customisation, or terminal theming content.
- **Relink**: content that belongs in a scripting or complementary-material page.

This avoids accidentally preserving PowerShell assumptions in prose, callouts, screenshots, imports, or component props.

### 2. Lock the new visible contract

Before rewriting the full body, define the exact learner-facing contract:

```text
After this lesson, learners should be able to confirm that Git, JDK 21,
Kotlin CLI, and the course Gradle workflow are available from their terminal.
```

Use this contract to decide what remains. For example, Oh My Posh may be useful as personal customisation, but it does
not support the core course workflow and should not stay in this page.

### 3. Rewrite the essential tools section

Replace the PowerShell-oriented tool list with a Kotlin-first list:

- **Git** for cloning course repositories and tracking changes.
- **JDK 21** as the JVM baseline.
- **Kotlin CLI** for local `.kts` / `.main.kts` support scripts.
- **Gradle Wrapper** for project builds and reproducible tasks.
- **IntelliJ IDEA or another Kotlin-capable editor** for development.

Avoid suggesting that learners must install a global Gradle when the course repositories provide a wrapper. Gradle’s own
compatibility depends on the Gradle version and Java version, so the lesson should prefer the repository wrapper and
keep Java compatibility claims aligned with Gradle’s official matrix. ([Gradle Documentation][2])

### 4. Rewrite OS-specific installation sections

For each OS, keep the same conceptual goal:

```text
Install JDK 21.
Install Kotlin CLI.
Verify both from a terminal.
Use the project Gradle Wrapper for builds.
```

Recommended shape:

- **Windows**

  - Prefer the official/manual Kotlin compiler installation path when appropriate, since Kotlin’s command-line
    documentation explicitly recommends manual installation on Windows. ([Kotlin][1])
  - Avoid PowerShell-only commands.
  - Use neutral wording such as “open a terminal” rather than “open PowerShell”.

- **macOS**

  - Use the project’s preferred package-manager route if already established.
  - Keep commands focused on Java, Kotlin, and Git.

- **Linux**

  - Avoid distribution-specific overreach.
  - Provide general verification commands and link out where needed.

### 5. Remove PowerShell-dependent customisation

Delete the Oh My Posh section and related subsections from this lesson.

Do not keep it as an “optional” block here, because optional content still affects the perceived course baseline. If the
material is worth preserving, move it later to a separate complementary page about terminal customisation.

### 6. Rewrite the final verification around Kotlin CLI

The final verification should be small and operational.

Suggested checks:

```bash
git --version
java --version
kotlin -version
```

For Gradle, prefer the wrapper from a course repository:

```bash
./gradlew --version
```

On Windows, the lesson may mention the wrapper variant without making PowerShell the baseline:

```bat
gradlew.bat --version
```

Then add a minimal script sanity check, for example:

```kotlin
#!/usr/bin/env kotlin

println("DIBS Kotlin CLI environment is ready.")
```

Run it with:

```bash
kotlin hello.main.kts
```

Keep this as verification only. The deeper explanation of `.main.kts`, script dependencies, and support-script design
belongs in the scripting lesson. The `main-kts` model is appropriate here because it is designed for command-line
utility scripts rather than full application entry points. ([GitHub][3])

### 7. Clean Astro-specific leftovers

After removing sections, check for:

- unused imports;
- unused components;
- orphaned images;
- stale headings;
- broken anchors;
- old callouts that mention PowerShell;
- code blocks tagged as PowerShell;
- references to `pwsh`, `$PROFILE`, Oh My Posh, or profile theming;
- links whose surrounding context no longer makes sense.

### 8. Validate locally

Run the narrowest checks available first, then broader checks only if needed.

Suggested order:

```bash
pnpm astro check
pnpm test -- installation
pnpm build
```

Adjust commands to the repository’s actual scripts. The important point is to catch Astro component errors, TypeScript
errors, and broken imports before doing editorial review.

### 9. Editorial review

Do one final reading with these questions:

- Does the page clearly say what environment the course expects?
- Is Kotlin CLI presented as the script execution baseline?
- Are Gradle and Kotlin responsibilities separated?
- Are there any visible PowerShell assumptions left?
- Are `.kts` / `.main.kts` mentioned only enough to verify the setup?
- Does the page point learners to the proper follow-up lesson?

## Relevant Files

- `e:\teaching\DIBS\projects\astro-website\src\pages\notes\installation.astro` Main lesson to refactor.

- `e:\teaching\DIBS\projects\kotlin-companion\README.md` Reference for the expected Kotlin CLI / `.main.kts` course
  contract.

- `e:\teaching\DIBS\projects\astro-website\src\pages\notes\scripting\support-scripts\index.astro` Reference for the
  Kotlin support-script execution model.

- `e:\teaching\DIBS\projects\astro-website\src\pages\notes\scripting\support-scripts\py.astro` Comparative reference for
  separating execution contract from implementation language.

## Verification Checklist

- `installation.astro` renders without Astro or TypeScript errors.
- No required-tool section mentions PowerShell.
- No visible section mentions Oh My Posh or PowerShell profiles.
- No code block uses `pwsh` as part of the main path.
- Final verification checks Git, Java, Kotlin CLI, and Gradle Wrapper.
- The page links to the scripting lesson instead of teaching scripting in full.
- The lesson’s tone remains a preparation guide, not a scripting tutorial.

## Decisions

- PowerShell is removed from this lesson entirely.
- Oh My Posh is removed rather than kept as optional material.
- Kotlin CLI becomes the central local script-execution tool.
- Gradle remains part of the environment, but project builds should prefer the repository wrapper.
- The page verifies `.main.kts` execution only minimally.
- Deeper scripting explanations remain in the dedicated support-scripts lesson.

## References

- Kotlin command-line compiler documentation: supports installing the compiler and using the provided `bin` scripts to
  compile and run Kotlin across platforms. ([Kotlin][1])
- Kotlin `main-kts` examples: frames `.main.kts` as a way to write simple command-line utility scripts. ([GitHub][3])
- Gradle Java compatibility and toolchains documentation: useful for keeping JDK 21 guidance aligned with the project’s
  Gradle version and wrapper. ([Gradle Documentation][2])

[1]: https://kotlinlang.org/docs/command-line.html?utm_source=chatgpt.com "Kotlin command-line compiler"
[2]: https://docs.gradle.org/current/userguide/compatibility.html?utm_source=chatgpt.com "Compatibility Matrix"
[3]: https://github.com/Kotlin/kotlin-script-examples/blob/master/jvm/main-kts/MainKts.md?utm_source=chatgpt.com "kotlin-script-examples/jvm/main-kts/MainKts.md at master"
