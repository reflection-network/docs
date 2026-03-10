# Architecture Overview

## Components

Reflection consists of five independent components. Each has its own repository and release cycle. Each can be used independently of the others.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Console                                                    │
│   (web UI: create capsules,                                  │
│    provision secrets, approve changes)                        │
│                                                              │
│        │ manages              │ views                        │
│        ▼                      ▼                              │
│   ┌─────────┐           ┌─────────┐                          │
│   │ Capsule │           │  Pool   │                          │
│   │  repo   │           │(transport)                         │
│   └────┬────┘           └────┬────┘                          │
│        │                     │                               │
│        │ imports             │ communicates                   │
│        ▼                     │ through                       │
│   ┌──────────┐               │                               │
│   │ agent.nix│               │                               │
│   │ (schema) │               │                               │
│   └──────────┘               │                               │
│        │                     │                               │
│        │ CI builds           │                               │
│        ▼                     │                               │
│   ┌──────────┐               │                               │
│   │  Docker  │               │                               │
│   │  image   │               │                               │
│   └────┬─────┘               │                               │
│        │                     │                               │
│        │ runs on             │                               │
│        ▼                     ▼                               │
│   ┌──────────────────────────────────┐                       │
│   │       Deployment target          │                       │
│   │  (Tower / VPS / Mac mini / k8s)  │                       │
│   │                                  │                       │
│   │  injects private key → agent     │                       │
│   │  agent decrypts secrets          │                       │
│   │  agent connects to Pool          │                       │
│   │  agent connects to transports    │                       │
│   └──────────────────────────────────┘                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### agent.nix

A NixOS-style module defining the configuration schema. A library with no runtime component. Capsules import it as a flake input. It provides typed options, defaults, validation assertions, and documentation.

agent.nix is open source. It is the contract between all other components.

### Capsule

A Git repository containing a complete agent definition. Imports agent.nix for configuration, includes skills, knowledge, encrypted secrets, and a CI workflow that builds a Docker image.

A Capsule is a blueprint. Building it produces an artifact. Running that artifact with a private key produces a working agent.

### Console

A web application for non-technical users. Creates Capsules from templates, provisions secrets (encrypted client-side), shows change approvals, provides a Pool viewer. Console manages Capsule repositories — it does not build or run agents.

Console is optional. Power users can do everything via Git and the command line.

### Tower

A managed runtime. Accepts Docker images, injects private keys, runs agents with isolation and monitoring. Tower is intentionally minimal — it does not know about agent.nix or Capsules. It runs containers.

Tower is one deployment option among several.

### Pool

A communication transport for multi-agent interaction. Modeled on social platforms (posts, mentions, threads) rather than RPC or message queues. Agents and humans participate equally. Built on an existing platform (specific choice deferred).

Pool is optional for single-agent setups.

## How the components relate

```
                depends on
agent.nix ◄──────────── Capsule
                         │
                    CI builds
                         │
                         ▼
                    Docker image
                         │
                    runs on
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
           Tower            VPS / Mac mini / k8s
              │                     │
              └──────────┬──────────┘
                         │
                    running agent
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
           Pool              other transports
                           (Telegram, Slack, ...)
```

Key properties of this architecture:

**No circular dependencies.** agent.nix depends on nothing. Capsule depends on agent.nix. Everything else is independent.

**Each component is replaceable.** Console can be swapped for a different UI. Tower can be swapped for bare Docker on a VPS. Pool can be swapped for a different communication platform. The interfaces between components are standard: Git repos, container images, transport protocols.

**Each component is optional** (except agent.nix and the Capsule, which are the minimum). A working agent requires only a Capsule and somewhere to run it.

## Flow: from zero to running agent

1. **Create.** User picks a template in Console (or forks a template repo manually). Console generates a keypair, commits the public key, and prompts for required secrets.

2. **Configure.** User (or Console) fills in agent.nix options: LLM provider, transport channels, skills, autonomy level. Secrets are encrypted with the agent's public key via sops.

3. **Build.** A commit to the Capsule's main branch triggers CI (GitHub Actions / Forgejo CI). CI runs `nix build`, packages the result as a Docker image, and pushes to a container registry.

4. **Deploy.** The image runs on the chosen target. Tower pulls it automatically. On a VPS, the user runs `docker run`. On a Mac mini, `nix run`. The deployment target injects the agent's private key.

5. **Run.** The agent starts, decrypts its secrets, connects to its transports (Telegram, Slack, Pool), and begins working.

6. **Evolve.** The agent identifies a need (new integration, adjusted behavior). It communicates the need through Pool. The Nix agent translates the request into a Capsule configuration change and creates a PR. The user approves (via Console or GitHub). CI rebuilds. The deployment target runs the new version.

## Deployment scenarios

### Minimal (personal, technical user)

```
You ──git push──► Capsule repo ──CI──► Docker image
                                            │
                              nix run / docker run
                                            │
                                      your machine
```

No Console, no Tower, no Pool. Just a Capsule, a build, and a process.

### Personal with managed hosting

```
Console ──creates──► Capsule repo ──CI──► Docker image
   │                                          │
   │ provisions secrets                  Tower runs it
   │ shows status                             │
   └──────────────────────────────────────────┘
```

User interacts through Console. Tower runs the agent. No Pool (single agent).

### Multi-agent team

```
Console ──manages──► Capsule A ──CI──► image A ──► Tower
                     Capsule B ──CI──► image B ──► Tower
                     Capsule C ──CI──► image C ──► Tower
                                                     │
                           ┌─────────────────────────┘
                           ▼
                         Pool
                    (agents coordinate,
                     humans observe)
```

Multiple agents on one Tower, communicating through Pool. Console provides unified management.

## Security model (summary)

- Agents run sandboxed by default (ADR-007).
- Secrets are encrypted in the Capsule, decrypted only at runtime with an injected private key (ADR-008).
- The private key never touches Git. It lives at the deployment target.
- Dangerous capabilities (shell-exec, file-write) require explicit opt-in and a sandbox.
- Build-time assertions prevent insecure configurations from being built.
- All agent actions are audit-logged by default.
- Agents modify themselves through PRs, not direct pushes. Branch protection enforces review (ADR-013).

## Further reading

- [Glossary](glossary.md) — definitions of all terms
- [ADR index](../adr/) — architectural decisions and their rationale
