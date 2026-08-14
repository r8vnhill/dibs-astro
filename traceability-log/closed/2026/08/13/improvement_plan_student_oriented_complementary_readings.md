# Improvement plan — Student-oriented complementary readings

## Goal

Transform the readings page from a **bibliographic appendix** into a **guided extension of the lesson**.

After using the page, students should be able to:

- identify which readings are essential and which are optional;
- understand why each reading was selected;
- know which chapter, section, or passage to prioritize;
- connect each source to a specific concept from the lesson;
- recognize the expected difficulty and purpose of each source;
- answer one or two questions that verify meaningful engagement with the reading;
- choose deeper readings according to their interests without feeling required to read every source.

The page should remain compact enough that it does not become a second lesson.

---

# Phase 1 — Replace “recommended vs. additional” with a learning path

## Goal

Organize readings according to **pedagogical role and reading order**, rather than merely importance.

The current distinction:

```text
Lecturas recomendadas
Referencias adicionales
```

is too weak for students because it does not explain why four very different artifacts—a Kotlin guide, a Nim manual, and
a foundational research paper—sit at the same level.

I would use three sections instead.

### 1. Lecturas esenciales

These directly reinforce the conceptual model of the lesson and should be understandable immediately afterward.

I recommend:

1. **Kotlin — Introduction to library authors' guidelines**
2. **Parnas (1972) — On the Criteria To Be Used in Decomposing Systems into Modules**
3. **Ousterhout (2021), Chapters 4–5 — Modules Should Be Deep / Information Hiding**
4. **Winters, Manshreck & Wright (2020), Chapter 1 — Hyrum's Law**

The Kotlin guide gives students an immediate modern-library context, while Parnas and Ousterhout establish the
conceptual basis for hiding implementation decisions. Hyrum's Law then complicates that clean abstraction model by
showing why observable behavior can constrain evolution even when it was never intended as part of the API contract.
([Kotlin][1])

### 2. De la idea a la práctica

These should connect the conceptual lesson to actual library engineering:

- **Bloch (2006) — How to Design a Good API and Why It Matters**
- **Kotlin — Backward compatibility guidelines for library authors**
- **Semantic Versioning 2.0.0**, if it is already represented in the bibliography

The current Kotlin compatibility guide is particularly appropriate here because it explicitly discusses source
compatibility and mechanisms for managing compatibility in published libraries. ([Kotlin][3])

### 3. Para profundizar

Place more specialized material here:

- **Nim Manual — Effect system**
- **Java Language Specification, Chapter 13 — Binary Compatibility**
- **Kotlin evolution principles**

This is a better home for Nim. The effect-system example is valuable because it shows students that some languages can
encode more contractual information in declarations, but it is a **language-design extension of the lesson**, not one of
the core readings needed to understand what a library is.

Likewise, Kotlin evolution principles discuss mechanisms such as `@Deprecated` and `@RequiresOptIn`, making them useful
once students already understand API evolution. ([Kotlin][4])

---

# Phase 2 — Turn each bibliography entry into a reading guide

## Goal

Answer four student questions for every source:

> Why am I reading this? What should I actually read? What idea should I pay attention to? What should I understand
> afterward?

Instead of:

> Introduce la compatibilidad que retomaremos al estudiar la evolución de APIs.

use a richer but still compact structure.

For example, the student-facing content could become:

### Kotlin — _Introduction to library authors' guidelines_

**Por qué leerlo.** Conecta las ideas abstractas de esta lección con decisiones reales al publicar una biblioteca
Kotlin.

**En qué enfocarse.** Presta especial atención a cómo la guía relaciona el diseño de la API con usabilidad,
mantenibilidad y evolución.

**Después de leer.** Deberías poder explicar por qué una biblioteca necesita considerar algo más que la corrección de su
implementación.

This is directly supported by the guide, which describes library design in terms of several fundamental objectives
rather than merely exposing functionality. ([Kotlin][1])

