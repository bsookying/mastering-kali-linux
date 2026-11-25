# kali-linux — Log

## 2026-11-24: Repo created

* Scaffolded the local repo with: CLAUDE.md (purpose, authorization, RoE), `.claude/settings.json`, `.gitignore`, README, and `okf/`.
* The Kali node will be part of every cyber range. It is the attack-simulation source for Cortex detection validation.

### Next
- [x] Push to GitHub (private repo)
- [ ] Identify the Kali host(s) and range CIDRs, then add them under `ranges/`
- [ ] Inventory the Kali MCP options (e.g. `mcp-kali-server`, hexstrike-ai): capabilities, safe / use with care / exclude
- [x] Build the OKF v0.2 bundle (overview, capabilities matrix)

---

## 2026-11-24: OKF v0.2 bundle built

* Installed GitHub CLI (gh 2.105.0) and Git for Windows (2.56.1) — neither was present on the Windows Server 2022 lab machine.
* Authenticated `gh` as `bsookying` via device-flow OAuth (HTTPS protocol).
* Cloned repo to `C:\Users\lab-user\Documents\mastering-kali-linux`.
* Built OKF v0.2 bundle:
  * `okf/overview.md` — purpose, scope, three tracks, reference docs, key decisions
  * `okf/capabilities.md` — metapackage selection table (Include/Add/Exclude) and MCP safety matrix (Safe/Use-with-care/Exclude) sourced from kali.org docs
* Wireless/RF/hardware metapackages marked **Exclude** (no hardware in VM ranges).
* Social engineering and DoS tools marked **Exclude from MCP** (run manually only).
* `hexstrike_server` flagged as primary MCP candidate → next: `okf/mcp-inventory.md`.

### Next
- [ ] Identify Kali host(s) and range CIDRs → `ranges/`
- [ ] Deep-dive `hexstrike_server` capabilities → `okf/mcp-inventory.md`
- [ ] Evaluate `mcp-kali-server` if available
- [ ] Confirm which metapackages are pre-installed on the range Kali host
