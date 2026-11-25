# Tactic: Discovery

**MITRE:** TA0007 — Discovery
**Goal:** Map the network, identify live hosts, enumerate services, and understand the Active Directory environment before attempting any exploitation.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<DC_IP>` | Domain Controller IP |
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |
| `<SUBNET_CIDR>` | Range subnet (e.g. 10.1.0.0/24) |
| `<DOMAIN>` | Active Directory domain name |
| `<USERNAME>` | Domain or local username |
| `<PASSWORD>` | Account password |

---

## Tool 1 — nmap: Host Discovery (Ping Sweep)

**What it does:** Sends ICMP echo requests across the subnet to identify which hosts are online. This is always step one — you can't attack what you can't find.

**MITRE:** T1018 — Remote System Discovery
**Targets:** Entire range subnet
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Discover all live hosts on the subnet**

```
sudo nmap -sn <SUBNET_CIDR>
```

**What to look for:** Each `Host is up` line is a live target. Note all the IPs — these become your attack surface for every subsequent step.

---

📸 **Screenshot:** `screenshots/01-discovery/01-nmap-ping-sweep.png`
*Show: nmap output listing all live hosts with their IPs*

---

**What Cortex sees**
> **Alert:** Abnormal ICMP echo (PING) to multiple hosts
> **Severity:** Medium | **MITRE:** T1018

📸 **Screenshot:** `screenshots/01-discovery/01-nmap-ping-sweep-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — nmap: Port & Service Scan

**What it does:** Probes specific ports on a target to identify open services, their versions, and default scripts output (banner grabbing, OS hints). This tells you what attack surface exists on each host.

**MITRE:** T1046 — Network Service Discovery
**Targets:** DC · Windows Client · Linux
**Demo time:** ✅ Fast (~30 seconds per host)

---

### Give it a try

**Step 1 — Scan the Domain Controller for common Windows/AD ports**

```
sudo nmap -sV -sC -p 22,53,80,88,135,139,389,443,445,464,636,3268,3269,3389,5985 <DC_IP>
```

**What to look for:**
- Port 88 (Kerberos) → confirms this is a Domain Controller
- Port 445 (SMB) → file shares and lateral movement vector
- Port 389/636 (LDAP/LDAPS) → AD enumeration target
- Port 5985 (WinRM) → remote management, evil-winrm entry point
- Port 3389 (RDP) → remote desktop access

---

📸 **Screenshot:** `screenshots/01-discovery/02-nmap-portscan-dc.png`
*Show: nmap output for DC — focus on the open ports list and service versions*

---

**Step 2 — Scan the Linux target**

```
sudo nmap -sV -sC -p 22,80,443,3306,5432,8080,8443 <LINUX_IP>
```

**What to look for:**
- Port 22 (SSH) → primary entry point for Linux
- Any web ports (80/443/8080) → potential web application attack surface

---

📸 **Screenshot:** `screenshots/01-discovery/02-nmap-portscan-linux.png`
*Show: nmap output for Linux target — open ports and service banners*

---

**What Cortex sees**
> **Alert:** Port Sweep · Possible network service discovery via command-line tool
> **Severity:** Medium | **MITRE:** T1046

📸 **Screenshot:** `screenshots/01-discovery/02-nmap-portscan-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — nmap: SMB Enumeration Scripts

**What it does:** Runs nmap's built-in SMB scripts against Windows targets to pull OS information, SMB signing configuration, and open shares without credentials. SMB signing disabled is a prerequisite for NTLM relay attacks.

**MITRE:** T1046 — Network Service Discovery · T1135 — Network Share Discovery
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~20 seconds)

---

### Give it a try

**Step 1 — Run SMB enumeration scripts against the DC**

```
sudo nmap -p 445 --script smb2-security-mode,smb-os-discovery,smb-enum-shares <DC_IP>
```

**What to look for:**
- `Message signing enabled but not required` → relay attacks are possible
- OS version → confirms Windows Server version
- Shares listed → SYSVOL, NETLOGON (always present), plus any custom shares

---

📸 **Screenshot:** `screenshots/01-discovery/03-nmap-smb-scripts.png`
*Show: nmap SMB script output — highlight the signing status line and shares*

---

**What Cortex sees**
> **Alert:** Abnormal SMB scanning activity to multiple hosts · SMB Traffic from Non-Standard Process
> **Severity:** Medium | **MITRE:** T1046

📸 **Screenshot:** `screenshots/01-discovery/03-nmap-smb-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — enum4linux-ng: Active Directory Enumeration

**What it does:** Queries the target Windows/AD host over SMB and RPC to pull users, groups, shares, OS info, and password policy — all without credentials. The updated `-ng` version is faster and more reliable than the original.

**MITRE:** T1087 — Account Discovery · T1069 — Permission Groups Discovery · T1201 — Password Policy Discovery
**Targets:** DC
**Demo time:** ⚠️ Moderate (~2 minutes)

---

### Give it a try

**Step 1 — Run a full unauthenticated enumeration against the DC**

```
enum4linux-ng -A <DC_IP>
```

