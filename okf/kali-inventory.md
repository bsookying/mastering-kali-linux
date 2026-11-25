# OKF v0.2 — Kali Node Inventory

> Surveyed: 2026-11-24
> Host: 10.3.0.57 | RDP:3389, SSH:22 | credentials in secrets/cortex.env
> OS: Kali GNU/Linux Rolling 2026.3
> Kernel: 7.1.5+kali-amd64
> Disk: 79G total / 18G used / 57G free
> RAM: 15GB total / ~1.2GB used
> Metapackages: kali-linux-core, kali-linux-default, kali-linux-headless, kali-tools-top10 (all 2026.4.2)
> APT status: fully up to date

---

## Installed Tools

### Reconnaissance & Enumeration
| Tool | Version | Notes |
|---|---|---|
| nmap | 7.991 | Port/service scanning |
| gobuster | 3.8.2 | Dir/DNS/vhost brute force |
| ffuf | 2.3.0 | Web fuzzing |
| enum4linux | 0.9.1 | SMB/AD enumeration (older) |
| enum4linux-ng | 1.3.10 | Modern replacement, use this |
| bloodhound.py | 1.9.0 | AD ingestor (remote collection) |

### Credential Access
| Tool | Version | Notes |
|---|---|---|
| hashcat | 7.1.2 | GPU/CPU offline cracking |
| john | 1.9.0-Jumbo | Hash cracking (Oct 2026 build) |
| hydra | 9.7 | Online brute force |
| mimikatz | 2.2.0 | Credential dumping (Windows) |
| impacket-scripts | 1.10 | secretsdump, psexec, ntlmrelayx, etc. |
| responder | 3.2.2.0 | LLMNR/NBT-NS/mDNS poisoning |
| certipy-ad | 5.1.0 | AD CS / PKI attacks |
| coercer | 2.4.3 | NTLM coercion (PetitPotam, PrinterBug) |

### Exploitation & Post-Exploitation
| Tool | Version | Notes |
|---|---|---|
| metasploit-framework | 6.5.7 | Primary exploit/C2 framework |
| evil-winrm | 4.1 | WinRM shell on Windows targets |
| netexec | 1.5.1 | CrackMapExec successor — SMB/LDAP/RDP/WinRM |

### Web Application
| Tool | Version | Notes |
|---|---|---|
| burpsuite | 2026.9 | Proxy / web app testing |
| ffuf | 2.3.0 | (see above) |
| gobuster | 3.8.2 | (see above) |

### AD Visualization
| Tool | Version | Notes |
|---|---|---|
| bloodhound | 9.9.2 | GUI (needs neo4j running first) |
| neo4j | 5.2.0 | Graph database backend for BloodHound |

### Tunneling & Pivoting
| Tool | Version | Notes |
|---|---|---|
| chisel | 1.13.0 | HTTP tunnel / SOCKS proxy |
| ligolo-ng | 0.9.2 | Transparent proxy tunnel — binaries: `/usr/bin/ligolo-proxy` (runs on Kali) + `/usr/bin/ligolo-agent` (deploys on target). No `ligolo-ng` symlink. |

---

## Gaps / Not Installed

| Tool | Category | Priority | Notes |
|---|---|---|---|
| Standalone C2 (Havoc, Sliver) | C2 | Low | Metasploit covers this for demos |
| Pacu | Cloud/AWS | Low | AWS pentest framework — add if AWS scenarios needed |
| cobaltstrike | C2 | — | Licensed, not in Kali repos |
| BloodHound CE (Docker) | AD visualization | Low | 9.9.2 from apt should work for demos |
| ligolo-ng in $PATH | Tunneling | Low | Binary installed, path needs checking |

---

## BloodHound Setup (first use)

BloodHound requires neo4j to be running. Single-line start sequence:

```
sudo neo4j start && sleep 10 && bloodhound &
```

Default neo4j credentials on first run: `neo4j / neo4j` (will prompt to change).
Then import `.zip` from `bloodhound-python` collection runs.

---

## Range Connectivity

From Kali (`10.3.0.57`), confirmed reachable:
- LogSim console: `10.3.0.53:5000`
- Range subnet: `10.1.0.0/24` (Windows AD domain `byos.local`)
- Target DC: `byos-dc-a.byos.local` (Cortex agent 9.4.0.498 installed)

Range domain accounts available for attack simulation: administrator, svc-staging, theboss, hreed, jborn, ohsooks, rrios, lab-user, krbtgt — see `okf/capabilities.md` for full detail.
