# API Design for C++

## Chapter 2: Qualities

### Model the problem domain

This excerpt argues that a good API should mirror the problem domain it is meant to solve, rather than exposing low-level implementation details. Its main idea is that APIs are easier to understand and use when they provide a coherent abstraction built around the concepts users already associate with that domain. 

Using an address book as an example, the text shows how API design begins with identifying the right high-level objects and relationships. An initial model might include an `AddressBook` containing many `Person` objects, but new requirements can reveal that this model is too simplistic. When people can have multiple addresses and phone numbers, and phone numbers need their own validation and formatting behavior, those concepts should become first-class objects such as `Address` and `TelephoneNumber`. The point is that the object model should be shaped by actual requirements, not by convenience. 

The excerpt also stresses that there is no single “correct” abstraction or object model. What matters is internal consistency, logical structure, and fitness for the API’s intended tasks. As requirements evolve, the model may need to change too, though designers should avoid over-generalizing beyond present needs. 

Finally, it explains that an API must not only define the right objects, but also make it clear how users solve core tasks with them. UML class diagrams help describe the structure of objects and their relationships, while sequence diagrams help show how clients interact with those objects step by step to accomplish real use cases. In that sense, good API design is both about modeling the domain well and making common workflows natural to express. 

### Hide implementation details

This excerpt argues that the core purpose of an API is **information hiding**: internal details should stay hidden so they can change without breaking clients. It distinguishes **physical hiding** from **logical hiding**. Physical hiding means separating interface from implementation, such as keeping declarations in headers and definitions in source files. Logical hiding means using language features like access control to restrict what clients can see and use. 

A major implication is that **public APIs should expose only what clients truly need**. The text strongly advises against making data members public or protected, because that leaks implementation details and makes future changes harder. Instead, data should be accessed through methods, which allow validation, caching, lazy computation, notifications, synchronization, and tighter control over invariants. 

The excerpt also stresses that **implementation methods should be hidden**, not just implementation data. A class should communicate **what it does**, not **how it does it**. Exposing low-level methods, internal handles, or non-const access to private state breaks encapsulation and gives clients ways to depend on unstable internals. 

Finally, it extends this idea from members to **whole implementation classes**. Some classes exist only to support the internal workings of a public API and should therefore be hidden as well, either physically or logically. Techniques like forward declarations, private headers, nested private classes, static functions in implementation files, and especially the **Pimpl idiom** are presented as ways to keep interfaces small, stable, and easier to evolve. 

### Minimally complete

This excerpt argues that a good API should be **minimally complete**: it must provide everything clients genuinely need, but expose no more than necessary. Completeness comes from understanding requirements and use cases; minimality matters because every public class or function becomes a long-term promise that is easy to add later but hard to remove safely. Its guiding rule is essentially: **when in doubt, leave it out**. 

It then connects minimality with **avoiding duplication**. Principles like DRY, single source of truth, and single responsibility can help keep an API compact by centralizing data and behavior, but they should not be applied rigidly. Over-eager abstraction can make an interface more complex than the duplication it was meant to eliminate. The text recommends thoughtful refactoring, sometimes only after repetition becomes clear, and notes that automation can also reduce duplication without complicating the public API. 

A key tension the excerpt explores is the one between a **small core API** and **ease of use**. Clients should not have to write repetitive boilerplate for simple tasks, so convenience operations can be valuable. But instead of bloating the core, those conveniences should live in **separate wrapper layers or modules** built on top of the public interface. The OpenGL / GLU / GLUT example illustrates this idea of progressive disclosure: keep the core focused and low-level, while offering higher-level helpers separately for common workflows. 

Finally, the excerpt warns that APIs can accidentally expose too much power through **virtual functions and inheritance**. Making methods overridable opens the door to fragile base-class problems, misuse, broken invariants, runtime overhead, and binary-compatibility issues. The advice is to make functions virtual only when extension is a deliberate part of the design, document those extension points carefully, and otherwise prefer non-virtual, more robust interfaces. 

