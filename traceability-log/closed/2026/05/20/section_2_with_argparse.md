## [DONE] Section 2 With `argparse`

Write Section 2 of the Python comparative `support-scripts` lesson as a complete section draft: Astro structure, Spanish
technical prose, and one minimal Python example.

The section should explain how Python makes the input contract explicit with `argparse`, while keeping the comparison
with Kotlin brief and focused. It should continue directly from Section 1, where `$PROJECT_DIR` was introduced as a
positional terminal value, and end by preparing the next section on converting that value into a `Path`.

## Section Goal

Teach that `argparse` lets the script declare its command-line contract instead of manually inspecting raw arguments.

Students should understand that the Python version still receives one project directory argument, but now the script
names that input, documents it, and delegates standard CLI behavior to the Python standard library.

## Scope

### Included

- One positional argument: `project_root`.
- A minimal `parse_args()` helper.
- A minimal `main()` function.
- A brief comparison with Kotlin’s manual `args` validation.
- Explanation of observable CLI behavior:
  - required positional argument;
  - generated help message;
  - standard error when the argument is missing.
- Transition to `pathlib`.

### Excluded

- Optional flags.
- Subcommands.
- Environment variables.
- Configuration files.
- JSON output.
- Packaging.
- Virtual environments.
- External CLI libraries such as Click or Typer.
- File checks with `pathlib`; that belongs to the next section.

## Proposed Section Structure

### 1. Comparative opening paragraph

Start from the previous section:

- `$PROJECT_DIR` was shown as a positional value passed from the terminal.
- In Kotlin, the base lesson can inspect `args` directly and fail manually when the argument is missing.
- In Python, `argparse` lets the script declare the expected input and delegate help/usage/error handling.

The comparison should be short. Do not turn it into a line-by-line Kotlin/Python translation.

### 2. Main Python example

Use one complete, minimal example:

```python
import argparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check whether a library project contains the expected files.",
    )
    parser.add_argument(
        "project_root",
        help="Project directory to inspect.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(f"Checking project: {args.project_root}")


if __name__ == "__main__":
    main()
```

Design notes:

- Keep `project_root` as a string in this section.
- Do not introduce `Path` yet.
- Do not add `type=Path` yet, because that would move the `pathlib` concept into this section.
- Do not add flags such as `--strict`, `--json`, or `--verbose`.
- Keep the example focused on declaring and reading the input contract.

### 3. Technical explanation

Explain the example in three short points:

- `ArgumentParser` describes the command-line interface.
- `add_argument("project_root", ...)` declares a required positional argument.
- `parse_args()` reads the terminal input and returns an object whose `project_root` attribute contains the received
  value.

Mention that `argparse` also provides help and usage output without writing a custom branch for those cases.

### 4. Observable behavior

Show at most two small terminal examples:

```bash
python check_library_layout.py --help
```

and:

```bash
python check_library_layout.py
```

Use prose to explain that the first command displays the generated usage/help text, while the second fails because the
required positional argument is missing.

Avoid pasting a long generated help output unless the surrounding lesson style already expects output blocks. If output
is included, keep it short and mark it as representative rather than exact if formatting may vary by Python version.

### 5. Transition to `pathlib`

End with a bridge:

- `argparse` gives the script a named input contract.
- The received value is still text.
- The next section will convert that value into a filesystem path and use it to check expected project files.

## Suggested Astro Shape

```astro
<NotesSection id="h2-declaring-input-contract">
    <Heading
        headingLevel="h2" Icon={icons.TerminalWindow}
        slot="heading"
    >
        Declarar el contrato de entrada con <PythonInline code="argparse" />
    </Heading>

    <!-- Comparative opening paragraph -->

    <PythonBlock code={`...`} />

    <!-- Technical explanation -->

    <!-- Optional short BashBlock examples for --help and missing argument -->

    <!-- Transition to pathlib -->
</NotesSection>
```

Use the project’s actual Python inline/code block components if their prop names differ.

## Implementation Steps

1. Define the local teaching boundary:
   - Section 2 explains input contracts.
   - It does not perform filesystem checks.

2. Add the section immediately after Section 1 in:

   ```text
   astro-website/src/pages/notes/scripting/support-scripts/py.astro
   ```

3. Use a section title equivalent to:

   ```text
   Declarar el contrato de entrada con argparse
   ```

4. Write the opening paragraph as a direct continuation of Section 1.

5. Add the minimal Python example with:
   - `import argparse`;
   - `parse_args()`;
   - one positional `project_root`;
   - `main()`;
   - `if __name__ == "__main__"`.

6. Explain only the contract-related parts of the code.

7. Optionally add short command examples for `--help` and missing argument behavior.

8. Close with a transition to `pathlib`.

9. Review the section for:
   - Spanish formal-technical prose;
   - inclusive language;
   - no Kotlin code blocks;
   - no premature `Path`;
   - no CLI features beyond the single required positional argument.

## Relevant Files

- `astro-website/src/pages/notes/scripting/support-scripts/py.astro`

  Insert the new Section 2 after the existing execution section.

- `astro-website/src/pages/notes/scripting/support-scripts/index.astro`

  Use only as pedagogical reference for the Kotlin base lesson’s manual argument handling.

- `astro-website/src/pages/notes/scripting/support-scripts/py.astro`

  Ensure continuity with Section 1 and the future `pathlib` section.

- `astro-website/src/pages/notes/scripting/support-scripts/index.astro`

  Confirm that the comparison remains faithful to the base lesson without duplicating code.

## Verification

1. **Editorial review**

   Confirm that the section assumes prior reading of the Kotlin lesson and does not re-explain support scripts from
   zero.

2. **Technical review**

   Confirm that the Python snippet is syntactically valid and executable as a minimal `argparse` example.

3. **Scope review**

   Confirm that the section does not introduce:

   - packaging;
   - virtual environments;
   - external CLI libraries;
   - JSON output;
   - subprocesses;
   - `pathlib` logic;
   - optional flags.

4. **Comparative review**

   Confirm that Kotlin appears only in prose and only to explain the design difference: manual raw-argument validation
   versus declared CLI contract.

5. **Transition review**

   Confirm that the final paragraph prepares the `pathlib` section by stating that `project_root` is still text and will
   become a filesystem path next.

## Decisions

- Use `argparse`, not an external CLI library.
- Use one required positional argument: `project_root`.
- Keep `project_root` as text in this section.
- Defer `pathlib.Path` conversion to the next section.
- Include a complete but minimal example.
- Keep the comparison with Kotlin brief and conceptual.
