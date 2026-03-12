import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateIconsIndex } from "../../generate-icons-index.js";

const ICONS_DIR = path.resolve(
    fileURLToPath(new URL("../../src/assets/img/icons", import.meta.url)),
);

function isIconGenerationDisabled(): boolean {
    const skipByFlag = process.env.SKIP_ICON_GENERATION === "true";
    const skipByCi = process.env.CI === "true";
    return skipByFlag || skipByCi;
}

function createWatcherPlugin(logger: AstroIntegrationLogger) {
    return {
        name: "generate-icons-hmr",
        handleHotUpdate(ctx: { file: string }) {
            if (ctx.file.startsWith(ICONS_DIR) && ctx.file.endsWith(".svg")) {
                const { changed } = generateIconsIndex();
                logger.info(
                    changed
                        ? "Regenerated icon exports after SVG change."
                        : "Icon exports already up to date after SVG change.",
                );
            }
        },
    };
}

export function generateIconsIntegration(): AstroIntegration {
    return {
        name: "generate-icons-integration",
        hooks: {
            "astro:config:setup"({ logger, updateConfig }) {
                if (isIconGenerationDisabled()) {
                    logger.info("Icon generation skipped by env flag (SKIP_ICON_GENERATION/CI).");
                    return;
                }

                const { changed } = generateIconsIndex();
                logger.info(
                    changed ? "Generated icon exports." : "Icon exports already up to date.",
                );

                updateConfig({
                    vite: {
                        plugins: [createWatcherPlugin(logger)],
                    },
                });
            },
            "astro:build:start"({ logger }) {
                if (isIconGenerationDisabled()) {
                    logger.info(
                        "Icon generation skipped before build by env flag (SKIP_ICON_GENERATION/CI).",
                    );
                    return;
                }

                const { changed } = generateIconsIndex({ quiet: true });
                logger.info(
                    changed
                        ? "Generated icon exports before build."
                        : "Icon exports already up to date before build.",
                );
            },
        },
    };
}
