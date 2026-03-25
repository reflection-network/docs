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

## Optional fields

These fields are used by adapters that support them. Adapters that don't recognize a field simply ignore it. All optional fields are validated when present — a field with a wrong type fails the build.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | LLM provider (e.g. `"anthropic"`, `"claude-code"`, `"openai"`) |
| `model` | string | Model identifier (e.g. `"claude-sonnet-4-5-20250929"`) |
| `transports.telegram.enable` | bool | Enable the Telegram channel |
| `transports.telegram.allowed-users` | list of strings | Telegram usernames allowed to interact with the bot |
| `transports.telegram.mention-only` | bool | Only respond when @mentioned in groups |

Example with all fields:

```nix
agent = {
  name = "Ada";
  system-prompt = "You are Ada, a helpful assistant.";
  provider = "claude-code";
  model = "claude-sonnet-4-5-20250929";
  transports.telegram.enable = true;
  transports.telegram.allowed-users = [ "alice" "bob" ];
  transports.telegram.mention-only = true;
};
```

A capsule with just `name` and `system-prompt` is valid. See [Adapters](/adapters) for which fields each adapter supports.

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
provider: claude-code
model: claude-sonnet-4-5-20250929

system prompt:
You are Ada, a helpful assistant.
You respond in the same language the user writes to you.
```

The `provider` and `model` lines only appear when those fields are set in the agent config.

## Next steps

- [Build a Docker container](/building-containers) from your capsule
- [Add an adapter](/adapters) to give your agent a real backend and transport
- [Set up the dev launcher](/launcher) for automatic rebuilds on git push
