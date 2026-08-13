# Plan — Reframe Lesson 1B Around the Consumer-Facing Library Contract

## Goal

Make Lesson 1B establish this mental model as its central thesis:

> **Biblioteca = implementación + API consumida externamente**

and derive from it six foundational concepts:

1. **consumers** — who depends on the library;
2. **API surface** — what consumers can observe and use;
3. **contract** — what those exposed elements promise;
4. **encapsulation** — what remains deliberately hidden;
5. **stability** — why exposed decisions become harder to change;
6. **library identity** — from the consumer's perspective, the library is characterized primarily by the contract it exposes rather than by its internal decomposition.

The lesson should establish the vocabulary. It should **not yet teach how to design a good API**; that remains the responsibility of the following lesson, which already develops domain modeling, encapsulation, minimality, usability, and related principles. ([DIBS][3])

---

# Phase 1 — Strengthen the transition from Lesson 1A

## Goal

Make the first paragraphs explicitly answer the closing question from the taxonomy lesson rather than restarting with another independent definition of “library.”

The taxonomy lesson has already established that two artifacts can share implementation yet differ because their mode of consumption and external contract differ. ([DIBS][2]) Lesson 1B should immediately specialize that principle to libraries.

## Changes

### 1. Rewrite the abstract around one thesis

The current abstract is already close, especially:

> “una biblioteca se entiende mejor como una API con implementación”

but I would make the relationship more explicit and introduce the consumer immediately. ([DIBS][1])

Conceptually, the abstract should become:

> **En la lección anterior distinguimos los artefactos por su relación de uso. Para una biblioteca, esa relación es la integración programática: otras personas desarrolladoras escriben código que depende de lo que la biblioteca expone.**
>
> **Por eso utilizaremos como modelo inicial:**
>
> **biblioteca = implementación + API consumida externamente**
>
> **La implementación realiza la capacidad; la API define qué parte de ella puede conocer y utilizar quien consume la biblioteca. Esta frontera determina su superficie, su contrato, qué detalles podemos encapsular y qué decisiones adquieren compromisos de estabilidad.**

The wording can be refined later, but those are the semantic commitments I would freeze.

### 2. Explicitly connect to Lesson 1A's comparison axes

Add a short opening transition such as:

> **La taxonomía anterior distinguía artefactos según destinatario, modo de consumo, contrato visible y estabilidad esperada. En una biblioteca, estos cuatro ejes convergen alrededor de su API.**

That gives the course continuity instead of repeating the taxonomy.

### Acceptance criteria

After the abstract, students should be able to answer:

* Who primarily consumes a library?
* How do they consume it?
* Why does the API become the relevant boundary?
* Why is the implementation alone insufficient to characterize the library as an artifact?

---

# Phase 2 — Replace the definition-first structure with a boundary model

## Goal

Make `implementation ↔ API ↔ consumer` the conceptual backbone of the lesson.

## Proposed new section

Immediately after the abstract, add:

### `## Una biblioteca tiene una frontera`

Use a minimal model:

```text
implementación interna
        │
        ▼
      API
        │
        ▼
código consumidor
```

Then introduce the central equation:

```text
biblioteca = implementación + API consumida externamente
```

The equation should explicitly be presented as a **design model**, not a mathematical definition.

I would explain its three parts in Spanish:

* **Implementación:** código, algoritmos, estructuras y decisiones internas que realizan la capacidad.
* **API:** superficie que la biblioteca hace disponible para integración.
* **Consumidor:** código externo que utiliza esa superficie y pasa a depender de su contrato.

This also prevents a subtle conceptual problem with saying simply “biblioteca = API”: an API is not itself sufficient to constitute a library, which the current `API ≠ biblioteca` section correctly observes. ([DIBS][1])

### Add one counterexample

Use the same implementation behind two different surfaces:

```kotlin
internal fun calculateChecksum(bytes: ByteArray): Long = ...
```

