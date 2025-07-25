import type { AstroIntegration } from "astro";
import fg from "fast-glob";
import { pathToFileURL } from "url";

/**
 * Creates an Astro integration that watches specified file patterns during development and triggers
 * hot reloads on change.
 *
 * @param patterns Glob patterns to watch
 * @returns An AstroIntegration for dev file watching
 */
export function devServerFileWatcher(patterns: string[]): AstroIntegration {
  return {
    name: "dev-server-file-watcher",

    hooks: {
      async "astro:config:setup"({ addWatchFile, config }) {
        const root = config.root;

        const filePaths = await fg(patterns, {
          cwd: root.pathname,
          absolute: true,
        });

        for (const file of filePaths) {
          addWatchFile(pathToFileURL(file));
        }
      },
    },
  };
}
