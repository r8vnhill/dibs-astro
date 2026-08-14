/*
 * Some build tools still need TypeScript's programmatic API. TypeScript 7 deliberately omits that
 * API, so this bridge redirects only an isolated tool process to the documented TypeScript 6
 * compatibility package. Project `tsc` commands continue to resolve TypeScript 7.
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
