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

### Writing good tests

This excerpt explains **what makes a good automated test, what kinds of things an API test suite should cover, and how to prioritize testing effort**.

It starts with the **qualities of a good test**. Tests should be **fast**, so developers get quick feedback; **stable**, so they do not fail randomly; **portable**, so they behave reliably across platforms; and written with **high coding standards**, just like production code. They should also make failures **easy to reproduce**, especially when randomness is involved. The broader point is that test code should be treated as serious software, not as disposable scaffolding.

The excerpt then outlines a set of **practical testing techniques** for APIs. These include testing control-flow conditions, equivalence classes, boundary values, parameter combinations, return values, getter/setter behavior, and different operation orders. It also highlights **regression testing** to protect backward compatibility, **negative testing** to check error handling, and C++-specific concerns such as buffer overruns, memory ownership, and null-pointer inputs. Together, these techniques aim to exercise both normal and failure behavior methodically.

Because exhaustive testing is usually impossible, the text recommends **focusing effort strategically**: prioritize primary use cases, tests with broad coverage, complex or risky code, poorly defined areas, security- or performance-sensitive features, failures with the worst client impact, and features that can be tested early in development. In other words, testing should be risk-driven, not just exhaustive in theory.

Finally, the excerpt discusses **working with QA teams**. A common split is that developers own unit tests while QA owns integration tests. For API work, QA is most effective when testers can also write code, since APIs are exercised programmatically. Script bindings, command-line tools, and data-driven test harnesses can make it easier for QA engineers to contribute automated tests even if they are not working directly in the API’s implementation language.

Overall, the main message is that a strong API test suite should be **well engineered, methodical, risk-focused, and collaborative**, combining good test design with practical process decisions.

### Writing testable code

This excerpt argues that **testability should influence API design from the start**, not be treated as something added afterward. The core idea is that decisions made during design and implementation can make automated testing far easier, more robust, and more expressive.

A major theme is **test-driven development (TDD)**. The text presents TDD as a cycle of writing a failing test first, implementing the smallest amount of code needed to make it pass, and then refactoring. This keeps development focused on actual use cases, encourages incremental progress, and helps avoid premature complexity. The excerpt also notes that TDD remains useful during maintenance: when a bug is found, writing a failing test for it first both guides the fix and leaves behind a regression test.

The passage then explains **test doubles**—especially **fakes, stubs, and mocks**—as tools for isolating code from unpredictable dependencies like filesystems, databases, or networks. Stubs mainly return canned responses, while mocks also verify interaction patterns such as call counts and order. The broader design lesson is that APIs become easier to test when they rely on **dependency injection**, so collaborators can be replaced during tests instead of being created internally.

It also discusses ways to test **private code** without destroying encapsulation. Options include public self-test methods, friend-based approaches, and dedicated test runner abstractions. The point is not that private implementation details should routinely become public, but that API designers may need controlled mechanisms to validate internal behavior thoroughly when ordinary public tests are not enough.

Another important section covers **assertions and contract programming**. Assertions are presented as checks for programmer errors and invalid internal states, while normal error handling should still be used for recoverable user mistakes. Building on that, the excerpt describes **preconditions, postconditions, and invariants** as executable forms of design by contract, typically enforced with assertion-style helpers such as `require`, `ensure`, and invariant checks. These checks help catch errors close to their source and clarify the API’s intended behavior.

Finally, the excerpt introduces two broader design-for-testability ideas. One is **record and playback**: logging API calls, arguments, and results so real usage can be replayed as reproducible tests or debugging sessions. The other is **internationalization-aware API design**, such as avoiding locale-specific formatted strings in low-level interfaces and exposing errors in forms that applications can localize appropriately. Together, these reinforce the main message: **good APIs are designed not only to work, but also to be testable, diagnosable, and adaptable in real-world use**.

### Automated testing tools

This excerpt surveys the **tooling ecosystem that supports automated testing**, organizing it into four main categories: **test harnesses, code coverage tools, bug tracking systems, and continuous build systems**. Its central idea is that good testing depends not just on writing tests, but on having infrastructure that helps teams run tests, measure what they cover, track defects, and execute verification continuously.

First, it presents **test harnesses** as frameworks that make automated tests easier to write, group, run, and report. A good harness should support assertions, fixtures, whole test suites, and failure reporting, and the text illustrates this with examples such as **CppUnit, Boost Test, Google Test, and TUT**. The main message is that these frameworks reduce the operational friction of testing and make test suites more maintainable.

Second, it explains **code coverage tools**, which instrument code so teams can see what functions, lines, branches, or conditions were actually exercised by tests. The excerpt distinguishes several coverage metrics—such as function, line, statement, decision/branch, and condition coverage—and stresses that they differ in precision and difficulty. It also argues that coverage targets should be used pragmatically, especially with legacy code: old modules may need gradual improvement rather than the same standards as new code.

Third, the text describes **bug tracking systems** as databases for recording, prioritizing, assigning, and resolving defects and feature requests. Their value lies not only in storing bugs, but also in enabling triage, filtered views, reporting, quality metrics, and integration with revision control so fixes can be tracked end to end. It also clarifies that bug trackers are not the same thing as customer support systems or general project-management tools, even though some platforms combine those capabilities.

Finally, it covers **continuous build systems**—what today would usually be called CI/CD—as automated processes that rebuild software and rerun tests whenever changes are checked in. These systems are especially important for large or cross-platform projects because they surface build and test failures quickly. The excerpt also notes a practical tension: as test suites grow, teams may need to split tests into fast and slow categories, or run separate pipelines for quick build feedback versus full test execution.

Overall, the passage argues that **reliable API testing requires an ecosystem of tools**: frameworks to execute tests, coverage tools to expose blind spots, trackers to manage defects, and CI systems to make testing continuous and actionable.

# The design of web APIs

## Chapter 2: Designing an API for its users

This excerpt argues that **API design should begin with users’ goals, not with implementation details or whatever capabilities happen to exist already**.

Its main point is that an API is a **user interface for developers**, so it should be designed to help its users accomplish meaningful tasks. Before designing endpoints, methods, or data structures, the designer needs a clear plan: identify what users actually want to achieve with the API, such as sharing content, adding contacts, or retrieving information.

