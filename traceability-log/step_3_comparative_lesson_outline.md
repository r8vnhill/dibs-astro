# [PLAN] Step 3: Comparative Lesson Outline

## Summary

Design the outline for `support-scripts/py.astro` as a compact comparative lesson that assumes the Kotlin base lesson
has already been read.

The lesson should revisit the same support-script responsibilities from Python: execution, CLI inputs, file checks,
small reusable functions, user-facing output, and maintainability. The goal is not to teach support scripts again, but
to show how Python changes the ergonomics, guarantees, and trade-offs of the same design problem.

## Pedagogical Goal

By the end of the comparative lesson, students should understand that Python is well suited for lightweight
project-local tooling because it offers:

- low ceremony for executable scripts;
- strong standard-library support for CLI parsing through `argparse`;
- concise filesystem modelling through `pathlib`;
- simple function extraction for reusable scripting logic.

They should also understand the main trade-off: Python does not provide Kotlin’s static feedback by default, so
maintainable scripts require explicit discipline through type annotations, tests, linters, and conventions.

## Non-Goals

This outline should not expand the lesson into:

- Python packaging;
- virtual environments;
- dependency management;
- subprocess orchestration;
- structured JSON output;
- generic Python scripting;
- a full replacement for the Kotlin base lesson.

Those topics can appear as brief forward references, but they should not become the centre of this comparative page.

## Proposed Outline

### ~~Section 1: Ejecutar un script Python como herramienta local~~

Compare the operational shape of a Python script with the Kotlin `.main.kts` execution model.

Use a short command example such as:

```bash
python check_library_layout.py .
```

Main points:

- Python has lower startup ceremony for small local tools.
- The script can be read as a regular file plus an interpreter invocation.
- Kotlin scripting can be a better fit when the project already lives in the JVM ecosystem and the script benefits from
  staying close to Kotlin APIs, Gradle conventions, or existing library code.

Keep this section short. Its role is to establish the execution model, not to explain Python installation or packaging.

### Section 2: Declarar el contrato de entrada con `argparse`

Introduce `argparse.ArgumentParser` as the Python standard-library mechanism for declaring a small CLI contract.

Use a Python-only example that accepts a project root path.

Main points:

- Kotlin can validate `args` directly, which keeps the example explicit but also requires manual help and error
  handling.
- Python’s `argparse` provides a ready-made contract for arguments, help text, usage messages, and invalid-input errors.
- This is a concrete Python advantage for small support scripts.

The official Python documentation describes `argparse` as a standard module for user-friendly command-line interfaces
that can generate help/usage output and report invalid arguments automatically. 

### Section 3: Revisar rutas con `pathlib`

Use `pathlib.Path` to represent the project root and expected files.

Suggested expected files:

```text
README.md
LICENSE
CODE_OF_CONDUCT.md
```

Main points:

- Both Kotlin and Python can model filesystem paths explicitly.
- Kotlin commonly relies on `java.nio.file.Path` and `Files.exists`.
- Python’s `pathlib` is concise for small scripts because path joining and file checks stay close to the `Path` object.
- This concision is ergonomic, but it does not remove the need for clear function boundaries.

The official Python documentation presents `pathlib` as an object-oriented API for filesystem paths, with path classes
that model operating-system-specific semantics. 

### Section 4: Nombrar responsabilidades pequeñas

Extract the script into small functions.

Suggested functions:

```text
parse_args()
expected_files()
check_path()
check_project_layout()
main()
```

Main points:

- The design principle is the same as in the Kotlin lesson: name responsibilities instead of leaving all logic in the
  entry point.
- Python supports the same modular discipline, even though the language does not force it.
- Type annotations can make these functions easier to read and check, but they are optional and require tooling to
  become a real feedback mechanism.

This section should include the strongest maintainability comparison: Kotlin pushes more feedback into the compiler;
Python makes the code lightweight, but the project must decide how much static checking to add.

### Section 5: Comunicar resultados de forma útil

