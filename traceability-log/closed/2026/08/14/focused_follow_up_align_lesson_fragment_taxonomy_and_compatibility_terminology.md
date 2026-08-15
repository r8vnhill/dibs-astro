# Focused follow-up — Align lesson fragment taxonomy and compatibility terminology

## Close-out — 14 August 2026

Completed with `h3-observable-change` as the canonical target. The subsection remains nested below `h2-encapsulation`,
renders an H3 heading, and retains its ordered exercise and closed disclosure.

The current repository had two references to the former ID: the lesson definition and its focused render test; both were
migrated. Repository search found no current inbound links.

No compatibility target was retained. The public deployment is still the April lesson version and does not contain the
observable-change subsection or the former fragment, while repository history shows the former ID was introduced after
that deployment. The rename therefore does not invalidate a published fragment contract.

The API-stability warning now uses the approved neutral compatibility terminology while preserving the distinction
between signature changes and behavioral incompatibilities.

Verification passed: the focused Astro render test (five tests), current-reference search, Astro static check (existing
deprecation warnings only), production build (67 pages), generated HTML inspection (one canonical target/H3/ordered
exercise and no open disclosure), and `git diff --check`.

## Goal

Align the observable-change subsection’s fragment identity with the repository’s lesson-section taxonomy, while
replacing two lesson-local formulations with neutral compatibility terminology.

Preserve:

- the subsection’s existing H3 position under **Encapsulación**;
- exercise structure and disclosure behavior;
- lesson ordering;
- citation behavior;
- all unrelated lesson content.

The intended production changes are limited to:

1. the fragment identifier;
2. the two Spanish formulations concerning API incompatibility.

---

# TDD cycle 1 — Characterize the subsection contract before renaming it

## Goal

Make the current semantic structure executable before changing the fragment identifier.

## Scope

Update the focused render-contract test for the library lesson.

Characterize that the observable-change subsection:

- is nested beneath the encapsulation section;
- is represented by an H3-level heading;
- contains the ordered classification exercise;
- contains the collapsed answer disclosure;
- is addressable through a stable fragment identifier.

## Red

Add a BDD-style assertion describing the **desired** contract:

```text
given the observable-change subsection
when the lesson is rendered
then it remains an H3 subsection under Encapsulación
and its fragment identifier follows the canonical subsection taxonomy
```

Also characterize the exercise:

```text
given the observable-change subsection
when it is rendered
then it contains the ordered classification exercise
and the proposed classification remains collapsed by default
```

This should fail only on the fragment-taxonomy expectation.

## Green

Rename:

```text
h2-observable-change
```

to:

```text
h3-observable-change
```

**only if `h3-*` is in fact the repository’s canonical convention for H3 fragments.**

Before applying the rename, verify the nearby lesson/component taxonomy. If fragment IDs generally encode heading level,
retain that convention consistently.

If the repository instead already favors semantic fragments independent of heading depth, prefer:

```text
observable-change
```

rather than introducing another level-coupled identifier.

The important architectural rule is:

> Do not invent a new fragment convention solely for this subsection.

This follows the guideline requiring a uniform taxonomy across implementation, tests, and documentation.

## Refactor

Keep the test focused on semantic structure and IDs.

Do not assert:

- Tailwind classes;
- incidental wrapper nesting;
- complete rendered HTML snapshots.

## Acceptance criteria

- the subsection remains H3;
- it remains under Encapsulación;
- the ordered exercise remains present;
- the disclosure remains collapsed by default;
- the fragment follows the repository’s established taxonomy.

## Non-goals

- changing the subsection to H2;
- restructuring the exercise;
- changing disclosure behavior;
- modifying surrounding lesson sections.

---

# TDD cycle 2 — Resolve fragment compatibility deliberately

## Goal

Ensure the fragment rename does not silently leave project-owned references inconsistent, and make the compatibility
decision explicit.

## Scope

Search all project-owned source, tests, configuration, generated-content inputs, and documentation for:

```text
h2-observable-change
#h2-observable-change
```

Exclude historical traceability records from required migration unless those records intentionally represent current
links.

## Red

Add the smallest practical fragment-contract assertion proving that the **new** fragment exists and the old fragment is
no longer used by current project-owned navigation/content.

