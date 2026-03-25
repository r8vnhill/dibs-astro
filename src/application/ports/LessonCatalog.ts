/**
 * Interfaz del repositorio de lecciones (puerto).
 * Contrato que define cómo acceder al catálogo de lecciones.
 *
 * Implementación actual: adaptador que lee course-structure.ts.
 * Implementación futura: base de datos, API, etc.
 */

export interface Lesson {
    id: string;
    title: string;
    slug: string;
    href?: string; // ruta completa normalizada (ej: /notes/unit/lesson/)
    unit?: string;
    children?: Lesson[];
}

/**
 * Puerto: Catálogo de lecciones.
 * La capa Application depende de este contrato;
 * Infrastructure proporciona la implementación concreta.
 */
export interface ILessonCatalog {
    /**
     * Obtiene la estructura jerárquica completa del catálogo.
     * @returns árbol de lecciones ordenadas
     */
    getCourseStructure(): Promise<Lesson[]>;

    /**
     * Busca una lección por ruta (pathname).
     * @param pathname ruta normalizada (ej: /notes/unit/lesson/)
     * @returns lección encontrada o null
     */
    findByPath(pathname: string): Promise<Lesson | null>;

    /**
     * Obtiene una lista plana de lecciones en orden.
     * Útil para navegación prev/next.
     * Todas las lecciones planas tienen `href` garantizado.
     * @returns array lineal de lecciones con href siempre presente
     */
    flatten(): Promise<Array<Lesson & { href: string }>>;
}
