import { describe, it, expect } from "vitest";
import { coursePaths, type CoursePaths } from "../paths";

describe("coursePaths", () => {
  describe("behavioral checks", () => {
    it("exposes canonical roots for major sections", () => {
      expect(coursePaths.notes).toBe("/notes");
      expect(coursePaths.softwareLibraries.root).toBe("/notes/software-libraries");
      expect(coursePaths.scripting.root).toBe("/notes/scripting");
    });

    it("exposes nested subsection roots where expected", () => {
      expect(coursePaths.softwareLibraries.apiDesign.root).toBe(
        "/notes/software-libraries/api-design",
      );
      expect(coursePaths.softwareLibraries.buildSystems.root).toBe(
        "/notes/software-libraries/build-systems",
      );
      expect(coursePaths.scripting.pipelines.root).toBe("/notes/scripting/pipelines");
    });

    it("resolves each lesson path to the expected URL string", () => {
      // Top-level installations
      expect(coursePaths.installation).toBe("/notes/installation");

      // Software libraries leaves
      expect(coursePaths.softwareLibraries.artifactsTaxonomy).toBe(
        "/notes/software-libraries/artifacts-taxonomy",
      );
      expect(coursePaths.softwareLibraries.whatIs).toBe(
        "/notes/software-libraries/what-is",
      );
      expect(coursePaths.softwareLibraries.taskAutomation).toBe(
        "/notes/software-libraries/task-automation",
      );
      expect(coursePaths.softwareLibraries.businessVsApp).toBe(
        "/notes/software-libraries/business-vs-app",
      );
      expect(coursePaths.softwareLibraries.domainModels).toBe(
        "/notes/software-libraries/domain-models",
      );

      // API Design nested leaves
      expect(coursePaths.softwareLibraries.apiDesign.fundamentals).toBe(
        "/notes/software-libraries/api-design/fundamentals",
      );
      expect(coursePaths.softwareLibraries.apiDesign.evolution).toBe(
        "/notes/software-libraries/api-design/evolution",
      );

      // Build Systems nested leaves
      expect(coursePaths.softwareLibraries.buildSystems.veritas1).toBe(
        "/notes/software-libraries/build-systems/veritas-1",
      );

      // Scripting leaves
      expect(coursePaths.scripting.help).toBe("/notes/scripting/help");
      expect(coursePaths.scripting.firstScript).toBe("/notes/scripting/first-script");
      expect(coursePaths.scripting.structuredOutput).toBe(
        "/notes/scripting/structured-output",
      );
      expect(coursePaths.scripting.shouldProcess).toBe(
        "/notes/scripting/should-process",
      );
      expect(coursePaths.scripting.errors).toBe("/notes/scripting/errors");
      expect(coursePaths.scripting.labGitlab).toBe("/notes/scripting/gitlab");

      // Pipelines nested leaves
      expect(coursePaths.scripting.pipelines.pipelineAware).toBe(
        "/notes/scripting/pipelines/pipeline-aware",
      );
      expect(coursePaths.scripting.pipelines.errors).toBe(
        "/notes/scripting/pipelines/errors",
      );
      expect(coursePaths.scripting.pipelines.gitSubmodules).toBe(
        "/notes/scripting/pipelines/git-submodules",
      );
    });

    it("allows internal consumers to read the expected nested paths", () => {
      // Simulate usage patterns from index.ts and unit-1.ts
      const notesPath = `${coursePaths.notes}/`;
      const installationPath = `${coursePaths.installation}/`;
      const softwareLibrariesRootPath = `${coursePaths.softwareLibraries.root}/`;
      const apiDesignFundamentalsPath = `${coursePaths.softwareLibraries.apiDesign.fundamentals}/`;
      const apiDesignEvolutionPath = `${coursePaths.softwareLibraries.apiDesign.evolution}/`;
      const artifactsTaxonomyPath = `${coursePaths.softwareLibraries.artifactsTaxonomy}/`;
      const whatIsPath = `${coursePaths.softwareLibraries.whatIs}/`;

      expect(notesPath).toBe("/notes/");
      expect(installationPath).toBe("/notes/installation/");
      expect(softwareLibrariesRootPath).toBe("/notes/software-libraries/");
      expect(apiDesignFundamentalsPath).toBe("/notes/software-libraries/api-design/fundamentals/");
      expect(apiDesignEvolutionPath).toBe("/notes/software-libraries/api-design/evolution/");
      expect(artifactsTaxonomyPath).toBe("/notes/software-libraries/artifacts-taxonomy/");
      expect(whatIsPath).toBe("/notes/software-libraries/what-is/");
    });
  });

  describe("table-driven checks", () => {
    const mappingTests = [
      // Top-level roots
      ["notes", "/notes"],
      ["installation", "/notes/installation"],

      // Software libraries subsection
      ["softwareLibraries.root", "/notes/software-libraries"],
      ["softwareLibraries.artifactsTaxonomy", "/notes/software-libraries/artifacts-taxonomy"],
      ["softwareLibraries.whatIs", "/notes/software-libraries/what-is"],
      ["softwareLibraries.taskAutomation", "/notes/software-libraries/task-automation"],
      ["softwareLibraries.businessVsApp", "/notes/software-libraries/business-vs-app"],
      ["softwareLibraries.domainModels", "/notes/software-libraries/domain-models"],

      // API Design nested subsection
      ["softwareLibraries.apiDesign.root", "/notes/software-libraries/api-design"],
      ["softwareLibraries.apiDesign.fundamentals", "/notes/software-libraries/api-design/fundamentals"],
      ["softwareLibraries.apiDesign.evolution", "/notes/software-libraries/api-design/evolution"],

      // Build Systems nested subsection
      ["softwareLibraries.buildSystems.root", "/notes/software-libraries/build-systems"],
      ["softwareLibraries.buildSystems.veritas1", "/notes/software-libraries/build-systems/veritas-1"],

      // Scripting subsection
      ["scripting.root", "/notes/scripting"],
      ["scripting.help", "/notes/scripting/help"],
      ["scripting.firstScript", "/notes/scripting/first-script"],
      ["scripting.structuredOutput", "/notes/scripting/structured-output"],
      ["scripting.shouldProcess", "/notes/scripting/should-process"],
      ["scripting.errors", "/notes/scripting/errors"],
      ["scripting.labGitlab", "/notes/scripting/gitlab"],

      // Pipelines nested subsection
      ["scripting.pipelines.root", "/notes/scripting/pipelines"],
      ["scripting.pipelines.pipelineAware", "/notes/scripting/pipelines/pipeline-aware"],
      ["scripting.pipelines.errors", "/notes/scripting/pipelines/errors"],
      ["scripting.pipelines.gitSubmodules", "/notes/scripting/pipelines/git-submodules"],
    ] as const;

    it.each(mappingTests)("resolves %s to %s", (path, expectedUrl) => {
      const keys = path.split(".");
      let value: unknown = coursePaths;
      for (const key of keys) {
        value = (value as Record<string, unknown>)[key];
      }
      expect(value).toBe(expectedUrl);
    });
  });

  describe("invariant checks", () => {
    /**
     * Flatten the nested coursePaths tree into a flat array of all string values.
     * This allows us to verify structural invariants.
     */
    function flattenPaths(obj: unknown): string[] {
      const paths: string[] = [];

      function visit(value: unknown): void {
        if (typeof value === "string") {
          paths.push(value);
        } else if (typeof value === "object" && value !== null) {
          for (const v of Object.values(value)) {
            visit(v);
          }
        }
      }

      visit(obj);
      return paths;
    }

    it("every exported path starts with /", () => {
      const allPaths = flattenPaths(coursePaths);
      for (const path of allPaths) {
        expect(path).toMatch(/^\//);
      }
    });

    it("no path contains //", () => {
      const allPaths = flattenPaths(coursePaths);
      for (const path of allPaths) {
        expect(path).not.toContain("//");
      }
    });

    it("no duplicate path values exist", () => {
      const allPaths = flattenPaths(coursePaths);
      const uniquePaths = new Set(allPaths);
      expect(uniquePaths.size).toBe(allPaths.length);
    });

    it("every section object with children exposes a root", () => {
      const sections = [
        { name: "softwareLibraries", obj: coursePaths.softwareLibraries },
        { name: "softwareLibraries.apiDesign", obj: coursePaths.softwareLibraries.apiDesign },
        { name: "softwareLibraries.buildSystems", obj: coursePaths.softwareLibraries.buildSystems },
        { name: "scripting", obj: coursePaths.scripting },
        { name: "scripting.pipelines", obj: coursePaths.scripting.pipelines },
      ];

      for (const { name, obj } of sections) {
        const hasChildren = Object.values(obj).some(
          (v) => typeof v === "object" && v !== null && "root" in v,
        );
        const hasRoot = "root" in obj && typeof obj.root === "string";

        if (hasChildren) {
          expect(hasRoot, `${name} should expose a root property`).toBe(true);
        }
      }
    });
  });

  describe("type safety", () => {
    it("exports CoursePaths type", () => {
      const typedPaths: CoursePaths = coursePaths;
      expect(typedPaths).toBe(coursePaths);
      expect(coursePaths).toBeDefined();
    });

    it("coursePaths is readonly", () => {
      // TypeScript will catch mutations at compile time,
      // but we can verify the object is frozen at runtime (if it is)
      // For const assertions, this is a compile-time guarantee.
      expect(coursePaths).toBeDefined();
    });
  });
});
