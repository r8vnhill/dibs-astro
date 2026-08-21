/**
 * The conceptual ownership contract for the task-graphs lesson split.
 *
 * This is intentionally independent of either page. It freezes the intended
 * boundary before the content is moved so that later phases can change the
 * information architecture without silently changing the learning outcomes.
 */
export type TaskGraphLessonNumber = 1 | 2;

export type TaskGraphConcept =
    | "dependency direction"
    | "build-system motivation"
    | "directed graph"
    | "paths/indirect dependency"
    | "cycles/DAG"
    | "topological order"
    | "partial order/incomparability"
    | "selected graph"
    | "graph vs actual execution"
    | "Gradle realization"
    | "--task-graph"
    | "explicit dependsOn limitation";

export type TaskGraphLessonOwnership = Readonly<{
    concept: TaskGraphConcept;
    lesson: TaskGraphLessonNumber;
}>;

export const taskGraphLessonOwnership = [
    { concept: "dependency direction", lesson: 1 },
    { concept: "build-system motivation", lesson: 1 },
    { concept: "directed graph", lesson: 1 },
    { concept: "paths/indirect dependency", lesson: 1 },
    { concept: "cycles/DAG", lesson: 1 },
    { concept: "topological order", lesson: 1 },
    { concept: "partial order/incomparability", lesson: 1 },
    { concept: "selected graph", lesson: 2 },
    { concept: "graph vs actual execution", lesson: 2 },
    { concept: "Gradle realization", lesson: 2 },
    { concept: "--task-graph", lesson: 2 },
    { concept: "explicit dependsOn limitation", lesson: 2 },
] as const satisfies readonly TaskGraphLessonOwnership[];

export const taskGraphLessonSeam = {
    lessonOneEndsWith: "topological orders",
    lessonTwoStartsWith: "selected graph",
} as const;

export const taskGraphSharedExample = {
    tasks: ["prepareCatalog", "generateReport", "packageReport", "verifyReport"],
    arrowConvention: "A -> B",
} as const;