The text emphasizes that these goals form the **functional blueprint** of the API. A good design depends on identifying a set of goals that is both relevant and complete, so that the API supports real user needs instead of exposing features blindly.

Finally, the excerpt contrasts two perspectives. The one that should guide API design is the **consumer’s perspective**: the viewpoint of the people and software that will use the API. The perspective that can distort design is the **provider’s perspective**, which focuses too much on the organization or the internal system exposing the API. Overall, the message is that **good APIs are designed around what users need to accomplish, not around what providers want to expose**.

### The right perspective for designing everyday user interfaces

This excerpt argues that API designers should think like designers of **everyday interfaces**: the right perspective is not “how the system works inside,” but **what users are trying to do**. The text says that focusing on internals leads to confusing interfaces, while focusing on user goals leads to simpler, more understandable ones.

It develops this idea through the fictional **“Kitchen Radar 3000”**. That device is presented as a badly designed interface because it exposes its underlying mechanism—the magnetron—and even its historical origin in radar technology, instead of clearly telling users that it is basically a microwave oven for heating food. As a result, the purpose of the device is hard to infer and the control scheme is awkward and unintuitive.

The excerpt then shows how the design improves when it is reframed around **user intentions**. Simply renaming the device and its button in terms users understand already helps, but the real improvement comes from redesigning the controls around the task users actually want to perform: **heating food for a chosen time at a chosen power**. The complex magnetron behavior is pushed behind the interface, where it belongs.

The main lesson for API design is that an API should work like a good control panel: it should be an **easy-to-understand, easy-to-use representation of what users can accomplish**, while hiding irrelevant implementation details. In that sense, the excerpt presents APIs as interfaces for software that should obey the same design principles as physical and digital everyday tools.

### Designing software’s interfaces

This excerpt argues that an API should be understood as **software’s control panel**. Just as a microwave oven has buttons and labels that let someone heat food without knowing how the circuitry works, an API should expose what users can do with software without forcing them to understand its internals.

Its main contrast is between two design perspectives. A **provider-centered API** exposes inner workings, such as “turn magnetron on” and “turn magnetron off.” That makes client code more complex, more error-prone, and less intuitive, because users must reconstruct the real task themselves from low-level operations. By contrast, a **consumer-centered API** expresses the actual goal directly, such as “heat food at a given power for a given duration.” That makes the interface simpler and easier to use.

The example shows this difference clearly: with the “Kitchen Radar 3000” API, heating food requires several steps, timing logic, and even risks bugs. With the “Microwave Oven API,” the same task becomes a single high-level instruction. The implementation still handles the complex internal behavior, but that complexity remains hidden where it belongs.

Overall, the passage’s message is that **good APIs represent user goals, not system mechanics**. They should hide irrelevant implementation details and present simple, meaningful actions that match what consumers actually want to achieve.

### Identifying an API’s goals

This excerpt explains a **method for identifying an API’s goals before designing the interface itself**. Its central idea is that you should not jump straight into endpoints or method signatures. Instead, you should first build a precise picture of **who uses the API, what they want to do, how they do it, what inputs they need, what outputs they get, and how those inputs and outputs connect to other goals**.

It begins with the distinction between **“whats”** and **“hows.”** The “whats” are the broad things users want to accomplish, while the “hows” are the concrete steps they follow. The key lesson is that a single high-level action often decomposes into multiple goals. In the shopping example, “buy products” is too coarse; it really breaks into steps such as searching for products, adding one to the cart, and checking out. Without that decomposition, important goals can be missed.

The excerpt then adds two more layers: **inputs** and **outputs**. For each step, you should ask what the user needs to perform it and what they receive in return. This helps make goals more precise and also reveals hidden domain concepts. For example, “check out cart” does not just consume a cart; it also returns an **order**, which means orders are part of the API’s domain whether or not they were obvious at first glance.

A major contribution of the method is that it uses **input sources and output usage to find missing goals**. If a step needs a product, where does that product come from? If a step returns an order, what is that order later used for? Following those questions can reveal missing actions like “search for products,” “list orders,” or “check order status.” In other words, goals are discovered iteratively by tracing how data enters and leaves each step.

The text then strengthens the method further by explicitly adding **user identification**. Different user types may have different goals, and missing user roles can hide entire parts of the API. In the shopping example, noticing that products must come from somewhere reveals an **admin** role who manages the catalog, not just customers who buy from it. The term “user” is broad here: it can mean end users, client applications, or distinct roles/profiles.

To organize all this, the excerpt proposes an **API goals canvas**, a six-column table: **Whos, Whats, Hows, Inputs (source), Outputs (usage), and Goals**. The idea is to use it as a practical worksheet for investigating an API systematically and then reformulating each step into a concise goal statement. The canvas is meant to stay **high-level** at this stage: do not dive into fine-grained data or error handling yet.

Finally, the excerpt stresses that this process is **iterative and incomplete by design**. You should start with a small set of users or use cases, focus on the main path first, and then expand to variations, branches, and additional roles. The method helps make the goals list more accurate and exhaustive, but it still requires care to keep the design grounded in the **consumer’s perspective** rather than slipping back into provider-centered thinking.

### Avoiding the provider’s perspective when designing APIs

This excerpt explains how the **provider’s perspective can quietly distort API design**, even when the designer intends to focus on users. Its core warning is that APIs become harder to understand and use when they mirror the provider’s internal world instead of the consumer’s goals.

It identifies **four main sources** of this distortion. The first is **data structure**: APIs that expose table names, schema fragments, or storage-oriented concepts force consumers to think like the database instead of like users. The second is **code and business logic**: when internal workflows are pushed onto consumers, they must orchestrate low-level steps themselves, which makes the API both more complex and more error-prone.

The third source is **software architecture**. If an API simply reflects the boundaries of backend services, consumers may need multiple calls and extra coordination just to complete one meaningful task. The fourth is **human organization**, following Conway’s law: if an API mirrors departments or teams inside the provider organization, it may expose steps that are irrelevant to consumers and should have remained internal.

Across all four cases, the remedy is the same: replace provider-oriented, low-level, fragmented goals with **higher-level consumer-oriented goals** that express what users actually want to achieve, while the implementation handles the internal complexity behind the scenes.

Finally, the excerpt updates the **API goals canvas** with one final check: after identifying users, actions, inputs, outputs, and goals, ask **“Is all this really the consumer’s business?”** That question helps detect accidental exposure of data models, business rules, architecture, or organizational structure, and keeps the design centered on usability.