I would use the same three prompts consistently for every core reading:

```text
Por qué leerlo
En qué enfocarse
Después de leer
```

That repeated structure is much more valuable pedagogically than free-form descriptions.

---

# Phase 3 — Tell students exactly what part of long sources to read

## Goal

Prevent “recommended reading” from implicitly meaning “read this entire book/manual.”

This is particularly important for books and specifications.

### Ousterhout

Do not cite only the whole book.

Recommend:

> **Capítulos 4–5: “Modules Should Be Deep” e “Information Hiding (and Leakage)”**

Then explain the conceptual mapping:

```text
deep modules
    ↓
small interface / hidden complexity

information hiding
    ↓
hide decisions consumers should not depend on
```

These chapters provide an accessible modern bridge from Parnas's information-hiding principle to API/module design.

### Software Engineering at Google

Recommend:

> **Capítulo 1, especialmente “Time and Change”, “Hyrum's Law” y “Example: Hash Ordering”.**

The publicly available Chapter 1 explicitly places Hyrum's Law under its discussion of time and change and follows it
with the hash-ordering example. ([Abseil][5])

This is far better for students than merely linking to the whole book.

### JLS

Use:

> **Capítulo 13 — Binary Compatibility**

Do not expect students to read the Java Language Specification generally. This should be marked explicitly as an
advanced technical reference.

### Nim

Link directly to:

> **Effect system**

as the current page already does.

Students should not be encouraged to navigate the entire language manual.

---

# Phase 4 — Add reading difficulty and role, but avoid artificial precision

## Goal

Help students allocate effort without creating a rigid workload.

I would add two lightweight labels.

### Type

For example:

```text
Conceptual
Applied
Primary source
Technical reference
```

### Difficulty

Use only three levels:

```text
Introductory
Intermediate
Advanced
```

I would **not** provide exact reading times such as “12 minutes” unless they are measured. Reading speed and the effort
required for Parnas versus Kotlin documentation vary too much.

If workload guidance is desirable, use relative size:

```text
Short
Medium
Selected sections
```

Example:

> **Parnas (1972)** `Conceptual · Primary source · Intermediate · Short`

This immediately tells a student much more than bibliographic metadata alone.

---

# Phase 5 — Improve the core reading selection

## Goal

Make every essential reading correspond to one important conceptual move in the lesson.

I would explicitly construct this mapping:

| Lesson concept                     | Main complementary reading           | Purpose                       |
| ---------------------------------- | ------------------------------------ | ----------------------------- |
| Library/API design                 | Kotlin library authors' introduction | Modern applied context        |
| Information hiding                 | Parnas (1972)                        | Foundational formulation      |
| Small interface, hidden complexity | Ousterhout, Chs. 4–5                 | Modern conceptual explanation |
| Observable behavior                | Winters et al., Ch. 1                | Hyrum's Law                   |
| API design                         | Bloch (2006)                         | Practical design principles   |
| Compatibility                      | Kotlin backward compatibility guide  | Applied library evolution     |
| Effects in declarations            | Nim Manual, Effect system            | Cross-language extension      |
| Binary compatibility               | JLS, Ch. 13                          | Formal technical reference    |

This also exposes one weakness in the current page: **Hyrum's Law is taught in the lesson but its source is missing from
the complementary readings**. Chapter 1 of _Software Engineering at Google_ should be added because it directly explains
the problem of consumers depending on observable behaviors outside intended promises. ([Abseil][5])

Ousterhout should likewise be added if the lesson continues to cite deep modules/information hiding.

---

# Phase 6 — Correct and sharpen the existing editorial descriptions

Several current descriptions can be improved.

### Bloch

Current:

> El capítulo sobre accesibilidad ayuda a evaluar qué elementos conviene exponer.

This is inaccurate for the linked source: **“How to Design a Good API and Why It Matters” is a conference contribution,
not the chapter on accessibility from _Effective Java_.**

