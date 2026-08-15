import { readFile } from "node:fs/promises";
import { parseCandidateMetadata, parseImageReference } from "./lib/oci/candidate-metadata.mjs";
import { createRegistryClient } from "./lib/oci/registry-client.mjs";

const metadata = parseCandidateMetadata(JSON.parse(await readFile(process.argv[2] ?? "tmp/oci-candidate.json", "utf8")));
const project = JSON.parse(await readFile("package.json", "utf8"));
const license = await readFile("LICENSE", "utf8");
if (project.license !== "BSD-2-Clause" || !license.includes("Redistribution and use in source and binary forms")) throw new Error("Authoritative project license metadata is incomplete.");

const image = parseImageReference(metadata.image);
const registry = createRegistryClient({ registry: image.registry, username: requiredEnv("CI_REGISTRY_USER"), password: requiredEnv("CI_REGISTRY_PASSWORD") });
const root = JSON.parse((await registry.getManifest(image, metadata.digest)).body.toString("utf8"));
if (!Array.isArray(root.manifests)) throw new Error("Candidate does not expose an attestation-bearing OCI index.");
const [os, architecture] = metadata.platform.split("/");
const platform = root.manifests.find((item) => item.platform?.os === os && item.platform?.architecture === architecture);
if (!platform) throw new Error(`Candidate has no ${metadata.platform} image manifest.`);
const attestations = root.manifests.filter((item) => item.annotations?.["vnd.docker.reference.type"] === "attestation-manifest");
if (!attestations.length) throw new Error("Candidate has no BuildKit attestation manifest.");

const manifest = JSON.parse((await registry.getManifest(image, platform.digest)).body.toString("utf8"));
const config = JSON.parse((await readBlob(manifest.config.digest)).toString("utf8"));
const labels = config.config?.Labels ?? {};
assertEqual(labels["org.opencontainers.image.source"], metadata.source, "source");
assertEqual(labels["org.opencontainers.image.revision"], metadata.revision, "revision");
assertEqual(labels["org.opencontainers.image.version"], metadata.version, "version");
assertEqual(labels["org.opencontainers.image.licenses"], project.license, "license");
console.log(`OCI provenance passed for ${metadata.image}@${metadata.digest}; ${attestations.length} attestation manifest(s) found.`);

async function readBlob(digest) {
    const response = await registry.getBlob(image, digest);
    if (!response.ok) throw new Error(`Could not read OCI blob ${digest} (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
}

function assertEqual(actual, expected, field) {
    if (actual !== expected) throw new Error(`OCI ${field} metadata mismatch: expected ${expected}, received ${actual ?? "missing"}.`);
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required for OCI provenance verification.`);
    return value;
}