## Chapter 9: Evolving an API design

This excerpt argues that **API design does not end when the first version is released**. Once an API exists, it becomes something that must evolve over time, and designing those evolutions requires special care.

Its main focus is **breaking changes**. The Billy bookcase example shows how a seemingly small design change—new shelves with incompatible pegs—can unexpectedly break compatibility with older products. The same can happen in APIs: a change that looks like an improvement from the provider’s side can break consumers that rely on the previous structure.

The banking example makes this concrete. Changing `balance` from a simple number into an object with `value` and `currency` may be more expressive, but it breaks existing client applications that still expect a number. As a result, consumers can fail or even crash unless they update their code.

The passage therefore defines a **breaking change** as any change that forces consumers to modify their code in order to keep working. Since providers usually cannot coordinate an API update with all consumers at the same time, avoiding or at least recognizing breaking changes is a major responsibility of API designers.

Finally, the excerpt notes that the API contract includes not only the explicit interface, but also **observable behaviors** that clients may depend on. Those behaviors can change silently and still create unexpected breakage. Overall, the message is that **API evolution must be designed carefully, with attention to compatibility, hidden behavioral contracts, and versioning**.

### Designing API evolutions

This excerpt explains **how API evolutions can introduce breaking changes, where those changes can appear, and which modifications are usually safer than others**. Its main message is that breaking changes are not limited to obvious signature changes: they can come from data shape, meaning, protocols, flows, security, or even undocumented observable behavior.

It first shows that **output data** is easy to break by renaming, moving, removing, or retyping fields, changing formats, changing meanings, widening characteristics in ways consumers did not expect, or adding enum values that clients cannot interpret. The safest output-side evolution is usually **adding new elements** without changing existing ones, though this can make the API messier over time.

It then contrasts this with **input data and parameters**, where the rules are slightly different. For inputs, renaming, moving, changing type/format/meaning, removing accepted values, or adding new mandatory fields will usually cause provider-side validation errors for old clients. The safest input-side changes are mostly **adding optional fields**, **widening accepted ranges**, **adding enum values**, or **making required fields optional**.

The excerpt also explains that **success and error feedback** can break clients, including response bodies and protocol-level signals like HTTP status codes. In theory, some HTTP status changes should be acceptable if clients follow the spec correctly, but in practice many clients are more rigid than the protocol assumes, so even seemingly valid feedback changes should be made with extreme caution.

At a higher level, **goals and flows** can break too. Renaming or removing goals is obviously disruptive, but even **adding a new mandatory step** to an existing workflow can silently break consumers that keep calling the old flow. The same applies to **security changes**: altering scopes, token acquisition, token contents, or access rules can cause either breaking changes or outright security breaches if done carelessly.

A particularly important idea is the **“invisible interface contract.”** Even if the documented interface has not changed, consumers may still depend on observable behaviors such as ordering, timing, default lengths, or other patterns not formally promised. The excerpt uses this to illustrate Hyrum’s law: with enough users, someone will depend on almost any observable behavior.

Finally, the text notes that **breaking changes are not always equally problematic**. For public APIs used by third parties, they are usually very costly and should be avoided. For private APIs whose consumers can be updated in sync, they may be manageable. Still, when breakage is unavoidable, the safest response is usually **versioning**.

### Versioning an API

This excerpt explains that **API versioning is mainly about managing breaking changes from the consumer’s point of view**, and that it should not be confused with **implementation versioning**. An API can keep exposing the same public contract even if its backend is rewritten, optimized, or moved to a different language. What matters for API version numbers is the **interface contract visible to consumers**, not internal technical changes.

It also argues that, for consumers, the only version changes that usually matter are the ones that signal **non-backward-compatible changes**. Providers may track minor compatible revisions internally, but most consumers mainly care whether they are still using “version 1” or must migrate to “version 2.” In that sense, API versioning is simpler from the consumer side than from the provider side.

The excerpt then surveys several ways to **expose API versions** in HTTP-style APIs: through the **path**, **domain/subdomain**, **query parameter**, **custom header**, **content negotiation**, or even **consumer-side configuration stored by the provider**. Its general recommendation is to choose a representation from the **consumer’s perspective**, prioritizing clarity and ease of use. Path- and domain-based versioning are presented as especially easy to understand, while other options may be more technical or less obvious.

A major section compares **versioning granularity**. You can version an API as a whole, or version individual **resources**, **operations**, or even **messages/data formats**. The tradeoff is that finer-grained versioning can reveal more precisely what changed, but it also makes it much harder for consumers to know which versions are compatible with each other. For REST APIs, the text therefore treats **API-level versioning as the default recommendation**, with finer-grained schemes reserved for special cases.

Finally, the excerpt stresses that versioning has consequences **beyond design**. Breaking changes affect product management, migration strategy, documentation, infrastructure, and implementation choices. Supporting multiple versions at once can require either multiple backends or a single implementation that handles all versions, and both approaches have costs. Overall, the passage’s message is that **versioning is not just naming releases: it is a consumer-facing compatibility strategy with technical, organizational, and product implications**.

### Designing APIs with extensibility in mind

This excerpt argues that **extensibility is one of the main ways to make API evolution safer**. Even when you already know how to avoid some breaking changes and how to version unavoidable ones, you should still design the API so future growth is easier and less disruptive. The text says this depends on careful choices in **data design, interactions, flows, and API boundaries**.

For **data**, the main advice is to choose shapes that can grow without changing meaning. High-level responses should be wrapped in **objects**, not returned as raw scalars or bare arrays, because objects let you add fields like metadata later without breaking clients. Inside those objects, the excerpt recommends avoiding fragile designs such as multiple booleans for evolving state, and instead preferring **self-descriptive values** such as status strings or status objects. It also suggests grouping similar repeated fields into **lists of structured items** and using established standards like **ISO 8601 durations** or **ISO 4217 currency codes** so new values can be introduced more naturally.

For **interactions**, the text applies a version of Postel’s law: be consistent in what you return and avoid unnecessary errors when accepting input. That means using **generic, reusable error types** instead of overly specific ones, and sometimes tolerating unknown parameters or capping oversized requests rather than rejecting them outright, when doing so is safe. At the same time, the excerpt is careful to say this should not be taken to absurd extremes: some invalid inputs, such as a money transfer amount above the allowed maximum, must still be rejected.

