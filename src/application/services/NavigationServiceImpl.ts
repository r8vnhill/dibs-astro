import type { INavigationService, NavigationResult } from "$application/ports";
import type { ILessonCatalog } from "$application/ports";

/**
 * Implementación del servicio de navegación.
 * Orquesta la resolución de prev/next usando el catálogo de lecciones.
 *
 * Esta es la capa Application: depende de puertos (ILessonCatalog)
 * que serán implementados en Infrastructure.
 */
export class NavigationServiceImpl implements INavigationService {
    constructor(private lessonCatalog: ILessonCatalog) {}

    async resolveAutoNav(pathname: string): Promise<NavigationResult> {
        const lessons = await this.lessonCatalog.flatten();

        // Extraer slug de la ruta
        // Ej: /notes/unit/lesson/ → lesson
        const pathParts = pathname
            .split("/")
            .filter((part) => part.length > 0);
        const currentSlug = pathParts[pathParts.length - 1];

        // Buscar índice de la lección actual
        const currentIndex = lessons.findIndex((l) => l.slug === currentSlug);
        if (currentIndex === -1) {
            return {};
        }

        const result: NavigationResult = {};

        // Lección anterior
        if (currentIndex > 0) {
            const prev = lessons[currentIndex - 1];
            result.previous = {
                title: prev.title,
                slug: prev.slug,
                href: `/notes/${this.slugToPath(prev.slug)}/`,
            };
        }

        // Lección siguiente
        if (currentIndex < lessons.length - 1) {
            const next = lessons[currentIndex + 1];
            result.next = {
                title: next.title,
                slug: next.slug,
                href: `/notes/${this.slugToPath(next.slug)}/`,
            };
        }

        return result;
    }

    /**
     * Convierte un slug a ruta (placeholder).
     * Nota: ésta es una implementación simplificada.
     * En una versión real, usaría metadata del catálogo para obtener unit+topic.
     */
    private slugToPath(slug: string): string {
        // TODO: integrar información de unidad desde el catálogo
        return slug;
    }
}
