/**
 * Interfaz del servicio de navegación (puerto).
 * Contrato que define resolución de navegación prev/next entre lecciones.
 *
 * Implementación actual: adaptador basado en course-structure.ts.
 * Implementación futura: podría incluir historial, preferencias, etc.
 */

export interface NavigationNode {
    title: string;
    slug: string;
    href: string; // normalizada con trailing slash
}

export interface NavigationResult {
    previous?: NavigationNode;
    next?: NavigationNode;
}

/**
 * Puerto: Resolución de navegación.
 * La capa Application orquesta este servicio para casos de uso de navegación.
 */
export interface INavigationService {
    /**
     * Resuelve los nodos de navegación anterior y siguiente
     * para una ruta dada.
     *
     * @param pathname ruta actual normalizada (ej: /notes/unit/lesson/)
     * @returns objeto con previous y next (undefined si no existen)
     */
    resolveAutoNav(pathname: string): Promise<NavigationResult>;
}
