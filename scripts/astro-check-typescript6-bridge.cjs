/*
 * Astro's checker still needs TypeScript's programmatic API. The project keeps TypeScript 6 as
 * the supported compiler boundary, and this bridge makes Astro resolve the explicit compatibility
 * package instead of depending on package-manager hoisting or a transitive workspace dependency.
 */
const Module = require("node:module");

const originalResolveFilename = Module._resolveFilename;
const compatibilityTypeScript = require.resolve("@typescript/typescript6");

Module._resolveFilename = function resolveAstroCheckTypeScript(request, parent, ...rest) {
    if (request === "typescript") {
        return compatibilityTypeScript;
    }

    return originalResolveFilename.call(this, request, parent, ...rest);
};
