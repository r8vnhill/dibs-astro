import type { ILessonCatalog, Lesson } from "$application/ports";
import type { NavigationResult } from "$application/ports/NavigationService";
import { LessonHref } from "$domain/value-objects/LessonHref";
import {
    courseStructure,
    type FlattenedLesson,
    flattenLessons,
    type Lesson as DomainLesson,
} from "~/data/course-structure";

/**
 * Nodo en un trail de breadcrumbs.
 *
 * Representa un paso en el camino desde la raíz hasta la lección actual.
 * - Grupos sin `href` aparecen como texto (href: undefined)
 * - Lecciones con `href` aparecen como enlaces navegables
 */
export type TrailNode = {
    title: string;
    href?: string;
};

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
        const normalizedSearch = LessonHref.create(href).value;
        const currentIndex = lessons.findIndex(
            (lesson) => LessonHref.create(lesson.href).value === normalizedSearch,
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
     * Extrae el trail de ancestros desde la raíz hasta la lección actual.
     *
     * ## Guarantees:
     *
     * - Retorna array ordenado: [ancestor1, ancestor2, ..., current]
     * - Grupos sin `href` aparecen con href: undefined
     * - Por defecto EXCLUYE "Apuntes" root (depth=0) de los ancestros
     * - Si la ruta no existe, retorna array vacío []
     * - `includeApuntesRoot: true` prepende raíz sintética
     *
     * ## Para breadcrumbs:
     *
     * El presentador puede prepender "Apuntes" usando `includeApuntesRoot: true`.
     *
     * @param href - Ruta a buscar (normalizará automáticamente)
     * @param options - { includeApuntesRoot?: boolean } - si incluir raíz sintética
     * @returns Trail de nodos desde ancestros hasta lección actual (excluyendo root por defecto)
     */
    async findTrailByHref(
        href: string,
        options: { includeApuntesRoot?: boolean } = { includeApuntesRoot: false },
    ): Promise<readonly TrailNode[]> {
        const flattened = flattenLessons(this.structure);
        const normalizedSearch = LessonHref.create(href).value;

        // Buscar la lección en la estructura aplanada
        const current = flattened.find(
            (lesson) => lesson.href && LessonHref.create(lesson.href).value === normalizedSearch,
        );

        if (!current) {
            return [];
        }

        const trail: TrailNode[] = [];

        // Incluir raíz sintética si se solicita
        if (options.includeApuntesRoot) {
            trail.push({ title: "Apuntes", href: "/notes/" });
        }

        // Agregar ancestros EXCLUYENDO la raíz (depth=0)
        // Los parentIds incluyen el root, así que saltamos el índice 0
        const ancestorIds = current.parentIds.slice(1);

        for (let i = 0; i < ancestorIds.length; i++) {
            const parentId = ancestorIds[i]!;
            const expectedDepth = i + 1; // +1 porque saltamos el root (depth=0)

            // Buscar el nodo ancestro por ID y depth
            const ancestor = flattened.find(
                (lesson) => lesson.id === parentId && lesson.depth === expectedDepth,
            );

            if (ancestor) {
                trail.push(this.toTrailNode(ancestor));
            }
        }

        // Agregar la lección actual
        trail.push(this.toTrailNode(current));

        return Object.freeze(trail);
    }

    private toTrailNode(lesson: Pick<FlattenedLesson, "title" | "href">): TrailNode {
        return {
            title: lesson.title,
            ...(lesson.href ? { href: lesson.href } : {}),
        };
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
