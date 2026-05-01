import { LessonTrail, type TrailNode } from "$domain/entities/LessonTrail";
import type { LessonNavigationRepository } from "$domain/repositories";
import { LessonSequenceService } from "$domain/services/LessonSequenceService";
import { LessonHref } from "$domain/value-objects/LessonHref";
import type { AdjacentLessons } from "$domain/value-objects/AdjacentLessons";
import {
    courseStructure,
    type FlattenedLesson,
    flattenLessons,
    type Lesson as DomainLesson,
} from "~/data/course-structure";

// Re-export TrailNode for callers of the adapter
export type { TrailNode };
export type CourseLesson = DomainLesson;

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
export class LessonCatalogAdapter implements LessonNavigationRepository {
    private flatCache: Array<FlattenedLesson & { href: string }> | null = null;
    private structure: readonly DomainLesson[];

    /**
     * Construye un adaptador de catálogo.
     * @param structure - Estructura del curso (por defecto, courseStructure global)
     */
    constructor(structure: readonly DomainLesson[] = courseStructure) {
        this.structure = structure;
    }

    async getCourseStructure(): Promise<readonly DomainLesson[]> {
        return this.structure;
    }

    async flatten(): Promise<Array<FlattenedLesson & { href: string }>> {
        if (this.flatCache) {
            return this.flatCache;
        }

        const flattened = flattenLessons(this.structure);
        this.flatCache = flattened
            .filter(hasHref)
            .map((lesson) => lesson);

        return this.flatCache;
    }

    async findByPath(pathname: string): Promise<FlattenedLesson | null> {
        const flattened = await this.flatten();
        return flattened.find((lesson) => lesson.href === pathname) ?? null;
    }

    async findAdjacentTo(href: LessonHref): Promise<AdjacentLessons> {
        const lessons = await this.flatten();

        return LessonSequenceService.findAdjacent(
            lessons.map((lesson) => ({
                title: lesson.title,
                slug: lesson.id,
                href: lesson.href,
            })),
            href.value,
            (h: string) => LessonHref.create(h).value,
        );
    }

    /**
     * Extrae el trail de ancestros desde la raíz hasta la lección actual.
     *
     * ## Guarantees:
     *
     * - Retorna array ordenado: [ancestor1, ancestor2, ..., current]
     * - Grupos sin `href` aparecen con href: undefined
     * - Por defecto excluye el root sintético `Notes` (depth=0) de los ancestros
     * - Si la ruta no existe, retorna array vacío []
     * - `includeNotesRoot: true` prepende raíz sintética
     *
     * ## Para breadcrumbs:
     *
     * El presentador puede prepender `Notes` usando `includeNotesRoot: true`.
     *
     * @param href - Ruta a buscar (normalizará automáticamente)
     * @param options - { includeNotesRoot?: boolean } - si incluir raíz sintética
     * @returns Trail de nodos desde ancestros hasta lección actual (excluyendo root por defecto)
     */
    async findTrailByHref(
        href: string,
        options: { includeNotesRoot?: boolean } = { includeNotesRoot: false },
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
        if (options.includeNotesRoot) {
            const nodesWithRoot: TrailNode[] = [
                { title: "Notes", href: "/notes/" },
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
}

function hasHref(lesson: FlattenedLesson): lesson is FlattenedLesson & { href: string } {
    return typeof lesson.href === "string";
}
