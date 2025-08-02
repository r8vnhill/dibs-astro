/**
 * Re-export of the `AstroComponentFactory` type from Astro's internal runtime.
 *
 * This type represents the factory function used internally by Astro to create server-rendered
 * components. It can be useful in advanced use cases such as custom integrations, component
 * wrappers, or when working with low-level rendering APIs.
 *
 * Note: This type is imported directly from Astro's internal server runtime, which may be subject
 * to breaking changes across versions. Use with caution and avoid relying on it in public-facing
 * APIs unless necessary.
 */
export type { AstroComponentFactory } from "astro/runtime/server/index.d.ts";