For **flows**, the key lesson is that extensibility is not only about future schema changes, but also about supporting **more than the original use case**. An API flow designed too closely around one UI or one consumer process can become awkward for other clients. The banking example shows that using special internal IDs tied to a mobile flow made reuse harder for a back-office tool. The recommendation is to design steps that are more **standalone**, less coupled to a single process, and based on **widely adopted inputs and outputs**.

Finally, at the **API level**, the excerpt argues that extensibility also depends on scope. As APIs grow larger, they accumulate more evolutions and therefore more chances to introduce breaking changes. So one of the best long-term extensibility strategies is often to build **smaller, better-scoped APIs** rather than one very large one.

Overall, the passage’s message is that extensibility should be designed in from the start: use **object envelopes, self-descriptive and standardised data, tolerant but sensible interactions, reusable flows, and smaller API boundaries** so future changes are easier to make without hurting consumers.

## Chapter 12: Documenting an API

This excerpt argues that **API documentation is broader than just reference docs** and that API designers need to think about documentation as part of the overall design process, not as an afterthought.

Its main idea is that APIs need **different kinds of documentation for different audiences and purposes**. Using the alarm clock example, the text distinguishes:

* **reference documentation**, which describes the interface itself;
* **operating manuals**, which explain how to accomplish real tasks or use cases;
* **change logs**, which communicate what was added or changed between versions; and
* **implementation specifications**, which guide the people building the system so the implemented behavior matches the intended design.

A key point is that **reference documentation alone is not enough**. Listing goals, inputs, and outputs may describe what the API offers, but users also need guidance on how to combine those pieces to achieve meaningful outcomes. That is why the text compares reference docs without usage guidance to a recipe that only lists ingredients but not the steps.

The excerpt also stresses that documentation matters not only for API consumers, but also for **implementers**. If the design does not include enough behavioral detail, the implementation may fail to match the intended result. In that sense, documentation helps preserve the integrity of the design all the way through development.

Finally, the passage explains that API designers may create this documentation directly or contribute raw material to technical writers, depending on the team and the kind of API. It also notes that documenting an API thoroughly can act as a **test of the design itself**: if it is hard to explain how to use or implement, that may signal that the API design is not good enough yet.

### Creating reference documentation

This excerpt argues that **API documentation is broader than just reference docs** and that API designers need to think about documentation as part of the overall design process, not as an afterthought.

Its main idea is that APIs need **different kinds of documentation for different audiences and purposes**. Using the alarm clock example, the text distinguishes:

* **reference documentation**, which describes the interface itself;
* **operating manuals**, which explain how to accomplish real tasks or use cases;
* **change logs**, which communicate what was added or changed between versions; and
* **implementation specifications**, which guide the people building the system so the implemented behavior matches the intended design.

A key point is that **reference documentation alone is not enough**. Listing goals, inputs, and outputs may describe what the API offers, but users also need guidance on how to combine those pieces to achieve meaningful outcomes. That is why the text compares reference docs without usage guidance to a recipe that only lists ingredients but not the steps.

The excerpt also stresses that documentation matters not only for API consumers, but also for **implementers**. If the design does not include enough behavioral detail, the implementation may fail to match the intended result. In that sense, documentation helps preserve the integrity of the design all the way through development.

Finally, the passage explains that API designers may create this documentation directly or contribute raw material to technical writers, depending on the team and the kind of API. It also notes that documenting an API thoroughly can act as a **test of the design itself**: if it is hard to explain how to use or implement, that may signal that the API design is not good enough yet.

### Creating a user guide

This excerpt explains that **reference documentation is necessary, but not sufficient**: API users also need a **user guide** that shows how to combine individual operations to accomplish real tasks. A reference tells you the “ingredients,” while a user guide explains the “recipe.”

Its main focus is **documenting use cases**. The example user guide shows concrete workflows such as transferring money or canceling a transfer, describing the sequence of API calls, the choices users must make, and the data they need at each step. The text connects this directly to the **API goals canvas** from design: the same work used to identify users, goals, inputs, and outputs can be reused to write task-oriented documentation.

The excerpt also explains that these guides can be implemented in different ways. For smaller or simpler cases, formatted text and diagrams may be enough. For larger APIs, tools like **ReDoc** can incorporate guide content directly from an OpenAPI description, including Markdown sections and images. Diagrams are especially encouraged because they help consumers grasp workflows more quickly.

Another key point is that a user guide should document **security and common behaviors**. Users need to know not only which calls to make, but also how to register, obtain tokens, authenticate, understand errors, work with pagination, and handle shared conventions across the API.

Finally, the text notes that documentation does not have to remain **static**. Modern developer portals can provide interactive guides, “Try It” features, and step-by-step runnable workflows, making the documentation itself part of the developer experience. Overall, the message is that **good API documentation must include practical, task-oriented guidance in addition to reference material**.

### Providing adequate information to implementers

This excerpt argues that **API implementers need more than consumer-facing documentation**. Reference docs and user guides explain the public contract and how consumers are supposed to use the API, but they are not enough to ensure the implementation behaves correctly. Implementers also need **provider-facing documentation** that explains what should happen under the hood.

The banking example shows what goes wrong when that information is missing. The implemented API returned balances in the wrong format, used internal currency codes, exposed stale daily balances instead of real-time ones, handled errors poorly, and even had a serious security flaw by returning another customer’s account data. The root cause was not just coding mistakes, but an **incomplete specification of mappings, behaviors, and security expectations**.

To fix this, the team enriched the OpenAPI description with more precise details. Standard fields and `externalDocs` clarified consumer-visible concepts such as ISO 4217 currency formats, while custom `x-implementation` extensions documented provider-side concerns like where data comes from, which internal fields map to which API properties, what security checks must be performed, and what error or HTTP status should result when those checks fail.

A key point is that this **implementation-oriented information must stay hidden from consumers**. Consumer-facing docs should expose the public contract, while provider-side details such as internal system locations, data mappings, and security rules should be stripped before publication.

Overall, the passage’s message is that good API documentation has **two layers**: one for consumers, explaining how to use the API, and one for implementers, explaining how to build it correctly and securely. In addition to written documentation, implementers may also need **training and general guidance**, especially for complex concerns like security and error mapping.

