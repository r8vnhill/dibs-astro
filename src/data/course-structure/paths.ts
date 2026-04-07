const notes = "/notes";
const softwareLibraries = `${notes}/software-libraries`;
const apiDesign = `${softwareLibraries}/api-design`;
const scripting = `${softwareLibraries}/scripting`;
const pipelines = `${scripting}/pipelines`;
const buildSystems = `${softwareLibraries}/build-systems`;

export const coursePaths = {
    notes,
    installation: `${notes}/installation`,
    softwareLibraries,
    softwareArtifactsTaxonomy: `${softwareLibraries}/artifacts-taxonomy`,
    whatIs: `${softwareLibraries}/what-is`,
    taskAutomation: `${softwareLibraries}/task-automation`,
    apiDesign,
    apiDesignFundamentals: `${apiDesign}/fundamentals`,
    apiDesignEvolution: `${apiDesign}/evolution`,
    scripting,
    scriptingHelp: `${scripting}/help`,
    firstScript: `${scripting}/first-script`,
    structuredOutput: `${scripting}/structured-output`,
    shouldProcess: `${scripting}/should-process`,
    scriptingErrors: `${scripting}/errors`,
    labGitlab: `${scripting}/gitlab`,
    pipelines,
    pipelineAware: `${pipelines}/pipeline-aware`,
    pipelineErrors: `${pipelines}/errors`,
    gitSubmodules: `${pipelines}/git-submodules`,
    buildSystems,
    veritas1: `${buildSystems}/veritas-1`,
    businessVsApp: `${softwareLibraries}/business-vs-app`,
    domainModels: `${softwareLibraries}/domain-models`,
} as const;
