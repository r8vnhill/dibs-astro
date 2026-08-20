/**
 * Declarative external-package resolution contracts. Each entry states an invariant DIBS owns
 * about how a `@ravenhill` package must be resolved; this does not attempt to duplicate the
 * package manager's own dependency resolution.
 */
export const packageResolutionContracts = [
    {
        name: "@ravenhill/site-core",
        exactVersion: "0.1.0",
        registryProject: "85449745",
        rootOnly: true,
        forbiddenLocalDir: "packages/site-core",
    },
    {
        name: "@ravenhill/astro-icons",
        registryProject: "85449745",
    },
];
