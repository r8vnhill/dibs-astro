import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateIconsIndex } from "../../generate-icons-index.js";

const ICONS_DIR = path.resolve(
  fileURLToPath(new URL("../../src/assets/img/icons", import.meta.url)),
);

function createWatcherPlugin(logger: AstroIntegrationLogger) {
  return {
    name: "generate-icons-hmr",
    handleHotUpdate(ctx: { file: string }) {
      if (ctx.file.startsWith(ICONS_DIR) && ctx.file.endsWith(".svg")) {
        generateIconsIndex();
        logger.info("Regenerated icon exports after SVG change.");
      }
    },
  };
}

export function generateIconsIntegration(): AstroIntegration {
  return {
    name: "generate-icons-integration",
    hooks: {
      "astro:config:setup"({ logger, updateConfig }) {
        generateIconsIndex();

        updateConfig({
          vite: {
            plugins: [createWatcherPlugin(logger)],
          },
        });
      },
      "astro:build:start"({ logger }) {
        generateIconsIndex({ quiet: true });
        logger.info("Generated icon exports before build.");
      },
    },
  };
}
