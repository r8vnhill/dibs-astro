# [PLAN] Lesson 3 `documentation`

## Summary

Create the third lesson in the `api-design` block: **“Documentar una API como parte del producto”**.

This lesson should close the progression already established by `fundamentals` and `evolution`: first, an API is designed as a domain-facing contract; then it evolves without breaking consumers; finally, it is documented so other people can understand, adopt, migrate, and trust the library. This preserves the central thesis of the original plan: documentation is not a later accessory, but the layer that makes the behavioural contract of an API explicit. 

The lesson should focus on **library design**, not on a specific documentation generator. Tools such as Dokka, Doxygen, Sphinx, or TypeDoc may be mentioned only as examples of implementation mechanisms, not as the main topic.

## Scope

### In scope

* Add the new lesson page.
* Register the route in `coursePaths`.
* Update the `api-design` lesson sequence.
* Add or update tests for path registration, course ordering, and page rendering.
* Write a conceptual lesson about documentation as part of the public API contract.

### Out of scope

* A full tutorial on Dokka, Doxygen, Sphinx, TypeDoc, or Markdown tooling.
* A full documentation system refactor.
* Deep repetition of the previous `evolution` lesson.
* Tool-specific syntax beyond small illustrative examples.
* Integrating new references into the bibliography catalog.
* Adding Turtle reference records, usage records, or regenerated bibliography artifacts.

## Implementation Changes

### 1. Add the lesson route

Create:

```txt
src/pages/notes/software-libraries/api-design/documentation/index.astro
```

The page should follow the same structural conventions used by the existing `api-design` lessons.

Expected lesson metadata:

```ts
title: "Documentar una API como parte del producto"
description: "Aprende por qué la documentación forma parte del contrato público de una biblioteca: comportamiento, ejemplos, referencia, migración, mantenimiento y experiencia de uso."
```

### 2. Register the course path

Add:

```ts
coursePaths.softwareLibraries.apiDesign.documentation =
  "/notes/software-libraries/api-design/documentation"
```

Also ensure that any internal consumer expecting trailing-slash-normalized paths receives:

```txt
/notes/software-libraries/api-design/documentation/
```

### 3. Update the `api-design` sequence

Update the sequence to:

```ts
[
  "fundamentals",
  "evolution",
  "documentation",
]
```

Conceptual ordering:

1. `fundamentals`: design the API from the domain.
2. `evolution`: evolve the API without breaking compatibility.
3. `documentation`: make the API contract understandable, teachable, and maintainable.

### 4. Treat source notes as editorial inputs only

Use these traceability notes to shape the lesson content, but do not integrate them into the bibliography catalog in this iteration:

* `traceability-log/# Reddy, M. (2024). Documentation (Secon. Documentation (Secon. Documentation (Secon`
* `traceability-log/# How to write software documentation.md`
* `traceability-log/# Documentation principles. (n.d.).md`

Do not add or modify Turtle fragments, generated bibliography artifacts, or catalog usage records. If the lesson needs a references block later, handle that in a separate bibliography-focused plan.

## Editorial Structure

## 1. La documentación completa el contrato de la API

Goal: connect directly from `evolution`.

Key points:

* Versioning, compatibility tests, and changelogs are not enough if consumers cannot understand what changed or how to use the API.
* A signature such as `sqrt(value)` does not explain:

  * whether negative values are valid;
  * what error is produced;
  * what precision is promised;
  * whether the function is deterministic;
  * whether it has side effects;
  * what behaviour changed between versions.
* Good names reduce ambiguity, but they do not replace behavioural documentation.

Recommended example:

```kotlin
fun sqrt(value: Double): Double
```

Then contrast it with a documented version that explains valid inputs, error behaviour, precision expectations, and examples.

## 2. Qué debe documentar una API pública

Goal: provide a practical rubric.

Public API documentation should cover, when relevant:

* purpose;
* valid inputs;
* return value;
* errors and exceptional cases;
* preconditions;
* postconditions;
* invariants;
* side effects;
* units;
* precision;
* complexity;
* ownership or lifetime constraints;
* thread-safety;
* versioning and deprecation;
* examples.

Use a small Kotlin example, preferably library-oriented and not application-specific.

Suggested example theme:

```kotlin
fun parseVersion(input: String): Version
```

This is better than `sqrt` for the course because it is closer to API/library design: parsing, validation, errors, domain modelling, and migration are all visible.

## 3. No toda documentación cumple la misma función

Goal: avoid treating “documentation” as a single artefact.

Distinguish:

* README / getting started;
* tutorial;
* how-to guide;
* conceptual guide;
* API reference;
* examples;
* changelog / release notes;
* migration guide;
* troubleshooting;
* licence;
* contributing guide.
* code of conduct.

Use the “ingredients vs recipes” distinction carefully:

