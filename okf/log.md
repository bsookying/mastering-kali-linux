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
- [x] Confirm which metapackages are pre-installed on the range Kali host

---

## 2026-11-24: Kali node inventoried and tools updated

* Kali host: `10.3.0.57`, credentials `kali/kali`, RDP:3389, SSH:22
* OS: Kali GNU/Linux Rolling 2026.3, kernel 7.1.5+kali-amd64
* Disk: 79G / 18G used. RAM: 15GB. Fully up to date — no pending upgrades.
* Metapackages: kali-linux-core, kali-linux-default, kali-linux-headless, kali-tools-top10 (all 2026.4.2)
* Installed additional tools: chisel 1.13.0, ligolo-ng 0.9.2, enum4linux-ng 1.3.10, coercer 2.4.3, bloodhound 9.9.2, neo4j 5.2.0
* Full inventory written to `okf/kali-inventory.md`
* No standalone C2 beyond Metasploit — sufficient for initial guide scenarios

### Next
- [ ] Verify ligolo-ng binary path (`find / -name ligolo-ng 2>/dev/null` on Kali)
- [ ] Design and write attack scenario guides under `guides/`
- [ ] Add range CIDR details to `ranges/`
