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
  href: string;
  /**
   * Optional nested lessons under this entry.
   * If present, this lesson is a parent and can be expanded in the UI.
   */
  children?: Lesson[];
}

/**
 * Defines the hierarchical structure of the course's lessons and units.
 *
 * This structure is used to render the sidebar and compute automatic navigation (e.g. next/previous
 * lesson).
 */
export const courseStructure: Lesson[] = [
  { title: "¿Cómo usar este apunte?", href: "/notes/" },
  { title: "Herramientas necesarias y recomendadas", href: "/notes/installation/" },
  {
    title: "Unidad 1 - Fundamentos de tipos y representaciones de datos",
    href: "/notes/type-fundamentals/",
    children: [
      {
        title: "Kotlin",
        href: "/notes/type-fundamentals/basics/",
        children: [
          { title: "Funciones", href: "/notes/type-fundamentals/basics/functions/" },
          { title: "Variables", href: "/notes/type-fundamentals/basics/variables/" }
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
  lessons: Lesson[],
  depth = 0,
  parentPath: string[] = []
): (Lesson & { depth: number; parents: string[] })[] {
  return lessons.flatMap((lesson) => {
    // Augment the lesson with its depth and ancestry
    const entry = { ...lesson, depth, parents: parentPath };

    // Recursively flatten children, if any
    const children = lesson.children
      ? flattenLessons(lesson.children, depth + 1, [
          ...parentPath,
          lesson.title,
        ])
      : [];

    // Combine current entry and its descendants
    return [entry, ...children];
  });
}
