# OKF v0.2 — Cortex XDR Agent Detection Map

> Maps Kali tools and techniques to the specific Cortex XDR Agent alert names they trigger.
> Source: XDR Agent analytics alert list (data source: XDR Agent).
> Used to populate the "What Cortex sees" section in each guide.

---

## Discovery (T1046, T1018, T1087, T1069, T1016)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| nmap ping sweep | Abnormal ICMP echo (PING) to multiple hosts |
| nmap port scan | Port Sweep / Possible network service discovery via command-line tool |
| nmap SMB scan | Abnormal SMB scanning activity to multiple hosts |
| enum4linux-ng / SMB enum | Remote account enumeration · SMB Traffic from Non-Standard Process · LDAP traffic from non-standard process · Permission Groups discovery commands |
| bloodhound-python (LDAP) | LDAP traffic from non-standard process · Kerberos Traffic from Non-Standard Process · Multiple discovery commands on a Windows host by the same process |
| netexec SMB enum | Abnormal SMB activity to multiple hosts · SMB Traffic from Non-Standard Process · Remote account enumeration |
| Local account/user enumeration on Windows | Local account discovery · Interactive local account enumeration · Discovery of host users via WMIC |
| ipconfig / network info | Uncommon IP Configuration Listing via ipconfig.exe |
| arp -a | Uncommon ARP cache listing via arp.exe |
| route print | Uncommon routing table listing via route.exe |
| Linux multi-command recon (id, uname, ps, etc.) | Multiple discovery commands on a Linux host by the same process |
| SUID/GUID enumeration | SUID/GUID permission discovery |

---

## Credential Access (T1003, T1110, T1557, T1558, T1552)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| impacket-secretsdump | Suspicious dump of ntds.dit using Shadow Copy with ntdsutil/vssadmin · Registry credentials extraction · SMB Traffic from Non-Standard Process |
| mimikatz (sekurlsa::logonpasswords) | Mimikatz command-line arguments |
| mimikatz (lsadump::sam) | Registry credentials extraction · Mimikatz command-line arguments |
| ProcDump → LSASS dump | Copy a process memory file · Procdump executed from an atypical directory |
| comsvcs.dll LSASS dump | Memory dumping with comsvcs.dll |
| responder (LLMNR/NBT-NS) | NTLM Hash Harvesting |
| responder + relay | NTLM Relay · Potential NTLM Relay Attack |
| coercer (PetitPotam/PrinterBug) | Machine Account NTLM Relay · Potential NTLM Relay Attack |
| impacket-ntlmrelayx | NTLM Relay · Machine Account NTLM Relay |
| hydra (SSH brute force) | Hydra Password Brute-Force Tool Execution · SSH authentication brute force attempts |
| hydra (SMB/RDP brute force) | NTLM Brute Force · NTLM Brute Force on an Administrator Account · Possible Brute-Force attempt |
| Kerberoasting (impacket-GetUserSPNs) | Possible Kerberoasting attack · Weakly-Encrypted Kerberos Ticket Requested · Multiple Weakly-Encrypted Kerberos Tickets Received |
| AS-REP Roasting | Possible AS-REP Roasting Attack · Kerberos Pre-Auth Failures by Host |
| certipy (AD CS enumeration) | The CA policy EditFlags was queried · Suspicious Certutil AD CS contact |
| certipy (certificate request) | A suspicious process enrolled for a certificate |
| Extracting creds from /etc/shadow, .bash_history | Extracting credentials from Unix files · Reading bash command history file |
| Searching for password files | Possible Search For Password Files |
| hashcat / john (offline) | *(offline — no network detection; agent may detect associated file drops)* |

---

## Lateral Movement (T1021, T1550, T1047, T1569)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| evil-winrm | Rare WinRM Session · Rare Windows Remote Management (WinRM) HTTP Activity |
| netexec Pass-the-Hash | Possible Pass-the-Hash · Rare NTLM Access By User To Host · A user authenticated with weak NTLM to multiple hosts |
| impacket-psexec | Remote PsExec-like command execution · Attempt to execute a command on a remote host using PsExec.exe · PsExec was executed with a suspicious command line |
| impacket-wmiexec | Command execution via wmiexec · Remote WMI process execution |
| impacket-smbexec | Remote service command execution from an uncommon source |
| Pass-the-Ticket (Kerberos) | Possible TGT reuse from different hosts (pass the ticket) |
| RDP lateral movement | Abnormal RDP connections to multiple hosts · An uncommon RDP session from a managed host · Rare RDP session to a remote host |

---

## Privilege Escalation (T1068, T1134, T1548)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| Fodhelper UAC bypass | Fodhelper.exe UAC bypass |
| at.exe privilege escalation | Interactive at.exe privilege escalation method |
| Windows Installer exploit | Windows Installer exploitation for local privilege escalation |
| Setuid/setgid bit manipulation | Setuid and Setgid file bit manipulation · Adding execution privileges |
| Linux linpeas (multi-command) | Multiple discovery commands on a Linux host by the same process · SUID/GUID permission discovery |

---

## Persistence (T1053, T1543, T1547, T1037)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| schtasks.exe (local) | Uncommon local scheduled task creation via schtasks.exe |
| schtasks.exe (remote) | Uncommon remote scheduled task creation |
| sc.exe (create service) | Uncommon Service Create/Config · Service execution via sc.exe |
| sc.exe (remote service) | Uncommon remote service start via sc.exe |
| Registry run key persistence | Script file added to startup-related Registry keys |
| New System-V service (Linux) | Installation of a new System-V service |
| Systemd timer (Linux) | Suspicious systemd timer activity |
| PAM modification (Linux) | Modification of PAM |

---

## Defense Evasion (T1562, T1070, T1036)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| wevtutil.exe clear-log | Windows Event Log was cleared using wevtutil.exe |
| netsh advfirewall disable | Suspicious disablement of the Windows Firewall |
| iptables -F (Linux) | The Linux system firewall was disabled · Iptables configuration command was executed |
| Add Defender exclusion | New addition to Windows Defender exclusion list |
| Clear bash history | Uncommon attempt to clear shell history |
| attrib.exe +h (hide file) | Hidden Attribute was added to a file using attrib.exe |
| Rename/masquerade binary | Execution of renamed lolbin · A process is masquerading as a common Microsoft product |
| certutil encode/decode | Encoded information using Windows certificate management tool · Suspicious certutil command line |

---

## Command & Control (T1071, T1572, T1090, T1105)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| Metasploit/Meterpreter listener | Abnormal process connection to default Meterpreter port |
| netcat listener / reverse shell | Netcat makes or gets connections · A TCP stream was created directly in a shell |
| chisel tunnel | Uncommon reverse SSH tunnel to external domain/ip |
| DNS tunneling | DNS Tunneling · Suspicious DNS traffic |
| Python HTTP server (file staging) | Python HTTP server started |
| File transfer (wget/curl from target) | File transfer from unusual IP using known tools |

---

## Collection & Exfiltration (T1041, T1048, T1560)

| Tool / Action | Cortex Alert Name(s) |
|---|---|
| Large file transfer over SSH | A compressed file was exfiltrated over SSH · Large Upload (Generic) |
| Data compression (tar/zip) | Unusual compressed file password protection |
| Compressing with Python | Compressing data using python |
| Exfil over SMB | Rare file transfer over SMB protocol |
