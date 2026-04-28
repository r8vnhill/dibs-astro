# GitLab Runner Setup on Windows with Docker Desktop WSL2

This document explains how to register, configure, maintain, and troubleshoot the self-hosted GitLab Runner used by
this project when:

- GitLab Runner is installed on Windows.
- Setup and maintenance commands are run from PowerShell.
- CI jobs use the GitLab Runner `docker` executor.
- Docker runs Linux containers through Docker Desktop with the WSL2 backend.
- Jobs must not consume GitLab-hosted runner quota.
- Runner tokens must never be printed, pasted, committed, or shared.

The important distinction is:

```text
PowerShell configures and manages the Windows runner service.
Docker Desktop + WSL2 runs the Linux containers used by CI jobs.
```

## Operating Model

This project uses a **project runner** installed as a **Windows service** with the **Docker executor**.

Required runner tags:

```text
local
docker
```

The runner must be configured to run **tagged jobs only**. Do not enable **Run untagged jobs**.

The pipeline must explicitly request the local Docker runner:

```yaml
default:
  tags:
    - local
    - docker
```

If a job defines its own `tags`, those tags must also include both `local` and `docker`.

The runner should run as a Windows service from:

```text
C:\GitLab-Runner
```

The main configuration file is:

```text
C:\GitLab-Runner\config.toml
```

Do not use `gitlab-runner run` for normal operation. That command starts a foreground runner in the current terminal
session. Use the Windows service instead.

## Docker Model

Docker Desktop must be running in **Linux containers** mode with the **WSL2 backend**.

Verify from PowerShell:

```powershell
docker info --format '{{.OSType}}'
```

Expected output:

```text
linux
```

Also verify that Linux images can run:

```powershell
docker run --rm alpine:3.20 uname -a
```

The runner itself is a Windows process. The job containers are Linux containers managed by Docker Desktop.

Do not use the `docker-windows` executor for this setup. `docker-windows` is for Windows containers. This project uses
Linux Node images such as `node:20-alpine`, so the executor should be `docker`.

## Service Account Choice

Docker Desktop is usually tied to a Windows user session. For the most predictable setup, install the GitLab Runner
service under the same Windows user that can run Docker Desktop and `docker info`.

That user should:

- Have a real Windows password.
- Be in the local `docker-users` group.
- Be able to run `docker info` from PowerShell.
- Keep Docker Desktop running when CI jobs are expected.

Check group membership:

```powershell
net localgroup docker-users
```

Add the user if needed:

```powershell
net localgroup docker-users "$env:USERNAME" /add
```

Sign out and sign back in after changing group membership.

## Quota Protection

To avoid consuming GitLab-hosted runner quota:

1. Configure the local runner with the tags `local` and `docker`.
2. Leave **Run untagged jobs** unchecked.
3. Add matching tags to `.gitlab-ci.yml`.
4. Disable GitLab-hosted, shared, or instance runners for the project unless there is an intentional fallback policy.

With this setup, if the local runner is offline or misconfigured, jobs should remain pending instead of falling back to
GitLab-hosted runners.

## Prerequisites

On the Windows machine that hosts the runner:

- PowerShell 7 is installed.

  ```powershell
  pwsh --version
  ```

- Git is installed and available on the system `PATH`.

  ```powershell
  git --version
  ```

- Docker Desktop is installed, running, and configured to use the WSL2 backend.

  ```powershell
  docker version
  docker info
  docker info --format '{{.OSType}}'
  ```

- Docker can run Linux containers.

  ```powershell
  docker run --rm node:20-alpine node --version
  ```

- The Windows machine can reach GitLab over HTTPS.

  ```powershell
  Invoke-WebRequest -Uri "https://gitlab.com/help" -Method Head -TimeoutSec 5
  ```

- You have permission to create project runners in GitLab.

Run setup commands from an elevated PowerShell terminal: right-click PowerShell and select **Run as Administrator**.

## Installing GitLab Runner on Windows

Install GitLab Runner with Scoop:

```powershell
scoop install gitlab-runner
```

If it is already installed, update it through Scoop:

```powershell
scoop update gitlab-runner
```

Verify the installed app:

```powershell
scoop list gitlab-runner
gitlab-runner --version
```

Expected shape:

