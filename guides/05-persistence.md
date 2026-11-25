# Tactic: Persistence

**MITRE:** TA0003 — Persistence
**Purpose for this guide:** Understand what attack persistence looks like on Windows and Linux so Cortex detections can be demonstrated to customers. Each technique triggers specific agent alerts — the detection is the point.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |
| `<KALI_IP>` | Kali attacker IP |
| `<DOMAIN>` | Active Directory domain name |
| `<USERNAME>` | Domain or local username |
| `<PASSWORD>` | Account password |

> **Lab only.** These commands run on range hosts we own. After each demo, clean up artifacts (cleanup commands noted per tool).

---

## Tool 1 — schtasks: Windows Scheduled Task

**What it does:** Attackers use Windows scheduled tasks to execute payloads automatically on a trigger (logon, startup, timer). It survives reboots and runs under defined user context. Cortex monitors task creation events.

**MITRE:** T1053.005 — Scheduled Task/Job: Scheduled Task
**Targets:** Windows Client · DC (run commands in an existing shell on target)
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Create a scheduled task on the target Windows host**

```
schtasks /create /tn "RangeDemo" /tr "cmd.exe /c whoami > C:\Windows\Temp\demo.txt" /sc onlogon /ru SYSTEM /f
```

**Step 2 — Verify it was created**

```
schtasks /query /tn "RangeDemo"
```

**Step 3 — Cleanup after demo**

```
schtasks /delete /tn "RangeDemo" /f
```

**What to look for:** `SUCCESS: The scheduled task "RangeDemo" has successfully been created.`

---

📸 **Screenshot:** `screenshots/05-persistence/01-schtasks.png`
*Show: schtasks create and query output confirming the task exists*

**What Cortex sees**
> **Alert:** Uncommon local scheduled task creation via schtasks.exe
> **Severity:** Medium | **MITRE:** T1053.005

📸 **Screenshot:** `screenshots/05-persistence/01-schtasks-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — sc.exe: Windows Service Creation

**What it does:** Attackers install malicious Windows services that start automatically at boot. Services run as SYSTEM by default and persist indefinitely. This is one of Cortex's most reliable detection points.

**MITRE:** T1543.003 — Create or Modify System Process: Windows Service
**Targets:** Windows Client · DC
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Create a demo service**

```
sc create RangeDemo binPath= "cmd.exe /c whoami" start= auto
```

**Step 2 — Query the service**

```
sc query RangeDemo
```

**Step 3 — Cleanup after demo**

```
sc delete RangeDemo
```

**What to look for:** Service created with `START_TYPE: 2 AUTO_START`. Even without running it, creation fires the alert.

---

📸 **Screenshot:** `screenshots/05-persistence/02-sc-service.png`
*Show: sc create and query output confirming the service*

**What Cortex sees**
> **Alert:** Uncommon Service Create/Config · Service execution via sc.exe · An uncommon service was started
> **Severity:** High | **MITRE:** T1543.003

📸 **Screenshot:** `screenshots/05-persistence/02-sc-service-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — Registry Run Key

**What it does:** Attackers add entries to Windows Registry run keys so their payload executes every time a user logs in. No special privileges required for HKCU; HKLM requires admin. One of the most common persistence mechanisms.

**MITRE:** T1547.001 — Boot or Logon Autostart Execution: Registry Run Keys
**Targets:** Windows Client
**Demo time:** ✅ Fast (~10 seconds)

---

### Give it a try

**Step 1 — Add a registry run key (user-level, no admin needed)**

```
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RangeDemo" /t REG_SZ /d "cmd.exe /c whoami" /f
```

**Step 2 — Verify it was added**

```
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RangeDemo"
```

**Step 3 — Cleanup after demo**

```
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RangeDemo" /f
```

---

📸 **Screenshot:** `screenshots/05-persistence/03-registry-run.png`
*Show: reg add and reg query confirming the run key entry*

**What Cortex sees**
> **Alert:** Script file added to startup-related Registry keys · Execution of an uncommon process at an early startup stage
> **Severity:** Medium | **MITRE:** T1547.001

📸 **Screenshot:** `screenshots/05-persistence/03-registry-run-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — crontab: Linux Cron Persistence

**What it does:** Attackers add cron jobs on Linux to execute commands on a schedule. These survive reboots and run as whatever user owns the crontab. Very common in Linux post-exploitation.

**MITRE:** T1053.003 — Scheduled Task/Job: Cron
**Targets:** Linux
**Demo time:** ✅ Fast (~15 seconds)

---

### Give it a try

**Step 1 — Add a cron job on the Linux target (via your shell on the target)**

```
(crontab -l 2>/dev/null; echo "* * * * * whoami > /tmp/rangedemo.txt") | crontab -
```

**Step 2 — Verify the cron entry**

```
crontab -l
```

**Step 3 — Cleanup after demo**

```
crontab -r
```

**What to look for:** The entry appears in `crontab -l`. The demo file `/tmp/rangedemo.txt` will be created each minute.

---

📸 **Screenshot:** `screenshots/05-persistence/04-crontab.png`
*Show: crontab -l showing the added entry*

**What Cortex sees**
> **Alert:** Suspicious systemd timer activity *(if systemd-based)* · Multiple discovery-like commands
> **Severity:** Medium | **MITRE:** T1053.003

📸 **Screenshot:** `screenshots/05-persistence/04-crontab-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — systemd Timer: Linux Systemd Persistence

**What it does:** A more sophisticated Linux persistence method using systemd unit files. Attackers create a `.service` and `.timer` file that the system runs automatically — harder to notice than a crontab entry and loads at system startup.

**MITRE:** T1053.006 — Scheduled Task/Job: Systemd Timers
**Targets:** Linux
**Demo time:** ⚠️ Moderate (~1 minute)

---

### Give it a try

**Step 1 — Create a simple service unit on the Linux target**

```
echo -e "[Unit]\nDescription=Range Demo\n[Service]\nExecStart=/bin/sh -c 'whoami >> /tmp/sdemo.txt'\n[Install]\nWantedBy=multi-user.target" | sudo tee /etc/systemd/system/rangedemo.service
```

**Step 2 — Reload systemd and enable the service**

```
sudo systemctl daemon-reload && sudo systemctl enable rangedemo.service
```

**Step 3 — Cleanup after demo**

```
sudo systemctl disable rangedemo.service && sudo rm /etc/systemd/system/rangedemo.service && sudo systemctl daemon-reload
```

**What to look for:** Service appears in `systemctl list-unit-files | grep rangedemo`.

---

📸 **Screenshot:** `screenshots/05-persistence/05-systemd.png`
*Show: systemctl enable output and unit file listing confirming persistence*

**What Cortex sees**
> **Alert:** Suspicious systemd timer activity · Installation of a new System-V service
> **Severity:** Medium | **MITRE:** T1053.006

📸 **Screenshot:** `screenshots/05-persistence/05-systemd-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