### Easy to use

This excerpt argues that a well-designed API should be **easy to learn, hard to misuse, consistent, orthogonal, safe in its resource management, and platform-independent**.

It begins with **usability**. Good APIs should make common tasks obvious from their method signatures alone, follow the principle of least surprise, and rely on familiar models and patterns so users can focus on their problem instead of deciphering the interface. Documentation and examples still matter, but ideally the API should already feel understandable before users read them.

A related idea is **discoverability**: users should be able to figure out how to use the API on their own. This depends heavily on a clear object model, good class and function names, and avoiding abbreviations that force users to guess meanings. Discoverability does not guarantee efficiency for expert users, but it usually improves overall usability.

The text then stresses that APIs should be **difficult to misuse**. Common mistakes often come from ambiguous parameters, especially several values of the same type such as multiple booleans or integers. The proposed solution is to use more specific types, such as enums or dedicated classes, so that incorrect argument ordering or illegal values can be caught earlier and code becomes more self-explanatory.

Another major quality is **consistency**. APIs should reuse the same naming conventions, parameter order, design patterns, error-handling style, and interface structure throughout. Similar concepts should look and behave similarly. Consistency reduces the amount of new knowledge users must memorize and helps transfer understanding from one part of the API to another.

The excerpt also introduces **orthogonality**, meaning that operations should be as independent as possible and avoid surprising side effects. Changing one property should not silently affect another unrelated one. Orthogonal designs are more predictable, easier to test, and easier to change because each part of the API has a clearer and more isolated responsibility.

It then discusses **robust resource allocation**, especially in C++. Since memory and other resources are easy to misuse, APIs should prefer safer ownership models such as smart pointers and RAII. The broader principle is that acquiring a resource should happen during object construction and releasing it during destruction, so users are less likely to leak resources, dereference invalid pointers, or forget cleanup steps.

Finally, the text argues for **platform independence** in public APIs. Public headers should not expose platform-specific conditionals that make the interface differ across systems. Instead, the API should stay stable and uniform, while platform-specific details remain hidden in the implementation. That way clients do not have to mirror those same conditionals in their own code.

Overall, the excerpt presents API quality as a balance of **clarity, safety, predictability, and abstraction**: good APIs should feel natural to use, prevent common errors, remain internally coherent, and hide unnecessary complexity.

### Loosely coupled

This excerpt argues that good APIs should aim for **loose coupling** and **high cohesion**: each component should have a clear, unified purpose, and dependencies between components should be kept as small and flexible as possible. Tight coupling makes components harder to understand, reuse, change, and maintain independently. 

To explain coupling, the text highlights several dimensions: the **number of connections** between components, how **visible** those connections are, how **direct** they are, and how easy they are to **change**. It warns especially against **circular dependencies**, since they make reuse and separation much harder. It also notes that API size affects coupling: the more classes, methods, and arguments an API exposes, the more ways clients become tied to it. 

The excerpt then presents several techniques for reducing coupling. One is using **forward declarations** when a class only needs to know another class by name, instead of including its full definition. Another is preferring **nonmember nonfriend functions** over member functions when possible, because free functions depend only on the public interface rather than on internal details. It also discusses **intentional redundancy** as a tradeoff: in some cases, duplicating a small piece of code or data can be justified if it breaks a harmful dependency. 

It also introduces **manager classes** as a way to shield high-level components from many low-level ones. By centralizing coordination behind a façade- or mediator-like interface, manager classes can reduce the number of direct dependencies and improve scalability. Similarly, **callbacks, observers, and notification systems** help reduce coupling when components need to react to events. Instead of one class directly depending on another, an intermediary event mechanism allows communication with less direct knowledge between sender and receiver. 

Overall, the main message is that API design should actively structure dependencies so that components remain **modular, replaceable, and easier to evolve**. Loose coupling is not just a low-level implementation concern: it shapes both the internal architecture of the API and how strongly client code becomes tied to it. 

