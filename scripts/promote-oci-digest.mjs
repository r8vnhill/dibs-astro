import { readFile } from "node:fs/promises";
import { parseCandidateMetadata, parseImageReference } from "./lib/oci/candidate-metadata.mjs";
import { createRegistryClient, digestBytes } from "./lib/oci/registry-client.mjs";
import { resolvePublicationAliases } from "./lib/oci/release-policy.mjs";

const metadata = parseCandidateMetadata(
    JSON.parse(await readFile(process.argv[2] ?? "tmp/oci-candidate.json", "utf8")),
);
const image = parseImageReference(metadata.image);
if (image.registry !== requiredEnv("CI_REGISTRY")) throw new Error("Candidate registry does not match CI_REGISTRY.");
const registry = createRegistryClient({
    registry: image.registry,
    username: requiredEnv("CI_REGISTRY_USER"),
    password: requiredEnv("CI_REGISTRY_PASSWORD"),
});
const candidate = await registry.getManifest(image, metadata.digest);
assertDigest(candidate.body, metadata.digest, candidate.response);
const aliases = resolvePublicationAliases({
    branch: process.env.CI_COMMIT_BRANCH,
    tag: process.env.CI_COMMIT_TAG,
    version: metadata.version,
}, metadata);

for (const alias of aliases) {
    await registry.putManifest(image, alias, candidate.body, candidate.contentType);
    const promoted = await registry.getManifest(image, alias);
    assertDigest(promoted.body, metadata.digest, promoted.response);
    console.log(`Published ${image.repository}:${alias} at ${metadata.digest}.`);
}

function assertDigest(body, expected, response) {
    const computed = digestBytes(body);
    if (computed !== expected) throw new Error(`Manifest digest mismatch: expected ${expected}, received ${computed}.`);
    const reported = response.headers.get("docker-content-digest") ?? response.headers.get("oci-content-digest");
    if (reported && reported !== expected) {
        throw new Error(`Registry digest mismatch: expected ${expected}, received ${reported}.`);
    }
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required for OCI publication.`);
    return value;
}
