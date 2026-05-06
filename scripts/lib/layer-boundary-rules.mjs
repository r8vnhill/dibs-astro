export const domainBoundaryRule = {
    id: "domain-boundary",
    source: "domain",
    allowedTargets: ["domain", "content-core"],
    forbiddenTargets: [
        "application",
        "infrastructure",
        "presentation-adapter",
        "presentation",
        "ui",
        "generated-data",
        "data",
    ],
    forbiddenPackages: ["astro", "react", "zod"],
    message: "Domain code must stay framework-free and independent from outer layers.",
    suggestion:
        "Move framework, validation, data-loading, or adapter-specific logic to application or infrastructure, and expose only domain-level abstractions inward.",
};

export const applicationBoundaryRule = {
    id: "application-boundary",
    source: "application",
    allowedTargets: ["domain", "application", "content-core"],
    forbiddenTargets: [
        "infrastructure",
        "presentation-adapter",
        "presentation",
        "ui",
        "generated-data",
        "data",
    ],
    forbiddenPackages: ["astro", "react", "zod"],
    message:
        "Application code may orchestrate domain use cases, but must not depend on infrastructure, UI, generated data, or framework packages.",
    suggestion:
        "Depend on domain abstractions or application ports, and move concrete framework/data access to infrastructure adapters.",
};

export const infrastructureBoundaryRule = {
    id: "infrastructure-boundary",
    source: "infrastructure",
    allowedTargets: [
        "domain",
        "application",
        "infrastructure",
        "data",
        "generated-data",
        "utils",
        "content-core",
    ],
    forbiddenTargets: [
        "presentation-adapter",
        "presentation",
        "ui",
    ],
    forbiddenPackages: [],
    message:
        "Infrastructure may implement outer technical details, but must not depend on presentation or UI surfaces.",
    suggestion:
        "Keep UI-specific composition in presentation adapters or components, and expose infrastructure through application/domain contracts.",
};

export const presentationAdapterBoundaryRule = {
    id: "presentation-adapter-boundary",
    source: "presentation-adapter",
    allowedTargets: [
        "domain",
        "application",
        "infrastructure",
        "presentation-adapter",
        "presentation",
        "utils",
        "content-core",
    ],
    forbiddenTargets: ["ui"],
    forbiddenPackages: [],
    message:
        "Presentation adapters should compose application and infrastructure services, but must not import UI components, layouts, or pages.",
    suggestion:
        "Keep adapters as data/service bridges and let UI surfaces consume the adapter output.",
};

export const uiBoundaryRule = {
    id: "ui-boundary",
    source: "ui",
    allowedTargets: [
        "presentation-adapter",
        "presentation",
        "ui",
        "assets",
        "styles",
        "utils",
        "content-core",
    ],
    forbiddenTargets: ["domain", "application", "infrastructure"],
    forbiddenPackages: [],
    message: "UI code must depend on presentation contracts, not domain/application internals.",
    suggestion: "Move shaping logic behind a presentation adapter, helper, or view model.",
};

export const contentCoreBoundaryRule = {
    id: "content-core-boundary",
    source: "content-core",
    allowedTargets: ["content-core"],
    forbiddenTargets: [
        "domain",
        "application",
        "infrastructure",
        "presentation-adapter",
        "presentation",
        "ui",
        "generated-data",
        "data",
        "utils",
        "assets",
        "styles",
    ],
    forbiddenPackages: ["astro", "react", "react-dom", "zod"],
    message:
        "@ravenhill/content-core must remain host-agnostic and independent from app-local layers.",
    suggestion:
        "Keep generated data, validation, Astro, UI, and app adapters in src, and expose only pure content contracts from the package.",
};

export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
    contentCoreBoundaryRule,
];

/**
 * Temporary allowlist for intentionally documented architecture exceptions.
 *
 * Step 4 evaluates exact exceptions through the rule evaluator.
 */
export const allowedExceptions = [];

export const legacyInitialBoundaryRules = [
    {
        id: "domain-must-not-import-outer-layers",
        source: ["src/domain/**"],
        forbiddenTargets: [
            "src/application/**",
            "src/infrastructure/**",
            "src/presentation/**",
        ],
        forbiddenPackages: ["astro", "react", "zod"],
        message:
            "Domain code must not import application, infrastructure, presentation, or UI framework dependencies.",
        suggestion:
            "Move the dependency behind a domain contract or invert the dependency direction.",
    },
    {
        id: "ui-must-not-import-infrastructure",
        source: [
            "src/components/**",
            "src/layouts/**",
            "src/pages/**",
        ],
        forbiddenTargets: ["src/infrastructure/**"],
        forbiddenPackages: [],
        message: "UI surfaces must not import infrastructure directly.",
        suggestion: "Expose this use case through src/presentation/adapters.",
    },
];

export const initialBoundaryRules = boundaryRules;
