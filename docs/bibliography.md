# Annotated bibliography for a language‑agnostic course on software library design

## What this bibliography is optimised for

Your syllabus treats a software library as a long‑lived, reusable product with explicit *contracts* (APIs), clear domain boundaries, compositional design, and a lifecycle that includes automation/build, testing as progressive assurance, publishing/versioning, and ecosystem evolution. That implies a bibliography that balances:

- **Foundational design and modularity** (modules, information hiding, abstract data types, contracts)
- **Domain modelling and boundaries** (DDD vocabulary, contexts, invariants, separation of concerns)
- **API design and evolution** (expressiveness, mis‑use prevention, compatibility, breaking changes, deprecation)
- **Assurance and automation** (testing ladders including PBT/mutation/contract testing; build systems; CI/CD; reproducibility)
- **Execution in the real world** (reliability, operability, evolution over time)

To keep the bibliography resilient to language/toolchain churn, I prioritised sources that are either (a) language‑agnostic by design, or (b) illustrate principles that generalise across ecosystems (e.g., contracts/specifications, modularity, compatibility management), using primary bibliographic “anchors” from publisher catalogues and major scholarly indexes such as entity["organization","ACM Digital Library","acm publications index"], entity["organization","IEEE","professional association"] venues, entity["organization","SpringerLink","springer publishing platform"], and entity["organization","arXiv","open preprint repository"]. citeturn0search13turn2search3turn9search6turn5search2

## Core book list with annotations

The following books (B‑series) are intended to function as the **course’s stable backbone**. Each entry includes a short “why it belongs” note and typical best‑fit units (your Unidad 1–7), but the books are useful beyond those units.

image_group{"layout":"carousel","aspect_ratio":"1:1","query":["Domain-Driven Design Tackling Complexity in the Heart of Software book cover","Design Patterns Elements of Reusable Object-Oriented Software book cover","Continuous Delivery Reliable Software Releases through Build Test and Deployment Automation book cover","API Design Patterns JJ Geewax book cover"],"num_per_query":1}

**B1.** entity["book","Domain-Driven Design: Tackling Complexity in the Heart of Software","evans 2003"] — Canonical anchor for treating software as a model of a complex domain, emphasising the centrality of the domain model and a shared language; particularly aligned to your domain/boundaries focus (Unidad 2–3). citeturn4search4

**B2.** entity["book","Implementing Domain-Driven Design","vernon 2013"] — Practical companion to B1 that operationalises DDD concepts into implementable techniques; useful when your syllabus moves from modelling to contracts, services, and boundaries (Unidad 2–3, 7). citeturn3search16

**B3.** entity["book","Domain Modeling Made Functional","wlaschin 2018"] — Especially relevant to your algebraic modelling, invariants, and “rules vs coordination vs effects” separation; bridges DDD thinking with typed modelling and compositional design (Unidad 2, 4–5). citeturn10search3

**B4.** entity["book","Types and Programming Languages","pierce 2002"] — A rigorous foundation for “restrictions expressed in types,” modelling valid states, and understanding what type systems can guarantee (supporting Unidad 2 and the laws/properties angle of Unidad 4–5). citeturn5search9

**B5.** entity["book","Object-Oriented Software Construction, Second Edition","meyer 1997"] — A classic reference for software *contracts* (pre/postconditions, invariants) and disciplined component construction; valuable for your “library as a contract” framing and invariant‑driven design (Unidad 1, 3–6). citeturn7search27

**B6.** entity["book","Design Patterns: Elements of Reusable Object-Oriented Software","gof 1994"] — Still the canonical catalogue for reusable design techniques (including Iterator and Builder), and for thinking about abstraction boundaries and composition mechanisms (Unidad 3–5). citeturn4search1

**B7.** entity["book","Clean Architecture: A Craftsman's Guide to Software Structure and Design","martin 2017"] — Strong “architecture boundary” text for separating core policy from infrastructure concerns; fits your ports/adapters spirit and “protect the core” objective (Unidad 3, 7). citeturn3search21

