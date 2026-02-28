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

        // Normalizar pathname para comparación
        const normalizedPath = this.normalizePath(pathname);

        // Buscar índice de la lección actual comparando hrefs
        const currentIndex = lessons.findIndex(
            (l) => l.href && this.normalizePath(l.href) === normalizedPath,
        );
        if (currentIndex === -1) {
            return {};
        }

        const result: NavigationResult = {};

        // Lección anterior
        if (currentIndex > 0) {
            const prev = lessons[currentIndex - 1];
            if (prev) {
                result.previous = {
                    title: prev.title,
                    slug: prev.slug,
                    href: prev.href || `/notes/${prev.slug}/`,
                };
            }
        }

        // Lección siguiente
        if (currentIndex < lessons.length - 1) {
            const next = lessons[currentIndex + 1];
            if (next) {
                result.next = {
                    title: next.title,
                    slug: next.slug,
                    href: next.href || `/notes/${next.slug}/`,
                };
            }
        }

        return result;
    }

    /**
     * Normaliza un pathname para comparación.
     * Asegura que empieza y termina con /.
     */
    private normalizePath(path: string): string {
        let normalized = path.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (!normalized.endsWith("/")) {
            normalized += "/";
        }
        return normalized;
    }
}
