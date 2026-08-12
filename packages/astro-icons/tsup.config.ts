import { defineConfig } from "tsup";

export default defineConfig({
    // The published standalone artifact is built from the release-policy-derived publishable
    // barrel, not the internal barrel. Named as "index" so the output file remains dist/index.js
    // regardless of the source file's basename, preserving the package import specifier.
    entry: { index: "src/publishable.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
    external: [/\.svg$/],
});
