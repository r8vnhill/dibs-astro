/**
 * @file astro-render.ts
 *
 * Test utility for rendering Astro components to HTML strings.
 *
 * This module wraps Astro's experimental `{ts} AstroContainer` API and provides a strongly-typed,
 * reusable renderer factory for use in Vitest test suites.
 *
 * ## Why this exists
 *
 * Astro components are not plain functions; they must be rendered inside an Astro runtime
 * container. The raw API:
 *
 * - Requires creating a container via `{ts} AstroContainer.create()`.
 * - Requires loading any framework renderers needed by child components (for example React
 *   islands rendered from inside an Astro layout).
 * - Requires calling `{ts} container.renderToString(...)`.
 * - Returns an HTML string.
 *
 * Most tests only care about:
 *
 * - Rendering a component with props,
 * - Receiving the resulting HTML.
 *
 * This helper abstracts away container creation and returns a simple function:
 *
 * ```ts
 * const render = await createAstroRenderer<ComponentProps>(Component);
 * const html = await render({ ...props });
 * ```
 *
 * This keeps tests:
 *
 * - Concise
 * - Focused on behavior
 * - Free from container boilerplate
 *
 * ## Renderer loading
 *
 * This project uses the React integration in production (`astro.config.ts`), and some Astro
 * components under test transitively render React-backed children. A plain container created
 * without renderers is therefore insufficient for layout-level tests such as `NotesLayout`.
 *
 * To keep callers simple, this helper eagerly loads the React container renderer once per created
 * test container. That makes the helper suitable for:
 *
 * - plain Astro components;
 * - Astro components that include React children;
 * - shared layout tests that should not need custom renderer setup.
 *
 * If the project later adds more framework integrations used in Astro tests, extend this helper
 * rather than duplicating container bootstrapping across suites.
 *
 * ## Type Strategy
 *
 * The `AstroRenderComponent` type is derived directly from the container's `renderToString`
 * signature. This ensures:
 *
 * - Compatibility with Astro's internal types.
 * - Compile-time failure if Astro changes the render contract.
 *
 * `AstroRender<Props>` models the final ergonomic API exposed to tests:
 *
 *   `(props: Props) => Promise<string>`
 *
 * Tests get strong typing on props while keeping the implementation generic.
 */

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer as getReactContainerRenderer } from "@astrojs/react";

/**
 * Extracts the component parameter type accepted by `AstroContainer.renderToString`.
 *
 * This avoids hardcoding internal Astro types and keeps the helper resilient to future Astro API
 * changes.
 */
type AstroRenderComponent = Parameters<
    Awaited<ReturnType<typeof AstroContainer.create>>["renderToString"]
>[0];

/**
 * Function signature returned by {@link createAstroRenderer}.
 *
 * @template Props Props type expected by the Astro component.
 *
 * @param props Component props.
 * @returns Rendered HTML string.
 */
export type AstroRender<Props extends object> = (
    props: Props,
    options?: AstroRenderOptions,
) => Promise<string>;

export interface AstroRenderOptions {
    /**
     * Optional named slots to inject into the rendered Astro component.
     */
    slots?: Record<string, string>;

    /**
     * Optional request used to populate `Astro.request` / `Astro.url` dependent code paths.
     */
    request?: Request;
}

/**
 * Creates a reusable renderer function for a given Astro component.
 *
 * ## Lifecycle notes
 *
 * - A new Astro container is created once per call to this factory.
 * - Tests typically call this inside `{ts} beforeEach` to ensure isolation.
 * - The container instance and its loaded renderers are reused for all render calls returned by
 *   the generated function.
 *
 * ## Why the `{ts} as any` cast?
 *
 * Astro's container typing is currently permissive and does not expose full generic constraints
 * for props. The cast keeps:
 *
 * - The external API strongly typed,
 * - The internal call compatible with Astro.
 *
 * If Astro improves its container typings in future versions, this cast can likely be removed.
 *
 * @template Props Expected props type for the component.
 * @param component Astro component to render.
 *
 * @returns A function that:
 *   - Accepts strongly-typed props.
 *   - Renders the component.
 *   - Returns the resulting HTML string.
 */
export async function createAstroRenderer<Props extends object>(
    component: AstroRenderComponent,
): Promise<AstroRender<Props>> {
    // Keep renderer setup centralized so layout tests do not need to know which framework-backed
    // children an Astro component pulls in transitively.
    const renderers = await loadRenderers([getReactContainerRenderer()]);
    const container = await AstroContainer.create({ renderers });

    return (props: Props, options?: AstroRenderOptions) =>
        container.renderToString(component, {
            props: props as any,
            ...(options?.slots ? { slots: options.slots as any } : {}),
            ...(options?.request ? { request: options.request } : {}),
        });
}
