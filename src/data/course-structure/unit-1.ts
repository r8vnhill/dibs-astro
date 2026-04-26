import type { Lesson } from "../course-structure";
import { LessonTreeBuilder } from "./lesson-tree-builder";
import { coursePaths } from "./paths";

const apiDesignLessons = new LessonTreeBuilder()
    .link(
        "fundamentals",
        "Diseñar la API desde el dominio",
        `${coursePaths.softwareLibraries.apiDesign.fundamentals}/`,
    )
    .link(
        "evolution",
        "Evolucionar una API sin romper compatibilidad",
        `${coursePaths.softwareLibraries.apiDesign.evolution}/`,
    )
    .link(
        "documentation",
        "Documentar una API como parte del producto",
        `${coursePaths.softwareLibraries.apiDesign.documentation}/`,
    )
    .build();

export const unit1Lessons: readonly Lesson[] = new LessonTreeBuilder()
    .link(
        "software-artifacts-taxonomy",
        "Taxonomía básica de artefactos de software",
        `${coursePaths.softwareLibraries.artifactsTaxonomy}/`,
    )
    .link(
        "lib-what-is",
        "La biblioteca como artefacto de software",
        `${coursePaths.softwareLibraries.whatIs}/`,
    )
    .group(
        "api-design",
        "Principios de diseño de APIs",
        apiDesignLessons,
    )
    .build();
