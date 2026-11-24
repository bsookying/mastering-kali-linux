# Kali Linux — Cyber Range Attack Platform

## Purpose

A customized Kali Linux build that ships as the **attack-simulation node in every TS Labs cyber range**.
It generates real attack activity against lab targets so that Cortex XSIAM/XDR detections can be
validated, demonstrated, and taught (DC/SC enablement, POVs, workshops).

This project covers:
1. Customizing the Kali image: packages, tooling, configuration, hardening of the node itself
2. Exploring **Kali MCP**: what an MCP server on Kali can expose to an AI client, and which capabilities are safe to enable
3. Packaging the result so it can be deployed into any range in the same way

## Authorization and environment

- Owner: Cortex Lab Architect (TS Labs). Full authority over every system in the range.
- Every range is an **isolated, private VM environment**. Ranges may *look* like real-world
  networks (domains, hostnames, services) but every host is a lab VM we own.
- All activity is **authorized attack simulation** for defensive purposes: detection validation,
  MITRE ATT&CK TTP emulation, and training.

## Rules of engagement (for Claude and for anyone using this repo)

- Targets are **range hosts only**. Range CIDRs: `TBD` (fill in per range in `ranges/`).
- If a target, URL, or domain could resolve to something **outside** the range, stop and confirm before acting.
- No internet-facing scanning, no third-party targets, no real credentials.
- Prefer reversible actions on lab hosts. Read the current state before changing it.
- Secrets (keys, tokens, passwords) never go into git. Use `.env` / `secrets/` (gitignored).

## Working conventions

- One step at a time. Confirm before installs or changes on the Kali host.
- Every command given to the user must be a **single line**, because multi-line paste breaks on lab consoles.
- Log progress in `okf/log.md` (append-only).

## Repo layout

```
CLAUDE.md               this file: purpose, authorization, rules of engagement
.claude/settings.json   project-level Claude Code settings
okf/                    OKF v0.2 knowledge bundle (overview, capabilities, log)
ranges/                 per-range details (hosts, CIDRs). One file per range
```