Library A:

```kotlin
fun checksum(bytes: ByteArray): Long = ...
```

Library B:

```kotlin
@JvmInline
value class Checksum(val value: Long)

fun checksum(bytes: ByteArray): Checksum = ...
```

Do **not** teach value classes here—the example can instead use ordinary types if that would introduce future syntax prematurely. The important observation is:

> the underlying algorithm may be identical, while consumers experience different libraries because they depend on different exposed contracts.

That directly builds on Lesson 1A's existing “same implementation, different artifact” idea. ([DIBS][2])

### Acceptance criteria

Students should distinguish:

* implementation from API;
* library API from internal implementation surface;
* library consumer from end user;
* equivalent implementation from equivalent public contract.

---

# Phase 3 — Introduce the six concepts as consequences of the boundary

I would make these **short conceptual sections**, each derived from the same model instead of independent definitions.

## 3.1 `## Consumidores: una biblioteca existe para ser integrada`

The current lesson says that libraries are primarily intended for developers incorporating them into other applications. Keep that content, but promote **consumer** to a first-class term. ([DIBS][1])

Introduce:

> Un consumidor es cualquier código situado fuera de la frontera de implementación que depende de la API de la biblioteca.

Important nuance:

**“external” should mean external to the library's implementation boundary, not necessarily public on the internet.**

That lets the concept work equally well for:

* Maven Central libraries;
* internal organizational libraries;
* modules consumed only inside a monorepo.

The current lesson already correctly notes that public versus private distribution does not change the underlying nature of a library. ([DIBS][1])

---

## 3.2 `## Superficie de API: lo que hacemos observable`

This concept needs to become explicit; currently “superficie pública” appears briefly but is not developed. ([DIBS][1])

Define API surface operationally as the set of exposed elements through which consumers can depend on the library, for example:

* names;
* types;
* functions;
* properties;
* constructors;
* parameters;
* return types;
* exceptions/errors;
* observable semantics.

Then establish:

> **Cada elemento que hacemos parte de la superficie crea una nueva forma en que código externo puede depender de la biblioteca.**

This anticipates, without teaching yet, the “minimal useful API” principle in Lesson 1C. The official Kotlin library-author guidelines similarly treat API clarity, predictability, and backward compatibility as core library-design concerns. ([Kotlin][4])

I would avoid talking about ABI mechanics here.

---

## 3.3 `## Contrato: exponer algo también significa prometer algo`

The current definition is good but can be made more precise.

Rather than:

> API = operations available

emphasize:

[
\text{API surface} \neq \text{contract}
]

The **surface** answers:

> “What can I interact with?”

The **contract** answers:

> “What may I rely on when I do?”

Example:

```kotlin
fun findUser(id: UserId): User?
```

The surface tells us there is a function with a particular signature.

The contract additionally includes questions such as:

* what does `null` mean?
* can the function perform I/O?
* can it fail?
* what constitutes the same user?
* are repeated calls expected to observe updated state?

No need to answer these questions yet. Their purpose is to show that **syntax is only part of an API contract**.

This also sets up the later documentation and API-evolution lessons naturally.

---

## 3.4 `## Encapsulación: la otra cara de la API`

This is the most important new conceptual relationship.

Present:

[
\text{library boundary}
=======================

\begin{cases}
\text{exposed contract} \
\text{hidden implementation}
\end{cases}
]

Then state:

> Diseñar una API no consiste solamente en decidir qué exponer. También consiste en decidir qué **no** exponer.

The implementation should remain free to change where consumers cannot observe or depend on those choices.

This connects directly to information hiding. Parnas' classic modularity argument is especially appropriate as a foundational reference: modules should hide design decisions likely to change rather than merely correspond to steps in processing. ([ACM Digital Library][5])

Do **not** repeat Lesson 1C's material about protecting domain invariants. Lesson 1B should establish encapsulation as **boundary management**; Lesson 1C can later teach how that boundary is designed well. ([DIBS][3])

