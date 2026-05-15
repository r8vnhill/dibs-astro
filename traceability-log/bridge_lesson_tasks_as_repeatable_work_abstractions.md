## [PLAN] Bridge Lesson — Tasks as Repeatable Work Abstractions

## Summary

Add a new Unit 2 bridge lesson immediately after **“Scripts de apoyo como software reusable”**. The goal is to formalise
the concept of a **task** before introducing build systems, using a small Kotlin companion script and a later exercise
that adds a `list` task.

The lesson should make one conceptual move:

> A task is not merely “a command that runs”; it is a named, repeatable, verifiable unit of work with intent, inputs,
> preconditions, effects, observable output, and a success/failure criterion.

The lesson uses a real Kotlin `.main.kts` companion script to show how tasks can be represented before adopting a
specialised build system. This fits Kotlin scripting well because Kotlin scripts are `.kts` files with top-level
executable code, intended for script-style execution from the command line. ([Kotlin][1])

The lesson deliberately stops before Gradle-specific concepts such as task graphs, cacheability, incremental execution,
and declared task inputs/outputs. Those ideas belong to the following build-systems lessons, where Gradle defines tasks
as independent units of build work and later enriches them with dependencies, inputs, outputs, and execution semantics.
([Gradle][2])

---

# Lección Puente: Tareas como abstracciones de acciones repetibles

## Goals

By the end of the lesson, students should be able to:

1. Explain the difference between a **function**, a **script**, and a **task**.
2. Identify the operational contract of a task:

   - name;
   - intention;
   - inputs;
   - preconditions;
   - effects or result;
   - observable output;
   - success/failure criterion.
3. Recognise that tasks can be implemented inside simple scripts before being managed by build systems.
4. Understand why build systems become useful once tasks need ordering, dependencies, reuse, and repeated execution.

---

## Key Changes

### 1. Add the lesson route

Create:

```text
astro-website/src/pages/notes/scripting/tasks-as-abstractions/index.astro
```

Suggested title:

```text
Tareas como abstracciones de acciones repetibles
```

Recommended page purpose:

```text
Bridge support scripts and build systems by introducing tasks as explicit, named, repeatable work units.
```

---

### 2. Add the course path

Add:

```ts
coursePaths.scriptingLibraries.tasksAsAbstractions;
```

with value:

```text
/notes/scripting/tasks-as-abstractions
```

Use the same trailing-slash convention already used by the surrounding `coursePaths` entries. If the path constants omit
the final slash, keep that convention and assert the rendered route separately.

---

### 3. Update Unit 2 ordering

Update `unit-2.ts` so the scripting sequence becomes:

1. `Scripts de apoyo como software reusable`
2. `Tareas como abstracciones de acciones repetibles`
3. first build-system lesson

This makes the conceptual progression explicit:

```text
reusable support script
→ named repeatable task
→ coordinated task system
→ build system
```

---

### 4. Add the Kotlin companion script

Create:

```text
kotlin-companion/scripts/library-tasks.main.kts
```

The script should be intentionally small and pedagogical. It should demonstrate task modelling without becoming a
miniature Gradle clone.

The lesson currently uses these commands as the main examples:

```bash
kotlin library-tasks.main.kts count-files .
kotlin library-tasks.main.kts summarize .
```

Use only common Kotlin classes and interfaces in the companion script. Do not use data classes, sealed interfaces, sealed
classes, enums-as-result-types, or advanced algebraic data type modelling here. The lesson should focus on the
conceptual abstraction of a task, not on Kotlin-specific modelling features that will be introduced elsewhere.

Recommended companion-script design note:

> Use only common Kotlin classes and interfaces in the companion script. Do not use data classes, sealed interfaces,
> sealed classes, enums-as-result-types, or advanced algebraic data type modelling here. The lesson should focus on the
> conceptual abstraction of a task, not on Kotlin-specific modelling features that will be introduced elsewhere.

Recommended task model:

```kotlin
interface Task {
    val name: String
    val description: String

    fun run(context: TaskContext): TaskResult
}

class TaskContext(
    val projectRoot: Path,
)

interface TaskResult {
    val message: String
    val exitCode: Int
}

class SuccessfulTaskResult(
    override val message: String,
) : TaskResult {
    override val exitCode: Int = 0
}

class FailedTaskResult(
    override val message: String,
) : TaskResult {
    override val exitCode: Int = 1
}
```

Task implementations should be small classes rather than lambda-only values.

Example task class:

```kotlin
class CountFilesTask : Task {
    override val name: String = "count-files"
    override val description: String = "Counts files in the selected project folder."

    override fun run(context: TaskContext): TaskResult {
        val fileCount = context.projectRoot
            .toFile()
            .walkTopDown()
            .count { it.isFile }

        return SuccessfulTaskResult("Found $fileCount files.")
    }
}
```

The main walkthrough also uses a second task that prints a short project summary:

```kotlin
class SummarizeProjectTask : Task {
    override val name: String = "summarize"
    override val description: String = "Shows a brief summary of the selected project folder."

    override fun run(context: TaskContext): TaskResult {
        val projectRoot = context.projectRoot.toAbsolutePath().normalize()
        val fileCount = projectRoot
            .toFile()
            .walkTopDown()
            .count { it.isFile }

        return SuccessfulTaskResult("Project: $projectRoot${System.lineSeparator()}Files: $fileCount")
    }
}
```

Keep the script focused on two main walkthrough tasks, with a third task added in the exercise:

| Task           | Purpose                                   | Teaching role                                  |
| -------------- | ----------------------------------------- | ---------------------------------------------- |
| `count-files` | Count files in the selected folder | Demonstrates a concrete repeatable action |
| `summarize`   | Print a short project summary | Demonstrates observable output |
| `list`        | Show available tasks | Added in the exercise to demonstrate discovery |

Avoid adding:

- dependency graphs;
- task ordering;
- caching;
- incremental checks;
- Gradle terminology beyond a closing preview;
- external dependencies.

A small hand-rolled dispatcher is enough for the lesson.

---

## Lesson Content Structure

### 1. Opening connection to the previous lesson

Start from the previous lesson’s conclusion:

> The support script already has an operational contract: it receives arguments, inspects project files, prints
> information, and exits successfully or unsuccessfully. However, it still looks like one concrete operation. The next
> step is to name those operations as tasks.

This creates continuity without repeating the previous lesson.

---

### 2. Define “task”

Use a compact definition:

> Una tarea es una unidad de trabajo nombrada, repetible y verificable. No se define solo por el comando que ejecuta,
> sino por la intención que representa, los datos que necesita, las condiciones que asume, los efectos que produce y el
> criterio que permite decidir si terminó correctamente.

Then break it down into the operational contract:

| Part                      | Guiding question                             |
| ------------------------- | -------------------------------------------- |
| Name                      | How do we invoke or identify this work?      |
| Intention                 | Why does this work exist?                    |
| Inputs                    | What information or files does it need?      |
| Preconditions             | What must already be true?                   |
| Effects/result            | What changes or conclusions does it produce? |
| Observable output         | What can the user or tool inspect?           |
| Success/failure criterion | How do we know whether it worked?            |

---

### 3. Contrast function, script, and task

Use a simple table:

| Concept  | Main role                        | Typical scope           |
| -------- | -------------------------------- | ----------------------- |
| Function | Organises logic inside a program | Internal implementation |
| Script   | Provides an executable artefact  | Command-line automation |
| Task     | Names a repeatable unit of work  | Operational workflow    |

Suggested explanation:

> Una función estructura código. Un script permite ejecutar código. Una tarea nombra una acción repetible con un
> contrato operativo. Por eso una tarea puede estar implementada por una función, expuesta desde un script o gestionada
> por un build system.

---

### 4. Introduce the `.main.kts` example

Add a `DibsSourceLink` to:

```text
dibs-course/kotlin-companion/scripts/library-tasks.main.kts
```

The lesson should show the commands first, then the internal model.

Example commands:

```bash
kotlin library-tasks.main.kts count-files .
kotlin library-tasks.main.kts summarize .
```

Recommended explanation:

> El punto central no es que Kotlin tenga una sintaxis especial para tareas. El punto es que podemos representar tareas
> explícitamente incluso antes de usar una herramienta especializada.

In the actual lesson, the first examples are `count-files` and `summarize`, and the `list` task appears later in the
exercise as the new task added to the same design.

---

### 5. Explain the dispatcher without overengineering

Show the idea of mapping a name to a task:

```kotlin
val tasks = listOf(
    countFilesTask,
    summarizeTask,
).associateBy { it.name }
```

Then explain that the dispatcher:

1. reads the task name from the command line;
2. finds the matching task;
3. builds a context;
4. runs the task;
5. converts the result into output and exit status.

Keep this section short. The purpose is conceptual, not to teach CLI framework design.

---

### 6. Close toward build systems

End with the next question:

> Si una tarea puede nombrarse, ejecutarse y verificarse, la siguiente pregunta aparece naturalmente: ¿qué ocurre cuando
> tenemos muchas tareas, algunas dependen de otras, algunas producen resultados reutilizables y varias deben ejecutarse
> muchas veces durante el desarrollo?

Then bridge to build systems:

> En ese punto, conviene usar una herramienta especializada. Un build system no solo ejecuta comandos: organiza tareas,
> relaciones, entradas, salidas y criterios de ejecución.

This prepares Gradle without teaching it yet. Gradle’s own model treats tasks as units of build work, and its more
advanced task guidance emphasises declared inputs, outputs, task actions, dependencies, and execution behaviour.
([Gradle][3])

---

## Companion Script Design

### Recommended implementation constraints

- Keep the script under roughly 100–150 lines.
- Keep helper functions short.
- Prefer immutable values.
- Avoid global mutable state.
- Return structured results instead of printing everywhere.
- Let only the top-level dispatcher print and exit.
- Use the standard library only.
- Use ordinary classes and interfaces only.
- Avoid data classes and sealed interfaces in this lesson.
- Prefer explicit class-based task implementations over lambda-only task values.
- Keep the design object-oriented and beginner-readable.

### Suggested internal structure

```text
library-tasks.main.kts
├─ task contracts
│  ├─ Task interface
│  ├─ TaskResult interface
│  ├─ TaskContext class
│  ├─ SuccessfulTaskResult class
│  └─ FailedTaskResult class
├─ task definitions
│  ├─ CountFilesTask
│  ├─ SummarizeProjectTask
│  └─ ListTasksTask (introduced in the exercise)
├─ pure helpers
│  ├─ countFiles()
│  ├─ projectSummary()
│  └─ availableTaskLines()
└─ CLI boundary
    ├─ parseCommand()
    ├─ dispatch()
    └─ renderResult()
```

The important design boundary is:

```text
task logic is testable and deterministic
CLI parsing/output is thin and replaceable
```

The script should demonstrate this progression:

```text
script with command-line arguments
→ interface representing a repeatable task
→ concrete task classes
→ small dispatcher that selects a task by name
```

Even if no formal tests are added inside `kotlin-companion`, the implementation should still be shaped as if it were
easy to test.

---

## README Update

Update:

```text
kotlin-companion/README.md
```

Add the new script to the existing table.

Suggested row:

| Lesson                                           | Script                           | Purpose                                                      |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------ |
| Tareas como abstracciones de acciones repetibles | `scripts/library-tasks.main.kts` | Models support-script operations as named, repeatable tasks. |

Also include the three invocation examples actually used by the lesson: `count-files .`, `summarize .`, and `list`.

---

## Tests

## 1. Course path tests

Update the `coursePaths` tests to assert the new route:

```text
/notes/scripting/tasks-as-abstractions
```

If route rendering normalises to a trailing slash, assert that separately in the render test.

---

## 2. Unit ordering tests

Update `unit-2.test.ts` to assert that:

```text
support-scripts
```

comes immediately before:

```text
tasks-as-abstractions
```

