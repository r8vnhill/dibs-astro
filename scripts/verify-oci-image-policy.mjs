import { readFile } from "node:fs/promises";
import { gunzipSync, inflateSync } from "node:zlib";
import { parseCandidateMetadata, parseImageReference } from "./lib/oci/candidate-metadata.mjs";
import { createRegistryClient } from "./lib/oci/registry-client.mjs";

const metadata = parseCandidateMetadata(JSON.parse(await readFile(process.argv[2] ?? "tmp/oci-candidate.json", "utf8")));
const image = parseImageReference(metadata.image);
const registry = createRegistryClient({ registry: image.registry, username: requiredEnv("CI_REGISTRY_USER"), password: requiredEnv("CI_REGISTRY_PASSWORD") });
const root = JSON.parse((await registry.getManifest(image, metadata.digest)).body.toString("utf8"));
const manifest = await selectPlatformManifest(root, metadata.platform);
const config = JSON.parse((await readBlob(registry, image, manifest.config.digest)).toString("utf8"));

const user = config.config?.User;
if (!user || user === "0" || user === 0 || user === "root") throw new Error("OCI runtime is configured to run as root.");
if (!(config.config?.ExposedPorts?.["8080/tcp"] || config.config?.ExposedPorts?.["8080"])) throw new Error("OCI runtime does not expose the expected HTTP port.");

const forbidden = ["app/src", "app/node_modules", "root/.npmrc", "usr/local/bin/node", "usr/local/bin/pnpm", "app/.git"];
for (const layer of manifest.layers) {
    const finding = tarEntries(await readBlob(registry, image, layer.digest)).find((entry) => forbidden.some((item) => entry === item || entry.startsWith(`${item}/`)));
    if (finding) throw new Error(`OCI layer contains forbidden runtime path /${finding}.`);
}
console.log(`OCI policy passed for ${metadata.image}@${metadata.digest}.`);

async function selectPlatformManifest(value, platform) {
    if (!Array.isArray(value.manifests)) return value;
    const [os, architecture] = platform.split("/");
    const descriptor = value.manifests.find((item) => item.platform?.os === os && item.platform?.architecture === architecture);
    if (!descriptor) throw new Error(`OCI index has no manifest for ${platform}.`);
    return JSON.parse((await registry.getManifest(image, descriptor.digest)).body.toString("utf8"));
}

async function readBlob(client, reference, digest) {
    const response = await client.getBlob(reference, digest);
    if (!response.ok) throw new Error(`Could not read OCI blob ${digest} (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
}

function tarEntries(buffer) {
    let tar;
    try { tar = gunzipSync(buffer); } catch { try { tar = inflateSync(buffer); } catch { tar = buffer; } }
    const entries = [];
    for (let offset = 0; offset + 512 <= tar.length;) {
        const name = tar.subarray(offset, offset + 100).toString("utf8").replace(/\0.*$/, "");
        if (!name) break;
        entries.push(name.replace(/^\.\//, ""));
        const sizeText = tar.subarray(offset + 124, offset + 136).toString("ascii").replace(/\0.*$/, "").trim();
        offset += 512 + Math.ceil(Number.parseInt(sizeText || "0", 8) / 512) * 512;
    }
    return entries;
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required for OCI policy verification.`);
    return value;
}