### Documenting evolutions and retirement

This excerpt explains that **API changes must be documented**, whether they are breaking or not.

Its main point is that a **change log** helps both API consumers and the wider project team. For consumers, it highlights new features, deprecations, and retirements so they know whether they need to update their code. For the team, it provides a shared overview of what has changed between versions.

The text also argues that the **best person to document these changes is the API designer**, because they know the rationale and impact of the modifications. A good change log should explicitly state which elements were **added, modified, deprecated, or retired**, including things like parameters, data model fields, responses, and security scopes.

It then shows how **OpenAPI** can support this process. While OpenAPI does not define a dedicated changelog structure, it does let designers mark operations, parameters, and schema properties as **deprecated** with a `deprecated: true` flag. Descriptions can then point users to replacements and optionally indicate when removal will happen.

Finally, the excerpt notes that deprecation can also be communicated **dynamically at runtime**, for example with the **Sunset** HTTP header, which tells clients when a resource or API version will stop being available.

Overall, the message is that **API evolution should be documented clearly and proactively**, using both static documentation like change logs and, when useful, runtime signals such as deprecation metadata and sunset dates.

## Chapter 13: Growing APIs

This excerpt serves as a transition from individual API design techniques to the **broader long-term practice of API design**.

Its main point is that APIs cannot be designed in isolation. Earlier chapters expanded the focus beyond the interface itself to include the **consumer’s context**, the **provider’s context**, and the need to design for **future evolution** so changes are less likely to introduce breaking problems. Documentation was also presented as part of that larger picture.

From there, the excerpt introduces the next step: understanding APIs as things that exist within a wider organizational and lifecycle context. It previews four major themes:

* the **API lifecycle**, from creation to retirement;
* **API guidelines**, needed for consistency across multiple APIs or versions;
* **API review**, to ensure designs are coherent, implementable, and useful; and
* **communication and sharing**, so APIs, their changes, and design practices are understood across teams.

Overall, the message is that **good API design is not only about designing one interface well, but about managing APIs over time, across teams, and within a larger ecosystem**.

### The API lifecycle

This excerpt explains that **API design is only one part of the broader API lifecycle**.

It presents the lifecycle as a sequence of phases: **analyze, design, implement, publish, run, evolve, and retire**. The process begins by deciding whether an API is worth creating and what needs, users, and goals it should serve. Then the interface is designed, implemented, published, operated, evolved with new features, and eventually retired when it is replaced or no longer needed.

A key point is that this lifecycle is **iterative**, especially in the early stages. Analysis, design, and implementation often loop back on each other as teams learn more, discover constraints, or revise decisions.

The excerpt also stresses that **API designers do more than design interfaces**. They often contribute across multiple phases of the lifecycle by collaborating with stakeholders, product owners, developers, testers, technical writers, and consumers. Their work can include documentation, reviews, communication, and helping guide API evolution over time.

Finally, it emphasizes that organizations usually manage **multiple evolving APIs**, not just one. Because of that, API designers need to work together—or stay consistent with their own prior work—to build a coherent API surface across the organization.

Overall, the main message is that **APIs must be understood as long-lived products with a lifecycle, and API designers need to think beyond individual interface design to support consistency, collaboration, and long-term evolution**.

### Building API design guidelines

This excerpt argues that **API design guidelines are essential for keeping an organisation’s API surface consistent**, especially when multiple designers, teams, or API versions are involved. Without shared guidance, people will make different but individually reasonable choices, which leads to inconsistency and wasted debate. Guidelines help align decisions, support beginners, and let teams focus on designing APIs that are easier to understand and use.

It then proposes **three main layers of guidelines**. **Reference guidelines** define the core rules and vocabulary, such as how to use HTTP methods, status codes, headers, paths, errors, and pagination. **Use case guidelines** turn those rules into practical recipes for common design situations, such as creating an element or choosing the right response pattern. **Design process guidelines** explain how to design APIs in the first place, pointing people to tools, canvases, checklists, training, and recommended materials. The excerpt also notes that guidelines can go beyond interface design and include security, network, architecture, or implementation considerations when those are needed for consistency.

A major point is that guidelines should be **built incrementally**, not all at once. Teams should start small, cover the most necessary topics clearly and accurately, and then evolve the guidelines based on real design questions and real experience. As they grow, guidelines may need fixes, refinements, or even different variants for different contexts, such as REST externally and gRPC internally. Because guidelines themselves evolve, they also need **versioning and change logs**.

Finally, the excerpt stresses that guidelines must be **collective, communicated, and non-dogmatic**. They should not be written in isolation by one person and then imposed as rigid law. Instead, they should be created by experienced practitioners, explained clearly, justified, promoted actively, and adjusted when necessary. Overall, the message is that good API guidelines are a **shared, evolving tool for consistency and practical decision-making**, not a static rulebook enforced by “API police.”

### Reviewing APIs

This excerpt argues that **APIs must be reviewed throughout their lifecycle**, because many serious problems are not caught by design alone. Its opening example shows how a proposed `send email` API looked reasonable at first, but review revealed deeper issues: it exposed the wrong goal, violated design guidelines, and would have created a major security hole by letting consumers send arbitrary emails on behalf of the company.

The passage then organizes API review into several layers. First, teams must **challenge and analyze the need itself** before designing anything, asking what problem really needs to be solved, in what context, for whom, and whether an API is even the right solution. This can reveal that the initial request is only a symptom of a different underlying need, as in the example where the real goal was customer notification, better solved with an event-driven publish/subscribe design.

Once a design exists, it should be **linted**: checked for errors, guideline violations, documentation gaps, security issues, inconsistent names, bad types, impossible flows, and breaking changes. Linting can partly be automated, but some of the most important checks—such as whether descriptions are meaningful or whether a design is consistent with preexisting APIs and standards—still require human judgment.

After linting, the design must be reviewed from both the **provider’s perspective** and the **consumer’s perspective**. From the provider side, the review asks whether the API truly fulfills the identified needs, can actually be implemented, is secure, performs adequately, and can evolve. From the consumer side, it asks whether the API is understandable, efficient, minimal, meaningful, and free from provider jargon or exposed internal mechanics.