Keep the output close to the base lesson’s operational contract.

Use simple status lines such as:

```text
Found README.md
Missing LICENSE
```

Main points:

- The script should communicate findings in a way that is useful for a person running it locally.
- Output should remain predictable enough to support later automation.
- Avoid introducing JSON in this lesson unless the base lesson already requires it; structured output would broaden the
  comparison beyond the immediate support-script example.

A small result structure may be introduced only if it clarifies the code without turning the lesson into a
data-modelling lesson.

### Section 6: Ventajas y límites de Python para scripts de apoyo

Make the comparative judgment explicit.

Python advantages:

- faster path from idea to usable local tool;
- concise filesystem operations with `pathlib`;
- built-in CLI support with `argparse`;
- low ceremony for project-local automation.

Python trade-offs against Kotlin:

- weaker static refactoring guarantees by default;
- type annotations are not enforced by the interpreter alone;
- larger scripts need tests, linters, and type checkers to stay maintainable;
- integration may be less direct in a Kotlin/JVM-first project.

Keep the section framed around software-library support tooling, not generic language preference.

### Abstract

Write this after the body sections and conclusion are drafted, even though it will appear at the top of the final
`py.astro` page.

State that the lesson revisits the Kotlin support-script example from Python.

Emphasise only the through-line that the completed lesson actually develops: Python as a practical option for
project-local tooling because it reduces startup ceremony and offers mature standard-library support for command line
interfaces and filesystem operations.

Avoid re-teaching what a support script is. The abstract should explicitly assume that the base Kotlin lesson already
covered that motivation.

### ConclusionsLayout

Close with a comparative conclusion.

Required conclusion points:

- The reusable-script design criteria remain the same across languages.
- Python reduces ceremony for local tooling.
- `argparse` and `pathlib` make common support-script responsibilities compact.
- Small functions still matter; Python does not remove the need for design.
- Kotlin offers stronger static feedback when scripts grow with the codebase.
- Python scripts can remain maintainable when paired with annotations, tests, linters, and clear project conventions.

## Suggested Code Example Arc

The lesson should avoid many disconnected snippets. Prefer one example that evolves across sections:

1. Run the script with a project root.
2. Parse the root with `argparse`.
3. Convert it into a `Path`.
4. Check required files.
5. Print found/missing results.
6. Refactor into named functions.

This keeps the lesson compact and mirrors the base lesson’s progression without duplicating Kotlin code.

## Drafting Order

Write the lesson in this order:

1. Body sections, from execution model through Python advantages and trade-offs.
2. `ConclusionsLayout`, using the completed comparison to identify the actual key points.
3. `Abstract`, last, so it previews the lesson that was actually written instead of committing too early to a thesis.

## Public Interfaces And Components

Target page:

```text
astro-website/src/pages/notes/scripting/support-scripts/py.astro
```

Expected existing components:

- `NotesLayout`
- `NotesSection`
- `Heading`
- `Abstract`
- `ConclusionsLayout`
- `PythonBlock`
- `PythonInline`
- `BashBlock` or the project’s terminal-style command block
- `OutputBlock`
- semantic text/list components used by nearby lessons

Do not create a new language-link component. `PythonLink` already exists and will be used in a later step when wiring
the link from `index.astro`.

## Review Criteria

The outline is acceptable when it ensures that the final lesson will:

- use Spanish formal-technical prose;
- use inclusive wording;
- assume the Kotlin lesson was already read;
- compare against Kotlin explicitly;
- include no Kotlin code blocks;
- use only Python examples;
- include at least one clear Python advantage;
- include at least one real Python/Kotlin trade-off;
- stay focused on support scripts for reusable project tooling;
- avoid drifting into packaging, subprocess orchestration, or structured output.

## Assumptions

- The comparative page slug remains `py.astro`.
- The final link from `index.astro` will be handled in a later step with `LinksLayout` and `PythonLink`.
- The lesson should stay close to the base example and avoid expanding into a broader Python tooling lesson.
