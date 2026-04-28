# GitLab Runner Setup

This document explains how to register, configure, maintain, and troubleshoot the self-hosted GitLab Runner used by 
this project.

The goal is simple:

- CI/CD jobs must run on the local server.
- Jobs must use the Docker executor.
- Jobs must not consume GitLab-hosted runner quota.
- Runner tokens must never be printed, pasted, committed, or shared.

## Operating Model

This project uses a **project runner** with the **Docker executor**.

Required runner tags:

```text
local
docker
```

The runner must be configured to run **tagged jobs only**. Do not enable **Run untagged jobs**.

The pipeline must explicitly request the local runner:

```yaml
default:
  tags:
    - local
    - docker
```

If a job defines its own `tags`, those tags must also include both `local` and `docker`.

The runner should run in **system mode**, managed by `systemd`, with its configuration stored at:

```text
/etc/gitlab-runner/config.toml
```

Do not use `gitlab-runner run` for normal operation. That command starts a foreground runner and may use the user-level
configuration at:

```text
~/.gitlab-runner/config.toml
```

## Quota Protection

To avoid consuming GitLab-hosted runner quota:

1. Configure the local runner with the tags `local` and `docker`.
2. Leave **Run untagged jobs** unchecked.
3. Add matching tags to `.gitlab-ci.yml`.
4. Disable GitLab-hosted, shared, or instance runners for the project unless there is an intentional fallback policy.

With this setup, if the local runner is offline or misconfigured, jobs should remain pending instead of falling back to
GitLab-hosted runners.

## Prerequisites

On the server that hosts the runner:

- GitLab Runner is installed.

  ```bash
  gitlab-runner --version
  ```

- Docker is installed and the daemon is running.

  ```bash
  docker info
  ```

- The `gitlab-runner` OS user can access the Docker socket.

  ```bash
  sudo -u gitlab-runner docker info
  ```

- The server can reach GitLab over HTTPS.

  ```bash
  curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help
  ```

  Use a public endpoint for connectivity checks. Unauthenticated calls to `https://gitlab.com/api/v4/version` may 
  return `401` and create a false network failure signal.

- You have permission to create project runners in GitLab.

## Creating the Project Runner

In GitLab:

1. Go to **Settings → CI/CD → Runners**.
2. Select **Create project runner**.
3. Configure the runner:

   ```text
   Tags: local,docker
   Run untagged jobs: unchecked
   Runner description: dibs-local-docker-runner
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

Run registration on the server in **system mode**:

```bash
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "<glrt-token-from-gitlab>" \
  --executor "docker" \
  --docker-image "node:20-alpine" \
  --description "dibs-local-docker-runner"
```

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
/etc/gitlab-runner/config.toml
```

It does not remove old runner entries. If invalid runners already exist, remove
them before relying on the service.

## Starting and Verifying the Service

Enable and restart the system service:

```bash
sudo systemctl enable --now gitlab-runner.service
sudo systemctl restart gitlab-runner.service
```

Check the service:

```bash
sudo systemctl status gitlab-runner.service --no-pager
```

Verify the registered runners:

```bash
sudo gitlab-runner verify
sudo gitlab-runner list
```

Expected verification output should include:

```text
Verifying runner... is alive
```

`gitlab-runner verify` confirms that the registered runner can connect to GitLab. It does not, by itself, prove that 
the running system service is using the expected configuration file. Always check the service logs too:

```bash
sudo journalctl -u gitlab-runner.service -n 100 --no-pager
```

## Expected `config.toml`

A healthy configuration should contain one runner entry for this project.

Example with the token redacted:

```toml
concurrent = 1
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "dibs-local-docker-runner"
  url = "https://gitlab.com/"
  id = 12345678
  token = "<redacted>"
  executor = "docker"

  [runners.docker]
    image = "node:20-alpine"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
```

If there are multiple stale or invalid `[[runners]]` blocks, clean them up. Multiple invalid entries can cause repeated 
`403 Forbidden` polling errors and make troubleshooting harder.

## Docker Socket Permissions

The `gitlab-runner` user must be able to access Docker:

```bash
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner.service
sudo -u gitlab-runner docker info
```

If `docker info` fails as `gitlab-runner`, check the socket:

```bash
ls -la /var/run/docker.sock
```

Expected shape:

```text
srw-rw---- root docker /var/run/docker.sock
```

The `gitlab-runner` user must be in the `docker` group:

```bash
id gitlab-runner
```

Security note: access to the Docker socket is powerful. Only grant it on a
trusted runner host.

## CI Configuration

The pipeline must request the local runner explicitly:

```yaml
default:
  tags:
    - local
    - docker
```

If a job has its own tags, include the same runner tags there too:

