/**
 * Variant configuration for "Pros" and "Cons" blocks.
 *
 * This object centralizes the visual and textual differences between the two types of sections
 * commonly used in pros/cons layouts.
 *
 * Each variant defines:
 * - `border`: the Tailwind CSS class for the left border color.
 * - `title`: the Tailwind CSS class for the title text color (light and dark mode).
 * - `defaultTitle`: the default heading text if none is provided.
 *
 * Usage:
 * Import and use this to apply consistent styling in `Pros.astro` and `Cons.astro`, without
 * duplicating hardcoded colors or labels.
 */
export const blockVariants = {
    pros: {
        border: "border-green-500", // Green border for positive items
        title: "text-green-700 dark:text-green-300", // Green title (adaptive to light/dark mode)
        defaultTitle: "Qué ganamos", // Default heading for pros section
    },
    cons: {
        border: "border-red-500", // Red border for negative items
        title: "text-red-700 dark:text-red-300", // Red title (adaptive to light/dark mode)
        defaultTitle: "En qué topamos", // Default heading for cons section
    },
} as const;
