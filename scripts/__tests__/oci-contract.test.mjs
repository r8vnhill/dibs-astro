import { expect, suite, test } from "vitest";
import { parseCandidateMetadata } from "../lib/oci/candidate-metadata.mjs";
import { digestBytes } from "../lib/oci/registry-client.mjs";
import { resolvePublicationAliases } from "../lib/oci/release-policy.mjs";

const candidate = {
    schemaVersion: 1,
    image: "registry.example/dibs/ci:123-abcdef0",
    digest: `sha256:${"a".repeat(64)}`,
    revision: "a".repeat(40),
    version: "0.22.0",
    source: "https://gitlab.com/r8vnhill/dibs-astro-website",
    platform: "linux/amd64",
};

suite("given candidate OCI metadata", () => {
    test("then it accepts the complete versioned handoff contract", () => {
        expect(parseCandidateMetadata(candidate)).toEqual(candidate);
    });

    test.each([
        ["unsupported schema", { schemaVersion: 2 }],
        ["malformed digest", { digest: "sha256:ABC" }],
        ["missing revision", { revision: undefined }],
        ["unsupported platform", { platform: "amd64" }],
        ["malformed source", { source: "github.com/project" }],
    ])("then it rejects %s", (_, change) => {
        expect(() => parseCandidateMetadata({ ...candidate, ...change })).toThrow();
    });
});

suite("given a verified candidate and release context", () => {
    test("then main publishes only the full revision alias", () => {
        expect(resolvePublicationAliases({ branch: "main", version: candidate.version }, candidate)).toEqual([
            candidate.revision,
        ]);
    });

    test("then a matching version tag publishes the revision and version aliases", () => {
        expect(resolvePublicationAliases({ tag: candidate.version, version: candidate.version }, candidate)).toEqual([
            candidate.revision,
            candidate.version,
        ]);
    });

    test.each(["v0.22.0", "0.23.0", "release-0.22.0"])("then it rejects non-canonical tag %s", (tag) => {
        expect(() => resolvePublicationAliases({ tag, version: candidate.version }, candidate)).toThrow();
    });
});

suite("given raw OCI manifest bytes", () => {
    test("then the computed digest is stable and uses sha256", () => {
        expect(digestBytes(Buffer.from("manifest"))).toBe(
            "sha256:05b3abf2579a5eb66403cd78be557fd860633a1fe2103c7642030defe32c657f",
        );
    });
});