**B8.** entity["book","Software Architecture in Practice, Fourth Edition","bass clements kazman 2021"] — Architecture as an explicit discipline with modern concerns; useful to connect your modularisation/extensibility goals to established architectural practices (Unidad 3, 7). citeturn3search39

**B9.** entity["book","Refactoring: Improving the Design of Existing Code, 2nd Edition","fowler 2018"] — Essential for controlled evolution: how to change internals without changing behaviour, and how vocabularies of refactorings support maintainability (Unidad 6–7; also supports the testing axis because safe refactoring presumes tests). citeturn4search22

**B10.** entity["book","Domain-Specific Languages","fowler parsons 2010"] — Direct support for expressive APIs via internal DSLs and language‑like interfaces; also connects to ubiquitous language as an implementation strategy (Unidad 5). citeturn5search4

**B11.** entity["book","API Design Patterns","geewax 2021"] — A pattern‑centric treatment of APIs as contracts; particularly useful to ground “expressive API design” and “versioning/compatibility” discussions (Unidad 5–6). citeturn1search9

**B12.** entity["book","Growing Object-Oriented Software, Guided by Tests","freeman pryce 2010"] — High‑leverage text for how test strategy shapes design, including isolation of collaborators (mocking) and incremental design growth (supports your testing progression: Unidad 1, 3–5). citeturn8search9

**B13.** entity["book","Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation","humble farley 2010"] — The clearest “build/test/deploy as a system” book for your automation/build lifecycle axis; supports making delivery repeatable, low‑risk, and scalable (Unidad 1, 6–7). citeturn6search4

**B14.** entity["book","Accelerate: The Science of Lean Software and DevOps","forsgren humble kim 2018"] — Research‑based view of what practices correlate with high‑performing delivery; useful as evidence when framing CI/CD and automation as engineering capabilities (Unidad 1, 7). citeturn10search6

**B15.** entity["book","Software Engineering at Google","winters manshreck wright 2020"] — A “programming over time” lens strongly aligned with your Unit 6–7 thesis (stability, change cost, scale); also explicitly frames long‑lived codebase practices. citeturn6search3

**B16.** entity["book","Site Reliability Engineering: How Google Runs Production Systems","google sre team 2016"] — Useful when your syllabus reaches real execution, automation, and ecosystem evolution; connects operational reliability with engineering practices (Unidad 7). citeturn6search10

**B17.** entity["book","Release It!: Design and Deploy Production-Ready Software, Second Edition","nygard 2018"] — Practical “design for production reality” complement to architecture discussions; valuable when teaching that library/ecosystem growth increases reliability and operational stakes (Unidad 7). citeturn11search5

**B18.** entity["book","A Philosophy of Software Design","ousterhout 2018"] — A compact “complexity management” book that aligns with your emphasis on clarity, composition, and preventing design erosion as systems evolve (Unidad 4–7). citeturn11search4

## Key research papers, standards, and empirical studies

These sources (P‑series) provide the “research spine” behind the syllabus: classic results on modularity and abstraction, plus modern empirical findings on API breakage, evolution strategies, build integrity, and advanced testing.

**P1.** “On the Criteria To Be Used in Decomposing Systems into Modules” (1972; DOI: 10.1145/361598.361623) — The foundational modularity/information‑hiding argument behind your repeated emphasis on boundaries, encapsulation, and change‑tolerant decomposition. citeturn0search19

**P2.** “Programming with Abstract Data Types” (1974; DOI: 10.1145/942572.807045) — Early formalisation of ADTs as a way to define abstractions by operations/contracts, supporting your “library as a contract” approach (especially Unidad 3–5). citeturn2search0

**P3.** “Applying ‘Design by Contract’” (1992) — A direct articulation of contracts (preconditions, postconditions, invariants) as a discipline for reliable reusable components, closely aligned to your contract/invariant learning outcomes. citeturn8search2