```yaml
deps:
  stage: prepare
  tags:
    - local
    - docker
  script:
    - pnpm fetch --frozen-lockfile
    - pnpm install --offline --frozen-lockfile
```

A job without matching tags can remain stuck even when the runner appears online.

## CI Variable: Cloudflare API Token

The deploy job calls `wrangler deploy`, which requires a Cloudflare API token.

Add the variable in GitLab:

1. Go to **Settings → CI/CD → Variables**.
2. Select **Add variable**.
3. Use:

   ```text
   Key: CLOUDFLARE_API_TOKEN
   Value: <cloudflare-token>
   Mask variable: enabled
   Protect variable: enabled, if deploy only runs on protected branches/tags
   ```

Only enable **Protect variable** if the deploy job runs on protected refs, such
as `main` or release tags. Protected variables are not available to unprotected
branches.

## Routine Maintenance

### Check Runner Health

```bash
sudo gitlab-runner verify
sudo systemctl status gitlab-runner.service --no-pager
sudo journalctl -u gitlab-runner.service -n 80 --no-pager
```

### Check Docker Access

```bash
sudo -u gitlab-runner docker info
```

### Check Network Access

```bash
curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help
```

### Restart the Runner

```bash
sudo systemctl restart gitlab-runner.service
```

### Back Up the Configuration

```bash
sudo cp /etc/gitlab-runner/config.toml /etc/gitlab-runner/config.toml.backup
```

Back up before editing or deleting runner entries.

## Removing Invalid or Deleted Runners

If a runner was deleted in GitLab but still exists in `config.toml`, the local
service may keep polling GitLab with an invalid token.

First back up the config:

```bash
sudo cp /etc/gitlab-runner/config.toml /etc/gitlab-runner/config.toml.backup
```

Then try automatic cleanup:

```bash
sudo gitlab-runner verify --delete
```

Alternatively, unregister by name:

```bash
sudo gitlab-runner unregister --name "dibs-local-docker-runner"
```

If unregistering does not remove the stale entry, edit the file manually:

```bash
sudo nano /etc/gitlab-runner/config.toml
```

Remove the full `[[runners]]` block for the stale runner, then restart:

```bash
sudo systemctl restart gitlab-runner.service
sudo gitlab-runner verify
```

## Troubleshooting

### Job Is Stuck: “Project does not have any runners online assigned to it”

Check:

```bash
sudo gitlab-runner verify
sudo gitlab-runner list
sudo systemctl status gitlab-runner.service --no-pager
```

Common causes:

| Symptom                                                            | Likely cause                                                                    | Fix                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Runner is offline or stale                                         | Service is stopped, network failed, or runner has not contacted GitLab recently | Restart the service and check logs                    |
| Runner is online but job is stuck                                  | Job tags do not match runner tags                                               | Add `local` and `docker` to the job or `default.tags` |
| Runner is paused                                                   | Runner was paused in GitLab UI                                                  | Resume the runner                                     |
| Runner is protected                                                | Job runs on an unprotected branch/tag                                           | Disable `Protected` or run from a protected ref       |
| GitLab-hosted runners are disabled and local runner does not match | Correct quota-protection behaviour                                              | Fix local runner tags or service state                |

### `curl ... /api/v4/version` Returns `401`

If this command fails:

```bash
curl -fsS --max-time 5 https://gitlab.com/api/v4/version
```

with:

```text
curl: (22) The requested URL returned error: 401
```

it does not necessarily mean the server cannot reach GitLab. On gitlab.com,
that endpoint can require authentication depending on policy and edge behavior.

Use a public endpoint for pure connectivity checks:

```bash
curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help
```

If you specifically need API verification, use an authenticated request:

