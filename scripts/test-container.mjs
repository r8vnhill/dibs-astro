import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const repositoryRoot = process.cwd();
const imageTag = `dibs-astro:test-${process.pid}`;
const containerName = `dibs-astro-test-${process.pid}`;

if (process.env.CONTAINER_BASE_URL) {
    await waitForHttp(process.env.CONTAINER_BASE_URL);
    await verifyHttpContract(process.env.CONTAINER_BASE_URL);
    console.log(`Container HTTP contract passed for ${process.env.CONTAINER_BASE_URL}.`);
    process.exit(0);
}

try {
    await runDocker([
        "build",
        "--progress=plain",
        "--build-arg",
        `SOURCE_REVISION=${process.env.GIT_COMMIT_SHA ?? "local"}`,
        "--build-arg",
        `IMAGE_VERSION=${process.env.npm_package_version ?? "local"}`,
        "--tag",
        imageTag,
        repositoryRoot,
    ]);

    await runDocker([
        "run",
        "--detach",
        "--read-only",
        "--tmpfs",
        "/tmp",
        "--name",
        containerName,
        "--publish",
        "127.0.0.1::8080",
        imageTag,
    ]);

    const port = await discoverPublishedPort();
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHttp(`${baseUrl}/`);
    await verifyHttpContract(baseUrl);
    await verifyRuntimeContract();

    console.log(`Container contract passed for ${imageTag}.`);
} finally {
    await runDocker(["rm", "--force", containerName], { allowFailure: true });
    await runDocker(["image", "rm", "--force", imageTag], { allowFailure: true });
}

async function verifyHttpContract(baseUrl) {
    const homepage = await request(baseUrl, "/");
    assertStatus(homepage, 200, "/");
    assertContentType(homepage, "text/html", "/");

    const lesson = await request(baseUrl, "/notes/software-libraries/what-is/");
    assertStatus(lesson, 200, "/notes/software-libraries/what-is/");
    assertContentType(lesson, "text/html", "/notes/software-libraries/what-is/");

    const islandPage = await request(baseUrl, "/notes/scripting/");
    assertStatus(islandPage, 200, "/notes/scripting/");
    const islandAsset = islandPage.body.match(/\/\_astro\/[^"'\s>]+/)?.[0];
    if (!islandAsset || !islandPage.body.includes("astro-island")) {
        throw new Error("The representative island page did not expose an Astro island and generated asset.");
    }

    const asset = await request(baseUrl, islandAsset);
    assertStatus(asset, 200, islandAsset);
    if (!asset.contentType || asset.contentType.startsWith("text/html")) {
        throw new Error(`Generated asset ${islandAsset} did not return a non-HTML MIME type.`);
    }

    const missing = await request(baseUrl, "/this-route-does-not-exist/");
    assertStatus(missing, 404, "/this-route-does-not-exist/");
    if (!missing.body.includes("P\u00e1gina no encontrada")) {
        throw new Error("The generated 404 page was not served for an unknown route.");
    }

    const legacy = await request(baseUrl, "/notes/software-libraries/scripting/support-scripts/", false);
    if (legacy.status < 200 || legacy.status >= 400) {
        throw new Error(`Legacy scripting route returned unexpected status ${legacy.status}.`);
    }
    const redirectTarget = legacy.headers.get("location") ?? legacy.body;
    if (!redirectTarget.includes("/notes/scripting/support-scripts/")) {
        throw new Error("Legacy scripting route did not preserve its generated redirect target.");
    }
}

async function verifyRuntimeContract() {
    const { stdout } = await runDocker([
        "inspect",
        "--format",
        "{{json .Config.User}}",
        imageTag,
    ]);
    const configuredUser = JSON.parse(stdout.trim());
    if (!configuredUser || configuredUser === "0" || configuredUser === 0) {
        throw new Error("The runtime image is configured to run as root.");
    }

    await runDocker([
        "run",
        "--rm",
        "--entrypoint",
        "/bin/sh",
        imageTag,
        "-ec",
        "test ! -e /usr/local/bin/node && test ! -e /usr/local/bin/pnpm && test ! -d /app/src && test ! -d /app/node_modules && test ! -e /root/.npmrc",
    ]);
}

async function request(baseUrl, route, followRedirects = false) {
    const response = await fetch(new URL(route, baseUrl), { redirect: followRedirects ? "follow" : "manual" });
    return {
        body: await response.text(),
        contentType: response.headers.get("content-type"),
        headers: response.headers,
        status: response.status,
    };
}

async function waitForHttp(url) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        try {
            await fetch(url);
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }
    throw new Error(`Container did not accept HTTP requests at ${url}.`);
}

async function discoverPublishedPort() {
    const { stdout } = await runDocker(["port", containerName, "8080/tcp"]);
    const match = stdout.trim().match(/:(\d+)$/m);
    if (!match) {
        throw new Error(`Could not discover the published container port from: ${stdout}`);
    }
    return match[1];
}

function assertStatus(response, expected, route) {
    if (response.status !== expected) {
        throw new Error(`${route} returned ${response.status}; expected ${expected}.`);
    }
}

function assertContentType(response, expected, route) {
    if (!response.contentType?.startsWith(expected)) {
        throw new Error(`${route} returned content type ${response.contentType}; expected ${expected}.`);
    }
}

async function runDocker(args, options = {}) {
    try {
        return await exec("docker", args, { cwd: repositoryRoot, maxBuffer: 8 * 1024 * 1024 });
    } catch (error) {
        if (options.allowFailure) {
            return { stderr: "", stdout: "" };
        }
        const detail = error.stderr || error.stdout || error.message;
        throw new Error(`docker ${args.join(" ")} failed: ${detail}`);
    }
}
