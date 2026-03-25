---
title: Building containers
description: Turn your capsule into a Docker image with nix build.
---

Every capsule can be built into a Docker image with a single command.

## Build and run

```bash
nix build .#packages.x86_64-linux.docker
docker load < result
docker run --rm ada:latest
```

The image name is derived from the agent name (lowercased, spaces replaced with hyphens). `"Ada"` becomes `ada:latest`, `"My Agent"` becomes `my-agent:latest`.

## What's in the image

The base image (built by agent-nix directly) contains only the agent's identity:

- `bash`, `coreutils` — minimal shell environment
- `agent-info` — script that prints the agent's name and system prompt
- `/etc/passwd`, `/etc/group` — proper user entries

The default entrypoint is `agent-info` — the agent identifies itself. [Adapters](/adapters) override this with their own runtime, adding components like:

| Adapter | Added components | Approx. image size |
|---------|------------------|--------------------|
| adapter-claude | Claude Code CLI, curl, jq, cacert, telegram-transport.sh | ~120 MB |
| adapter-zeroclaw | ZeroClaw binary, cacert, config.toml, IDENTITY.md (+ Claude Code CLI when `provider = "claude-code"`) | ~136 MB |

## Container security

- Runs as non-root `agent` user (uid 1000)
- Writable home directory at `/home/agent`
- `/tmp` with sticky bit (1777)
- Built with `dockerTools.buildLayeredImage` for efficient layer caching

## Memory limits

Always run adapter containers with `--memory` to limit RAM:

```bash
docker run -d --memory 4g ...
```

On servers without swap, a runaway allocation from any process can make the entire machine unresponsive before the OOM killer acts. The `--memory` flag ensures Docker's cgroup limit triggers the OOM killer inside the container instead.