### Stable, documented, and tested

This excerpt says that a good API must be designed not just for the present, but also for long-term evolution.

Its first key idea is **stability**. An API does not need to remain completely unchanged, but it should avoid incompatible changes between versions. When change is necessary, it should be managed through proper versioning so users can adapt without their code breaking unexpectedly.

The second idea is **future-proofing**. A strong API should be extensible, so that new features and changes can be incorporated in an orderly way instead of forcing messy redesigns later. In other words, good API design anticipates growth.

The excerpt also emphasizes two supporting practices that are essential to API quality: **documentation** and **automated testing**. Documentation helps users understand what the API does, how it behaves, how it should be used, and what errors to expect. Automated tests help maintainers evolve the implementation with confidence, knowing that existing behavior is still protected.

Overall, the text presents **versioning, extensibility, documentation, and testing** as foundational qualities of a robust API, and notes that they are important enough to deserve deeper treatment on their own.

## Chapter 10: Versioning

This excerpt argues that releasing an API is not the end of design work, but the start of an ongoing maintenance and evolution process.

Its central message is that after version 1.0, APIs will keep changing: bugs must be fixed, features added, workflows improved, architectures refined, and new platforms supported. Because of that, API development must be treated as continuous rather than as a one-time design task.

The main goal of every post-release update should be **minimizing impact on existing clients**. Changes to the interface or its behavior can force users to rewrite their code, which makes upgrades costly and discouraging. The less manual adaptation clients need, the more likely they are to keep adopting new versions.

The excerpt also stresses that **backward compatibility is critical to trust**. An API that frequently introduces breaking changes risks frustrating users and pushing them toward alternatives, while one known for stability and robustness can build a strong reputation and long-term success.

Overall, the passage frames **API versioning and backward compatibility** as essential parts of API design after release: the challenge is not just adding improvements, but doing so without disrupting existing users.

### Version numbers

This excerpt explains that every API release should have a **clear version identifier**, usually a version number, so users can distinguish one release from another. It presents the common **major.minor.patch** scheme and explains its meaning: major versions signal large or potentially breaking changes, minor versions add features or significant fixes without normally breaking compatibility, and patch versions are for bug or security fixes that should not change the interface. 

It also notes that some projects use extra markers such as build numbers, alpha/beta/RC suffixes, or more unusual schemes like date-based versions, even/odd stability numbering, or mathematically themed numbers such as TeX’s approach toward π. Still, the main recommendation for APIs is to stick to the standard major/minor/patch style because it is widely understood and communicates the expected scale of change. 

A major practical point in the excerpt is that version information should be available **from code**, not just in release notes. Clients may need to check the API version both at **compile time** and at **runtime**. Compile-time access helps them conditionally compile code against newer symbols, while runtime access helps them choose behaviors dynamically or report the library version in logs and diagnostics. 

To support this, the text proposes a small **version API** with methods to retrieve the major, minor, and patch numbers, return the version as a string, compare versions through a helper such as `IsAtLeast`, and test for individual capabilities through a `HasFeature` method. The deeper idea is that clients often do not really care about the number itself, but about whether a certain feature or fix exists. Feature tags therefore make version checks more meaningful and flexible, especially in ecosystems where different implementations may expose different capabilities under the same nominal version. 

Overall, the excerpt argues that versioning is not just labeling releases: it is a way to **communicate change, preserve compatibility expectations, and give clients reliable mechanisms to adapt to API evolution**. 

### Software branching strategies

This excerpt explains that **branching strategy matters because API evolution usually happens in parallel with release maintenance**, and poor coordination across branches can easily lead to conflicting or lost API changes. 

It first introduces the basic distinction between a **trunk/main line** and additional branches used for releases, hotfixes, or longer-running development. The main idea is that branching exists to support parallel work, but it must be governed by policy: teams need to decide where active development happens, when release branches are cut, how often merges occur, and how to keep branches from drifting too far apart. The text strongly favors doing most active development in trunk, branching only when needed, and merging early and often so the main line stays healthy. 

