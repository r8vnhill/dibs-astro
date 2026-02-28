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

    async getCourseStructure(): Promise<Lesson[]> {
        return this.mapToSimpleStructure(courseStructure);
    }

    async flatten(): Promise<Lesson[]> {
        if (this.flatCache) {
            return this.flatCache;
        }

        const flattened = flattenLessons(courseStructure);
        this.flatCache = flattened.map<Lesson>((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            slug: this.extractSlug(lesson.href || ""),
        }));

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
        return domainLessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            slug: this.extractSlug(lesson.href || lesson.id),
            children: lesson.children
                ? this.mapToSimpleStructure(lesson.children)
                : undefined,
        }));
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