```bash
curl -fsS --max-time 5 \
  -H "PRIVATE-TOKEN: <token>" \
  https://gitlab.com/api/v4/version
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

```bash
sudo systemctl stop gitlab-runner.service
sudo cp /etc/gitlab-runner/config.toml /etc/gitlab-runner/config.toml.backup
sudo gitlab-runner verify --delete
sudo systemctl start gitlab-runner.service
sudo gitlab-runner verify
```

If the invalid entry remains, remove the stale `[[runners]]` block manually and
register a fresh project runner.

### Runner Is Marked `stale`

A stale runner has not contacted GitLab for an extended period.

Check the local service:

```bash
sudo systemctl status gitlab-runner.service --no-pager
sudo journalctl -u gitlab-runner.service -n 100 --no-pager
```

Then check the configured runner:

```bash
sudo gitlab-runner verify
sudo gitlab-runner list
```

If verification fails, delete the stale runner in GitLab, remove its local
`[[runners]]` block, and register a new project runner.

### `Cannot connect to the Docker daemon`

Check Docker as root:

```bash
sudo docker info
```

Check Docker as `gitlab-runner`:

```bash
sudo -u gitlab-runner docker info
```

If the second command fails:

```bash
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner.service
```

Then verify again:

```bash
sudo -u gitlab-runner docker info
```

### Build Job Is Killed by OOM

The build job needs enough memory for Node and the Docker container.

Check available memory:

```bash
free -h
```

Check disk space:

```bash
df -h /
```

If memory is tight, either lower the Node memory setting in `.gitlab-ci.yml` or
add swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Service Is Down or Crashing

```bash
sudo systemctl status gitlab-runner.service --no-pager
sudo journalctl -u gitlab-runner.service -n 100 --no-pager
```

If the service repeatedly exits, check for TOML syntax errors:

```bash
sudo gitlab-runner verify
sudo sed -n '1,220p' /etc/gitlab-runner/config.toml
```

Do not share the raw output unless tokens are redacted.

### Long Polling Warning

Log pattern:

```text
CONFIGURATION: Long polling issues detected
Worker starvation bottleneck
Request bottleneck
```

If there is only one active runner and one job at a time is expected, this is
usually not urgent.

If multiple valid runners are configured, consider increasing `concurrent` in:

```text
/etc/gitlab-runner/config.toml
```

Example:

```toml
concurrent = 2
```

GitLab Runner reloads most configuration changes automatically, but a restart is
still acceptable after editing:

```bash
sudo systemctl restart gitlab-runner.service
```

## Safe Diagnostic Script

Run this from the runner server.

It redacts runner tokens before printing configuration or logs.

```bash
set -u

section() {
  printf "\n---%s---\n" "$1"
}

redact() {
  sed -E \
    -e 's/(Token=)[^[:space:]]+/\1<redacted>/g' \
    -e 's/(token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
    -e 's/(registration-token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig'
}

section "RUNNERS"
sudo gitlab-runner verify 2>&1 | redact
sudo gitlab-runner list 2>&1 | redact

section "CONFIG"
sudo sed -E \
  -e 's/(token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
  -e 's/(registration-token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
  /etc/gitlab-runner/config.toml 2>&1

section "SERVICE"
sudo systemctl status gitlab-runner.service --no-pager --full 2>&1 | sed -n '1,45p'

section "LOGS"
sudo journalctl -u gitlab-runner.service -n 80 --no-pager 2>&1 | redact

section "DOCKER_ROOT"
sudo docker info 2>&1 | sed -n '1,35p'

section "DOCKER_GITLAB_RUNNER_USER"
sudo -u gitlab-runner docker info 2>&1 | sed -n '1,35p'

section "NET"
curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help 2>&1 || true

section "RESOURCES"
free -h
df -h /
```

## Remote Diagnostic Script from PowerShell 7

Use this from your local machine when diagnosing the runner over SSH.

```powershell
$Remote = @'
set -u

section() {
  printf "\n---%s---\n" "$1"
}

redact() {
  sed -E \
    -e 's/(Token=)[^[:space:]]+/\1<redacted>/g' \
    -e 's/(token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
    -e 's/(registration-token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig'
}

sudo_() {
  sudo -n "$@"
}

section "RUNNERS"
sudo_ gitlab-runner verify 2>&1 | redact
sudo_ gitlab-runner list 2>&1 | redact

section "CONFIG"
sudo_ sed -E \
  -e 's/(token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
  -e 's/(registration-token[[:space:]]*=[[:space:]]*")[^"]+(")/\1<redacted>\2/Ig' \
  /etc/gitlab-runner/config.toml 2>&1

section "SERVICE"
sudo_ systemctl status gitlab-runner.service --no-pager --full 2>&1 | sed -n '1,45p'

section "LOGS"
sudo_ journalctl -u gitlab-runner.service -n 80 --no-pager 2>&1 | redact

section "DOCKER_ROOT"
sudo_ docker info 2>&1 | sed -n '1,35p'

section "DOCKER_GITLAB_RUNNER_USER"
sudo_ -u gitlab-runner docker info 2>&1 | sed -n '1,35p'

section "NET"
curl -fsS --max-time 5 -o /dev/null https://gitlab.com/help 2>&1 || true

section "RESOURCES"
free -h
df -h /
'@

if ([string]::IsNullOrWhiteSpace($env:PIRB)) {
    throw "Missing PIRB environment variable."
}

$Remote | ssh "raven@$env:PIRB" 'bash -s'
```

To save the output locally:

```powershell
$Remote | ssh "raven@$env:PIRB" 'bash -s' |
    Tee-Object -FilePath "gitlab-runner-diagnostics.txt"
```
