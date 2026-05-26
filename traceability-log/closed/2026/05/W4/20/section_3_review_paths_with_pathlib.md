# [DONE] Section 3 — Review Paths With `pathlib`

## Summary

Draft Section 3 in `src/pages/notes/scripting/support-scripts/py.astro` as the direct Python comparison to the Kotlin
base section on checking expected project paths.

This section should continue the script arc from `argparse`: take `args.project_root`, convert it into a `pathlib.Path`,
define the expected files, compose paths with `/`, and check each file with `path.exists()`.

The section should teach **filesystem path modelling**, not broader Python scripting.

## Section Goal

Students should understand that Python’s `pathlib` gives the script an explicit object for filesystem paths.

The comparison with Kotlin should stay concise:

- Kotlin converts text into a path-like value with `Path.of(projectPath)` and checks existence with
  `Files.exists(path)`.
- Python converts text with `Path(args.project_root)` and keeps path composition plus existence checks close to the
  `Path` object.

## Scope

### Included

- Add a new `NotesSection` after the `argparse` section.
- Convert `args.project_root` into `Path`.
- Define the expected files.
- Compose candidate paths with `/`.
- Check each candidate with `path.exists()`.
- Print simple `Found:` / `Missing:` lines.
- Explain the relevant `pathlib` operations.

### Excluded

- `argparse` option expansion.
- `type=Path` in `add_argument`.
- Packaging.
- Virtual environments.
- Subprocess execution.
- JSON output.
- Rich result modelling.
- Test tooling.
- Function extraction beyond what is already present.

Function extraction belongs to Section 4.

## Implementation Changes

1. **Add the new section after Section 2**

   Target file:

   ```text
   astro-website/src/pages/notes/scripting/support-scripts/py.astro
   ```

   Suggested section id:

   ```text
   h2-review-paths-with-pathlib
   ```

   Suggested heading:

   ```astro
   Revisar rutas con <PythonInline code="pathlib" />
   ```

   Suggested icon:

   ```ts
   icons.Path;
   ```

   If `icons.Path` does not exist or does not match the local icon set, use the closest filesystem/path icon already
   used in nearby lessons.

2. **Open with a short comparative paragraph**

   The paragraph should connect from Section 2:

   - `argparse` gave the input a name: `project_root`.
   - That value is still text.
   - The next step is to model it as a filesystem path.

   Then compare briefly with Kotlin:

   - Kotlin uses `Path.of(...)` and `Files.exists(...)`.
   - Python uses `Path(...)` and methods/operators from `pathlib`.

3. **Use one evolving Python example**

   Extend the previous script instead of creating disconnected snippets.

   Suggested example shape:

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


   def main() -> None:
       args = parse_args()
       project_root = Path(args.project_root)
       expected_files = ["README.md", "LICENSE", "CODE_OF_CONDUCT.md"]

       for expected_file in expected_files:
           path = project_root / expected_file
           if path.exists():
               print(f"Found: {expected_file}")
           else:
               print(f"Missing: {expected_file}")


   if __name__ == "__main__":
       main()
   ```

   Keep this example intentionally inline. Section 4 will extract names such as `expected_files()` and `check_path()`.

4. **Add an `Explanation` block**

   Explain only the concepts needed for this section:

   - `Path` represents a filesystem path explicitly.
   - `Path(args.project_root)` converts the CLI text into a path object.
   - `project_root / expected_file` composes paths with `pathlib`; here `/` is not numeric division.
   - `path.exists()` checks whether the composed path exists.
   - The loop repeats the same responsibility for each expected project file.

5. **Close with a transition to Section 4**

   End with the maintainability observation:

   - The `pathlib` version is compact and expressive.
   - However, `main()` is now accumulating several responsibilities: parsing input, defining expected files, composing
     paths, checking existence, and printing results.
   - The next section will name those responsibilities with small functions.

## Draft Content Constraints

- Write prose in formal technical Spanish.
- Use inclusive wording.
- Mention Kotlin only in prose or inline references.
- Do not include Kotlin code blocks.
- Do not introduce `type=Path` in `argparse`; keep conversion explicit.
- Do not extract helper functions yet.
- Do not introduce richer result objects yet.
- Do not add JSON, subprocesses, packaging, virtual environments, or testing.
- Keep the section focused on filesystem path modelling.

## Review Criteria

The section is acceptable when:

- it appears after the `argparse` section;
- it continues from `args.project_root`;
- it introduces `pathlib.Path` clearly;
- it checks `README.md`, `LICENSE`, and `CODE_OF_CONDUCT.md`;
- it uses `project_root / expected_file` for path composition;
- it uses `path.exists()` for existence checks;
- all code examples are Python only;
- the Kotlin comparison remains brief and conceptual;
- the section prepares Section 4 by showing why function extraction is useful.

## Relevant Files

- `astro-website/src/pages/notes/scripting/support-scripts/py.astro`

  Add Section 3 after the `argparse` section.

- `astro-website/src/pages/notes/scripting/support-scripts/index.astro`

  Use as the pedagogical reference for the Kotlin section that checks expected paths.

- `astro-website/src/components/semantics/Heading.astro`

  Relevant only if heading icon alignment or layout needs visual verification.

## Verification

1. **Editorial review**

   Confirm that the section:

   - assumes the Kotlin base lesson was already read;
   - does not re-explain support scripts from scratch;
   - stays focused on path modelling.

2. **Technical review**

   Confirm that the Python snippet is syntactically valid and that:

   - `Path` is imported from `pathlib`;
   - `args.project_root` is converted with `Path(args.project_root)`;
   - `project_root / expected_file` is valid `pathlib` composition;
   - `path.exists()` is called on the composed path.

3. **Scope review**

   Confirm that the section does not introduce:

   - helper extraction;
   - `type=Path`;
   - optional CLI flags;
   - packaging;
   - virtual environments;
   - subprocesses;
   - JSON output;
   - testing tools.

4. **Transition review**

   Confirm that the final paragraph naturally motivates Section 4 by pointing out that `main()` now has too many
   responsibilities.

5. **Astro validation**

   Run the narrowest available check:

   - a focused render/component test for this lesson, if one exists;
   - otherwise the closest Astro check command for the site;
   - only use a broader `pnpm` check if no narrower validation is available.

## Decisions

- Use `Path(args.project_root)` explicitly in `main()`.
- Do not use `type=Path` in `argparse` in this section.
- Keep expected files as:

  ```text
  README.md
  LICENSE
  CODE_OF_CONDUCT.md
  ```

- Keep output as simple text lines.
- Keep helper extraction for Section 4.

## Further Considerations

If the later lesson wants stronger CLI typing, a later section can revisit the design and compare explicit conversion in
`main()` with `type=Path` in `argparse`. For now, explicit conversion is pedagogically clearer because it makes the
transition from terminal text to filesystem path visible.