The excerpt then connects branching directly to **API stability**. Even if different teams work on separate branches, the externally visible API should still evolve in a **linear, serialized way**: version *N* should feel like a clean continuation of version *N–1*, not like one of several incompatible branches of reality. To support that, the text recommends avoiding direct API changes in release branches, merging public API changes into trunk as soon as possible, and using a centralized **API review process** to catch incompatible or conflicting decisions before release. 

It also notes that source control tooling influences what policies are practical. Systems like Git or Mercurial make branching and frequent merging easier than older centralized systems, which means teams can reduce divergence more effectively. But tooling alone is not enough: the real goal is to preserve **one authoritative definition of the API**, ideally centered on trunk. 

Finally, the excerpt uses a file-format example to show how versioning can become messy when **different product variants** are encoded only through version numbers. In the Basic-versus-Advanced case, the version number was forced to carry two meanings at once: file format evolution and product variant identity. This made compatibility increasingly confusing. The lesson is to **separate those concerns**: store both the version number and the variant name, so each can evolve independently and compatibility checks remain understandable. 

Overall, the main message is that **API versioning is not just about numbering releases**. It depends on disciplined branching, regular merging, centralized review, and careful separation of concepts like release version and product variant, so that API evolution remains coherent instead of chaotic. 

### Life cycle of an API

This excerpt explains that an API has a distinct **life cycle**, and that maintaining one is harder than maintaining ordinary software because public interfaces act as contracts with clients.

Its main point is that the **initial release is the turning point**. Before version 1.0, the API can still be redesigned freely: requirements can change, interfaces can be reworked, and major structural decisions can be revisited. Early releases in this stage should usually be marked as **0.x** to signal that the API is still unstable.

After the initial release, the API enters **maintenance**. At this stage, the goal is no longer to redesign the interface, but to **evolve it without breaking existing clients**. That usually means adding new methods or classes and fixing bugs, while avoiding incompatible changes. API reviews become important here because they help preserve backward compatibility.

The excerpt then describes a **completion** phase, where the API is considered mature and essentially finished. At that point, stability matters more than new features, so changes are usually limited to bug fixes. Eventually, the API may stop changing altogether.

Finally, some APIs enter **deprecation**, meaning they should no longer be used for new development and existing clients are encouraged to migrate away. This usually happens when the API is obsolete or has been replaced by a newer alternative.

Overall, the passage frames API evolution in four stages—**prerelease, maintenance, completion, and deprecation**—and emphasizes a central rule: **before release you may redesign an API, but after release you should only evolve it compatibly**.

### Levels of compatibility

This excerpt makes the terminology around API compatibility much more precise. Its main point is that **“compatibility” is not just one thing**: it includes several distinct guarantees, and an API may promise different ones for major, minor, and patch releases. At the broadest level, **backward compatibility** means a newer version can replace an older one without forcing client code to change; in that sense, the new API should behave like a superset of the old one. The text also notes that compatibility concerns are not only about code: network protocols, file formats, and database schemas have their own versioning and compatibility rules too. 

It then distinguishes three main forms of backward compatibility. **Functional compatibility** is the strongest and refers to preserving runtime behavior exactly, though the text points out this is rarely absolute because even bug fixes change behavior. **Source compatibility** is weaker: it means client code written for version *N* can still be recompiled against version *N+1* without edits, even if behavior changes. **Binary compatibility** (ABI compatibility) is stricter in a different way: clients should be able to relink or replace a library binary without recompiling their code. This is especially hard in C++ because even seemingly small interface changes can alter mangled symbols, object layout, or virtual tables. 