Either keep the current source and describe it accordingly:

> **Presenta principios prácticos para diseñar APIs pequeñas, comprensibles y difíciles de usar incorrectamente. Úsalo
> para contrastar tus decisiones de superficie con criterios concretos de diseño.**

Or add _Effective Java_, 3rd ed., **Chapter 4, especially Item 15 (“Minimize the accessibility of classes and
members”)**, as a separate optional book reading.

I prefer doing both only if students have reasonable access to the book; otherwise the Bloch paper/talk is enough.

### Kotlin compatibility

Current:

> Introduce la compatibilidad que retomaremos al estudiar la evolución de APIs.

More useful:

> **Distingue formas de compatibilidad que una biblioteca publicada puede necesitar preservar. En esta etapa,
> concéntrate en reconocer que compatibilidad de fuente y compatibilidad binaria son propiedades diferentes;
> estudiaremos sus mecanismos en detalle más adelante.**

The current Kotlin guidance explicitly treats source compatibility separately and notes that maintaining it can be
difficult. ([Kotlin][3])

### Nim effect system

Current:

> Referencia primaria para las restricciones de excepciones y efectos laterales de Nim.

For students:

> **Úsala para comparar cuánto del contrato puede expresar directamente una declaración en distintos lenguajes. No
> necesitas estudiar el sistema de efectos completo: concéntrate en `raises` y `noSideEffect`.**

This connects the source directly to the Kotlin/Nim comparison in the lesson.

### Parnas

Current:

> La lectura fundacional para entender el ocultamiento de decisiones de diseño susceptibles de cambiar.

Keep the idea, but make the reading task explicit:

> **Mientras lees, identifica qué criterio utiliza Parnas para decidir dónde establecer una frontera modular y compáralo
> con una descomposición basada únicamente en etapas de procesamiento.**

The paper explicitly compares different decompositions and argues that the criterion used to divide a system determines
modularization quality. ([ACM Digital Library][2])

---

# Phase 7 — Add one guiding question per essential reading

## Goal

Convert passive reading into active retrieval and comparison.

Do **not** add a quiz with many questions. One high-value question per source is enough.

Examples:

### Kotlin introduction

> **Pregunta guía:** ¿Qué responsabilidades aparecen al pasar de escribir código para una aplicación a publicar una
> capacidad para consumidores desconocidos?

### Parnas

> **Pregunta guía:** ¿Qué decisión de nuestra biblioteca ficticia esconderías detrás de la frontera y por qué?

### Ousterhout

> **Pregunta guía:** ¿Qué haría que `detectParasite` fuera una interfaz “profunda” en el sentido de Ousterhout?

### Hyrum's Law

> **Pregunta guía:** ¿Qué comportamiento de `detectParasite` podría empezar a utilizar un consumidor aunque nunca lo
> documentemos?

### Kotlin compatibility

> **Pregunta guía:** ¿Puede un cambio preservar compatibilidad de fuente y aun así cambiar el comportamiento esperado?
> Da un ejemplo.

These questions force transfer back to the lesson's running `detectParasite` example rather than testing bibliographic
trivia.

---

# Phase 8 — Add a short “recommended route” at the top

## Goal

Prevent students from assuming that every listed source is mandatory.

Immediately below:

> Referencias para profundizar en los conceptos de la lección.

add student-facing guidance such as:

> **No necesitas leer todas estas fuentes.** Si quieres consolidar las ideas centrales de la lección, comienza por la
> introducción a diseño de bibliotecas de Kotlin y luego lee Parnas. Si quieres profundizar en por qué una API puede
> limitar su evolución, continúa con _Hyrum's Law_. Las demás fuentes permiten explorar diseño de APIs, compatibilidad y
> mecanismos de otros lenguajes.

This provides an actual route:

