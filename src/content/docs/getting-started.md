---
title: Getting started
description: Create your first Reflection Network agent capsule.
---

A Reflection Network agent is a Git repo (called a **capsule**) with a single `flake.nix` that declares the agent's identity.

## Prerequisites

- [Nix](https://nixos.org/download/) with flakes enabled

## Create a capsule

Initialize a new repo and create `flake.nix`:

```nix
{
  description = "My agent capsule";

  inputs = {
    agent-nix.url = "github:reflection-network/agent.nix";
  };

  outputs = { self, agent-nix }:
    agent-nix.lib.mkAgent {
      agent = {
        name = "Ada";
        system-prompt = ''
          You are Ada, a helpful assistant.
          You respond in the same language the user writes to you.
        '';
      };
    };
}
```

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent's display name |
| `system-prompt` | string | Instructions that define the agent's behavior |

Both fields are validated at evaluation time. Missing or empty values produce a clear error:

```
error: assertion failed: agent.name must be a non-empty string
```

## Try it

```bash
git init my-agent && cd my-agent
# create flake.nix as above
git add flake.nix
nix develop
```

The dev shell prints the agent's name on entry:

```
  reflection: Ada

```

Use `agent-info` to inspect the full config:

```
$ agent-info
name: Ada

system prompt:
You are Ada, a helpful assistant.
You respond in the same language the user writes to you.
```

## Building a container

Every capsule can be built into a Docker image:

```bash
nix build .#packages.x86_64-linux.docker
docker load < result
docker run --rm ada:latest
```

The image name is derived from the agent name (lowercased, spaces replaced with hyphens). The container runs as a non-root `agent` user (uid 1000) with a writable home directory at `/home/agent`.

The default entrypoint is `agent-info` — the agent identifies itself. Adapters override this with their own runtime.

## Adding a runtime with an adapter

The base image only contains the agent's identity. To make the agent actually talk, you need an **adapter** — a Nix flake that adds an LLM runtime and transport layer.

`adapter-claude` adds Claude Code as the backend and Telegram as the transport. Switch your capsule to use it by changing one import:

```nix
{
  description = "My agent capsule";

  inputs = {
    adapter-claude.url = "github:reflection-network/adapter-claude";
  };

  outputs = { self, adapter-claude }:
    adapter-claude.lib.mkAgent {
      agent = {
        name = "Ada";
        system-prompt = ''
          You are Ada, a helpful assistant.
          You respond in the same language the user writes to you.
        '';
      };
    };
}
```

The agent config stays the same — only the import changes. The adapter provides:

- `devShells.default` — same dev shell as before (from agent-nix)
- `packages.docker` — Docker image with Claude Code, Telegram transport, and all dependencies

### Running the bot

Build and load the image as before, then run with a Telegram bot token and Claude credentials:

```bash
nix build .#packages.x86_64-linux.docker
docker load < result
docker run --rm \
  -e TELEGRAM_BOT_TOKEN=<your-token> \
  -v ~/.claude/.credentials.json:/home/agent/.claude/.credentials.json \
  ada:latest
```

The bot connects to Telegram via long polling, forwards messages to Claude Code, and sends responses back. Each message is handled independently (no session persistence between messages).

### Creating a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token — this becomes your `TELEGRAM_BOT_TOKEN`

### The adapter pattern

Adapters are the translation layer between your agent's universal config and a specific runtime backend. The same capsule can run on different backends by switching the adapter import:

| Adapter | Backend | Status |
|---------|---------|--------|
| `adapter-claude` | Claude Code CLI + Telegram | Available |

More adapters can be built by anyone — the interface is `lib.mkAgent { agent }`, same as agent-nix.
