# [PLAN] Editorial Adjustment Plan: “Documentar una API como parte del producto”

## Summary

Revise the lesson so it works as the closing piece of the current API-design sequence. The lesson should connect directly with API evolution and compatibility: once an API is published, it creates commitments; documentation is the public surface where those commitments become understandable, usable, testable, and maintainable.

The change should remain editorial and focused. Do not split the lesson, introduce a new page, or redesign the course structure. The goal is to reduce visible cognitive load, clarify the internal progression, and close the unit explicitly.

## Editorial Goals

- Present documentation as part of the API contract, not as an accessory.
- Make the lesson progression easier to follow:
  1. published APIs create commitments;
  2. documentation makes those commitments legible;
  3. different documents serve different purposes;
  4. examples make usage concrete and verifiable;
  5. documentation must evolve with the API;
  6. real readers scan, search, copy, and arrive from errors.
- Keep the main reading path compact.
- Move useful but secondary material into `More` blocks.
- Close the whole API-design block without pointing to a non-existent next lesson.

## Non-Goals

- Do not rewrite the full lesson from scratch.
- Do not create a separate lesson for project documentation.
- Do not expand the bibliography unless suitable references already exist in the active catalog.
- Do not introduce new course-navigation changes unless strictly required.
- Do not make inclusive language a detached ethical appendix; keep it tied to API clarity, accessibility, and user experience.

## Key Changes

### 1. Rewrite the abstract

The abstract should explicitly bridge from the previous lesson on API evolution and compatibility.

It should communicate that:

- a published API creates expectations and commitments;
- documentation is where those commitments become visible;
- good documentation describes observable behaviour, constraints, examples, migration paths, and maintenance expectations;
- the lesson closes the API-design sequence by treating documentation as part of the product.

Suggested direction:

> Una API publicada no solo expone funciones, tipos o rutas: también crea compromisos. Esta lección estudia la documentación como el lugar donde esos compromisos se vuelven legibles para quienes usan la biblioteca. El foco estará en documentar el contrato observable, escribir ejemplos útiles y verificables, explicar cambios y migraciones, mantener la documentación junto con la API, usar lenguaje inclusivo y diseñar páginas que respondan a la forma real en que las personas leen documentación técnica.

### 2. Clarify the internal structure

Preserve the current major sections, but make the sequence more explicit.

Recommended order:

1. **Documentation as public contract**
   - API documentation explains what external users can rely on.
   - Avoid framing documentation as a restatement of signatures.

2. **What a public API reference must document**
   - Keep the rubric.
   - Emphasise behaviour, inputs, outputs, errors, constraints, side effects, stability, and examples.

3. **Different documents, different functions**
   - Explain that tutorials, how-to guides, explanations, and references solve different reader problems.
   - Use this section to avoid overloading API reference pages.

4. **Executable and verifiable examples**
   - Connect examples with regression, compatibility, and trust.
   - Examples should be copyable, realistic, and close to public use cases.

5. **Maintaining documentation with the API**
   - Treat documentation updates as part of API evolution.
   - Connect with deprecation, migration notes, changelogs, and compatibility promises.

6. **Inclusive and precise language**
   - Present inclusive language as part of clarity and product quality.
   - Keep practical criteria visible; move long replacement lists if they dominate the section.

7. **Designing for real reading**
   - Keep the focus on scanning, anchors, search, examples, errors, and stable links.

8. **Closing reflection**
   - Close the whole API-design sequence:
     artefacts → libraries as APIs → API design → evolution and compatibility → documentation.

### 3. Move secondary material into `More`

Use `More` blocks to preserve valuable content without making the main path too dense.

Move to `More`:

- **“Los documentos de proyecto también son documentación”**
  - Keep LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, README, changelog, and governance documents here.
  - Frame them as documentation around the API ecosystem, not the central focus of the lesson.

- **ARID**
  - Keep it as an optional deepening principle.
  - It is useful for documentation quality, but not required for the base argument.

Evaluate:

- **Inclusive-language replacement list**
  - Keep the core criterion visible:
    prefer precise, neutral, respectful terms that reduce unnecessary exclusion or ambiguity.
  - Move the long replacement table to `More` if it interrupts the lesson flow.
  - Keep a few representative examples visible if they directly support the explanation.

### 4. Strengthen transitions

Add short transition paragraphs between major blocks so the lesson feels cumulative rather than enumerative.

Useful transition points:

- From contract to rubric:
  - “If documentation is part of the public contract, then the reference must answer the questions that affect correct use.”

- From rubric to document types:
  - “Not every reader problem belongs in the API reference; different document types distribute the explanatory load.”

- From examples to maintenance:
  - “Examples are useful only while they remain true; documentation therefore needs the same maintenance discipline as code.”

- From maintenance to reading experience:
  - “Even accurate documentation can fail if readers cannot find the relevant promise at the moment they need it.”

### 5. Reinforce the closing reflection

Update `closing-reflection` so it closes the current unit/block explicitly.

It should mention the path covered so far:

- software artefacts;
- libraries as reusable products;
- APIs as public contracts;
- API design decisions;
- compatibility and evolution;
- documentation as the readable form of those commitments.

Keep the final question focused:

> ¿Qué promesas necesita encontrar una persona que usa la biblioteca para depender de ella sin leer la implementación?

Avoid references to a “next lesson” unless the course structure actually includes one.

## References Handling

- Search only the active TTL/catalog sources already used by the site.
- Add `ReferencesFromCatalog` only if the sources are already catalogued and directly support this lesson.
- Good candidates, if already present:
  - Diátaxis, for document types and reader needs.
  - Reddy, for API documentation and inclusive language.
  - Write the Docs materials, for documentation practice.
  - Semantic Versioning or compatibility references, if already used in the previous lesson.
- Do not invent bibliography entries.
- Do not add uncatalogued references as part of this editorial pass.

## Test Plan

### Required checks

- Run the existing render test for the documentation lesson.
- Run course-structure tests if the edit touches:
  - lesson metadata;
  - navigation;
  - references;
  - unit registration;
  - heading hierarchy.

### Manual review

Verify that:

- the abstract clearly connects to API evolution and compatibility;
- the lesson reads correctly without opening any `More` block;
- each `More` block contains optional depth, not required conceptual material;
- heading levels remain valid and scannable;
- the inclusive-language section remains practical and not performative;
- `closing-reflection` closes the API-design sequence;
- no text points to a non-existent next lesson;
- no new reference is added unless it already exists in the catalog.

## Acceptance Criteria

- The visible lesson path is shorter and easier to scan.
- The central thesis is clear: documentation is part of the public API contract.
- The section order follows a coherent progression:
  contract → reference rubric → document types → executable examples → maintenance → inclusive language → real reading.
- Secondary project-documentation material is preserved but moved out of the main flow.
- `closing-reflection` closes the current API-design block explicitly.
- Existing render and structure tests pass.
- No uncatalogued or weakly related references are introduced.

## Assumptions

- `documentation` is currently the final lesson in `apiDesignLessons` inside `unit-1.ts`.
- `More` is appropriate for optional depth that enriches the lesson but is not required for the base reading path.
- The goal is a focused editorial improvement, not a structural split.