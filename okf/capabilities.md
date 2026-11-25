# OKF v0.2 — Capabilities Matrix

> Source: https://www.kali.org/docs/general-use/metapackages/ and https://www.kali.org/tools/
> Purpose: attack-simulation node in isolated TS Labs VM ranges. All targets are range-internal.

---

## 1. Metapackage Selection

Legend: **Include** = install by default | **Add** = optional/on-demand | **Exclude** = not needed in VM range

| Metapackage | Category | Decision | Reason |
|---|---|---|---|
| `kali-linux-core` | System | **Include** | Base system |
| `kali-linux-headless` | System | **Include** | Headless range node default |
| `kali-linux-default` | System | **Add** | Only if GUI needed for demos |
| `kali-tools-information-gathering` | Recon | **Include** | OSINT/recon against range targets |
| `kali-tools-vulnerability` | Vuln assessment | **Include** | Core for detection validation |
| `kali-tools-exploitation` | Exploitation | **Include** | Core for detection validation |
| `kali-tools-post-exploitation` | Post-ex | **Include** | Lateral movement / persistence TTPs |
| `kali-tools-sniffing-spoofing` | Network | **Include** | MitM and traffic analysis TTPs |
| `kali-tools-passwords` | Cred access | **Include** | Brute force / cracking TTPs |
| `kali-tools-web` | Web | **Include** | Web app attack TTPs |
| `kali-tools-database` | Database | **Include** | SQLi / DB attack TTPs |
| `kali-tools-reverse-engineering` | RE | **Add** | Useful for payload analysis |
| `kali-tools-forensics` | Forensics | **Add** | Blue team perspective / artifact collection |
| `kali-tools-reporting` | Reporting | **Add** | Range exercise documentation |
| `kali-tools-fuzzing` | Fuzzing | **Add** | On demand |
| `kali-tools-social-engineering` | SE | **Add** | Phishing sims in range only |
| `kali-tools-crypto-stego` | Crypto | **Add** | On demand |
| `kali-tools-windows-resources` | Windows | **Add** | Binaries for Windows targets |
| `kali-linux-labs` | Labs | **Add** | Practice environments |
| `kali-tools-wireless` | RF/WiFi | **Exclude** | No wireless in VM range |
| `kali-tools-802-11` | WiFi | **Exclude** | No wireless in VM range |
| `kali-tools-bluetooth` | Bluetooth | **Exclude** | No wireless in VM range |
| `kali-tools-rfid` | RFID | **Exclude** | No hardware in VM range |
| `kali-tools-sdr` | SDR | **Exclude** | No hardware in VM range |
| `kali-tools-hardware` | Hardware | **Exclude** | No hardware in VM range |
| `kali-tools-voip` | VoIP | **Add** | Only if range includes VoIP targets |
| `kali-tools-gpu` | GPU | **Exclude** | GPU passthrough not standard in range |
| `kali-linux-everything` | Full set | **Exclude** | Bloat; select by category |
| `kali-desktop-xfce` | Desktop | **Add** | Only if GUI/demo required |

---

## 2. MCP Safety Matrix

> For Kali MCP servers (e.g. `mcp-kali-server`, hexstrike-ai): which tool categories are safe to expose to an AI client, which need guardrails, and which must be excluded.

Legend: **Safe** = expose via MCP with no extra controls | **Use-with-care** = expose with range-CIDR scope filter | **Exclude** = do not expose via MCP

| MITRE Phase | Key Tools | MCP Decision | Reason |
|---|---|---|---|
| Reconnaissance | nmap, amass, theHarvester, gobuster, subfinder | **Use-with-care** | Scope-filter to range CIDRs; internet recon must be blocked |
| Vuln scanning | nikto, nuclei, nessus, wpscan | **Use-with-care** | Noisy; limit to range targets |
| Initial access | metasploit-framework, sqlmap, commix | **Use-with-care** | Confirm target before each run |
| Credential access — cracking | hashcat, john, hydra, medusa | **Safe** | Offline cracking / range-internal brute force |
| Credential access — dumping | mimikatz, rubeus, creddump7 | **Safe** | Post-exploitation on range hosts only |
| Lateral movement | crackmapexec, netexec, evil-winrm, impacket | **Use-with-care** | Confirm target scope before each run |
| C2 frameworks | metasploit, havoc, empire, villain | **Use-with-care** | Listener must bind to range interface only |
| C2 raw channels | netcat, socat, ncat, penelope | **Safe** | Low-level, range-internal |
| C2 tunneling | chisel, ligolo-ng, proxychains | **Use-with-care** | Ensure tunnel exits stay in range |
| Collection / MitM | ettercap, mitmproxy, mitm6 | **Use-with-care** | Range-internal only |
| Social engineering | gophish, setoolkit | **Exclude** | High risk of out-of-range targeting; run manually |
| Wireless / RF | aircrack-ng, kismet, wifite | **Exclude** | No wireless in VM range |
| Impact / DoS | goldeneye, t50, slowhttptest | **Exclude** | Destructive; run manually with explicit confirmation |
| Forensics | autopsy, volatility, yara | **Safe** | Read-only analysis |
| Reporting | cherrytree, dradis, eyewitness | **Safe** | Documentation only |
| Payload generation | msfvenom, veil, donut | **Use-with-care** | Payloads must target range hosts only |

---

## 3. Notable AI / Modern Tools

| Tool | Notes |
|---|---|
| `hexstrike_server` | Listed in Kali tools under Services. Primary MCP server candidate — inventory separately in `okf/mcp-inventory.md` |
| `shell-gpt` | CLI LLM integration. Useful for AI-assisted TTP scripting |
| `gemini-cli` | Google Gemini CLI. Assess for range use |

---

## Status

- [ ] Confirm which metapackages are pre-installed on the range Kali host (requires access to the host)
- [ ] Evaluate `hexstrike_server` capabilities → `okf/mcp-inventory.md`
- [ ] Evaluate `mcp-kali-server` if available
- [ ] Add range CIDRs to `ranges/` to anchor MCP scope filters
