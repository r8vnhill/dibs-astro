import type { Lesson } from "../course-structure";
import { LessonTreeBuilder } from "./lesson-tree-builder";
import { coursePaths } from "./paths";

const apiDesignLessons = new LessonTreeBuilder()
    .link(
        "fundamentals",
        "Diseñar la API desde el dominio",
        `${coursePaths.apiDesignFundamentals}/`,
    )
    .build();

export const unit1Lessons: readonly Lesson[] = new LessonTreeBuilder()
    .link(
        "software-artifacts-taxonomy",
        "Taxonomía básica de artefactos de software",
        `${coursePaths.softwareArtifactsTaxonomy}/`,
    )
    .link(
        "lib-what-is",
        "La biblioteca como artefacto de software",
        `${coursePaths.whatIs}/`,
    )
    .group(
        "api-design",
        "Principios de diseño de APIs",
        apiDesignLessons,
    )
    .build();
