# Getting Started

This guide walks you through creating and running your first Reflection agent. By the end, you will have an agent running locally that responds to you in Telegram.

## Prerequisites

- [Nix](https://nixos.org/download.html) with flakes enabled
- A Git repository host (GitHub, Gitea, or Forgejo)
- An LLM API key (Anthropic, OpenAI, or a local model via Ollama)
- A Telegram bot token (from [@BotFather](https://t.me/botfather))
- [age](https://github.com/FiloSottile/age) for key generation
- [sops](https://github.com/getsops/sops) for secret encryption

## Step 1: Create a Capsule from a template

Clone the personal assistant template:

```bash
git clone https://github.com/reflection/template-personal-assistant my-agent
cd my-agent
```

The template contains:

```
my-agent/
├── flake.nix           # imports agent.nix, defines the build
├── flake.lock          # pinned dependencies
├── agent.nix           # your agent's configuration
├── .sops.yaml          # sops encryption config (public key goes here)
├── secrets/            # encrypted secrets (empty on start)
├── knowledge/          # system prompt, few-shot examples
│   └── system-prompt.md
└── .github/
    └── workflows/
        └── build.yml   # CI: builds Docker image on push
```

## Step 2: Generate a keypair

Your agent needs a cryptographic identity. The public key goes in the Capsule (so others can encrypt secrets for the agent). The private key stays on your machine (or in Tower).

```bash
# Generate a key
age-keygen -o agent.key

# Extract the public key
age-keygen -y agent.key > agent.pub

# Note the public key — you'll need it for .sops.yaml
cat agent.pub
```

Store `agent.key` somewhere safe. Do not commit it to the repository.

## Step 3: Configure sops

Edit `.sops.yaml` to use your agent's public key:

```yaml
keys:
  - &agent age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # your public key

creation_rules:
  - path_regex: secrets/.*
    key_groups:
      - age:
          - *agent
```

Commit:

```bash
git add .sops.yaml agent.pub
git commit -m "Add agent public key"
```

## Step 4: Add secrets

Create encrypted secret files. sops will open your editor — enter the values and save:

```bash
# LLM API key
sops secrets/llm.yaml
```

Enter:

```yaml
api_key: sk-ant-your-key-here
```

```bash
# Telegram bot token
sops secrets/telegram.yaml
```

Enter:

```yaml
bot_token: "123456:ABC-DEF..."
```

sops encrypts the values automatically using the public key from `.sops.yaml`. Commit:

```bash
git add secrets/
git commit -m "Add encrypted secrets"
```

## Step 5: Configure the agent

Edit `agent.nix`. The template comes with sensible defaults — you mainly need to set your identity and verify the LLM and transport settings:

```nix
{ config, lib, pkgs, ... }:

{
  services.agent = {
    enable = true;

    identity = {
      name = "my-agent";
      locale = "en";
      systemPromptFile = ./knowledge/system-prompt.md;
    };

    llm = {
      provider = "anthropic";
      model = "claude-sonnet-4-20250514";
      apiKeySecret = "file:secrets/llm.yaml#api_key";
    };

    transport.channels.telegram = {
      type = "telegram";
      tokenSecret = "file:secrets/telegram.yaml#bot_token";
      allowedUsers = [ "YOUR_TELEGRAM_USER_ID" ];
    };

    skills.builtin = [ "web-search" "calculator" ];

    memory.backend = "sqlite";
  };
}
```

Replace `YOUR_TELEGRAM_USER_ID` with your Telegram numeric user ID. This restricts the bot to only respond to you.

Commit:

```bash
git commit -am "Configure agent"
```

## Step 6: Build and run

### Option A: Run locally with Nix

The simplest path — no Docker, no CI, no Tower:

```bash
# Set the private key location
export AGENT_KEY_FILE=$(pwd)/agent.key

# Build and run
nix run
```

Your agent should start, connect to Telegram, and respond to your messages.

### Option B: Build a Docker image and run it

```bash
# Build the Docker image
nix build .#docker-image

# Load it
docker load < result

# Run with the private key mounted
docker run -d \
  --name my-agent \
  -v $(pwd)/agent.key:/run/secrets/agent.key:ro \
  my-agent:latest
```

### Option C: Push to GitHub and let CI build

```bash
git remote set-url origin git@github.com:yourname/my-agent.git
git push -u origin main
```

GitHub Actions will build the Docker image and push it to GitHub Container Registry. From there, pull and run it on any machine — or deploy to Tower.

## Step 7: Verify

Open Telegram, find your bot, and send a message. The agent should respond.

Check logs:

```bash
# If running with nix run — logs go to stdout

# If running with Docker
docker logs my-agent

# If running with systemd
journalctl -u agent -f
```

## What to do next

**Customize the system prompt.** Edit `knowledge/system-prompt.md` to define your agent's personality, capabilities, and boundaries. Commit and rebuild.

**Add integrations.** Modify `agent.nix` to add Google Calendar, email, or other integrations. You will need to add the corresponding secrets via sops.

**Enable Pool.** If you plan to run multiple agents, set up a Pool instance and add it as a transport.

**Deploy to Tower.** For always-on agents without managing infrastructure, deploy the Docker image to a Reflection Tower instance.

**Let the agent evolve.** As you work with your agent, it may identify capabilities it needs. The self-modification flow (agent proposes a change → PR → approval → rebuild) is what makes Reflection different from other agent platforms.

## Troubleshooting

**Build fails with "assertion failed".** agent.nix includes safety assertions. Read the error message — it will tell you what is misconfigured (e.g., external listen address without auth, shell-exec without sandbox).

**Agent starts but doesn't respond in Telegram.** Check that `allowedUsers` contains your numeric Telegram user ID (not your username). Check that the bot token is correct.

**sops fails to encrypt.** Verify that `.sops.yaml` contains the correct public key and that the `path_regex` matches your secrets directory.

**"Permission denied" when decrypting secrets at runtime.** The private key is not mounted or not readable. Check the `AGENT_KEY_FILE` environment variable or Docker volume mount.

## Further reading

- [Glossary](glossary.md) — what all the terms mean
- [Architecture Overview](architecture-overview.md) — how the components fit together
- [Security Model](security-model.md) — how secrets and sandboxing work (coming soon)
- [Self-Modification Guide](self-modification.md) — how agents evolve their own Capsules (coming soon)