For example:

```text
given the rendered lesson
when the observable-change subsection is inspected
then exactly one canonical fragment target exists for that subsection
```

At repository level, add a deterministic search check as verification rather than embedding shell commands into the test
suite unless fragment integrity is already tested centrally.

## Green

Update every current project-owned reference atomically.

### Compatibility decision

I would change one part of the original plan:

> “Do not add a hash-redirect compatibility mechanism because the repository has no migration policy.”

That is not, by itself, enough justification.

Fragment IDs behave like externally addressable navigation identifiers. Changing one can invalidate bookmarks, links
from course materials, search results, or external references. The guidelines explicitly prioritize behavior
preservation and stable public contracts.

Use this decision rule:

- **If the lesson has not been published with this fragment, or there is evidence the fragment is internal-only:**
  rename directly and add no compatibility mechanism.
- **If the fragment may already be externally referenced:** either retain a lightweight compatibility target temporarily
  or record the fragment change explicitly as an intentional compatibility change.

Do not build a generalized redirect framework for one anchor.

If compatibility is required, prefer the smallest static solution supported by the existing lesson architecture rather
than client-side JavaScript.

## Refactor

If this mismatch reveals that many lesson IDs duplicate heading-level information manually, record a separate future
improvement:

> derive or validate heading-level fragment taxonomy centrally.

Do not expand this focused change into a site-wide fragment migration.

## Acceptance criteria

- exactly one canonical new fragment exists;
- all current project-owned references use it;
- no stale current reference to the old fragment remains;
- historical traceability material is preserved where appropriate;
- the compatibility decision is documented with evidence rather than inferred from the absence of a migration framework.

---

# TDD cycle 3 — Replace lesson-local wording with neutral compatibility terminology

## Goal

Use precise compatibility language without changing the conceptual distinction being taught.

## Scope

Change the warning title from:

> `La firma no es la única forma de romper una API`

to:

> **`Una incompatibilidad no siempre cambia la firma`**

Rewrite the opening sentence so it describes observable technical consequences rather than using unnecessary destructive
wording.

Recommended formulation:

> **`Cambiar nombres o tipos puede hacer que el código consumidor deje de ser compatible de inmediato, pero también pueden aparecer incompatibilidades sin cambiar ninguna firma.`**

Then preserve the existing explanation that changing:

- result meaning;
- effects;
- identity guarantees;

can produce **behavioral incompatibilities** without altering the signature.

This terminology is more precise because “compatibility” is the actual software-evolution concept being discussed, while
the project guidelines explicitly require neutral terminology where an accurate alternative exists.

## Red

Extend the focused render test:

```text
given the API-stability warning
when the lesson is rendered
then it describes signature and behavioral incompatibility using the approved terminology
```

The test should assert only stable, meaningful text fragments—not the entire paragraph verbatim.

Also add a negative regression assertion for the two specific project-local formulations being removed, if textual
policy tests are already accepted in this repository.

## Green

Apply only the two lesson-local terminology changes.

Do not perform an unrestricted repository-wide replacement of words such as `romper`: standardized phrases, quotations,
historical material, or contexts with different semantics may require separate judgment.

## Refactor

Keep terminology assertions narrow enough that future editorial improvements do not create unnecessary test churn.

## Acceptance criteria

- the warning heading is `Una incompatibilidad no siempre cambia la firma`;
- the introduction describes consumer-code incompatibility directly;
- the distinction between signature and behavioral compatibility remains intact;
- no lesson-local instance targeted by this change retains the previous wording.

---

# TDD cycle 4 — Add a lightweight structural consistency guard

## Goal

Reduce the chance that another lesson subsection receives an inconsistent heading-level fragment without requiring a
broad framework.

## Scope

If the repository convention is explicitly:

```text
H2 section → h2-*
H3 subsection → h3-*
```

add a small contract test for the lesson—or preferably the existing lesson-rendering contract layer—that checks the
relationship for authored lesson sections.

For example:

```text
given a lesson section whose canonical heading is H2
then a level-prefixed fragment uses h2-

given a lesson subsection whose canonical heading is H3
then a level-prefixed fragment uses h3-
```

### Important constraint

Only add this if the convention is actually intentional and repository-wide.

