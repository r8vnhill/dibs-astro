import {
    buildCommitUrl,
    type BuildCommitUrlOptions,
    buildRepoLinkText,
    type BuildRepoLinkTextOptions,
    buildRepoUrl,
    type BuildRepoUrlOptions,
    normalizePlatforms,
    type RepoPlatform,
    type RepoRef,
} from "@ravenhill/site-core";
import { expectTypeOf, test } from "vitest";

test("exposes the complete public type surface from the package root", () => {
    const repo: RepoRef = { user: "octocat", repo: "hello-world" };
    const platform: RepoPlatform = "github";
    const repoUrlOptions: BuildRepoUrlOptions = { path: "tree/main" };
    const commitUrlOptions: BuildCommitUrlOptions = { path: "README.md" };
    const linkTextOptions: BuildRepoLinkTextOptions = { label: "Source", showPlatform: true };

    expectTypeOf(repo).toEqualTypeOf<RepoRef>();
    expectTypeOf<RepoPlatform>().toEqualTypeOf<RepoPlatform>();
    expectTypeOf(repoUrlOptions).toEqualTypeOf<BuildRepoUrlOptions>();
    expectTypeOf(commitUrlOptions).toEqualTypeOf<BuildCommitUrlOptions>();
    expectTypeOf(linkTextOptions).toEqualTypeOf<BuildRepoLinkTextOptions>();
    expectTypeOf(buildRepoUrl).toEqualTypeOf<
        (ref: RepoRef, platform: RepoPlatform, options?: BuildRepoUrlOptions) => string
    >();
    expectTypeOf(buildCommitUrl).toEqualTypeOf<
        (ref: RepoRef, platform: RepoPlatform, hash: string, options?: BuildCommitUrlOptions) => string
    >();
    expectTypeOf(buildRepoLinkText).toEqualTypeOf<
        (ref: RepoRef, platform: RepoPlatform, options?: BuildRepoLinkTextOptions) => string
    >();
    expectTypeOf(normalizePlatforms).toEqualTypeOf<(platforms?: unknown) => RepoPlatform[]>();
    void platform;
});

test("does not expose repositories as a public type subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/site-core.
    expectTypeOf<typeof import("@ravenhill/site-core/repositories")>().not.toBeAny();
});

test("does not expose source or distribution files as public type subpaths", () => {
    // @ts-expect-error Consumers must import from @ravenhill/site-core.
    expectTypeOf<typeof import("@ravenhill/site-core/src/index.js")>().not.toBeAny();
    // @ts-expect-error Consumers must import from @ravenhill/site-core.
    expectTypeOf<typeof import("@ravenhill/site-core/dist/index.js")>().not.toBeAny();
});