Finally, the excerpt stresses that review does not stop at design: the **implementation must also be verified**. Security testing is especially non-negotiable. Teams should not trust generated documentation alone, must test runtime behavior, must verify response constraints like required fields and value ranges, and must exercise the full network path—including gateways, proxies, and firewalls—because those layers can silently alter or break the API’s behavior.

Overall, the main message is that **good API review is broader than checking endpoints**: it means validating the need, linting the contract, reviewing usability and implementability, and testing the real deployed behavior so that the API is secure, coherent, and genuinely useful.

### Communicating and sharing

This excerpt says that **API design is deeply collaborative**. API designers do not work alone: they need to coordinate with stakeholders, consumers, implementers, security specialists, documentation teams, and other API designers.

Its main message is that designers must be able to **share their work clearly**. That includes using standard API description formats, source control, wikis, catalogs, or developer portals so designs, guidelines, and existing APIs are easy to find and reuse.

It also stresses the importance of **accessibility and consistency**. Guidelines should be visible to everyone involved, and APIs and data models should be searchable so designers can stay aligned with past work instead of reinventing things inconsistently.

Finally, the excerpt highlights **review and community**. Designers should seek peer review, participate in API communities or guilds, and, most importantly, get feedback from actual consumers. Overall, the message is that **good API design depends not only on technical skill, but also on communication, shared knowledge, and collaboration**.

# Clean Code

## Chapter 1: Clean Code

The passage argues that **code will never disappear**: even if languages become more abstract or domain-specific, requirements still need to be expressed with enough precision for a machine to execute them, and that precision is code. It also argues that **bad code is a long-term productivity trap**: teams often create messes to go faster, but the mess quickly slows development, encourages more mess, and can even trigger failed “grand redesign” efforts.

A central theme is **professional responsibility**. The author says programmers cannot blame only managers, schedules, or changing requirements for bad code; developers are responsible for defending code quality just as doctors defend hygiene and safety. The “primal conundrum” is that people feel pressure to rush, but the author insists that the only real way to move fast is to **keep the code clean at all times**.

The text then explores **what clean code means** through several perspectives. Across those views, common themes emerge: clean code is elegant, efficient, focused, readable, expressive, minimally duplicated, and supported by tests. It should make intent obvious, minimize dependencies, do one thing well, and feel as though it was written by someone who cares.

Another major point is that programmers are **authors**, and code is read far more than it is written. Because most development time is spent navigating and understanding existing code, making code easier to read also makes future code easier to write. That leads to the “Boy Scout Rule”: always leave the code a little cleaner than you found it, even through small improvements.

The conclusion is modest but practical: a book cannot magically give someone “code-sense,” but it can teach techniques, habits, and ways of thinking that help people recognize and produce cleaner code. Real improvement, like mastering an art, comes through **practice**.

## Chapter 2: Meaningful Names

The passage argues that **good names are essential to readable code** because names appear everywhere and carry much of the burden of explanation. Good names should reveal intent, avoid misleading clues, make meaningful distinctions, be pronounceable, searchable, and free of unnecessary encodings like Hungarian notation or member prefixes. It also stresses that classes should usually have noun-like names, methods verb-like names, and teams should use one consistent word per concept to avoid confusion.

A major theme is that **clarity beats cleverness**. The text warns against vague names, tiny spelling variations, noise words like `Info` or `Data`, cute or joke names, and single-letter identifiers outside very small scopes. It encourages using solution-domain terms when they are the clearest for programmers, problem-domain terms when they best reflect the business concept, and enough context to make a name meaningful—but not so much context that names become bloated and redundant.

The passage ends by emphasizing that **naming is a skill tied to design and communication**, not just syntax. Good names often require refactoring, and developers should not be afraid to rename things when better names emerge. The payoff is code that reads more naturally and remains easier to understand and maintain over time.

## Chapter 3: Functions

The passage argues that **functions are the primary unit of organization in programs**, and that writing them well means making them **small, focused, and readable**. It contrasts a long, tangled example with a refactored version to show that good functions stay at one level of abstraction, tell a clear story, and are easier to understand from top to bottom.

A central principle is that **functions should do one thing, do it well, and do only that**. The text explains that a function is doing “one thing” when its steps all belong to the same level of abstraction and can be described as a short “TO” paragraph. Small functions with shallow indentation, descriptive names, and minimal nested structure make code easier to follow.

The chapter also gives detailed advice about **arguments and side effects**. It recommends preferring zero, one, or at most two arguments; avoiding flag arguments; introducing argument objects when several parameters belong together; and separating commands from queries. It also warns against hidden side effects, output arguments, and returning error codes instead of throwing exceptions, because these make code harder to read and reason about.

Another major theme is that **duplication and mixed concerns damage clarity**. The text promotes extracting `try/catch` blocks, isolating error handling, burying switch statements behind polymorphism, and following DRY. It also stresses that good names matter enormously: descriptive, consistent names help functions read like a narrative and often lead to better design.

The conclusion is that programming is fundamentally an act of **language design and storytelling**. Functions are the verbs of the system’s language, and well-written systems read like clear, top-down stories. Good functions do not usually emerge fully formed; they are produced by rewriting, refactoring, renaming, and simplifying until the code becomes clean and expressive.

## Chapter 4: Comments

The passage argues that **comments are not inherently good**: they are at best a necessary evil, used when code fails to express intent clearly enough on its own. Because comments age badly and often drift away from the code they describe, they can become misleading; the author therefore insists that the most trustworthy source of truth is the code itself, and that developers should prefer rewriting unclear code over explaining it with comments.

It then makes a distinction between **useful comments** and **harmful ones**. Useful comments include things like legal notices, concise explanations of intent, warnings about consequences, carefully managed TODOs, and documentation for public APIs. But most comments, the author says, fall into the bad category: redundant, noisy, misleading, outdated, overly broad, or compensating for bad structure. Examples include commented-out code, journal comments, HTML-heavy comments, mandatory boilerplate, and function headers that merely restate what the code already says.

The core lesson is that **cleaner code reduces the need for comments**. Good naming, small functions, extracted variables, and better structure usually communicate intent more accurately than prose stuck beside the code. Comments should be rare, local, and high-value; when in doubt, the right fix is usually to improve the code rather than add more commentary.

## Chapter 5: Formatting

