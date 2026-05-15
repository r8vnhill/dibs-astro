/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";
import { fileURLToPath } from "node:url";

process.env.SKIP_ICON_GENERATION ??= "true";

export default getViteConfig({
    resolve: {
        alias: {
            "@ravenhill/lesson-export-core": fileURLToPath(
                new URL("./packages/lesson-export-core/src/index.ts", import.meta.url),
            ),
            "@ravenhill/shiki-core": fileURLToPath(
                new URL("./packages/shiki-core/src/index.ts", import.meta.url),
            ),
        },
    },
    test: {
        environment: "node",
        globals: false,
        css: false,
        include: ["src/**/*.render.test.ts"],
        exclude: ["node_modules/**"],
        testTimeout: 15_000,
    },
});