```text
Kotlin introduction
        ↓
     Parnas
        ↓
   Hyrum's Law
        ↓
choose a branch

API design     Compatibility     Language mechanisms
   Bloch          Kotlin                Nim
```

That is probably the single largest improvement to the page for self-directed online students.

---

# Phase 9 — Keep bibliographic and pedagogical information visually distinct

## Goal

Make the page scannable.

Each entry should conceptually contain:

```text
Title + bibliographic metadata
[Conceptual] [Intermediate] [Short]

Why read it
...

Focus on
...

Guiding question
...
```

The **APA/catalog-generated reference remains bibliographic metadata**.

The explanatory text is pedagogical metadata.

Do not merge the two into a large paragraph.

This separation will also make it easier to reuse the same source in later lessons with a different:

- reason for reading;
- selected chapter;
- guiding question;
- difficulty in context.

---

# Proposed final hierarchy

I would restructure the page approximately as follows:

```text
La biblioteca como artefacto de software

Short explanation
How to use these readings

1. Essential readings
   1. Kotlin — Introduction to library authors' guidelines
   2. Parnas — On the Criteria...
   3. Ousterhout — Chapters 4–5
   4. Software Engineering at Google — Chapter 1 / Hyrum's Law

2. From concepts to practice
   1. Bloch — How to Design a Good API...
   2. Kotlin — Backward compatibility guidelines
   3. Semantic Versioning

3. Deeper technical exploration
   1. Nim Manual — Effect system
   2. JLS — Chapter 13
   3. Kotlin evolution principles
```

I would **not display a separate “References” section after these**, because the entries themselves already contain the
catalog-generated bibliographic information.

---

# Suggested execution order

This is a small-to-medium content change, so I would implement it directly through short review cycles rather than
creating further milestones:

1. **Reclassify the existing six sources** by pedagogical role without adding anything.
2. **Add the missing readings directly tied to taught concepts:** Ousterhout Chs. 4–5 and _Software Engineering at
   Google_, Ch. 1.
3. **Rewrite every editorial annotation** into `Por qué leerlo / En qué enfocarse / Después de leer`.
4. **Add one guiding question** to each essential reading.
5. **Add type/difficulty/length labels** and the “how to use this page” introduction.
6. **Review scope:** make sure the essential route is realistic and that technical references remain clearly optional.
7. **Verify consistency with the lesson:** every major externally attributed idea should have an appropriate reading,
   but every citation does **not** need to become required reading.

## Acceptance criteria

The content is ready when a student can open the page and answer, without prior guidance:

- **What should I read first?**
- **Which readings are actually essential?**
- **Why was each source selected?**
- **Which chapter or section should I read?**
- **What idea should I extract from it?**
- **How does it connect to the `detectParasite` example and the lesson?**
- **Where can I go deeper if API design, compatibility, or language mechanisms interest me?**

Most importantly, I would optimize the page for **guided selectivity rather than completeness**. The Kotlin
documentation itself emphasizes reducing the number of concepts users must understand and keeping APIs intentionally
small; the same principle is useful pedagogically here: the readings page should make the important path obvious instead
of presenting every source with equal weight. ([Kotlin][6])

[1]: https://kotlinlang.org/docs/api-guidelines-introduction.html?utm_source=chatgpt.com "Introduction to library authors' guidelines"
[2]: https://dl.acm.org/doi/10.1145/361598.361623?utm_source=chatgpt.com "On the criteria to be used in decomposing systems into ..."
[3]: https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html?utm_source=chatgpt.com "Backward compatibility guidelines for library authors"
[4]: https://kotlinlang.org/docs/kotlin-evolution-principles.html?utm_source=chatgpt.com "Kotlin evolution principles"
[5]: https://abseil.io/resources/swe-book/html/ch01.html?utm_source=chatgpt.com "What Is Software Engineering?"
[6]: https://kotlinlang.org/docs/api-guidelines-simplicity.html?utm_source=chatgpt.com "Use explicit API mode - Simplicity"
