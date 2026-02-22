/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";

export default getViteConfig({
    test: {
        environment: "node",
        globals: true,
        css: false,
        include: ["src/**/*.render.test.ts"],
        exclude: ["node_modules/**"],
    },
});
