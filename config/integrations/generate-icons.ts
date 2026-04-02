import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateIconsIndex } from "../../generate-icons-index.js";

const ICONS_DIR = path.resolve(
    fileURLToPath(new URL("../../src/assets/img/icons", import.meta.url)),
);

const LOGOS_DIR = path.resolve(
    fileURLToPath(new URL("../../src/assets/img/logos", import.meta.url)),
);

const ASSET_DIRS = { icons: ICONS_DIR, logos: LOGOS_DIR } as const;

function isIndexGenerationDisabled(): boolean {
    const skipByFlag = process.env.SKIP_ICON_GENERATION === "true";
    const skipByCi = process.env.CI === "true";
    return skipByFlag || skipByCi;
}

function getAssetType(filePath: string): keyof typeof ASSET_DIRS | null {
    if (filePath.startsWith(ICONS_DIR)) return "icons";
    if (filePath.startsWith(LOGOS_DIR)) return "logos";
    return null;
}

function createWatcherPlugin(logger: AstroIntegrationLogger) {
    return {
        name: "generate-assets-index-hmr",
        handleHotUpdate(ctx: { file: string }) {
            if (!ctx.file.endsWith(".svg")) return;

            const assetType = getAssetType(ctx.file);
            if (!assetType) return;

            const { changed } = generateIconsIndex({ assetType, quiet: false });
            logger.info(
                changed
                    ? `Regenerated ${assetType} index after SVG change.`
                    : `${
                        assetType.charAt(0).toUpperCase() + assetType.slice(1)
                    } index already up to date after SVG change.`,
            );
        },
    };
}

export function generateIconsIntegration(): AstroIntegration {
    return {
        name: "generate-assets-integration",
        hooks: {
            "astro:config:setup"({ logger, updateConfig }) {
                if (isIndexGenerationDisabled()) {
                    logger.info(
                        "Asset index generation skipped by env flag (SKIP_ICON_GENERATION/CI).",
                    );
                    return;
                }

                const iconResult = generateIconsIndex({ assetType: "icons", quiet: false });
                const logoResult = generateIconsIndex({ assetType: "logos", quiet: false });

                const changed = iconResult.changed || logoResult.changed;
                logger.info(
                    changed
                        ? "Generated asset indices."
                        : "Asset indices already up to date.",
                );

                updateConfig({
                    vite: {
                        plugins: [createWatcherPlugin(logger)],
                    },
                });
            },
            "astro:build:start"({ logger }) {
                if (isIndexGenerationDisabled()) {
                    logger.info(
                        "Asset index generation skipped before build by env flag (SKIP_ICON_GENERATION/CI).",
                    );
                    return;
                }

                const iconResult = generateIconsIndex({ assetType: "icons", quiet: true });
                const logoResult = generateIconsIndex({ assetType: "logos", quiet: true });

                const changed = iconResult.changed || logoResult.changed;
                logger.info(
                    changed
                        ? "Generated asset indices before build."
                        : "Asset indices already up to date before build.",
                );
            },
        },
    };
}