**What to look for:**
- **Password policy** — minimum length, lockout threshold (no lockout = safe to brute force)
- **User list** — every domain account name, used for targeted attacks
- **Group memberships** — who is in Domain Admins, Administrators
- **Shares** — SYSVOL/NETLOGON readable, any non-standard shares

**Step 2 — Save output to a file for reference**

```
enum4linux-ng -A <DC_IP> -oJ /tmp/enum4linux-results
```

---

📸 **Screenshot:** `screenshots/01-discovery/04-enum4linux-users.png`
*Show: enum4linux-ng output — the users section listing domain accounts*

📸 **Screenshot:** `screenshots/01-discovery/04-enum4linux-policy.png`
*Show: enum4linux-ng output — the password policy section (highlight no lockout if present)*

---

**What Cortex sees**
> **Alert:** Remote account enumeration · LDAP traffic from non-standard process · Permission Groups discovery commands
> **Severity:** Medium–High | **MITRE:** T1087, T1069

📸 **Screenshot:** `screenshots/01-discovery/04-enum4linux-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — netexec: SMB Host & User Enumeration

**What it does:** Swiss-army knife for Windows network enumeration and exploitation. In discovery mode it confirms domain membership, signs in with credentials to list users, shares, logged-on sessions, and checks which hosts the current user has admin access on.

**MITRE:** T1018 — Remote System Discovery · T1087 — Account Discovery · T1135 — Network Share Discovery
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Confirm SMB connectivity and domain info (no credentials)**

```
netexec smb <SUBNET_CIDR>
```

**What to look for:** Each responding host shows hostname, OS version, domain name, and SMB signing status. The `(signing:False)` flag is your green light for relay attacks.

---

📸 **Screenshot:** `screenshots/01-discovery/05-netexec-smb-sweep.png`
*Show: netexec SMB sweep output listing hosts, OS versions, and signing status*

---

**Step 2 — Enumerate users with valid credentials**

```
netexec smb <DC_IP> -u <USERNAME> -p <PASSWORD> --users
```

**Step 3 — Enumerate shares**

```
netexec smb <DC_IP> -u <USERNAME> -p <PASSWORD> --shares
```

**Step 4 — Check local admin access across the subnet**

```
netexec smb <SUBNET_CIDR> -u <USERNAME> -p <PASSWORD> --local-auth
```

**What to look for:** Hosts showing `(Pwn3d!)` accept this credential with local admin rights — these are your lateral movement targets.

---

📸 **Screenshot:** `screenshots/01-discovery/05-netexec-users.png`
*Show: netexec --users output listing domain accounts*

📸 **Screenshot:** `screenshots/01-discovery/05-netexec-pwned.png`
*Show: netexec subnet sweep output — highlight any Pwn3d! results*

---

**What Cortex sees**
> **Alert:** Abnormal SMB activity to multiple hosts · SMB Traffic from Non-Standard Process · Remote account enumeration
> **Severity:** Medium–High | **MITRE:** T1018, T1087

📸 **Screenshot:** `screenshots/01-discovery/05-netexec-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 6 — bloodhound-python: Active Directory Graph Collection

**What it does:** Collects comprehensive Active Directory data — users, groups, computers, ACLs, sessions, trust relationships, and delegation paths — and outputs it in a format that BloodHound can visualise as an attack graph. The graph reveals the shortest path from any compromised account to Domain Admin.

**MITRE:** T1087 — Account Discovery · T1069 — Permission Groups Discovery · T1482 — Domain Trust Discovery
**Targets:** DC
**Demo time:** ⚠️ Moderate (~3–5 minutes depending on domain size)

---

### Give it a try

**Step 1 — Collect all AD data and output a zip file**

```
bloodhound-python -u <USERNAME> -p <PASSWORD> -d <DOMAIN> -ns <DC_IP> -c All --zip -o /tmp/bh-output
```

**Flags explained:**
- `-c All` — collect everything: users, groups, computers, sessions, ACLs, trusts
- `--zip` — packages all JSON files into a single zip ready to import
- `-ns <DC_IP>` — use the DC as the DNS server

**What to look for:** The script prints collection progress per category. When finished you'll see a `.zip` file in `/tmp/bh-output/`.

---

📸 **Screenshot:** `screenshots/01-discovery/06-bloodhound-collection.png`
*Show: bloodhound-python running — progress lines per collection type, zip file created at end*

---

**Step 2 — Start BloodHound and import the data**

```
sudo neo4j start && sleep 8 && bloodhound &
```

Then in the BloodHound GUI:
1. Upload the zip file from `/tmp/bh-output/`
2. Run the pre-built query: **Shortest Paths to Domain Admins**
3. Run: **Find All Domain Admin Paths**

---

📸 **Screenshot:** `screenshots/01-discovery/06-bloodhound-graph.png`
*Show: BloodHound GUI — attack path graph from a low-privilege user to Domain Admin*

---

**What Cortex sees**
> **Alert:** LDAP traffic from non-standard process · Kerberos Traffic from Non-Standard Process · Multiple discovery commands on a Windows host by the same process
> **Severity:** High | **MITRE:** T1087, T1069, T1482

📸 **Screenshot:** `screenshots/01-discovery/06-bloodhound-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