**P4.** “Build Systems à la Carte” (2018; DOI: 10.1145/3236774) — A modern, comparative framework for reasoning about build systems as designs with trade‑offs (not merely tooling), matching your “build as lifecycle support” axis. citeturn0search13

**P5.** “Reproducible Builds: Increasing the Integrity of Software Supply Chains” (2021) — Positions reproducible builds as a method to validate that binaries correspond to source code, giving a strong security‑and‑integrity justification for deterministic, auditable automation. citeturn5search2

**P6.** “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs” (2000; DOI: 10.1145/351240.351266) — The canonical property‑based testing paper; supports your PBT stage and the link between algebraic properties and testing. citeturn0search2

**P7.** “Theorems for Free!” (1989; DOI: 10.1145/99370.99404) — Establishes how types (parametric polymorphism) imply behavioural laws; directly supports your “properties and laws of composition” goals. citeturn9search29

**P8.** “Monads for functional programming” (1995) — A classic framing of how to structure effectful computation compositionally, reinforcing your “functional core, imperative shell” style separation (conceptually, even when not teaching monads per se). citeturn9search6

**P9.** “An Analysis and Survey of the Development of Mutation Testing” (2011; DOI: 10.1109/TSE.2010.62) — A widely cited mutation‑testing survey that supports your mutation testing capstone stage and helps justify it as a mature technique. citeturn2search3

**P10.** “How do APIs evolve? A story of refactoring” (2006) — Empirical evidence that a large share of breaking API changes are refactorings, and discussion of compatibility strategies; directly relevant to Unidad 6. citeturn12view2

**P11.** “An empirical study on the impact of refactoring activities on evolving client‑used APIs” (2018) — Findings about how refactoring relates to API breakage in library evolution; valuable grounding for discussing evolution cost and client impact. citeturn5search7

**P12.** “Why and How Java Developers Break APIs” (2018) — Field study framing motivations for breaking changes (feature pressure, simplification, maintainability), aligning to your Unit 6 learning outcomes about rupture cost and evolution drivers. citeturn5academia42

**P13.** “An extended study of syntactic breaking changes in the wild” (2025) — Large‑scale evidence about breaking changes appearing even in non‑major updates, directly useful when teaching the limits of “version numbers as truth.” citeturn5search38

**P14.** “Interface Evolution Patterns — Balancing Compatibility and Extensibility across Service Life Cycles” (2019; DOI: 10.1145/3361149.3361164) — A pattern language focused explicitly on API evolution strategies (e.g., version identifiers, semantic versioning, lifetime guarantees). citeturn12view0

**P15.** “Microservice API Evolution in Practice: A Study on Strategies and Challenges” (2024; DOI: 10.1016/j.jss.2024.112110) — Interview‑based study identifying real‑world API evolution strategies centred on backward compatibility and impacts such as consumer lock‑in; useful for Unit 7 ecosystem evolution. citeturn12view3

**P16.** “Solving package dependencies: from EDOS to Mancoosi” (2008) — Research overview of dependency management and solver approaches, useful when Unit 6 discussions reach real dependency resolution and “dependency hell” dynamics. citeturn9search4

**S1.** entity["book","Semantic Versioning 2.0.0","preston-werner 2013 spec"] — The SemVer specification is essential for Unit 6; importantly, it makes “declaring a public API” a prerequisite for SemVer to work, matching your public‑contract framing. citeturn2search6

## How the bibliography covers the transversal axes

Your two transversal axes (testing progression; build systems as evolution support) can be explicitly “stitched” from the B‑ and P‑sets without tying the course to a specific stack.

For the **testing progression**, the bibliography provides research and practice anchors for each stage:

