// Pure export-name transformation shared by the index generator and the icon audit system.
// No filesystem or process dependencies.

/**
 * Converts an SVG filename like `copy-icon.svg` or `terminal_window.svg` to PascalCase:
 * CopyIcon, TerminalWindow.
 *
 * @param {string} filename - The SVG filename (e.g., "copy-icon.svg")
 * @returns {string} - PascalCase version without extension
 */
export const toPascalCase = (filename) =>
    filename
        .replace(/\.svg$/, "") // Remove .svg extension
        .replace(/(^\w|[-_]\w)/g, (match) =>
            match.replace(/[-_]/, "").toUpperCase(),
        );