```text
Installed apps matching 'gitlab-runner':

Name          Version Source Updated             Info
----          ------- ------ -------             ----
gitlab-runner 18.11.1 main   2026-04-24 10:50:54
```

Create a stable runner configuration directory, for example:

```powershell
New-Item -ItemType Directory -Path "E:\dev\tools\gitlab-runner" -Force
```

Scoop provides the `gitlab-runner` command on `PATH`. The `C:\GitLab-Runner` directory is still useful as the service
working directory and as the location for `config.toml`.

## Creating the Project Runner

In GitLab:

1. Go to **Settings > CI/CD > Runners**.
2. Select **Create project runner**.
3. Configure the runner:

   ```text
   Tags: local,docker
   Run untagged jobs: unchecked
   Runner description: dibs-local-windows-docker-runner
   Paused: unchecked
   Protected: unchecked, unless the runner should only run protected branches/tags
   Lock to current projects: checked
   Maximum job timeout: optional
   ```

4. Create the runner.
5. Copy the runner authentication token.

The token starts with `glrt-`.

> Security note: treat the `glrt-` token as secret. If it is pasted into a chat, ticket, screenshot, commit, terminal
> recording, or log, delete the runner and create a new one.

## Registering the Runner

Run registration from an elevated PowerShell terminal on the Windows runner host:

```powershell
Set-Location "E:\dev\tools\gitlab-runner"

$Token = Read-Host -Prompt "GitLab runner token"

gitlab-runner register `
    --non-interactive `
    --url "https://gitlab.com/" `
    --token "$Token" `
    --executor "docker" `
    --docker-image "node:20-alpine" `
    --description "dibs-local-windows-docker-runner"

Remove-Variable Token
```

Do not print or save `$Token`. If the token appears in terminal history, logs, screenshots, or chat, delete the runner
in GitLab and create a new one.

Do not pass these options when using a `glrt-` runner authentication token:

```text
--tag-list
--run-untagged
--locked
--access-level
--maximum-timeout
--paused
--maintenance-note
```

Configure those options in the GitLab UI when creating or editing the runner.

Registration adds a new `[[runners]]` block to:

```text
C:\GitLab-Runner\config.toml
```

It does not remove old runner entries. If invalid runners already exist, remove them before relying on the service.

## Expected `config.toml`

A healthy configuration should contain one runner entry for this project.

Example with the token redacted:

```toml
concurrent = 1
check_interval = 0

[[runners]]
  name = "dibs-local-windows-docker-runner"
  url = "https://gitlab.com/"
  id = 12345678
  token = "<redacted>"
  executor = "docker"

  [runners.docker]
    host = "npipe:////./pipe/docker_engine"
    image = "node:20-alpine"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
```

The `host` value points the runner at Docker Desktop's Windows named pipe. If Docker Desktop is installed normally, this
is the expected Docker endpoint.

If there are multiple stale or invalid `[[runners]]` blocks, clean them up. Multiple invalid entries can cause repeated
`403 Forbidden` polling errors and make troubleshooting harder.

## Installing and Starting the Windows Service

Install the runner as a Windows service under the Docker-capable Windows user.

First check whether the service already exists:

```powershell
Get-Service gitlab-runner -ErrorAction SilentlyContinue
Get-CimInstance Win32_Service -Filter "Name='gitlab-runner'" |
    Select-Object Name, StartName, State, PathName
```

If the service already exists and already points at the expected config path, do not run `gitlab-runner install` again.
Restart it instead:

```powershell
gitlab-runner restart
```

If the service already exists but uses the wrong account, working directory, or config path, stop and uninstall the
service before installing it again:

```powershell
gitlab-runner stop
gitlab-runner uninstall
```

From an elevated PowerShell terminal:

```powershell
Set-Location "E:\dev\tools\gitlab-runner"

gitlab-runner install `
    --working-directory "E:\dev\tools\gitlab-runner" `
    --config "E:\dev\tools\gitlab-runner\config.toml"

gitlab-runner start
```

Check the service:

```powershell
Get-Service gitlab-runner
```

Verify the registered runners:

```powershell
gitlab-runner verify
gitlab-runner list
```

Expected verification output should include:

```text
Verifying runner... is valid
```

Older GitLab Runner versions may print `is alive` instead. Either `is valid` or `is alive` means the runner token can
authenticate with GitLab.

`gitlab-runner list` can print the raw runner token. Do not paste its unredacted output into chats, tickets, commits,
screenshots, or logs.