- **BDD as shared language and acceptance focus** is covered via the original “Introducing BDD” articulation (useful historically and conceptually), and can be reinforced with your specification‑centric workflow using B‑level texts that emphasise specification/test alignment. citeturn8search0turn1search7  
- **Design‑by‑contract and invariants** are supported both as a discipline (P3) and as a broader component‑construction approach (B5), mapping cleanly to “contracts early, properties later.” citeturn8search2turn7search27  
- **Mocking and isolation of collaborators** is strongly treated in B12, which is explicitly about the symbiosis between test‑driven design and object design. citeturn8search9  
- **Property‑based testing** has a canonical research foundation (P6) and deeper “types imply laws” support (P7), aligning directly to your Unidad 4 notion of composition laws and invariants. citeturn0search2turn9search29  
- **Mutation testing** is supported by a high‑citation survey (P9) you can treat as the capstone “how strong is our test suite, really?” lens. citeturn2search3  
- **Contract testing** for extension points and integration surfaces is supported by case‑study literature on consumer‑driven contract testing in microservices contexts, giving a concrete “replace flaky integration tests with stable contracts” argument you can adapt to plugin/adapter boundaries. citeturn8search7turn8search3

For **build systems and project evolution**, the bibliography supports the progression you propose:

- Build systems as a *design space* (rather than incidental tooling) is directly supported by P4. citeturn0search13  
- CI/CD and automation as lifecycle capability is supported both by practice‑heavy books (B13) and research‑grounded organisational evidence (B14). citeturn6search4turn10search6  
- Determinism, auditability, and supply‑chain integrity concerns provide a modern justification for reproducible automation (P5). citeturn5search2  
- Dependency resolution and upgrade friction (the “downstream reality” of publishing) can be grounded in package‑solver research (P16), giving technical depth for Unit 6 beyond “just use SemVer.” citeturn9search4

## Unit‑aligned minimal and expanded reading bundles

This section suggests **compact bundles** in terms of the codes above, so you can attach readings to each unit without repeating titles across the syllabus narrative.

For **Unidad 1 (fundamentos, automatización, scripting)**, a minimal bundle is B13 + P4, adding P5 if you want a security‑integrity justification for reproducible automation. citeturn6search4turn0search13turn5search2

For **Unidad 2 (problema, límites del dominio, DDD, invariantes)**, a minimal bundle is B1 + B2, with B3 as the strongest bridge into algebraic modelling and type‑driven expression of invariants; B4 is the “formal depth” option. citeturn4search4turn3search16turn10search3turn5search9

For **Unidad 3 (núcleo, contratos, puertos/adaptadores, API mínima)**, a minimal bundle is P1 + P2 + B7, adding P3 or B5 when you want contracts/invariants treated explicitly as a design mechanism. citeturn0search19turn2search0turn3search21turn8search2turn7search27

For **Unidad 4 (composición, propiedades, leyes)**, a minimal bundle is P6 + P7, with P8 as the optional deepening for structuring effects without contaminating the core (your “functional core, imperative shell” intent). citeturn0search2turn9search29turn9search6

For **Unidad 5 (APIs expresivas, DSLs, builders, typeclasses/capacidades)**, a minimal bundle is B11 + B10, with B6 as the “classic reusable design patterns” complement that includes Builder and Iterator as named, teachable patterns. citeturn1search9turn5search4turn4search1

For **Unidad 6 (publicación, versionado, estabilidad, compatibilidad)**, a minimal bundle is S1 + P10, with P11–P13 as the empirical “reality check” cluster showing how and why breakage happens and how versioning signals can fail; P14 adds a pattern‑language framing for evolution strategies. citeturn2search6turn12view2turn5search7turn5academia42turn5search38turn12view0

For **Unidad 7 (ejecución, extensibilidad, CI, ecosistema)**, a minimal bundle is B8 + B15, with B16/B17 as the production‑reality pair; P15 adds contemporary empirical grounding about evolution challenges in distributed systems (useful even if your reference project is “just a library,” because libraries increasingly live inside service ecosystems). citeturn3search39turn6search3turn6search10turn11search5turn12view3