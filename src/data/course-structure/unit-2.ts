import type { Lesson } from "../course-structure";
import { LessonTreeBuilder } from "./lesson-tree-builder";
import { coursePaths } from "./paths";

export const unit2Lessons: readonly Lesson[] = new LessonTreeBuilder()
    .link(
        "support-scripts",
        "Scripts de apoyo como software reusable",
        `${coursePaths.scriptingLibraries.supportScripts}/`,
    )
    .build();