A major practical takeaway is that **source compatibility does not imply binary compatibility**. For example, adding an optional parameter may still let old source code compile, but it changes the function’s binary symbol and therefore breaks ABI compatibility. The excerpt gives concrete examples of changes that typically break binary compatibility, such as removing members, changing signatures, reordering fields, or altering virtual methods, and contrasts them with safer changes like adding new free functions or new nonvirtual methods. It also suggests techniques like overloads, the Pimpl idiom, or even a flat C wrapper to preserve binary stability more effectively. 

Finally, the text defines **forward compatibility** as the opposite direction: code written against a newer API should still compile against an older version, which mainly matters for downgrade scenarios. This is hard to guarantee because it requires anticipating future evolution before release. The author suggests a few ways to make that easier, such as reserving unused parameters early, using opaque typedefs that can later change implementation type, or adopting data-driven APIs that can accept extensible named arguments without changing signatures. Overall, the excerpt frames compatibility as a set of tradeoffs about how APIs evolve while minimizing disruption for clients. 

### How to maintain backward compatibility

This excerpt explains several practical strategies for **evolving an API while preserving backward compatibility**. 

First, it discusses **adding functionality**. For source compatibility, adding new classes, methods, or free functions is usually safe because existing code does not need to change. A key exception is abstract base classes: adding a new **pure virtual** method breaks all derived client classes, since they must now implement it. The safer approach is to add a virtual method with a default implementation instead. For **binary compatibility**, the situation is stricter: even additions such as new data members, new base classes, template changes, or the first virtual method in a class can break ABI. 

Second, it covers **changing functionality**. For source compatibility, some changes can be made without breaking callers, such as appending new optional parameters or changing a `void` return type to a value that existing code can ignore. If a signature change cannot be made compatibly, the recommended strategy is to introduce a **new function or overload** rather than altering the old one. By contrast, for binary compatibility, essentially any signature change breaks ABI, so new behavior should be exposed through additional methods instead of modifying existing ones. The text also notes that changing implementation behavior without changing signatures may preserve source and binary compatibility while still breaking **functional compatibility**; in such cases, making the new behavior opt-in can reduce disruption. 

Third, it examines **deprecation**. Deprecation means a feature is still present, but clients are warned not to use it because it has been superseded or is planned for removal. The excerpt recommends documenting deprecated features clearly and pointing users to replacements. It also describes ways to emit warnings, such as C++14’s `[[deprecated]]` attribute, compiler-specific annotations, or runtime warnings. The goal is to give clients time to migrate before removal happens. 

Fourth, it addresses **removal**. Removing functionality is a major breaking change and should usually happen only after at least one deprecation cycle. One way to handle this is to release a new **major version** that is explicitly not backward compatible, while still keeping the old API available for legacy users. Another softer option is to leave old functionality in place for compatibility, but hide it from the documentation so it is no longer promoted to new users. 

Finally, the text introduces **inline namespaces for versioning** in C++11. By placing API symbols inside versioned namespaces, a library can ship multiple versions of the same API at once and let clients explicitly bind to older symbols when needed. This helps isolate clients from ABI-breaking changes, though it increases maintenance cost because multiple symbol sets must be kept. The excerpt stresses that this strategy should be adopted from the first version of the API; introducing it later can itself break binary compatibility. 

Overall, the main message is that compatible API evolution depends on using the right tool for each kind of change: **safe additions, overloads instead of signature edits, deprecation before removal, and versioning mechanisms when breakage is unavoidable**. 

### API reviews

This excerpt argues that **backward compatibility requires deliberate process, not just good intentions**, and that API teams should enforce **API reviews** to prevent silent breakage before releases. 

It presents two complementary review models. One is a **prerelease review**, held shortly before release to inspect all public API changes since the previous version. The other is a **precommit review**, where proposed public API changes must be approved before they are merged. The main idea is that prerelease reviews are the final safety net, while precommit reviews catch problems earlier and reduce the load of the final review. 

The text explains several reasons these reviews matter: preserving backward compatibility, maintaining design consistency, controlling risky or poorly timed changes, ensuring the API remains easy to evolve in the future, and revisiting earlier decisions in light of real usage. In other words, API reviews are not just about blocking breakage; they also protect architectural coherence and long-term maintainability. 

