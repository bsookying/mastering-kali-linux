# Tactic: Defense Evasion

**MITRE:** TA0005 — Defense Evasion
**Purpose for this guide:** Show customers how attackers try to cover their tracks and disable defenses — and demonstrate that Cortex detects these actions in real time. Each technique here is a Cortex detection opportunity.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |

> **Lab only.** Run these in existing shells on range hosts. Cleanup commands provided for each technique.

---

## Tool 1 — wevtutil: Clear Windows Event Logs

**What it does:** Attackers clear Windows event logs to remove evidence of their activity. `wevtutil` is a built-in Windows utility that provides direct log management. Cortex detects the clearing action itself — the absence of logs is the evidence.

**MITRE:** T1070.001 — Indicator Removal: Clear Windows Event Logs
**Targets:** Windows Client · DC
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Clear the Security event log (requires admin)**

```
wevtutil cl Security
```

**Step 2 — List available logs and clear another (less sensitive) log for demo**

```
wevtutil el | Select-String "Application" && wevtutil cl Application
```

**What to look for:** No output on success. Check Event Viewer — the log will be empty.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/01-wevtutil.png`
*Show: wevtutil cl command run, Event Viewer showing empty log*

**What Cortex sees**
> **Alert:** Windows Event Log was cleared using wevtutil.exe
> **Severity:** High | **MITRE:** T1070.001

📸 **Screenshot:** `screenshots/06-defense-evasion/01-wevtutil-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — netsh advfirewall: Disable Windows Firewall

**What it does:** Attackers disable the Windows Firewall to allow inbound connections for C2, file staging, and lateral movement without firewall interference. A built-in Windows tool, so it doesn't trigger AV — but Cortex catches the action.

**MITRE:** T1562.004 — Impair Defenses: Disable or Modify System Firewall
**Targets:** Windows Client · DC
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Disable Windows Firewall for all profiles**

```
netsh advfirewall set allprofiles state off
```

**Step 2 — Verify**

```
netsh advfirewall show allprofiles | findstr State
```

**Step 3 — Re-enable after demo**

```
netsh advfirewall set allprofiles state on
```

**What to look for:** `State: OFF` for all profiles.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/02-netsh-firewall.png`
*Show: netsh advfirewall off command and State: OFF confirmation*

**What Cortex sees**
> **Alert:** Suspicious disablement of the Windows Firewall
> **Severity:** High | **MITRE:** T1562.004

📸 **Screenshot:** `screenshots/06-defense-evasion/02-netsh-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — Windows Defender Exclusion

**What it does:** Attackers add directories to Windows Defender's exclusion list so payloads dropped there are not scanned. A signed, trusted Microsoft process makes the change — which is exactly why it's an effective evasion technique and a strong detection signal.

**MITRE:** T1562.001 — Impair Defenses: Disable or Modify Tools
**Targets:** Windows Client
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Add a directory exclusion to Defender**

```
powershell -c "Add-MpPreference -ExclusionPath 'C:\Windows\Temp'"
```

**Step 2 — Verify the exclusion was added**

```
powershell -c "Get-MpPreference | Select-Object -ExpandProperty ExclusionPath"
```

**Step 3 — Remove after demo**

```
powershell -c "Remove-MpPreference -ExclusionPath 'C:\Windows\Temp'"
```

**What to look for:** `C:\Windows\Temp` appears in the exclusion list.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/03-defender-exclusion.png`
*Show: Add-MpPreference and Get-MpPreference output confirming exclusion*

**What Cortex sees**
> **Alert:** New addition to Windows Defender exclusion list
> **Severity:** High | **MITRE:** T1562.001

📸 **Screenshot:** `screenshots/06-defense-evasion/03-defender-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — attrib.exe: Hide a File

**What it does:** Attackers use `attrib.exe` to set the hidden attribute on files and directories, making them invisible in standard file browsing. Combined with a system attribute, the file won't appear even with "show hidden files" enabled.

**MITRE:** T1564.001 — Hide Artifacts: Hidden Files and Directories
**Targets:** Windows Client
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Create a demo file and hide it**

```
echo "demo" > C:\Windows\Temp\rangedemo.txt && attrib +h +s C:\Windows\Temp\rangedemo.txt
```

