# [PLAN] Section 4: Name Small Responsibilities

## Summary

Add Section 4 to:

```text
astro-website/src/pages/notes/scripting/support-scripts/py.astro
```

Place it after the existing `pathlib` section.

This section should refactor the current inline loop into small named Python functions. The goal is to show that Python
supports the same maintainability discipline as the Kotlin base lesson, but with a different feedback model: Python
keeps the script lightweight, while Kotlin provides stronger compiler-backed guarantees.

## Section Goal

Students should understand that extracting small functions is not decoration. It gives names to responsibilities that
were previously hidden inside `main()`:

- defining the project policy;
- checking one expected path;
- coordinating all checks;
- connecting CLI parsing with the workflow.

The section should also make the Python/Kotlin trade-off explicit:

- Kotlin function signatures are checked by the compiler.
- Python annotations document intent and help external tooling.
- Python’s runtime does not enforce those annotations by default. :contentReference[oaicite:1]{index=1}

## Recommended Design Choice

Prefer this shape:

```python
def check_path(project_root: Path, relative_path: str) -> bool:
    return (project_root / relative_path).exists()
```

Instead of this:

```python
def check_path(project_root: Path, relative_path: str) -> None:
    ...
    print(...)
```

Reason: `check_path()` should own the filesystem check, not the output policy. Section 5 can then discuss how to
communicate results usefully. This improves testability and keeps responsibilities smaller.

## Scope

### Included

- Add a new `NotesSection`.
- Continue the evolving Python script from Section 3.
- Extract named functions:
  - `parse_args() -> argparse.Namespace`
  - `expected_files() -> list[str]`
  - `check_path(project_root: Path, relative_path: str) -> bool`
  - `check_project_layout(project_root: Path) -> None`
  - `main() -> None`
- Keep output simple for now.
- Explain each function by responsibility.
- Compare briefly with Kotlin’s stronger static feedback.

### Excluded

- Kotlin code blocks.
- Dataclasses.
- Result objects.
- `typing.Sequence`.
- Custom result types.
- Property-based tests.
- Linters or type-checker setup.
- Packaging.
- Virtual environments.
- Subprocesses.
- JSON output.

Those topics would broaden the section beyond its local purpose.

## Implementation Changes

1. **Add the section after the `pathlib` section**

   Suggested section id:

   ```text
   h2-name-small-responsibilities
   ```

   Suggested heading:

   ```text
   Nombrar responsabilidades pequeñas
   ```

   Suggested icon:

   ```ts
   icons.FunctionSquare;
   ```

   Use another existing function/code/structure icon if `icons.FunctionSquare` is not available.

2. **Open with the local refactoring motivation**

   Explain that the previous version works, but `main()` is now doing too much:

   - parsing input;
   - converting text into a path;
   - defining expected files;
   - iterating through them;
   - checking existence;
   - printing results.

   The refactor gives those responsibilities names.

3. **Add a brief comparative paragraph**

   Keep the Kotlin comparison conceptual:

   - The Kotlin lesson already used function extraction to name repeated work.
   - Python supports the same design discipline with less ceremony.
   - The difference is the feedback model: Kotlin checks signatures at compile time; Python annotations help readers and
     tools, but are not runtime guarantees by themselves.

4. **Replace the inline loop with a refactored Python example**

   Recommended example:

   ```python
   import argparse
   from pathlib import Path


   def parse_args() -> argparse.Namespace:
       parser = argparse.ArgumentParser(
           description="Check whether a library project contains the expected files.",
       )
       parser.add_argument(
           "project_root",
           help="Project directory to inspect.",
       )
       return parser.parse_args()


   def expected_files() -> list[str]:
       return ["README.md", "LICENSE", "CODE_OF_CONDUCT.md"]


   def check_path(project_root: Path, relative_path: str) -> bool:
       return (project_root / relative_path).exists()


   def check_project_layout(project_root: Path) -> None:
       for relative_path in expected_files():
           if check_path(project_root, relative_path):
               print(f"Found: {relative_path}")
           else:
               print(f"Missing: {relative_path}")


   def main() -> None:
       args = parse_args()
       project_root = Path(args.project_root)
       check_project_layout(project_root)


   if __name__ == "__main__":
       main()
   ```

   This still prints inside `check_project_layout()` so the observable behavior remains close to Section 3, but the
   lower-level filesystem check is now separated from the output decision.

5. **Add an `Explanation` block**

   Explain responsibilities, not syntax trivia:

   - `expected_files()` names the project policy being checked.
   - `check_path()` owns one filesystem existence check and returns whether it passed.
   - `check_project_layout()` coordinates the repeated checks and decides how to report them for now.
   - `main()` stays as the entry point that connects CLI parsing with the workflow.
   - Type annotations document expectations and support tools, but Python does not enforce them at runtime by default.
     :contentReference[oaicite:2]{index=2}

6. **Close with a bridge to Section 5**

   End by explaining that once responsibilities have names, the next design concern is output:

   - Is the output useful for someone running the script locally?
   - Is it predictable enough for later automation?
   - Should printing remain mixed with checking, or should a later refactor separate reporting from analysis?

   Do not implement richer output yet.

## Draft Content Shape

```text
Opening paragraph:
The previous version works, but too many responsibilities are concentrated in main().

Comparative paragraph:
The same principle appeared in the Kotlin lesson: naming repeated responsibilities
makes the script easier to read, change, and reuse.

PythonBlock:
Refactored script with parse_args(), expected_files(), check_path(),
check_project_layout(), main(), and __main__ guard.

Explanation:
Short responsibility-focused list.

Closing paragraph:
Small functions preserve the operational contract as the script grows. The next
section will focus on communicating results usefully.
```

## Review Criteria

The section is acceptable when:

- it appears after the `pathlib` section;
- it continues the existing evolving example;
- it includes no Kotlin code blocks;
- Kotlin appears only in prose;
- function names describe responsibilities, not implementation details;
- `check_path()` returns `bool`;
- `main()` stays short;
- the Python/Kotlin feedback trade-off is explicit;
- the section does not introduce packaging, virtual environments, subprocesses, JSON, dataclasses, result objects, or
  test tooling;
- the closing paragraph prepares Section 5.

## Test Plan

1. **Technical snippet review**

   Confirm that the Python example is syntactically valid and that every function used is defined.

2. **Astro/content validation**

   Run the narrowest available render or content check for the lesson. If no focused test exists, run the relevant Astro
   project check.

3. **Manual editorial review**

   Confirm:

   - Spanish formal-technical prose;
   - inclusive wording;
   - no Kotlin code blocks;
   - clear maintainability trade-off;
   - no drift into future sections.

## Decisions

- Continue the evolving example rather than introducing a disconnected snippet.
- Use `list[str]` instead of `Sequence[str]` to keep the example approachable.
- Use `bool` as the return type of `check_path()` for better separation of concerns.
- Keep richer result modelling for a later lesson or future refactor.
- Keep printing in `check_project_layout()` temporarily to preserve the current observable behavior.
- Keep type-checker, linter, and testing setup out of this section.

## Further Considerations

If Section 5 later needs stronger separation between checking and reporting, the next refactor could introduce a small
result value. For this section, returning `bool` from `check_path()` is enough to show the design improvement without
adding unnecessary structure.
