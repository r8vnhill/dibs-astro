import type { ILessonCatalog, Lesson } from "$application/ports";
import {
    courseStructure,
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
    private flatCache: Lesson[] | null = null;
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

    async flatten(): Promise<Lesson[]> {
        if (this.flatCache) {
            return this.flatCache;
        }

        const flattened = flattenLessons(this.structure);
        this.flatCache = flattened
            .filter((lesson) => lesson.href) // solo lecciones con href
            .map<Lesson>((lesson) => {
                const mapped: Lesson = {
                    id: lesson.id,
                    title: lesson.title,
                    slug: this.extractSlug(lesson.href || ""),
                };

                // Solo agregar href si existe (evita undefined con exactOptionalPropertyTypes)
                if (lesson.href) {
                    mapped.href = lesson.href;
                }

                return mapped;
            });

        return this.flatCache;
    }

    async findByPath(pathname: string): Promise<Lesson | null> {
        const flattened = await this.flatten();
        const result = flattened.find((lesson) => {
            const expectedPath = `/notes/${lesson.slug}/`;
            return pathname === expectedPath;
        });

        return result || null;
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
     * Ej: /notes/software-libraries/scripting/help/ → help
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
