import { readFile } from "node:fs/promises";
import { gunzipSync, inflateSync } from "node:zlib";

const metadata = JSON.parse(await readFile(process.argv[2] ?? "tmp/oci-candidate.json", "utf8"));
const username = process.env.CI_REGISTRY_USER;
const password = process.env.CI_REGISTRY_PASSWORD;
if (!username || !password) {
    throw new Error("OCI policy verification requires CI_REGISTRY_USER and CI_REGISTRY_PASSWORD.");
}

const image = parseImage(metadata.image);
const manifestResponse = await registryRequest(image, `/v2/${image.repository}/manifests/${metadata.digest}`, "GET", {
    Accept: "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json",
});
if (!manifestResponse.ok) throw new Error(`Could not read candidate manifest (${manifestResponse.status}).`);
const published = await manifestResponse.json();
const manifest = await selectPlatformManifest(published, metadata.platform);
const config = JSON.parse((await readBlob(image, manifest.config.digest)).toString("utf8"));

const user = config.config?.User;
if (!user || user === "0" || user === 0 || user === "root") throw new Error("OCI runtime is configured to run as root.");
if (!(config.config?.ExposedPorts?.["8080/tcp"] || config.config?.ExposedPorts?.["8080"])) {
    throw new Error("OCI runtime does not expose the expected HTTP port.");
}

const forbidden = ["/app/src", "/app/node_modules", "/root/.npmrc", "/usr/local/bin/node", "/usr/local/bin/pnpm", "/app/.git"];
const layerNames = manifest.layers.map((layer) => layer.digest);
for (const digest of layerNames) {
    const layer = await readBlob(image, digest);
    const entries = tarEntries(layer);
    const finding = entries.find((entry) => forbidden.some((item) => entry === item.slice(1) || entry.startsWith(`${item.slice(1)}/`)));
    if (finding) {
        throw new Error(`OCI layer contains forbidden runtime path /${finding}.`);
    }
}

console.log(`OCI policy passed for ${metadata.image}@${metadata.digest}.`);

async function selectPlatformManifest(value, platform) {
    if (!Array.isArray(value.manifests)) return value;
    const [os, architecture] = platform.split("/");
    const descriptor = value.manifests.find(
        (item) => item.platform?.os === os && item.platform?.architecture === architecture,
    );
    if (!descriptor) throw new Error(`OCI index has no manifest for ${platform}.`);
    return fetchManifest(image, descriptor.digest);
}

async function fetchManifest(image, digest) {
    const response = await registryRequest(image, `/v2/${image.repository}/manifests/${digest}`, "GET", {
        Accept: "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json",
    });
    if (!response.ok) throw new Error(`Could not read platform manifest (${response.status}).`);
    return response.json();
}

async function readBlob(image, digest) {
    const response = await registryRequest(image, `/v2/${image.repository}/blobs/${digest}`, "GET");
    if (!response.ok) throw new Error(`Could not read OCI blob ${digest} (${response.status}).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
}

function tarEntries(buffer) {
    let tar;
    try {
        tar = gunzipSync(buffer);
    } catch {
        try {
            tar = inflateSync(buffer);
        } catch {
            tar = buffer;
        }
    }

    const entries = [];
    for (let offset = 0; offset + 512 <= tar.length;) {
        const name = tar.subarray(offset, offset + 100).toString("utf8").replace(/\0.*$/, "");
        if (!name) break;
        entries.push(name.replace(/^\.\//, ""));
        const sizeText = tar.subarray(offset + 124, offset + 136).toString("ascii").replace(/\0.*$/, "").trim();
        const size = Number.parseInt(sizeText || "0", 8);
        offset += 512 + Math.ceil(size / 512) * 512;
    }
    return entries;
}

async function registryRequest(image, path, method, headers = {}) {
    const basic = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    const initial = await fetch(`https://${image.registry}${path}`, { method, headers: { Authorization: basic, ...headers } });
    if (initial.status !== 401) return initial;
    const challenge = initial.headers.get("www-authenticate");
    if (!challenge) return initial;
    const params = Object.fromEntries([...challenge.matchAll(/(realm|service|scope)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
    const tokenResponse = await fetch(`${params.realm}?service=${encodeURIComponent(params.service)}&scope=${encodeURIComponent(params.scope ?? `repository:${image.repository}:pull`)}`, { headers: { Authorization: basic } });
    if (!tokenResponse.ok) throw new Error(`Could not obtain registry authorization (${tokenResponse.status}).`);
    const token = (await tokenResponse.json()).token;
    return fetch(`https://${image.registry}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...headers } });
}

function parseImage(value) {
    const match = value.match(/^(?<registry>[^/]+)\/(?<repository>.+):[^:@]+$/);
    if (!match?.groups) throw new Error(`Unsupported OCI image reference: ${value}`);
    return match.groups;
}
