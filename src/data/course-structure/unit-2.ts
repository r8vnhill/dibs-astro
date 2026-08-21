import type { Lesson } from "../course-structure";
import { LessonTreeBuilder } from "./lesson-tree-builder";
import { coursePaths } from "./paths";

export const unit2Lessons: readonly Lesson[] = new LessonTreeBuilder()
    .link(
        "support-scripts",
        "Scripts de apoyo como software reusable",
        `${coursePaths.scriptingLibraries.supportScripts}/`,
    )
    .link(
        "tasks-as-abstractions",
        "Tareas como abstracciones de acciones repetibles",
        `${coursePaths.scriptingLibraries.tasksAsAbstractions}/`,
    )
    .link(
        "task-graphs",
        "Dependencias y grafos de tareas",
        `${coursePaths.scriptingLibraries.taskGraphs}/`,
    )
    .link(
        "selected-task-graphs",
        "Grafo seleccionado y Gradle",
        `${coursePaths.scriptingLibraries.selectedTaskGraphs}/`,
    )
    .build();
