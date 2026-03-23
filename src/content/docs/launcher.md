---
title: Dev launcher
description: Automatically rebuild and restart your agent on git push.
---

The **launcher** is a dev tool that monitors your capsule's git repo, rebuilds the Docker image on new commits, and restarts the container automatically. It runs alongside your capsule — not inside it.

## Quick start

From your capsule directory:

```bash
cd my-agent
nix run github:reflection-network/launcher
```

The launcher:

1. Builds the Docker image from the current working copy and starts the container
2. Polls `git fetch` every 30 seconds for new commits
3. On a new commit: builds in a temporary git worktree — if the build succeeds, restarts the container; if it fails, the old container keeps running

## Configuration

All configuration is via environment variables. All are optional.

| Variable | Default | Description |
|----------|---------|-------------|
| `REPO_DIR` | current directory | Path to agent repo |
| `CONTAINER_NAME` | repo directory name | Docker container name |
| `ENV_FILE` | `$REPO_DIR/.env` | Path to env file with secrets |
| `CREDENTIALS_FILE` | `$REPO_DIR/.credentials.json` | Claude credentials file to mount into the container |
| `CONTAINER_MEMORY` | `4g` | Container memory limit (Docker `--memory` flag) |
| `POLL_INTERVAL` | `30` | Seconds between git fetch checks |

The poll interval can also be set via `--poll-interval`:

```bash
nix run github:reflection-network/launcher -- --poll-interval 60
```

## Example

Create a `.env` file in your capsule with the bot token, and place your Claude credentials alongside:

```
my-agent/
├── flake.nix
├── .env                 # TELEGRAM_BOT_TOKEN=<your-token>
└── .credentials.json    # Claude OAuth credentials
```

Then run the launcher:

```bash
cd my-agent
nix run github:reflection-network/launcher
```

The launcher builds the image, starts the container, and begins polling. Push a config change to your capsule repo — the launcher detects it, rebuilds, and restarts the bot with the new config.

## Safe deploys

The launcher uses [git worktree](https://git-scm.com/docs/git-worktree) to build new commits in isolation. This prevents a broken commit from taking down a running agent.

When a new commit is detected:

1. `git fetch` downloads the new commit (no checkout)
2. A temporary worktree checks out the new commit at `.worktree-build`
3. `nix build` runs in the worktree
4. If the build **fails** — the worktree is removed, the old container keeps running, and the working copy is unchanged
5. If the build **succeeds** — the image is loaded, the worktree is removed, the working copy is fast-forwarded, and the container is restarted

The key invariant: **the working copy always contains the last successfully built code.** This means a launcher restart always recovers cleanly — the initial build from the working copy succeeds because it built before.

| Scenario | Container | Working copy |
|----------|-----------|-------------|
| New commit builds OK | Updated | Updated |
| New commit breaks build | Old version keeps running | Unchanged |
| Launcher restart | Rebuilt from working copy | Unchanged |
| Fix commit after broken ones | Fixed version | Updated |

## Persistent home

The launcher mounts a named Docker volume at `/home/agent` so the agent's home directory survives container restarts and redeploys. Session files, conversation history, and any files the agent creates are preserved.

The volume name is `${CONTAINER_NAME}-home` — for a container named `ada`, the volume is `ada-home`. You can inspect it with:

```bash
docker volume ls | grep home
docker volume inspect ada-home
```

On the first run, Docker copies the image's `/home/agent` contents (including `.claude/`) into the volume. On subsequent runs, the volume retains its data. The credentials file is bind-mounted on top, so it always reflects the host's current credentials.

When the launcher is stopped (Ctrl+C or `SIGTERM`), it automatically stops and removes the container. The volume is preserved — the next launch picks up where it left off.

To reset an agent's state completely, remove the volume:

```bash
docker volume rm ada-home
```

## Limitations

- **No health checks.** If the container crashes between polls, it stays down until the next commit triggers a redeploy.
- **Requires Docker.** The user running the launcher must have access to the Docker daemon.
- **Dev tool only.** The launcher is designed for local development. For production, use CI/CD or a container orchestrator.