The passage argues that **formatting is a core part of communication**, not a cosmetic extra. Readability, consistency, and discipline in layout shape how people judge the quality of the whole system, and those choices affect maintainability long after the original functionality has changed.

A major theme is **vertical structure**. Source files should be relatively small, organized like newspaper articles: high-level ideas first, details later. Blank lines should separate distinct concepts, related lines should stay close together, declarations should appear near their use, and functions that depend on each other should be placed near one another in top-down order.

The text also covers **horizontal formatting**. Lines should stay reasonably short, whitespace should clarify relationships and operator precedence, and horizontal alignment is usually less valuable than keeping code compact and well-factored. Indentation is especially important because it makes scope and structure visible at a glance; breaking indentation rules or collapsing blocks onto one line harms readability.

The chapter ends by stressing **team consistency over personal preference**. A development team should agree on one shared formatting style, automate it when possible, and apply it uniformly so the codebase reads like one coherent document rather than a patchwork of individual habits.

## Chapter 17 Smells and Heuristics

The passage presents a long **catalog of code smells and heuristics** meant both as a reference and as a statement of values. It groups problems across comments, environment, functions, general design, naming, tests, and Java-specific practices, arguing that bad code often reveals itself through clutter, duplication, misplaced abstractions, hidden dependencies, unclear names, weak tests, and inconsistent structure.

A central theme is that **clean code is not just about correctness, but about design clarity and maintainability**. The heuristics repeatedly push toward smaller interfaces, fewer arguments, no dead code, minimal duplication, appropriate abstraction levels, precise naming, encapsulated conditionals and boundary cases, explicit dependencies, and functions that do one thing well. The text also emphasizes that design should be enforced by structure when possible, not left to convention alone.

Another major thread is **developer discipline around testing and environment**. Builds and test runs should be simple, tests should be thorough, fast, and especially strong around boundaries and recent bugs, and coverage tools should expose gaps. The goal is not just to have tests, but to make them easy to run and useful for diagnosing patterns of failure.

The conclusion is that this list is **not a complete rulebook**, and that completeness is not even the point. Instead, the heuristics are meant to express a **value system**: professionalism, craftsmanship, and disciplined judgment matter more than memorizing smells one by one. Clean code comes from values that shape habits, not from mechanically following a checklist.

# Write the Docs

## How to write software documentation

The passage argues that **software documentation is essential, not optional**, especially for open-source projects. Good docs help future-you understand your own code, help users see why the project exists and how to use it, attract contributors, improve code design by forcing clearer thinking, and strengthen technical writing skills.

It then explains **what documentation should include**, with an emphasis on serving two main audiences: users and developers. The text recommends clearly stating the problem the project solves, showing a small example, explaining installation, linking to the source code and issue tracker, describing how to get support, documenting how to contribute, and stating the license. It also warns against leaning too heavily on FAQs, since they tend to become outdated, messy, and a substitute for proper documentation.

Finally, the passage discusses **practical tooling and starting points**. It recommends plain-text-based documentation workflows that can render to HTML, briefly mentions Markdown and reStructuredText, and presents the README as the most important initial document because it is often the first thing users see. The overall message is to **start simple, cover the essentials, and treat documentation as part of making software usable and maintainable**.

## Getting started: documentation best practices for developers¶

The passage is a short guide that points developers to **different documentation advice depending on context**. It says that for **open-source developers**, good documentation helps people discover, understand, and use a project, and it recommends a guide on how to start writing software docs.

For **developers in companies**, it focuses on the challenge of justifying documentation work when deadlines push it aside. In that case, it recommends material aimed at showing the business value of documentation and helping teams build support for a documentation strategy internally.

## Building documentation mindshare in a company

The passage argues that building a **documentation culture inside a company** is valuable but difficult, so it should be approached as an organized change effort rather than an ad hoc initiative. It recommends starting by defining a **small, concrete problem**, such as internal engineering project documentation, instead of trying to fix all communication issues at once.

A major recommendation is to **start within engineering**, where it is usually easier to get traction and permission. From there, the effort should include broad input from teams across the organization, so the resulting system reflects real use cases and gains legitimacy.

The text also emphasizes the importance of **structure and ease of use**. A good documentation culture needs a clear taxonomy, standard templates, and a consistent hierarchy so people know both **where to write** and **where to look**. Reducing friction is crucial, since new tooling and processes often create resistance.

Finally, it stresses that documentation culture is a **long-term commitment**, not a one-time setup project. Regular meetings, ongoing feedback, and continuous maintenance are necessary to keep the system alive, improve adoption, and prevent it from decaying like previous abandoned documentation efforts.

## Documentation principles

The passage proposes a **full framework for software documentation**, borrowing the spirit of software design principles such as DRY and KISS and applying them to docs. Its basic claim is that documentation should be treated as a designed system, not as an afterthought: it should be planned early, written collaboratively, structured carefully, published intentionally, and evaluated as a whole body rather than as isolated pages.

It begins with two **general principles**. Documentation should be **precursory**, meaning teams should start documenting before implementation begins: requirements and specifications can serve as the first draft of later public docs, while also helping with peer feedback and group decision-making. Documentation should also be **participatory**: it should not be siloed away from the people who build and use the software. Developers and engineers should document as part of their normal workflow, and readers should have channels to contribute feedback or even edits, subject to appropriate editorial oversight.

The text then defines what makes **content itself** good. First, it should be **ARID**: unlike code, documentation cannot be perfectly DRY, because some of what code does must be restated in prose for humans. The point is not to embrace duplication carelessly, but to accept that some “moisture” is unavoidable and to stay aware that docs must be updated when code changes. Content should also be **skimmable**: readers should be able to find and skip concepts quickly, which means concise headings, descriptive hyperlinks, and paragraphs or list items that foreground the key idea early instead of burying it in prose. It should be **exemplary**, including examples and tutorials for common use cases, but not so many that the docs become cluttered; examples may be separated from dense reference material to preserve scan-ability. It should be **consistent**, both in language and formatting, ideally guided by a style guide, because consistency reinforces readability and aesthetics. Finally, it should be **current**: outdated documentation is described as worse than missing documentation, so authors should try to keep docs version-agnostic where possible and support older versions when necessary.