For **prerelease reviews**, the excerpt recommends involving roles such as the product owner, technical lead, documentation lead, and testing lead, since API quality depends not only on code but also on usability, documentation, and automated test coverage. It also suggests reviewing the public interface and documentation rather than implementation details, and asking structured questions about compatibility, testing, performance, architecture, coding standards, and upgrade support. 

For **precommit reviews**, the excerpt describes a formal change-request workflow for public API modifications. Requests should explain the change, justify it, assess client impact, provide migration guidance, and update compatibility tests. The text highlights examples such as Symbian and NetBeans, and notes that modern tooling can automate parts of this process through pull request checks, required approvals, static analysis, test runs, and code ownership rules. 

Overall, the passage’s main message is that **API evolution needs explicit governance**: review processes, clear approval criteria, and supporting automation help teams evolve APIs without losing compatibility, consistency, or future flexibility. 

## Chapter 11: Documentation

This excerpt argues that an API is **not fully specified by code alone**. Header files may show what functions and methods exist and how to call them, but they do not explain **behavior**, intended usage, or expectations. For that reason, documentation is presented as an essential part of the API itself, not as an optional extra.

The text emphasizes that **reuse depends on both design and documentation**. Even a well-designed component is unlikely to be reused if people cannot understand how to use it correctly. Documentation is therefore treated as a core requirement for making an API practical and usable.

It also distinguishes between **internal code documentation** and **public API documentation**. Commenting implementation code is useful for maintainers, but documenting public headers is even more important because that documentation is what users rely on to understand the API.

Finally, the excerpt introduces **automatic documentation tools**, especially Doxygen, as a practical way to generate API docs from comments in header files. Overall, the main message is that **good API documentation is indispensable for clarity, usability, and reuse**.

### Reasons to write documentation

This excerpt argues that **API documentation is not optional support material but part of the API’s specification itself**. Even if an interface is well designed, consistent, and discoverable, users still need documentation to understand how functions behave, what inputs are valid, and what guarantees the API makes. Good documentation can be the difference between people adopting an API or abandoning it for another one. 

A central theme is that documentation should define the API’s **behavioral contract**. Method signatures only show parameters and return types; they do not explain ranges, invalid inputs, error handling, side effects, or expected outcomes. The text frames this using **design by contract**: functions should document their **preconditions** and **postconditions**, while classes should document their **invariants**. That way, clients know both what they must provide and what the API promises in return. 

The excerpt also notes that documentation is crucial for communicating **behavioral changes that do not alter signatures**. An implementation can change in a way that remains source- and binary-compatible but still affects how client code should behave. In such cases, updating the documentation is the main way to communicate that the API has meaningfully changed. 

It then gives practical guidance on **what to document**: every public class, function, enum, constant, and typedef. Documentation should cover valid inputs and outputs, exceptions, thread safety, units, complexity, ownership rules, side effects, deprecations, related features, version information, and examples. The broader point is that users need both the interface surface and the contextual details that let them use it safely and productively. 

Finally, the text recommends writing documentation **as the API is implemented**, revising it later as the design stabilizes, and having someone else review it. Since API authors are often too close to the implementation, outside reviewers can spot missing assumptions and unclear explanations more easily. Overall, the excerpt presents documentation as a key tool for making APIs understandable, trustworthy, and reusable. 

### Types of documentation

This excerpt explains that API documentation should be **broader than autogenerated reference pages** and should cover multiple complementary forms, each serving a different user need. 

It begins by noting that documentation can be partly **community-driven**. Wikis, comment systems, and feedback channels let users contribute examples, corrections, and clarifications that go beyond what the original authors can provide. But this raises a versioning challenge: documentation should stay aligned with specific API releases, so older users can still consult the docs that match the version they use. 