* API reference lists the ingredients.
* Guides and examples show recipes.
* Migration guides help people cross version boundaries.
* Contributing docs help sustain the library as a project.
* `LICENSE`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` communicate usage rights, collaboration expectations, and community norms around the project.

This section should explicitly separate user-facing documentation from contributor-facing documentation.

## 4. Ejemplos, tests y documentación ejecutable

Goal: connect documentation with testing without collapsing one into the other.

Key points:

* Examples are part of the API experience.
* Examples should cover common and representative use cases, not every possible variation.
* Tests lock behaviour; examples teach use.
* Documentation examples should be verified when possible.
* Executable examples reduce drift between code and docs.

Recommended message:

> A test can prove that a behaviour exists, but an example explains why someone would use it.

Suggested small example:

```kotlin
val version = parseVersion("1.4.2")

println(version.major) // 1
println(version.minor) // 4
println(version.patch) // 2
```

Then show how the corresponding test can protect the example from becoming stale.

## 5. Documentación mantenible: cerca, única y actual

Goal: make maintenance a design concern.

Use the principles already present in the original plan:

* nearby;
* unique;
* current.

Add the ARID vs DRY distinction:

* Some repetition improves local readability.
* Canonical facts should not be duplicated across many places.
* Repeated examples are acceptable when they serve different reader goals.
* Repeated version numbers, compatibility guarantees, or support policies should have a single source of truth.

Important risk:

> Incorrect documentation is worse than missing documentation because it creates false confidence and damages trust.

## 6. Diseñar para lectura real

Goal: close with documentation as user experience.

Cover:

* skimmable;
* discoverable;
* addressable;
* cumulative;
* complete;
* consistent.

Also include:

* people arrive from search engines, README links, compiler errors, changelogs, and issue discussions;
* readers scan before reading deeply;
* examples are often copied before the surrounding explanation is read;
* headings, anchors, short sections, and predictable structure are part of API usability;
* inclusive language is part of communicative quality and reader trust.

Close by linking documentation back to API evolution:

* versioned documentation;
* migration guides;
* deprecation notes;
* examples updated across versions.

## Pedagogical Closure

End with three ideas:

1. A library is not delivered only as compilable code.
2. A documented API makes intention, behaviour, limits, and migration paths visible.
3. Documentation reduces uncertainty and allows other people to depend on the library with confidence.

Then connect forward to future course topics:

* publication;
* packaging;
* developer experience;
* testing;
* automation;
* maintenance;
* release workflows.

## Acceptance Criteria

### Course structure

* `coursePaths.softwareLibraries.apiDesign.documentation` exists.
* The path resolves to `/notes/software-libraries/api-design/documentation`.
* Internal consumers can resolve the trailing-slash form.
* The `api-design` sequence contains exactly:

```ts
["fundamentals", "evolution", "documentation"]
```

### Lesson page

* The page renders successfully.
* The lesson title appears.
* The description appears in the expected metadata or page structure.
* The page contains at least these conceptual sections:

  * API contract;
* public API documentation rubric;
* documentation types;
* project-level documents such as `CONTRIBUTING.md`, `LICENSE`, and `CODE_OF_CONDUCT.md`;
* examples/tests;
* maintainability;
* reading/discoverability.

## Test Plan

### 1. Path tests

Update:

```txt
src/data/course-structure/__tests__/paths.test.ts
```

Add tests that verify:

* `coursePaths.softwareLibraries.apiDesign.documentation`;
* the raw path without trailing slash;
* the normalized path with trailing slash;
* the mapping table entry, if the file uses one.

Suggested BDD-style names:

```ts
test("exposes the API documentation lesson path")
test("normalizes the API documentation lesson path for internal consumers")
test("includes the API documentation lesson in the course path mapping")
```

### 2. Course structure validation

Update:

```txt
src/data/__tests__/course-structure.validation.test.ts
```

Expected order:

```ts
["fundamentals", "evolution", "documentation"]
```

Suggested BDD-style name:

```ts
test("orders the API design lessons from contract design to evolution to documentation")
```

### 3. Render test

Add a render test only if the project already has a lightweight convention for lesson render tests.

Verify:

* page title;
* at least one core section heading;
* no missing imports or render-time errors.

Suggested BDD-style name:

```ts
test("renders the API documentation lesson")
```

### 4. Commands

Run the narrow tests first:

```sh
pnpm test:unit -- src/data/course-structure/__tests__/paths.test.ts src/data/__tests__/course-structure.validation.test.ts
```

If a render test is added:

```sh
pnpm test:astro
```

## Refined Assumptions

* The lesson is conceptual and design-oriented.
* Kotlin should be the default example language for consistency with the course.
* Python should be avoided here unless there is a specific comparative reason.
* Reddy is the primary API-design reference.
* Write the Docs supports documentation maintainability and reader-centred principles.
* Diátaxis is useful for distinguishing documentation types.
* Bibliography catalog integration is intentionally deferred to a separate plan.
* The lesson should not repeat `evolution`; versioning, changelogs, and migration should appear only through the lens of documentation.
* The lesson ID and slug are both `documentation`.
* The public title is **“Documentar una API como parte del producto”**.
