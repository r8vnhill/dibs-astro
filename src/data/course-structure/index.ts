import type { Lesson } from "../course-structure";
import { LessonTreeBuilder } from "./lesson-tree-builder";
import { coursePaths } from "./paths";
import { unit1Lessons } from "./unit-1";

/**
 * Root lesson entries that live outside any specific unit.
 *
 * This module is the composition boundary for the internal course-structure submodules:
 *
 * - root-level standalone notes are declared here;
 * - unit-specific trees are imported from their own modules and appended in display order;
 * - the exported `courseStructure` remains a plain `readonly Lesson[]` so callers stay decoupled
 *   from the internal builder API.
 *
 * Keep this file focused on top-level assembly. Detailed unit trees belong in their own modules.
 */
const lessons = new LessonTreeBuilder()
    .link("how-to-start", "¿Cómo usar este apunte?", `${coursePaths.notes}/`)
    .link(
        "installation",
        "Herramientas necesarias y recomendadas",
        `${coursePaths.installation}/`,
    )
    .group(
        "unit-1",
        "Unidad 1 - Introducción al desarrollo de bibliotecas de software",
        unit1Lessons,
        `${coursePaths.softwareLibraries.root}/`,
    )
    .build();

/**
 * Internal canonical lesson tree assembled from root notes plus unit modules.
 *
 * The array order defines sidebar order and the pre-order traversal used by navigation helpers.
 */
export const courseStructure = [
    ...lessons
] as const satisfies readonly Lesson[];
