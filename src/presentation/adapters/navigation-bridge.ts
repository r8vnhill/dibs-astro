/**
 * Bridge pattern: conecta Presentation con Application layer.
 *
 * Este módulo proporciona una función adaptadora que permite a los componentes
 * de presentación (como NotesLayout) usar el nuevo servicio de navegación de
 * la capa Application sin romper la interfaz existente.
 *
 * ## Ventajas del patrón bridge
 *
 * 1. **Compatibilidad**: mantiene la firma de la función original
 * 2. **Transición gradual**: permite cambiar entre implementaciones
 * 3. **Desacoplamiento**: Presentation no depende directamente de Infrastructure
 * 4. **Testing**: facilita pruebas unitarias con mocks del servicio
 */

import { NavigationServiceImpl } from "$application/services/NavigationServiceImpl";
import { LessonCatalogAdapter } from "$infrastructure/adapters/LessonCatalogAdapter";
import type { Lesson } from "~/data/course-structure";
import { resolveAutoNav as legacyResolveAutoNav } from "~/utils/navigation";

/**
 * Feature flag para controlar qué implementación usar.
 *
 * - `true`: usa el nuevo servicio de Application layer
 * - `false`: usa la implementación legacy de utils/navigation.ts
 *
 * Esto permite validar la nueva implementación sin romper rutas existentes.
 */
const USE_NEW_SERVICE = true;

/**
 * Tipo de retorno compatible con la interfaz legacy.
 */
export type AutoNavResult = {
    previous: { title: string; href: string } | undefined;
    next: { title: string; href: string } | undefined;
};

/**
 * Bridge para resolución automática de navegación.
 *
 * Mantiene la misma interfaz que `resolveAutoNav` de `utils/navigation.ts`,
 * pero internamente usa el nuevo servicio de Application layer.
 *
 * @param pathname - Ruta actual (ej: /notes/unit/lesson/)
 * @param lessons - Estructura del curso (usado para crear el catálogo)
 * @returns Objeto con previous y next (undefined si no existen)
 *
 * @example
 * const { previous, next } = await resolveAutoNavBridge("/notes/foo/bar/", courseStructure);
 */
export async function resolveAutoNavBridge(
    pathname: string,
    lessons: readonly Lesson[],
): Promise<AutoNavResult> {
    if (!USE_NEW_SERVICE) {
        // Fallback a implementación legacy (síncrona)
        // Cast necesario porque courseStructure es readonly pero resolveAutoNav espera Lesson[]
        return legacyResolveAutoNav(pathname, lessons as Lesson[]);
    }

    // Usar nuevo servicio (Application layer)
    // Crear catálogo con la estructura proporcionada (permite testing con mocks)
    const catalog = new LessonCatalogAdapter(lessons);
    const navigationService = new NavigationServiceImpl(catalog);

    const result = await navigationService.resolveAutoNav(pathname);

    // Adaptar formato de NavigationResult a AutoNavResult
    return {
        previous: result.previous
            ? { title: result.previous.title, href: result.previous.href }
            : undefined,
        next: result.next
            ? { title: result.next.title, href: result.next.href }
            : undefined,
    };
}