Check the service logs from PowerShell:

```powershell
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 80 |
    Select-Object TimeCreated, LevelDisplayName, Message
```

Focus on the newest entries first. Older errors can remain in the Windows event log after the service has been fixed.
A healthy recent startup should include the configured path:

```text
Starting multi-runner from E:\dev\tools\gitlab-runner\config.toml
Configuration loaded
Initializing executor providers
```

If older entries mention another path, treat them as historical unless they continue to appear after the latest service
restart.

## CI Configuration

The pipeline must request the local Docker runner explicitly:

```yaml
default:
  tags:
    - local
    - docker
```

Jobs can use Linux Docker images:

```yaml
.node-job:
  image: node:${NODE_VERSION}-alpine
  before_script:
    - npm config set fetch-retries 5
    - npm config set fetch-retry-mintimeout 20000
    - npm config set fetch-retry-maxtimeout 120000
    - corepack enable
    - corepack prepare pnpm@${PNPM_VERSION} --activate || npm install --global pnpm@${PNPM_VERSION}
    - pnpm config set store-dir ${PNPM_STORE_DIR}
    - pnpm install --frozen-lockfile
```

Linux container commands are valid in job scripts because they run inside the container, not in Windows PowerShell.

Pin `PNPM_VERSION` to an exact version such as `9.15.9`, not a floating major such as `9`. Floating versions force
Corepack to query npm package metadata before it can activate pnpm, which can fail before the project install starts.
The fallback `npm install --global pnpm@${PNPM_VERSION}` keeps setup resilient when Corepack activation fails.

Do not pass `node_modules/` between jobs as an artifact. Packages such as Rollup use platform-specific optional native
dependencies, and carrying `node_modules` between jobs can leave the next container without the required native package,
such as `@rollup/rollup-linux-x64-musl`. Run `pnpm install --frozen-lockfile` inside each job container instead.

Avoid caching `.pnpm-store/` unless the cache is proven to be faster on this runner. The store can contain tens of
thousands of files, and GitLab may spend more time archiving and uploading the cache than the install would have taken.
If a job appears stuck after successful output such as `Result (401 files): 0 errors`, check whether it is actually
saving cache.

Do not use `pnpm store status` as a normal CI gate when the pnpm store is restored from GitLab cache. It can fail with
`ERR_PNPM_MODIFIED_DEPENDENCY` for cached package contents even after a successful install. Use it only as a local or
temporary diagnostic command.

For example:

```yaml
build:
  stage: build
  image: node:20-alpine
  script:
    - apk add --no-cache git
    - pnpm build
```

A job without matching tags can remain stuck even when the runner appears online.

## CI Variable: Cloudflare API Token

The deploy job calls `wrangler deploy`, which requires a Cloudflare API token.

Add the variable in GitLab:

1. Go to **Settings > CI/CD > Variables**.
2. Select **Add variable**.
3. Use:

   ```text
   Key: CLOUDFLARE_API_TOKEN
   Value: <cloudflare-token>
   Mask variable: enabled
   Protect variable: enabled, if deploy only runs on protected branches/tags
   ```

Only enable **Protect variable** if the deploy job runs on protected refs, such as `main` or release tags. Protected
variables are not available to unprotected branches.

Do not echo secret variables in job logs.

## Routine Maintenance

Run these commands from an elevated PowerShell terminal in `C:\GitLab-Runner`.

### Check Runner Health

```powershell
gitlab-runner verify
gitlab-runner list
Get-Service gitlab-runner
```

### Check Docker Access

```powershell
docker version
docker info --format '{{.OSType}}'
docker run --rm node:20-alpine node --version
```

Expected Docker OS type:

```text
linux
```

### Check Runner Logs

```powershell
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 80 |
    Select-Object TimeCreated, LevelDisplayName, Message
```

### Check Network Access

```powershell
Invoke-WebRequest -Uri "https://gitlab.com/help" -Method Head -TimeoutSec 5
```

### Restart the Runner

```powershell
gitlab-runner restart
```

If that fails, use the Windows service cmdlets:

```powershell
Restart-Service gitlab-runner
```

### Back Up the Configuration

```powershell
Copy-Item `
    -Path "E:\dev\tools\gitlab-runner\config.toml" `
    -Destination "E:\dev\tools\gitlab-runner\config.toml.backup" `
    -Force
