/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";

process.env.SKIP_ICON_GENERATION ??= "true";

export default getViteConfig({
    test: {
        environment: "node",
        globals: false,
        css: false,
        include: ["src/**/*.render.test.ts"],
        exclude: ["node_modules/**"],
        testTimeout: 15_000,
    },
});
