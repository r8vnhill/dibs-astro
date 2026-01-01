import type { AstroIntegration } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Creates an Astro integration that watches specified file patterns during development and triggers hot reloads on
 * change.
 *
 * @param patterns Glob patterns to watch
 * @returns An AstroIntegration for dev file watching
 */
export function devServerFileWatcher(patterns: string[]): AstroIntegration {
    const normalize = (pattern: string) =>
        pattern.replace(/[/\\]\*\*?$/, "").replace(/[/\\]\*$/, "");

    return {
        name: "dev-server-file-watcher",
        hooks: {
            "astro:server:setup"({ server, logger }) {
                // `server.config.root` can be a string path or a file:// URL depending on runtime.
                // Accept both forms to avoid "The URL must be of scheme file" when running under environments (like
                // VS Code bootloader) that provide a string rather than a URL.
                const root = typeof server.config.root === "string"
                    ? server.config.root
                    : fileURLToPath(server.config.root);

                const targets = patterns
                    .map((pattern) => normalize(pattern) || ".")
                    .map((pattern) => path.resolve(root, pattern));

                for (const target of targets) {
                    server.watcher.add(target);
                    logger.info(`dev-server-file-watcher: watching ${target}`);
                }
            },
        },
    };
}