```

Back up before editing or deleting runner entries.

## Removing Invalid or Deleted Runners

If a runner was deleted in GitLab but still exists in `config.toml`, the local service may keep polling GitLab with an
invalid token.

First back up the config:

```powershell
Copy-Item `
    -Path "E:\dev\tools\gitlab-runner\config.toml" `
    -Destination "E:\dev\tools\gitlab-runner\config.toml.backup" `
    -Force
```

Then try automatic cleanup:

```powershell
gitlab-runner verify --delete
```

Alternatively, unregister by name:

```powershell
gitlab-runner unregister --name "dibs-local-windows-docker-runner"
```

If unregistering does not remove the stale entry, edit the file manually:

```powershell
notepad "E:\dev\tools\gitlab-runner\config.toml"
```

Remove the full `[[runners]]` block for the stale runner, then restart:

```powershell
gitlab-runner restart
gitlab-runner verify
```

## Troubleshooting

### Job Is Stuck: "Project does not have any runners online assigned to it"

Check:

```powershell
gitlab-runner verify
gitlab-runner list
Get-Service gitlab-runner
```

Common causes:

| Symptom                                                            | Likely cause                                                                    | Fix                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Runner is offline or stale                                         | Service is stopped, network failed, or runner has not contacted GitLab recently | Restart the service and check logs                    |
| Runner is online but job is stuck                                  | Job tags do not match runner tags                                               | Add `local` and `docker` to the job or `default.tags` |
| Runner is paused                                                   | Runner was paused in GitLab UI                                                  | Resume the runner                                     |
| Runner is protected                                                | Job runs on an unprotected branch/tag                                           | Disable `Protected` or run from a protected ref       |
| GitLab-hosted runners are disabled and local runner does not match | Correct quota-protection behaviour                                              | Fix local runner tags or service state                |

### Docker Is Not Reachable from the Runner

Check Docker from the same Windows account used by the service:

```powershell
docker info
docker run --rm alpine:3.20 echo ok
```

Then check the service logs:

```powershell
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 80 |
    Select-Object TimeCreated, LevelDisplayName, Message
```

Common fixes:

- Start Docker Desktop.
- Switch Docker Desktop to Linux containers.
- Enable the Docker Desktop WSL2 backend.
- Add the service user to the `docker-users` group.
- Restart Docker Desktop and the GitLab Runner service.

### Docker Reports `OSType` as `windows`

This runner is expected to run Linux images such as `node:20-alpine`.

If this command returns `windows`:

```powershell
docker info --format '{{.OSType}}'
```

switch Docker Desktop back to Linux containers, then verify:

```powershell
docker run --rm node:20-alpine node --version
```

### Job Fails Pulling or Starting `node:20-alpine`

Check whether Docker can run the image outside GitLab Runner:

```powershell
docker pull node:20-alpine
docker run --rm node:20-alpine node --version
```

If that fails, fix Docker Desktop or WSL2 before troubleshooting GitLab Runner.

### `curl ... /api/v4/version` or `Invoke-WebRequest ... /api/v4/version` Returns `401`

It does not necessarily mean the runner cannot reach GitLab. On gitlab.com, that endpoint can require authentication
depending on policy and edge behavior.

Use a public endpoint for pure connectivity checks:

```powershell
Invoke-WebRequest -Uri "https://gitlab.com/help" -Method Head -TimeoutSec 5
```

Inside a Linux job container, use:

```bash
curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help
```

### `403 Forbidden` on Every Job Poll

Log pattern:

```text
ERROR: Checking for jobs... forbidden
runner=<short-id> status=POST https://gitlab.com/api/v4/jobs/request: 403 Forbidden
ERROR: Runner "https://gitlab.com/<short-id>" is unhealthy and will be disabled for 1h0m0s
```

Likely cause: the runner authentication token in `config.toml` is invalid.

This can happen when:

- The runner was deleted in GitLab but the local config still contains it.
- The token was exposed and the runner was recreated.
- The token was rotated without updating the local runner.
- The local config points to a runner from another project or GitLab instance.

Fix:

```powershell
gitlab-runner stop
Copy-Item `
    -Path "E:\dev\tools\gitlab-runner\config.toml" `
    -Destination "E:\dev\tools\gitlab-runner\config.toml.backup" `
    -Force