The test should check relative order, not merely presence. This protects the pedagogical sequence.

---

## 3. Astro render test

Add a render test following the existing `support-scripts.render.test.ts` pattern.

Recommended assertions:

- rendered HTML contains the lesson title;
- rendered HTML contains `/notes/scripting/tasks-as-abstractions/`;
- rendered HTML contains `library-tasks.main.kts`;
- rendered HTML links to `dibs-course/kotlin-companion`;
- rendered HTML includes examples with `kotlin library-tasks.main.kts count-files .` and `kotlin library-tasks.main.kts summarize .`;
- rendered HTML includes the later `list` exercise or solution content;
- rendered HTML includes the conceptual distinction between function, script, and task;
- rendered HTML includes the bridge toward build systems.

---

## 4. Companion script smoke test

Recommended, if the companion repository already has a script-test convention:

```bash
kotlin scripts/library-tasks.main.kts count-files .
kotlin scripts/library-tasks.main.kts summarize .
kotlin scripts/library-tasks.main.kts list
```

Assert:

- `count-files .` exits successfully;
- `summarize .` exits successfully;
- `list` exits successfully;
- unknown task exits unsuccessfully and prints available tasks.

If there is no existing test harness in `kotlin-companion`, document these as manual validation commands for now and
avoid adding infrastructure only for this lesson.

---

## TDD Sequence

### Cycle 1 — Route and ordering contract

1. Add failing tests for:

   - `coursePaths.scriptingLibraries.tasksAsAbstractions`;
   - Unit 2 ordering.
2. Add the path constant.
3. Update `unit-2.ts`.
4. Run:

```bash
pnpm test:unit -- course-structure
```

---

### Cycle 2 — Companion script contract

1. Add the `.main.kts` script.
2. Start with the public command behaviour:

    - `count-files`;
   - `summarize`;
    - `list`;
   - unknown task.
3. Keep the task model minimal.
4. Run the script manually or through the existing companion test command.

---

### Cycle 3 — Lesson render contract

1. Add failing Astro render test.
2. Create `index.astro`.
3. Add the conceptual sections.
4. Add `DibsSourceLink`.
5. Run:

```bash
pnpm test:astro -- tasks-as-abstractions
```

---

### Cycle 4 — README and final validation

1. Update `kotlin-companion/README.md`.
2. Run the focused checks:

```bash
pnpm test:unit -- course-structure
pnpm test:astro -- tasks-as-abstractions
```

3. Run the companion script examples from `kotlin-companion/scripts`.

---

## Definition of Done

The change is complete when:

- the new lesson exists under `/notes/scripting/tasks-as-abstractions/`;
- Unit 2 places it immediately after `Scripts de apoyo como software reusable`;
- `coursePaths` exposes the new route;
- the lesson explains tasks as named, repeatable, verifiable units of work;
- the lesson clearly distinguishes function, script, and task;
- the Kotlin companion script exists and supports `count-files`, `summarize`, and `list`;
- the lesson links to the companion script with `DibsSourceLink`;
- render tests cover the new lesson;
- course-structure tests cover path and ordering;
- the lesson ends by motivating build systems without prematurely teaching Gradle.

---

## Refined Assumptions

- The lesson belongs in Unit 2 under `/notes/scripting/`.
- The lesson is a conceptual bridge, not a Gradle lesson.
- The companion script should remain real, executable, and small.
- The deprecated `task-automation` material may be used only as background inspiration.
- No new dependencies are needed.
- The actual lesson introduces `list` in the exercise rather than as one of the initial commands.
- Task graphs, dependency resolution, cacheability, incremental execution, and declared inputs/outputs are intentionally
    deferred to the build-system sequence.

[1]: https://kotlinlang.org/docs/command-line.html?utm_source=chatgpt.com "Kotlin command-line compiler"
[2]: https://docs.gradle.org/current/userguide/more_about_tasks.html?utm_source=chatgpt.com "Understanding Tasks"
[3]: https://docs.gradle.org/current/userguide/task_basics.html?utm_source=chatgpt.com "Task Basics"
