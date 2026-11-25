# OKF v0.2 — Kali Linux Attack Node: Overview

## What this is

A customized Kali Linux build that ships as the **attack-simulation node in every TS Labs cyber range**.
It generates real attack activity against lab targets so that Cortex XSIAM/XDR detections can be
validated, demonstrated, and taught (DC/SC enablement, POVs, workshops).

## Scope

- **Environment:** Isolated, private VM ranges. All hosts are lab VMs we own.
- **Authorization:** Full. Owner is the Cortex Lab Architect (TS Labs).
- **Targets:** Range hosts only. CIDRs defined per range in `ranges/`.
- **Purpose:** Authorized attack simulation for defensive use — detection validation, MITRE ATT&CK TTP emulation, training.

## Three tracks

| Track | What | Key artifact |
|---|---|---|
| 1. Image customization | Packages, tooling, config, node hardening | `okf/capabilities.md` |
| 2. Kali MCP | What an MCP server on Kali exposes to an AI client; which capabilities are safe | `okf/mcp-inventory.md` |
| 3. Range packaging | Deployable image/container for any range | `ranges/` |

## Reference docs

- General use / post-install: https://www.kali.org/docs/general-use/
- Tools reference: https://www.kali.org/docs/tools/
- Containers (Docker, LXD): https://www.kali.org/docs/containers/
- Metapackages: https://www.kali.org/docs/general-use/metapackages/

## Key decisions (to date)

| Decision | Status |
|---|---|
| Git protocol | HTTPS (via gh CLI) |
| Repo visibility | Private |
| Secrets handling | `.env` / `secrets/` — gitignored |
| Multi-line paste constraint | All commands must be single-line (lab console limitation) |
