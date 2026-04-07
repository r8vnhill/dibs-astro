import type { ILessonCatalog, Lesson } from "$application/ports";
import type { NavigationResult } from "$application/ports/NavigationService";
import {
    courseStructure,
    type FlattenedLesson,
    flattenLessons,
    type Lesson as DomainLesson,
} from "~/data/course-structure";

/**
 * Adaptador de infraestructura para el catálogo de lecciones.
 *
 * Implementa el puerto ILessonCatalog usando la estructura actual
 * de `courseStructure` (src/data/course-structure.ts).
 *
 * Este adaptador es el puente entre:
 * - Application: que depende de ILessonCatalog
 * - Infrastructure: que conoce la estructura del dominio actual
 *
 * Responsabilidades:
 * - Mapear entre DomainLesson (con kind/"link"/"group") y Lesson simplificada
 * - Implementar búsquedas por ruta (href)
 * - Proporcionar aplanamiento para navegación lineal
 *
 * Nota: Por ahora simula async para futura compatibilidad con APIs/DBs.
 */
export class LessonCatalogAdapter implements ILessonCatalog {
    private flatCache: Array<Lesson & { href: string }> | null = null;
    private structure: readonly DomainLesson[];

    /**
     * Construye un adaptador de catálogo.
     * @param structure - Estructura del curso (por defecto, courseStructure global)
     */
    constructor(structure: readonly DomainLesson[] = courseStructure) {
        this.structure = structure;
    }

    async getCourseStructure(): Promise<Lesson[]> {
        return this.mapToSimpleStructure(this.structure);
    }

    async flatten(): Promise<Array<Lesson & { href: string }>> {
        if (this.flatCache) {
            return this.flatCache;
        }

        const flattened = flattenLessons(this.structure);
        this.flatCache = flattened
            .filter(hasHref)
            .map<Lesson & { href: string }>((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                slug: this.extractSlug(lesson.href),
                href: lesson.href,
            }));

        return this.flatCache;
    }

    async findByPath(pathname: string): Promise<Lesson | null> {
        const flattened = await this.flatten();
        return flattened.find((lesson) => lesson.href === pathname) ?? null;
    }

    async findAdjacentByHref(href: string): Promise<NavigationResult> {
        const lessons = await this.flatten();
        const normalizedSearch = this.normalizePath(href);
        const currentIndex = lessons.findIndex(
            (lesson) => this.normalizePath(lesson.href) === normalizedSearch,
        );

        if (currentIndex < 0) {
            return {};
        }

        const result: NavigationResult = {};
        const prev = this.toNavigationNode(lessons[currentIndex - 1]);
        const next = this.toNavigationNode(lessons[currentIndex + 1]);

        if (prev) result.previous = prev;
        if (next) result.next = next;

        return result;
    }

    /**
     * Normaliza una ruta para comparación consistente.
     *
     * Reglas de normalización:
     * 1. Elimina query params y hash fragments
     * 2. Garantiza slash inicial
     * 3. Colapsa múltiples slashes consecutivos a uno
     * 4. Garantiza slash final
     *
     * Ejemplos:
     * - "/foo?x=1" → "/foo/"
     * - "foo#section" → "/foo/"
     * - "//foo//bar" → "/foo/bar/"
     * - "foo" → "/foo/"
     */
    private normalizePath(path: string): string {
        // 1. Elimina query params y hash
        const trimmed = path.trim();
        const withoutQuery = trimmed.split(/[?#]/)[0] ?? "";

        // 2. Garantiza slash inicial
        const withLeadingSlash = withoutQuery.startsWith("/")
            ? withoutQuery
            : `/${withoutQuery}`;

        // 3. Colapsa múltiples slashes
        const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

        // 4. Garantiza slash final
        return collapsedSlashes.endsWith("/")
            ? collapsedSlashes
            : `${collapsedSlashes}/`;
    }

    /**
     * Convierte una lección a un nodo de navegación.
     * Retorna undefined si la lección es undefined (para bordes de lista).
     */
    private toNavigationNode(lesson: (Lesson & { href: string }) | undefined) {
        if (!lesson) {
            return undefined;
        }

        return {
            title: lesson.title,
            slug: lesson.slug,
            href: lesson.href,
        };
    }

    /**
     * Mapea la estructura jerárquica actual a una forma simplificada.
     *
     * Nota: esta función es private porque es detalles de la implementación.
     * El puerto no expone este mapeo.
     */
    private mapToSimpleStructure(
        domainLessons: readonly DomainLesson[],
    ): Lesson[] {
        return domainLessons.map((lesson) => {
            const mapped: Lesson = {
                id: lesson.id,
                title: lesson.title,
                slug: this.extractSlug(lesson.href || lesson.id),
            };

            // Solo agregar href si existe
            if (lesson.href) {
                mapped.href = lesson.href;
            }

            // Solo agregar children si existen
            if (lesson.children) {
                mapped.children = this.mapToSimpleStructure(lesson.children);
            }

            return mapped;
        });
    }

    /**
     * Extrae un slug legible de una ruta.
     * Ej: /notes/scripting/help/ → help
     * Fallback: usa una versión normalizada del id.
     */
    private extractSlug(hrefOrId: string): string {
        if (!hrefOrId) return "";

        // Si es una ruta (comienza con /), extrae el último segmento
        if (hrefOrId.startsWith("/")) {
            const parts = hrefOrId.split("/").filter((p) => p.length > 0);
            return parts[parts.length - 1] || "root";
        }

        // Si es un ID, normalízalo (reemplaza guiones y números)
        return hrefOrId;
    }
}

function hasHref(lesson: FlattenedLesson): lesson is FlattenedLesson & { href: string } {
    return typeof lesson.href === "string";
}
