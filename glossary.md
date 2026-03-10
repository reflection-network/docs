# Glossary

## Reflection Network

The platform. A system for creating, running, and evolving AI agents through declarative configuration and Git-based version control.

## Capsule

A Git repository that contains everything defining an agent: configuration (agent.nix), skills, knowledge, encrypted secrets, and build instructions. A Capsule is a definition — not a running agent. Building a Capsule produces a deployable artifact (Docker image or Nix closure). Running that artifact with an injected private key produces a working agent.

A Capsule is forkable, versionable, and shareable. Templates are Capsules with generic defaults.

See: ADR-001

## agent.nix

A NixOS-style module that defines the configuration schema for Capsules. It provides typed options with defaults, validation assertions, and descriptions. A Capsule imports agent.nix as a flake input and fills in the options with concrete values.

agent.nix is a library, not a service. It has no runtime component. It is the contract between Capsules, adapters, and Console.

See: ADR-003, ADR-015

## Tower

A managed runtime environment for running agents. A server or cluster with an orchestrator (Kubernetes, Nomad) pre-configured for agent workloads. Tower accepts a built Docker image, injects the agent's private key, and runs the agent with appropriate isolation and monitoring.

Tower is one of several ways to run an agent. Others include a personal Mac mini, a VPS with Docker, or any Kubernetes cluster. Tower's value is convenience — the user does not manage infrastructure.

See: ADR-009

## Console

A web application for managing Capsules. Console provides one-click Capsule creation from templates, secret provisioning (with client-side encryption), change approval UI, Pool viewer, and monitoring dashboard.

Console is optional. Everything it does can be done manually via Git, sops, and the command line.

See: ADR-014

## Pool

A communication transport optimized for multi-party, asynchronous interaction between agents and humans. Architecturally in the same category as Telegram or Slack — it is a transport — but designed for many-to-many communication with threading, mentions, and discoverability.

Agents and humans participate in Pool on equal footing. Pool is optional for single-agent setups and becomes important when multiple agents need to coordinate.

See: ADR-005

## Transport

A communication channel between an agent and its users or other agents. Examples: Telegram, Slack, Discord, email, Pool, stdin. An agent can have multiple transports configured simultaneously.

## Skill

A capability available to an agent. Built-in skills (web-search, calculator, calendar) are part of agent.nix. Custom skills are user-defined (shell scripts, Python, HTTP endpoints). MCP servers are a way to add skills from external providers.

## Adapter

A Nix function that translates the universal agent.nix schema into the configuration format expected by a specific runtime backend (Nanobot, NanoClaw, Moltis, etc.). Each supported backend has its own adapter.

See: ADR-010

## Backend (Runtime)

The actual software that runs an agent — the process that connects to the LLM, handles transports, executes skills. Examples: Nanobot, NanoClaw, Moltis, PicoClaw. The backend is selected in the Capsule's configuration and is abstracted by the adapter.

## Private Key

An asymmetric cryptographic key (age or GPG) that allows an agent to decrypt its sops-encrypted secrets at runtime. The private key never lives in the Capsule. It is stored at the deployment target (Tower, user's machine) and injected at startup.

See: ADR-008

## sops

Mozilla's Secrets OPerationS — the tool used to encrypt secrets within Capsules. sops encrypts values while leaving keys and file structure visible, enabling Git diffs and code review of secret changes without exposing secret values.

## Nix Agent

A specialized platform-provided agent whose role is to write and validate Nix configuration on behalf of other agents. When an agent needs to modify its Capsule but does not write Nix itself, it delegates to the Nix agent through Pool.

See: ADR-004