**Step 2 — Verify it's hidden (dir won't show it normally)**

```
dir C:\Windows\Temp\rangedemo.txt
```

**Step 3 — Cleanup**

```
attrib -h -s C:\Windows\Temp\rangedemo.txt && del C:\Windows\Temp\rangedemo.txt
```

**What to look for:** `dir` returns "File Not Found" for a file that exists on disk.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/04-attrib-hide.png`
*Show: attrib +h +s applied, dir showing file not found*

**What Cortex sees**
> **Alert:** Hidden Attribute was added to a file using attrib.exe
> **Severity:** Medium | **MITRE:** T1564.001

📸 **Screenshot:** `screenshots/06-defense-evasion/04-attrib-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — iptables: Disable Linux Firewall

**What it does:** Attackers flush Linux firewall rules to open inbound ports for C2 listeners or remove blocking rules. `iptables -F` clears all existing rules. Cortex monitors firewall modification commands on protected Linux hosts.

**MITRE:** T1562.004 — Impair Defenses: Disable or Modify System Firewall
**Targets:** Linux
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — View current rules, then flush them**

```
sudo iptables -L && sudo iptables -F
```

**Step 2 — Confirm rules are cleared**

```
sudo iptables -L
```

**What to look for:** All chains show `policy ACCEPT` with no rules listed.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/05-iptables-flush.png`
*Show: iptables -L before and after -F, showing empty chains*

**What Cortex sees**
> **Alert:** The Linux system firewall was disabled · Iptables configuration command was executed
> **Severity:** High | **MITRE:** T1562.004

📸 **Screenshot:** `screenshots/06-defense-evasion/05-iptables-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 6 — Clear Bash History

**What it does:** Attackers clear or truncate shell history on Linux hosts to remove evidence of commands they ran. A simple but common cleanup step at the end of an intrusion. Cortex detects the history-clearing action specifically.

**MITRE:** T1070.003 — Indicator Removal: Clear Command History
**Targets:** Linux
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Clear the current session history and the history file**

```
history -c && cat /dev/null > ~/.bash_history
```

**Step 2 — Verify history is gone**

```
history | wc -l
```

**What to look for:** `history | wc -l` returns `0` or `1` (just the history command itself).

---

📸 **Screenshot:** `screenshots/06-defense-evasion/06-clear-history.png`
*Show: history -c run, then history | wc -l returning 0*

**What Cortex sees**
> **Alert:** Uncommon attempt to clear shell history
> **Severity:** Medium | **MITRE:** T1070.003

📸 **Screenshot:** `screenshots/06-defense-evasion/06-clear-history-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 7 — certutil: Encode and Decode Files

**What it does:** `certutil.exe` is a built-in Windows binary that attackers abuse to encode files (base64) for obfuscation and exfiltration, or decode payloads delivered as encoded blobs. Because it's a signed Microsoft binary, it bypasses application control policies that block unknown executables.

**MITRE:** T1140 — Deobfuscate/Decode Files or Information · T1027 — Obfuscated Files
**Targets:** Windows Client · DC
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Encode a file using certutil**

```
echo "demo data" > C:\Windows\Temp\demo.txt && certutil -encode C:\Windows\Temp\demo.txt C:\Windows\Temp\demo.b64
```

**Step 2 — Decode it back**

```
certutil -decode C:\Windows\Temp\demo.b64 C:\Windows\Temp\demo-decoded.txt && type C:\Windows\Temp\demo-decoded.txt
```

**Step 3 — Cleanup**

```
del C:\Windows\Temp\demo.txt C:\Windows\Temp\demo.b64 C:\Windows\Temp\demo-decoded.txt
```

**What to look for:** The decoded file contents match the original. This demonstrates the encode/decode abuse pattern.

---

📸 **Screenshot:** `screenshots/06-defense-evasion/07-certutil-encode.png`
*Show: certutil encode then decode, file contents match*

**What Cortex sees**
> **Alert:** Encoded information using Windows certificate management tool · Suspicious certutil command line
> **Severity:** Medium | **MITRE:** T1140

📸 **Screenshot:** `screenshots/06-defense-evasion/07-certutil-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
