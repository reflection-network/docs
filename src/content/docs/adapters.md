---
title: Adapters
description: Add an LLM runtime and transport to your agent.
---

The base capsule image only contains the agent's identity. To make the agent actually talk, you need an **adapter** — a Nix flake that adds an LLM runtime and transport layer.

## Available adapters

| Adapter | Backend | Transport | Status |
|---------|---------|-----------|--------|
| `adapter-claude` | Claude Code CLI | Telegram (bash long-poll) | Available |
| `adapter-zeroclaw` | ZeroClaw (Rust binary) | Telegram (native channel) | Available |

More adapters can be built by anyone — the interface is `lib.mkAgent { agent }`, same as agent-nix.

### Comparison

| | adapter-claude | adapter-zeroclaw |
|---|---|---|
| Runtime | Bash + Claude Code CLI | ZeroClaw (Rust binary, 8 MB) |
| LLM backend | Claude Code only | 15+ providers |
| Telegram | Long-poll bash loop | Native channel |
| Memory | Claude's `--resume` | Built-in SQLite |
| Tools | Claude Code's tools | 60+ built-in |
| Image size | ~120 MB | ~136 MB (with claude-code provider) |

### Schema support

Not every adapter uses every agent.nix field. Fields that an adapter doesn't support are silently ignored — they don't cause build errors.

| Field | adapter-claude | adapter-zeroclaw |
|-------|---------------|-----------------|
| `name` | Yes | Yes |
| `system-prompt` | Yes | Yes |
| `provider` | — | Yes (default: `"anthropic"`) |
| `model` | — | Yes (default: `"claude-sonnet-4-5-20250929"`) |
| `transports.telegram.enable` | — (always on) | Yes |
| `transports.telegram.allowed-users` | — | Yes |
| `transports.telegram.mention-only` | — | Yes |

---

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

The agent config stays the same — only the import changes. Optional fields like `provider` and `transports` are accepted but ignored by this adapter.

### Running

Build and load the image, then run with a Telegram bot token and Claude credentials:

```bash
nix build .#docker
docker load < result
docker run --rm \
  -e TELEGRAM_BOT_TOKEN=<your-token> \
  -v ~/.claude/.credentials.json:/home/agent/.claude/.credentials.json \
  ada:latest
```

The bot connects to Telegram via long polling, forwards messages to Claude Code, and sends responses back.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from [@BotFather](https://t.me/BotFather) |

### Volume mounts

| Mount | Required | Description |
|-------|----------|-------------|
| `~/.claude/.credentials.json:/home/agent/.claude/.credentials.json` | Yes | Claude Code OAuth credentials |

### Session persistence

Each Telegram chat gets its own Claude session, so the agent remembers the conversation history. Sessions are stored in `$HOME/sessions/` inside the container and survive across messages but not across container restarts.

Use `/new` in the chat to reset the session and start a fresh conversation. `/start` also resets the session.

---

## Using adapter-zeroclaw

adapter-zeroclaw runs agents on [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) — an open-source agent runtime written in Rust. Single binary, 60+ built-in tools, native Telegram channel, SQLite memory, session persistence.

```nix
{
  description = "My agent capsule";

  inputs = {
    adapter-zeroclaw.url = "github:reflection-network/adapter-zeroclaw";
  };

  outputs = { self, adapter-zeroclaw }:
    adapter-zeroclaw.lib.mkAgent {
      agent = {
        name = "Ada";
        system-prompt = ''
          You are Ada, a helpful assistant.
          You respond in the same language the user writes to you.
        '';
        provider = "claude-code";
        model = "claude-sonnet-4-5-20250929";
        transports.telegram.enable = true;
      };
    };
}
```

### Provider options

The `provider` field selects the LLM backend:

| Provider | Authentication | Notes |
|----------|---------------|-------|
| `"claude-code"` | Mount `~/.claude/.credentials.json` | Reuses Claude Code CLI credentials, no API key needed |
| `"anthropic"` | `-e API_KEY=sk-ant-...` | Calls Anthropic API directly |
| Other | `-e API_KEY=...` | Any ZeroClaw-supported provider (OpenAI, Groq, etc.) |

When `provider = "claude-code"`, the Claude Code CLI is bundled into the Docker image automatically.

### Running

```bash
nix build .#docker
docker load < result

# With Claude Code credentials:
docker run -d --memory 4g \
  -e TELEGRAM_BOT_TOKEN=<your-token> \
  -v ~/.claude/.credentials.json:/home/agent/.claude/.credentials.json \
  ada:latest

# With Anthropic API key:
docker run -d --memory 4g \
  -e TELEGRAM_BOT_TOKEN=<your-token> \
  -e API_KEY=sk-ant-... \
  ada:latest
```

Always use `--memory` to limit container RAM. Without it, a runaway allocation on a server without swap can make the entire machine unresponsive.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | When Telegram enabled | Bot token from [@BotFather](https://t.me/BotFather) |
| `API_KEY` | When `provider != "claude-code"` | LLM provider API key |

### Volume mounts

| Mount | Required | Description |
|-------|----------|-------------|
| `~/.claude/.credentials.json:/home/agent/.claude/.credentials.json` | When `provider = "claude-code"` | Claude Code OAuth credentials |

### Telegram pairing

On first startup, ZeroClaw requires pairing with your Telegram account:

```
🔐 Telegram pairing required. One-time bind code: 805295
   Send `/bind <code>` from your Telegram account.
```

Send `/bind <code>` to your bot on Telegram. This only happens once — the pairing is persisted in SQLite.

### Session persistence

ZeroClaw uses SQLite for session persistence. Conversations survive across messages. Memory auto-save is enabled by default.

### Config generation

The adapter generates two files from your agent config:

- **`config.toml`** — ZeroClaw's main config: provider, model, channel settings, memory backend, autonomy level. Secrets are injected at container startup.
- **`IDENTITY.md`** — Your agent's system prompt. ZeroClaw reads workspace identity files at startup and injects them into the LLM system prompt.

---

## Creating a Telegram bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token — this becomes your `TELEGRAM_BOT_TOKEN`

## The adapter pattern

Adapters are the translation layer between your agent's universal config and a specific runtime backend. The same capsule can run on different backends by switching the adapter import — the agent identity never changes.

The adapter interface is `lib.mkAgent { agent }`. Any adapter that implements this interface is a drop-in replacement. Adapters call `agent-nix.lib.mkAgent` internally for validation, then build a richer Docker image with their own runtime.

### Same agent, different adapters

A capsule targeting adapter-claude:

```nix
inputs.adapter-claude.url = "github:reflection-network/adapter-claude";
outputs = { self, adapter-claude }:
  adapter-claude.lib.mkAgent {
    agent = {
      name = "Ada";
      system-prompt = "You are Ada, a helpful assistant.";
    };
  };
```

The same agent targeting adapter-zeroclaw:

```nix
inputs.adapter-zeroclaw.url = "github:reflection-network/adapter-zeroclaw";
outputs = { self, adapter-zeroclaw }:
  adapter-zeroclaw.lib.mkAgent {
    agent = {
      name = "Ada";
      system-prompt = "You are Ada, a helpful assistant.";
      provider = "claude-code";
      transports.telegram.enable = true;
    };
  };
```

One line changes (the input URL). The extra fields (`provider`, `transports`) are optional — adapter-claude ignores them, adapter-zeroclaw uses them.