If fragment IDs are not formally level-prefixed across the project, **do not codify an accidental pattern**. In that
case, keep this cycle limited to the specific regression test from cycle 1.

This is where the guidelines’ “generalization over specialization” principle needs to be balanced against their warning
against speculative abstraction.

## Testing technique

DDT is appropriate if several heading levels share the same rule:

```text
H2 → h2-
H3 → h3-
...
```

PBT, fuzzing, differential testing, and state-machine testing are not justified for this tiny static taxonomy rule.

## Acceptance criteria

- an established taxonomy is enforced if one exists;
- no new convention is invented merely to support this change;
- the test remains independent of presentation classes.

---

# Verification

Run the focused lesson render test first:

```powershell
pnpm vitest run <focused-library-lesson-render-test>
```

Then confirm current project-owned references:

```text
h2-observable-change
#h2-observable-change
```

have no remaining matches outside intentionally historical material.

Run the repository’s canonical static validation rather than introducing parallel commands where an existing wrapper
exists. At minimum:

```powershell
pnpm exec astro check
git diff --check
```

and the relevant broader validation command from `package.json`.

Also perform a production build if fragment links are validated only after static generation.

### Production artifact check

Inspect the generated lesson HTML and verify:

```text
exactly one new canonical fragment target exists
the heading remains H3
the exercise remains ordered
the disclosure remains closed
```

No client hydration should be introduced.

---

# Assurance strategy

For this change, the testing techniques should be considered explicitly rather than all applied indiscriminately.

| Technique                 | Decision                 | Purpose                                                           |
| ------------------------- | ------------------------ | ----------------------------------------------------------------- |
| BDD/example tests         | **Required**             | Fragment, hierarchy, exercise, terminology                        |
| DDT                       | **Useful conditionally** | Heading-level taxonomy matrix                                     |
| Contract testing          | **Required**             | Heading ↔ fragment relationship                                   |
| Static repository search  | **Required**             | Stale fragment references                                         |
| Production artifact check | **High value**           | Actual generated anchor                                           |
| Static analysis           | **Required**             | Astro/template correctness                                        |
| PBT                       | **Not justified**        | Tiny finite taxonomy                                              |
| Metamorphic testing       | **Not justified**        | No useful transformation adds assurance                           |
| Mutation testing          | **Low value here**       | Mostly static content/identifier edits                            |
| Differential testing      | **Not justified**        | No independent implementation                                     |
| Fuzz testing              | **Not applicable**       | No parser or external input boundary                              |
| Mock testing              | **Avoid**                | No effectful dependency                                           |
| Browser E2E               | **Not required**         | Static fragment existence is sufficiently testable without layout |
| Snapshot testing          | **Avoid**                | Too broad for these focused semantics                             |

---

# Documentation and traceability

Create a focused close-out record containing:

- the incorrect fragment taxonomy;
- the selected canonical fragment;
- all migrated current references;
- compatibility decision and rationale;
- terminology changes;
- focused test evidence;
- static-search result;
- static/build verification commands.

Update the originating open traceability plan to mark this follow-up complete, but **do not close the larger
platform-modernization plan**.

Do not update `AGENTS.md`: the existing project guidance already establishes neutral terminology, and this change does
not introduce a new repository-wide policy.

If cycle 4 establishes a previously undocumented repository-wide fragment taxonomy, document **that taxonomy** in the
appropriate authoring/maintainer documentation rather than in an implementation-specific comment.

---

## Suggested execution order

```text
1. RED: characterize H3 + canonical fragment contract
2. GREEN: rename the fragment
3. RED/GREEN: update and verify all current references
4. RED: characterize neutral compatibility wording
5. GREEN: update the two lesson-local formulations
6. Add taxonomy guard only if the convention is genuinely repository-wide
7. Run focused tests + static search
8. Run Astro/static/build checks
9. Record compatibility decision and close the focused traceability item
```

The main improvement I would make to your original plan is **not to assume that “no fragment migration policy exists”
means backward compatibility is irrelevant**. The fragment is observable navigation behavior. First determine whether it
has a meaningful external compatibility surface; then either preserve it minimally or explicitly accept the intentional
incompatibility. Everything else in the change can remain quite small.
