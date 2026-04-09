import type { ILessonCatalog, Lesson } from "$application/ports";
import type { NavigationResult } from "$application/ports/NavigationService";
import { LessonTrail, type TrailNode } from "$domain/entities/LessonTrail";
import { LessonSequenceService } from "$domain/services/LessonSequenceService";
import { LessonHref } from "$domain/value-objects/LessonHref";
import {
    courseStructure,
    type FlattenedLesson,
    flattenLessons,
    type Lesson as DomainLesson,
} from "~/data/course-structure";

// Re-export TrailNode for callers of the adapter
export type { TrailNode };

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

        // Delegate to pure domain service with normalizer function
        const adjacent = LessonSequenceService.findAdjacent(
            lessons,
            href,
            (h: string) => LessonHref.create(h).value,
        );

        const result: NavigationResult = {};
        if (adjacent.previous) result.previous = adjacent.previous;
        if (adjacent.next) result.next = adjacent.next;

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

        // Find the current lesson in the flattened structure
        const current = flattened.find(
            (lesson) => lesson.href && LessonHref.create(lesson.href).value === normalizedSearch,
        );

        if (!current) {
            return [];
        }

        // Build map from ancestor IDs to TrailNodes (excluding root at depth=0)
        const idToNode = new Map<string, TrailNode>();

        // Map all ancestors except the root (depth=0)
        const ancestorIds = current.parentIds.slice(1); // Skip root
        for (let i = 0; i < ancestorIds.length; i++) {
            const ancestorId = ancestorIds[i]!;
            const expectedDepth = i + 1; // Depths start at 1 after skipping root

            const ancestor = flattened.find(
                (lesson) => lesson.id === ancestorId && lesson.depth === expectedDepth,
            );

            if (ancestor) {
                idToNode.set(ancestorId, this.toTrailNode(ancestor));
            }
        }

        // Build trail from ancestry
        const currentNode = this.toTrailNode(current);
        const trail = LessonTrail.buildFromAncestry(ancestorIds, idToNode, currentNode);

        // Prepend synthetic root if requested
        if (options.includeApuntesRoot) {
            const nodesWithRoot: TrailNode[] = [
                { title: "Apuntes", href: "/notes/" },
                ...trail.nodes,
            ];
            return Object.freeze(nodesWithRoot);
        }

        return trail.nodes;
    }

    private toTrailNode(lesson: Pick<FlattenedLesson, "title" | "href">): TrailNode {
        return {
            title: lesson.title,
            ...(lesson.href ? { href: lesson.href } : {}),
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