The excerpt then describes several major documentation types. The first is **automated API documentation**, generated from comments in public headers. This keeps class and method docs close to the code, makes them easier to keep current, and enables cross-references. It also recommends having technical writers review these comments for clarity, consistency, and completeness. 

Beyond reference docs, the text stresses the need for **overview documentation**: prose that explains what the API does, what problem it solves, its main concepts, requirements, installation, configuration, feedback channels, and life-cycle status. It also highlights that some of this higher-level material can itself be partially autogenerated from code or metadata, so it stays synchronized with the implementation. 

A particularly strong emphasis is placed on **examples and tutorials**. The excerpt argues that users often care less about isolated method descriptions than about how to accomplish tasks. For that reason, documentation should include small code snippets, working demos, walkthroughs, sequence diagrams, FAQs, and even contributed examples from users. It also recommends deriving examples from automated tests when possible, so the samples remain correct and up to date. 

The text also covers **release notes**, which should accompany every release after the first. These should summarize what changed, list incompatibilities, fixed bugs, deprecated or removed features, migration advice, known issues, and ways to report problems. Release notes help users understand not just the API itself, but how it evolves over time. 

Finally, it argues that documentation should include **license information** prominently. Users need to know what rights and obligations they have when using the API, whether under proprietary terms or open-source licenses such as GPL, LGPL, BSD, MIT, MPL, or Apache. Without a license, users may have no legal right to use the API at all. 

Overall, the main message is that good API documentation is a **documentation ecosystem**, not a single artifact: reference docs, conceptual overviews, examples, tutorials, release notes, contribution channels, versioned docs, and licensing information all work together to make an API understandable, usable, and maintainable. 

### Documentation usability

This excerpt focuses on **API documentation usability** and **inclusive language**.

Its first main idea is that documentation should be designed for **navigation and learning**, not just for completeness. Research cited in the excerpt suggests that good documentation benefits from an index page, a consistent visual style, searchable content, breadcrumbs, clear terminology, diagrams, and especially code examples. These features help users build a mental map of the documentation and find what they need quickly. 

The text also highlights common reasons APIs are **hard to learn**: missing examples, incomplete content, lack of task-oriented guidance, poor explanation of design rationale, and documentation that is not available in a convenient format. It notes that simply adding more documentation is not always enough, because users often do not read everything carefully. For that reason, tutorials, examples, and cross-references are especially valuable. 

The second major theme is **inclusive language**. The excerpt argues that documentation and software terminology should be respectful, neutral, and welcoming to a diverse audience. It gives examples of replacing terms with harmful or exclusionary associations—such as “master/slave” or “blacklist/whitelist”—with more neutral alternatives like “primary/secondary” or “allow list/deny list.” 

More broadly, it recommends being mindful about wording related to color, race, gender, age, names, and ability, and choosing terms that avoid stereotypes or unnecessary negative connotations. The overall message is that API documentation should not only be **clear and easy to use**, but also **inclusive and considerate in how it communicates**. 

### Using Doxygen

This excerpt introduces **Doxygen** as a mature, open-source tool for generating API documentation automatically from source-code comments, and uses it to illustrate how automated reference documentation can be organized in practice. It supports multiple languages and output formats, and is configured through a plain-text file where you specify project metadata, source patterns, recursion, and output settings. 

A central idea is that **documentation should live close to the code**. Doxygen recognizes special comment styles and commands that let authors describe files, classes, methods, parameters, return values, exceptions, deprecations, version information, warnings, and cross-references. This makes it possible to treat source comments as structured documentation rather than just informal notes. 

The excerpt also shows that good generated docs need **multiple levels of structure**. At the top level, Doxygen can generate a main page with an overview of the API, sections, subsections, extra pages, and conceptual groups. Then, at lower levels, authors can document individual header files, classes, methods, and enums, including grouping related methods into named subsections to improve navigation. 

