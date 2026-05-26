# [DONE] Section 1: Ejecutar un script Python como herramienta local

## Summary

Introduce the operational shape of the Python support script before discussing argument parsing, filesystem checks,
validation, or function extraction.

This section should play the same structural role as the base lesson’s execution section: show how the tool is invoked,
name the script, identify the project directory argument, and establish the first comparison with Kotlin scripting.

The section must be short, comparative, and focused on execution only.

## Teaching Goal

After this section, students should understand that the Python version starts as a regular `.py` file executed through
the Python interpreter:

```bash
python check_library_layout.py $PROJECT_DIR
```

They should also understand the first trade-off:

- Python reduces ceremony for a small local support tool.
- Kotlin scripting may fit better when the script needs close integration with a JVM, Gradle, or Kotlin-first codebase.

## Implementation Changes

1. Place this as the first body `NotesSection` in:

   ```text
   astro-website/src/pages/notes/scripting/support-scripts/py.astro
   ```

   It should appear after the `Abstract` and before the `argparse` section.

2. Use this section title:

   ```text
   Ejecutar un script Python como herramienta local
   ```

3. Use this section id:

   ```text
   h2-running-python-script
   ```

4. Use a terminal-oriented icon, preferably:

   ```ts
   icons.TerminalWindow;
   ```

   Match the base lesson’s execution section icon if it already uses a different terminal icon.

5. Introduce the script name:

   ```text
   check_library_layout.py
   ```

6. Show one canonical invocation pattern:

   ```bash
   python check_library_layout.py $PROJECT_DIR
   ```

7. Show one concrete local invocation:

   ```bash
   python check_library_layout.py .
   ```

   Explain briefly that `.` represents the current directory.

8. Compare explicitly in prose:

   - Kotlin uses a `.main.kts` script executed through `kotlin`.
   - Python uses a regular `.py` file executed through the Python interpreter.
   - Python has less startup ceremony for this kind of small local tool.
   - Kotlin may remain preferable when the support script depends on JVM, Gradle, or existing Kotlin project APIs.

9. End with a transition to the next section:

   - `$PROJECT_DIR` is currently just a positional command-line value.
   - The next section will make that input contract explicit with `argparse`.

## Suggested Section Shape

```text
<NotesSection id="h2-running-python-script" icon={icons.TerminalWindow}>
  <Heading>Ejecutar un script Python como herramienta local</Heading>

  Paragraph 1:
  Situate the script as the Python version of the Kotlin support-script example.
  Mention the same goal: checking whether a project contains expected files.

  Paragraph 2:
  Explain that the Python version can start as a regular `.py` file invoked with
  the Python interpreter.

  BashBlock:
  python check_library_layout.py $PROJECT_DIR

  Paragraph 3:
  Explain the placeholder `$PROJECT_DIR`.

  BashBlock:
  python check_library_layout.py .

  Paragraph 4:
  Compare Python and Kotlin execution models, then transition to `argparse`.
</NotesSection>
```

## Draft Content Constraints

- Keep the section to roughly 4 short paragraphs and 2 command blocks.
- Mention Kotlin only in prose.
- Do not include Kotlin code blocks.
- Do not introduce `argparse` code yet.
- Do not introduce `pathlib`.
- Do not discuss validation logic.
- Do not extract functions yet.
- Do not discuss packaging, virtual environments, shebangs, `python -m`, or executable file permissions.
- Do not explain what a support script is from scratch.

## Test And Review Criteria

The section is acceptable when:

- it appears before the `argparse` section;
- it uses the expected title and id;
- it contains only shell command examples;
- it uses `check_library_layout.py` consistently;
- both command examples match the later positional-argument contract;
- Kotlin is mentioned only for comparison in prose;
- no Kotlin code block appears;
- `argparse`, `Path`, validation, and function extraction are deferred;
- the section ends by preparing the next section on CLI contracts.

## Assumptions

- The Python script name is `check_library_layout.py`.
- The course prose uses `python`, not `python3` or `py`, for the canonical command.
- Environment setup, packaging, virtual environments, shebangs, module execution, and executable permissions are
  intentionally out of scope for this section.
