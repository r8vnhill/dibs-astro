/// <reference types="vitest/config" />

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: [],
        typecheck: {
            include: ["packages/content-core/src/**/__tests__/**/*.test-d.ts"],
            tsconfig: "packages/content-core/tsconfig.json",
        },
    },
});
