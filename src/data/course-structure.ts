/**
 * Interface that represents a lesson entry in the course structure.
 */
export interface Lesson {
    /**
     * The title of the lesson, displayed in the navigation.
     */
    title: string;
    /**
     * The URL path to the lesson page.
     * This should be a relative path from the base URL of the site.
     */
    href?: string; // Optional: containers can omit href and serve as visual groups only
    /**
     * Optional nested lessons under this entry.
     * If present, this lesson is a parent and can be expanded in the UI.
     */
    children?: Lesson[];
}

/**
 * A lesson entry augmented with metadata from flattening a hierarchy.
 *
 * Includes the nesting depth and the title path of its ancestors for navigation.
 */
export type FlattenedLesson = Lesson & { depth: number; parents: string[] };

/**
 * Defines the hierarchical structure of the course's lessons and units.
 *
 * This structure is used to render the sidebar and compute automatic navigation (e.g. next/previous
 * lesson).
 */
export const courseStructure: Lesson[] = [
    { title: "¿Cómo usar este apunte?", href: "/notes/" },
    {
        title: "Herramientas necesarias y recomendadas",
        href: "/notes/installation/",
    },
    {
        title: "Unidad 1 - Introducción al desarrollo de bibliotecas de software",
        href: "/notes/software-libraries/",
        children: [
            {
                title: "Bibliotecas de software",
                href: "/notes/software-libraries/what-is/",
            },
            {
                title: "Automatización de tareas",
                href: "/notes/software-libraries/task-automation/",
            },
            {
                title: "Scripting",
                href: "/notes/software-libraries/scripting/",
                children: [
                    {
                        title: "Ayuda",
                        href: "/notes/software-libraries/scripting/help/",
                    },
                    {
                        title: "Primer script",
                        href: "/notes/software-libraries/scripting/first-script/",
                    },
                    {
                        title: "Salida estructurada",
                        href: "/notes/software-libraries/scripting/structured-output/",
                    },
                    {
                        title: "Ensayo seguro (-WhatIf/-Confirm)",
                        href: "/notes/software-libraries/scripting/should-process/",
                    },
                    {
                        title: "Manejo de errores",
                        href: "/notes/software-libraries/scripting/errors/",
                    },
                    {
                        title: "Lab. 1: GitLab",
                        href: "/notes/software-libraries/scripting/gitlab/",
                    },
                    {
                        title: "Pipelines",
                        href: "/notes/software-libraries/scripting/pipelines/",
                        children: [
                            {
                                title: "Pipeline-awareness",
                                href:
                                    "/notes/software-libraries/scripting/pipelines/pipeline-aware/",
                            },
                            {
                                title: "Práctica: Composición",
                                href: "/notes/software-libraries/scripting/pipelines/practice/",
                            },
                        ],
                    },
                ],
            },
            {
                title: "Sistemas de construcción",
                href: "/notes/software-libraries/build-systems/",
                children: [
                    {
                        title: "Veritas: Ep. 1",
                        href: "/notes/software-libraries/build-systems/veritas-1/",
                    },
                ],
            },
            {
                title: "Lógica de negocio y aplicación",
                href: "/notes/software-libraries/business-vs-app/",
            },
            {
                title: "Modelos de dominio",
                href: "/notes/software-libraries/domain-models/",
            },
        ],
    },
    {
        title: "Unidad 2 - Fundamentos de tipos y representaciones de datos",
        href: "/notes/type-fundamentals/",
        children: [
            {
                title: "Kotlin",
                href: "/notes/type-fundamentals/basics/",
                children: [
                    {
                        title: "Funciones",
                        href: "/notes/type-fundamentals/basics/functions/",
                    },
                    {
                        title: "Variables",
                        href: "/notes/type-fundamentals/basics/variables/",
                    },
                ],
            },
        ],
    },
];

/**
 * Recursively flattens a hierarchical list of lessons into a flat array, preserving the original
 * order and tracking depth and parent titles.
 *
 * This is useful for computing automatic navigation and displaying lessons in a linear format while
 * retaining contextual metadata.
 *
 * @param lessons - The hierarchical list of lessons.
 * @param depth - The current depth level (used internally during recursion).
 * @param parentPath - An array of parent lesson titles (used for context).
 * @returns A flat list of lessons with depth and ancestry info.
 */
export function flattenLessons(
    lessons: readonly Lesson[],
    depth = 0,
    parentPath: readonly string[] = [],
): FlattenedLesson[] {
    return lessons.flatMap((lesson) => {
        // Augment the lesson with its depth and ancestry
        const entry: FlattenedLesson = {
            ...lesson,
            depth,
            parents: [...parentPath],
        };

        // Recursively flatten children, if any
        const children = lesson.children?.length
            ? flattenLessons(lesson.children, depth + 1, [
                  ...parentPath,
                  lesson.title,
              ])
            : [];

        // Combine current entry and its descendants
        return [entry, ...children];
    });
}