gitlab-runner verify --delete
gitlab-runner start
gitlab-runner verify
```

If the invalid entry remains, remove the stale `[[runners]]` block manually and register a fresh project runner.

### Runner Is Marked `stale`

A stale runner has not contacted GitLab for an extended period.

Check the local service:

```powershell
Get-Service gitlab-runner
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 80 |
    Select-Object TimeCreated, LevelDisplayName, Message
```

Then check the configured runner:

```powershell
gitlab-runner verify
gitlab-runner list
```

If verification fails, delete the stale runner in GitLab, remove its local `[[runners]]` block, and register a new
project runner.

### Long Polling Warning

Log pattern:

```text
WARNING: CONFIGURATION: Long polling issues detected.
```

If there is only one active runner and one job at a time is expected, this is usually not urgent. Confirm that the runner
is otherwise healthy:

```powershell
gitlab-runner verify
Get-Service gitlab-runner
```

If jobs are delayed or multiple runners are configured, inspect `concurrent` in:

```text
E:\dev\tools\gitlab-runner\config.toml
```

For a single local runner, this is acceptable:

```toml
concurrent = 1
```

### Build Job Is Killed by OOM

The build job needs enough memory for Node and the Docker container. Because Docker Desktop runs through WSL2, memory
limits may come from Docker Desktop settings or WSL configuration.

Check Docker's available resources:

```powershell
docker info
```

Inside a Linux container, check memory:

```powershell
docker run --rm node:20-alpine sh -lc "free -h && df -h /"
```

If memory is tight, either lower the Node memory setting in `.gitlab-ci.yml` or increase Docker Desktop / WSL2 memory.

### Service Is Down or Crashing

```powershell
Get-Service gitlab-runner
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 100 |
    Select-Object TimeCreated, LevelDisplayName, Message
```

If the service repeatedly exits, check for TOML syntax errors:

```powershell
gitlab-runner verify
Get-Content "E:\dev\tools\gitlab-runner\config.toml"
```

Do not share the raw output unless tokens are redacted.

### The Service Account Cannot Access Docker Desktop

If Docker works in your interactive PowerShell session but not from CI, the GitLab Runner service may be running as a
different Windows account.

Check the service account:

```powershell
Get-CimInstance Win32_Service -Filter "Name='gitlab-runner'" |
    Select-Object Name, StartName, State
```

Use one of these fixes:

- Install the service under the same Windows user that runs Docker Desktop.
- Add the service account to the `docker-users` group.
- Restart the Windows session, Docker Desktop, and GitLab Runner service.

## Safe Diagnostic Script

Run this from an elevated PowerShell terminal on the Windows runner host.

It redacts runner tokens before printing configuration or logs.

```powershell
Set-Location "E:\dev\tools\gitlab-runner"

function Section {
    param([string] $Name)
    "`n---$Name---"
}

function Redact {
    process {
        $_ `
            -replace '(?i)(token\s*=\s*")[^"]+(")', '$1<redacted>$2' `
            -replace '(?i)(registration-token\s*=\s*")[^"]+(")', '$1<redacted>$2' `
            -replace '(?i)(Token=)[^\s]+', '$1<redacted>'
    }
}

Section "RUNNERS"
gitlab-runner verify 2>&1 | Out-String | Redact
gitlab-runner list 2>&1 | Out-String | Redact

Section "CONFIG"
Get-Content "E:\dev\tools\gitlab-runner\config.toml" | Redact

Section "SERVICE"
Get-Service gitlab-runner
Get-CimInstance Win32_Service -Filter "Name='gitlab-runner'" |
    Select-Object Name, StartName, State

Section "LOGS"
Get-WinEvent -ProviderName gitlab-runner -MaxEvents 80 |
    Select-Object TimeCreated, LevelDisplayName, Message |
    Out-String |
    Redact

Section "DOCKER"
docker version
docker info --format 'OSType={{.OSType}} ServerVersion={{.ServerVersion}}'
docker run --rm node:20-alpine node --version

Section "NET"
Invoke-WebRequest -Uri "https://gitlab.com/help" -Method Head -TimeoutSec 5

Section "DISK"
Get-PSDrive -PSProvider FileSystem
```

To save the output locally:

```powershell
.\diagnose-gitlab-runner.ps1 | Tee-Object -FilePath "gitlab-runner-diagnostics.txt"
```