---

## 3.5 `## Estabilidad: las dependencias externas crean compromisos`

Derive stability instead of presenting it merely as a desirable property:

```text
exponemos una decisión
        ↓
código externo empieza a usarla
        ↓
el consumidor depende de ella
        ↓
cambiarla tiene un costo
```

The key statement should be:

> **Lo interno puede cambiar mientras preserve el contrato observable; lo expuesto debe evolucionar considerando las dependencias que ya existen.**

This is the conceptual seed for Lesson 1D on API evolution.

Kotlin's current library-author guidance explicitly treats backward compatibility as a central concern because consumers compile and write source code against published APIs. ([Kotlin][6])

Again, stop before teaching source/binary/behavioral compatibility in detail.

---

## 3.6 `## La biblioteca desde la perspectiva de quien la consume`

This should synthesize the change requested:

> **Para quien implementa, una biblioteca contiene archivos, algoritmos, estructuras de datos y decisiones internas. Para quien la consume, esas decisiones son irrelevantes mientras no atraviesen la frontera de la API. Lo que puede conocer, usar y depender de la biblioteca es aquello que esta expone.**

Then add the crucial qualification:

> This does **not** mean implementation quality is irrelevant. It means implementation details do not form part of the consumer-facing identity **unless they become observable through the contract**.

That avoids teaching an excessively strong version of “a library is only its API.”

---

# Phase 4 — Compress material that distracts from the new thesis

The current lesson is fairly broad. After the API discussion it spends substantial space on:

* why libraries exist;
* open-source libraries;
* proprietary libraries;
* build versus adopt;
* categories of libraries;
* popular library examples. ([DIBS][1])

Most of that is reasonable information, but it weakens Lesson 1B's new role as **the conceptual bridge from taxonomy to API design**.

I would therefore refactor it.

## Keep, but compress

### `¿Por qué necesitamos bibliotecas de software?`

Keep as a short motivation section.

Retain:

* reuse;
* shared maintenance;
* interoperability;
* abstraction of reusable capabilities.

Reduce it to roughly half its current size.

### `¿Cuándo construir y cuándo adoptar?`

Keep as a short callout rather than a major subsection.

This is useful course philosophy, especially given DIBS's preference to reuse mature dependencies instead of reinventing infrastructure.

---

## Remove or relocate

### `Open-source`

### `Software propietario`

Their essential teaching point—**public/private distribution does not alter the consumer-contract model**—can be reduced to one paragraph near the definition.

The organizational governance material is useful, but not essential to Lesson 1B's conceptual objective.

### `Categorías de bibliotecas de software`

I would **remove this section from 1B**.

Lesson 1A has already taught taxonomy and distribution dimensions extensively, including package versus artifact role. ([DIBS][2]) Reintroducing another taxonomy immediately afterward adds repetition without advancing the conceptual model.

Static/dynamic linkage can return later when packaging/JVM/native distribution makes it operationally relevant.

### `Ejemplos de bibliotecas populares`

Either remove it or reduce it to a compact comparative table of 3–4 libraries used to illustrate **different API surfaces**, not ecosystem trivia.

For example:

| Library              | Consumer-facing surface emphasizes |
| -------------------- | ---------------------------------- |
| Kotlin stdlib        | types, functions, extensions       |
| `kotlinx.coroutines` | suspend functions, scopes, flows   |
| OkHttp               | objects, builders, callbacks       |
| Arrow                | typed abstractions and functions   |

The question becomes **“what does this library expose?”**, which reinforces the lesson.

---

# Phase 5 — Rebuild the conclusion around one causal chain

The current conclusion already says that library value depends on the clarity, coherence, and stability of its contract. ([DIBS][1]) I would make it much tighter.

The closing mental model should be:

```text
library
    ↓
is consumed from external code
    ↓
through an API surface
    ↓
whose observable behavior forms a contract
    ↓
while implementation details remain encapsulated
    ↓
and consumer dependencies create pressure for stability
```

Then reduce `Puntos clave` to approximately five statements:

* **Biblioteca = implementación + API consumida externamente.**
* **La API es la superficie a través de la cual otro código integra la biblioteca.**
* **El contrato incluye tanto la forma de esa superficie como su comportamiento observable.**
* **Encapsular significa mantener decisiones internas fuera de aquello de lo que los consumidores pueden depender.**
* **Exponer una decisión crea dependencias y, por tanto, compromisos de estabilidad.**

The closing reflection can then point directly to Lesson 1C:

> **Si la API define aquello de lo que otras personas pueden depender, la siguiente pregunta es inevitable: ¿qué deberíamos exponer y cómo deberíamos diseñarlo?**

That is almost a perfect handoff to `Diseñar la API de una biblioteca desde el dominio`. ([DIBS][3])

---

# Suggested execution order

I would implement the changes in this order:

1. **Freeze the conceptual boundary** between 1A, 1B, and 1C:

   * 1A = *what kind of artifact are we building?*
   * 1B = *what makes a library's consumer-facing boundary special?*
   * 1C = *how do we design that boundary well?*

2. Rewrite the **abstract and opening** around `implementation → API → consumer`.

3. Introduce the six concepts in causal order:
   **consumer → surface → contract → encapsulation → dependency → stability**.

4. Move/compress the broad ecosystem material so it does not interrupt that argument.

5. Rewrite the conclusion to mirror the same causal chain.

6. Review 1C afterward only for **duplication**, especially its current introductory statement that “a library is an API.” Do not move its domain modeling/minimality/usability material backward into 1B. ([DIBS][3])

7. Expand the bibliography with at least:

   * Parnas for information hiding/modular boundaries; ([ACM Digital Library][5])
   * Kotlin's current Library Authors' Guidelines for modern API-design concerns; ([Kotlin][4])
   * Kotlin's compatibility guidance as the forward reference for the stability argument. ([Kotlin][6])

## Explicit non-goals

I would **not** add these to Lesson 1B:

* detailed Kotlin visibility rules;
* `public`/`internal`/`private` mechanics;
* JVM ABI;
* source vs. binary compatibility details;
* SemVer mechanics;
* API testing;
* domain modeling techniques;
* value classes, sealed types, variance, extensions, or other Kotlin-specific API mechanisms;
* package publication;
* Gradle.

Those all have better places later in DIBS.

### Resulting lesson role

After the refactor, the first three lessons form a much cleaner argument:

[
\boxed{
\begin{aligned}
\text{1A:}&\quad \text{What artifact are we building?}\
\text{1B:}&\quad \text{What does a library expose, hide, and promise?}\
\text{1C:}&\quad \text{How should we design what it exposes?}
\end{aligned}}
]

That is the change I would prioritize most: **1B stops being primarily a broad introduction to libraries and becomes the conceptual lesson about the library boundary.**

[1]: https://dibs.ravenhill.cl/notes/software-libraries/what-is/ "La biblioteca como artefacto de software | DIBS"
[2]: https://dibs.ravenhill.cl/notes/software-libraries/artifacts-taxonomy/ "Taxonomía básica de artefactos de software | DIBS"
[3]: https://dibs.ravenhill.cl/notes/software-libraries/api-design/fundamentals/ "Diseñar la API de una biblioteca desde el dominio | DIBS"
[4]: https://kotlinlang.org/docs/api-guidelines-introduction.html?utm_source=chatgpt.com "Introduction to library authors' guidelines"
[5]: https://dl.acm.org/doi/10.1145/361598.361623?utm_source=chatgpt.com "On the criteria to be used in decomposing systems into modules"
[6]: https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html?utm_source=chatgpt.com "Backward compatibility guidelines for library authors"