After content, the passage turns to **content sources**, meaning the systems where documentation is stored and edited. It gives examples such as Markdown or reStructuredText files, CMS content, help text embedded in code, and code comments later assembled into formal docs. It says sources should be **nearby** and **unique**. “Nearby” means documentation should live as close to the relevant code as possible so that changing code and changing docs fit into the same workflow. “Unique” means different sources should not overlap in scope, because parallel copies of the same information create maintenance problems and eventual divergence.

The next level is **publications**, meaning the actual forms readers consume: API references, man pages, `--help` output, in-application tips, tutorials, internal manuals, and so on. Each publication should satisfy five properties. It should be **discoverable**, so users can find it from wherever they are likely to look, even if that means placing pointers rather than full content in multiple places. It should be **addressable**, so readers can deep-link or otherwise refer to specific sections at a granular level. It should be **cumulative**, ordering concepts so prerequisites come before dependent ideas whenever possible, especially in tutorials and examples. It should be **complete**, meaning that within its chosen scope it should cover concepts fully rather than partially; the text uses the analogy of a map that should either show all roads of a given kind or none, not an arbitrary subset. It gives `iconv` as an example: the man page fully covers command options, while a separate `iconv -l` listing fully covers encodings, and both publications are complete within their own scope. Finally, each publication should be **beautiful**, with intentional visual style; even plain-text help output has visual style through layout, spacing, and capitalization.

Finally, the passage zooms out to the **body of publications**, meaning the whole collection of docs across a project and its subprojects. At this level, the main requirement is **comprehensiveness**. No documentation set can answer every obscure question, but together the publications should answer the questions users are most likely to have. The author also notes that this is a balancing problem: a documentation body that answers rare questions while neglecting common ones is out of balance, and it is acceptable if answering some questions requires consulting more than one publication.

So the detailed takeaway is that the passage is not just listing stylistic tips. It is building a layered model of documentation quality: start documentation early and collaboratively; write content that tolerates necessary repetition, is easy to skim, includes examples, stays consistent, and remains current; keep sources close to code and non-overlapping; design publications so they are discoverable, deep-linkable, prerequisite-aware, complete within scope, and visually intentional; and make sure the whole ecosystem of publications is comprehensive enough to answer the questions users are actually likely to ask.

## Conquering imposter syndrome

You are a technical writer. At some point in your career, you may face the notion that you are “just” a technical writer. That notion might originate from the perception of your more technical coworkers, or your own self-doubt.

Some common themes emerge in many teams: anyone can write, but writers don’t code, so they can’t understand technical content. There might even be a notion that the docs should be written by engineers, but they either don’t want to, or don’t have the time. The actual product or code is going to trump its accompanying documentation when push comes to shove. It might seem logical to accept that writing is going to take a backseat and garner less esteem.

All of this can engender an inferiority complex. Combine that with a non-technical background, and you have the recipe for imposter syndrome. You may feel like you are just winging it, and fooling people into thinking you are competent.

If you are worried that you as a writer are just impersonating a skilled technician, you may need to revise your perception of what the required skills for your work truly are.

“Anyone can write”
They sure can. Writing well is a different matter. So is writing well in a technical context. You were not hired because you can capitalise words and punctuate sentences correctly. You’re not copying and pasting what the engineers say and making it look nice. Your skill goes far beyond that.

You have cultivated a cognitive skill set that lets you distil meaning out of a mass of information, and convey it in a way that your entire audience can put it to use. You transform your engineers’ input into chunks that can be readily processed cognitively, and structure those chunks into meaningful sequences. You embed the lot into a context that helps your users apply what they learn and solve their business challenges. You convey not just the WHAT and the HOW, but the WHY. You are at the crossroads of engineering, product management and user enablement.

Your skills require a deep understanding of cognition, communication, how people learn, and what real-life scenarios your users grapple with. These are not skills that people with technical backgrounds possess automatically.

Perspective
Who are your readers?

Beginners who are just getting started

Intermediate or advanced users trying out something new

Any type of user who tried to do something and got stuck

You not being a technical expert is actually an asset. As a technical writer, one of your great skills is the ability to adopt different people’s perspectives and understand exactly what bits of information they need, and how to present them. You may be writing for a very varied audience, not just in terms of learning level, but goals and personal background. As a good writer, you excel at understanding what your readers bring to the table, and what you need to give them so that they can learn efficiently. You make a qualified judgment call on what and how much to include.

Being overly proficient could lead you to overlook something; a step that may be glaringly obvious to a power user could seriously stump a beginner. You don’t skip those obvious parts, and you provide complete information without being blinded by routine.

Complex information and user context
The engineers have a deep understanding of their domain. They are used to outsiders not understanding it. The first answer you get to your technical question might be way too superficial because they haven’t yet gauged how far your understanding reaches.

Know that it does not reflect on your ability to grasp complex technical information. It’s a normal process. The conversation might take a few steps to reach the answers you need. This is another one of the areas where you excel. You ask the right questions and hunt down the answers to make sure that your documentation is of value to all your users.

You do not need to be able to write code or even understand the code itself. Your job is to understand how the resulting software works and how it can help your users solve their business challenges.

Dealing with knowledge gaps
For all that, you do of course need to learn about the technologies that you document, and you do need to be prepared to enter domains that are outside of your comfort zone. You can avoid some common traps.

Don’t take the developer’s word for it when you don’t understand something. Keep asking questions, keep reading. Acquire the knowledge you need.

Don’t dwell on the parts of your docs that you are most comfortable with. Focus on the sections of your documentation that users need the most, even if those are sections where you are less knowledgeable.

If you are an introvert, overcome your natural aversion to hounding people for answers.

Your role isn’t to know everything, but to synthesise the knowledge of everyone working on your product in form that is of most benefit to your users.

The knowledge gap might go both ways. Communicate actively with all your internal stakeholders. Keep them in the loop about the work you are doing.

Be honest about what you do and do not know. Be upfront when you don’t understand something or got something wrong.

Relentlessly ask questions and maintain a healthy thirst for more knowledge.

Documentation as a part of the product
Some of the issues need to be addressed on an organisational level. We won’t be able to change the fact that it’s the product that rakes in the money, not the docs. However, the user experience is strongly tied to whether or not your users can reach their goals with the product or not. Documentation has a valuable role to play from that angle. The Definition of Done can include meaningful documentation, enshrining your contribution to a positive user experience from the get go.
