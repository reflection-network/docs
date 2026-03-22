---
title: Getting started
description: Create your first Reflection agent capsule.
---

A Reflection agent is a Git repo (called a **capsule**) with a single `flake.nix` that declares the agent's identity.

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
