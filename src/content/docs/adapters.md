---
title: Adapters
description: Add an LLM runtime and transport to your agent.
---

The base capsule image only contains the agent's identity. To make the agent actually talk, you need an **adapter** — a Nix flake that adds an LLM runtime and transport layer.

## Available adapters

| Adapter | Backend | Transport | Status |
|---------|---------|-----------|--------|
| `adapter-claude` | Claude Code CLI | Telegram | Available |

More adapters can be built by anyone — the interface is `lib.mkAgent { agent }`, same as agent-nix.

## Using adapter-claude

Switch your capsule to use adapter-claude by changing one import:

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

The agent config stays the same — only the import changes.

## Running the bot

Build and load the image, then run with a Telegram bot token and Claude credentials:

```bash
nix build .#packages.x86_64-linux.docker
docker load < result
docker run --rm \
  -e TELEGRAM_BOT_TOKEN=<your-token> \
  -v ~/.claude/.credentials.json:/home/agent/.claude/.credentials.json \
  ada:latest
```

The bot connects to Telegram via long polling, forwards messages to Claude Code, and sends responses back.

## Session persistence

Each Telegram chat gets its own Claude session, so the agent remembers the conversation history. Sessions are stored in `$HOME/sessions/` inside the container and survive across messages but not across container restarts.

Use `/new` in the chat to reset the session and start a fresh conversation. `/start` also resets the session.

## Creating a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token — this becomes your `TELEGRAM_BOT_TOKEN`

## The adapter pattern

Adapters are the translation layer between your agent's universal config and a specific runtime backend. The same capsule can run on different backends by switching the adapter import — the agent identity never changes.

The adapter interface is `lib.mkAgent { agent }`. Any adapter that implements this interface is a drop-in replacement. Adapters call `agent-nix.lib.mkAgent` internally for validation, then build a richer Docker image with their own runtime.