Finally, the text provides practical templates that show how to document an API systematically: one comment for the file, one for each class, one for each method, and optional comments for enums and grouped members. Overall, the main message is that **tools like Doxygen help turn structured source comments into consistent, navigable API documentation**, but that still depends on authors writing clear, complete comments at every level of the public interface. 

## Chapter 12: Testing

This excerpt argues that **testing is essential because bugs are inevitable**, especially as an API grows in size and complexity. Since developers will always introduce defects, the purpose of testing is to catch those problems as early as possible, before they affect users.

It also emphasizes that API failures can have **wide impact**. Modern software depends heavily on third-party APIs, so defects in one API can propagate into many client applications. Because of that, reliability and predictability are not just nice qualities; they are central to whether users will trust and keep using an API.

The passage’s strongest claim is that **automated tests are the most important practical safeguard** against breaking client programs. Careful testing improves stability, reduces regressions, and strengthens the long-term success of the API.

Finally, the excerpt previews a broader testing perspective: it points to different forms of automated testing, such as **unit, integration, and performance testing**, and also stresses that good API design should make testing easier. Overall, the main message is that **testing is a core part of API development, not an optional extra**.

### Reasons to write tests

This excerpt argues that **testing succeeds or fails as much because of process and priorities as because of technical skill**. It rejects the idea that engineers dislike writing tests; instead, it says most good developers value testing, but they need time and organizational support to do it properly. When schedules are driven only by deadlines or feature delivery, testing is often the first thing sacrificed. 

It then gives several reasons why automated testing matters. Tests increase confidence when changing code, help preserve backward compatibility across API versions, catch defects earlier when they are cheaper to fix, and turn important use cases into executable checks that guard against regressions. In some domains, tests also support compliance with external standards or regulations. The excerpt sums this up by saying testing helps verify both that you are **building the right thing** and **building it right**. 

The passage also acknowledges a tradeoff: large test suites create maintenance overhead. Poorly structured tests can make even good code changes expensive because many tests need updating. Still, it notes that this friction can be useful when public API changes are involved, since it forces teams to think carefully about compatibility and user impact. 

Overall, the main message is that **automated testing is a strategic investment in quality, confidence, compatibility, and cost control**, but it only delivers those benefits when teams explicitly make room for it in their development process. 

### Types of API testing

This excerpt explains that **testing an API is not the same as testing a full end-user application**, so the most relevant testing strategies are not things like GUI automation or whole-system testing, but rather techniques that match APIs as reusable components. It starts by distinguishing **open box testing**—written with knowledge of the implementation—from **closed box testing**—written from requirements and expected behavior without depending on internals. In API work, both perspectives matter. 

Its main recommendation is that API testing should combine **unit testing** and **integration testing**. **Unit tests** check small pieces such as individual functions or classes in isolation, tend to be fast, and are typically written by developers as an open-box technique. The text also notes two common ways to support these tests: preparing a reusable fixture or isolating dependencies with **stubs and mocks**, especially when the code depends on unstable resources like databases, filesystems, or networks.

By contrast, **integration tests** verify that several components work together correctly from the client’s point of view. Even if units pass individually, the API may still fail to support real workflows cleanly when components interact. For that reason, integration testing is framed as a **closed-box technique** based on the API specification and use cases. These tests often need richer validation methods, such as comparing generated outputs against golden files, running the same test over many datasets, or exercising command-line tools that ship alongside the API.

The excerpt also expands API testing beyond functional correctness into **nonfunctional testing**. It lists performance, load, scalability, soak, security, and concurrency testing as important depending on the API’s requirements. Among these, **performance testing** gets special emphasis: key use cases should be monitored so teams do not accidentally introduce speed or memory regressions, although such tests are harder to maintain because timings fluctuate and depend heavily on hardware and environment.

Overall, the main message is that **good API testing is layered**: use **unit tests** for isolated behavior, **integration tests** for real client workflows and component cooperation, and add **nonfunctional tests** like performance, security, or concurrency when those qualities are part of the API’s contract.
