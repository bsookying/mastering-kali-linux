/**
 * capture-07-c2.js
 * Captures automatable C2 tool screenshots.
 * Meterpreter (tool 4) requires manual capture — see guide.
 * Credentials loaded from secrets/range.env
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ENV_FILE = path.join(__dirname, '..', 'secrets', 'range.env');
if (!fs.existsSync(ENV_FILE)) { console.error('Missing secrets/range.env'); process.exit(1); }
const VARS = Object.fromEntries(
  fs.readFileSync(ENV_FILE, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const KALI_TERMINAL = `http://${VARS.KALI_IP}:7681`;
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '07-command-and-control');

function sub(cmd) { return cmd.replace(/<(\w+)>/g, (_, k) => VARS[k] ?? `<${k}>`); }
async function typeCmd(page, cmd) {
  await page.click('.xterm-helper-textarea, canvas, textarea').catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.type(sub(cmd), { delay: 25 });
  await page.keyboard.press('Enter');
}
async function wait(page, ms) { await page.waitForTimeout(ms); }
async function shot(page, f) {
  await wait(page, 800);
  await page.screenshot({ path: path.join(SHOTS_DIR, f) });
  console.log(`  📸 ${f}`);
}
async function clear(page) { await typeCmd(page, 'clear'); await wait(page, 600); }

async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page    = await (await browser.newContext()).newPage();
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(KALI_TERMINAL, { waitUntil: 'networkidle', timeout: 15000 });
  await wait(page, 2000);

  // ── 01: Python HTTP server ─────────────────────────────────────────────
  console.log('\n[1] Python HTTP server...');
  await clear(page);
  await typeCmd(page, 'python3 -m http.server 8080 &');
  await wait(page, 3000);
  await typeCmd(page, 'curl -s http://127.0.0.1:8080/ | head -5');
  await wait(page, 5000);
  await shot(page, '01-python-http-server.png');
  await typeCmd(page, 'pkill -f "http.server 8080" 2>/dev/null; echo "stopped"');
  await wait(page, 3000);

  // ── 02: netcat listener (show setup, can't auto-trigger) ──────────────
  console.log('\n[2] netcat listener (showing setup)...');
  await clear(page);
  await typeCmd(page, 'nc -lvnp 4444 &');
  await wait(page, 3000);
  await typeCmd(page, 'nc -zv 127.0.0.1 4444 && echo "Port 4444 listening"');
  await wait(page, 5000);
  await shot(page, '02-netcat-reverse-shell.png');
  await typeCmd(page, 'pkill -f "nc -lvnp 4444" 2>/dev/null; echo "stopped"');
  await wait(page, 3000);

  // ── 03: chisel server startup ─────────────────────────────────────────
  console.log('\n[3] chisel server...');
  await clear(page);
  await typeCmd(page, 'chisel --version && chisel server --reverse --port 8888 &');
  await wait(page, 5000);
  await shot(page, '03-chisel-tunnel.png');
  await typeCmd(page, 'pkill chisel 2>/dev/null; echo "stopped"');
  await wait(page, 3000);

  // ── 04: meterpreter - manual only note ───────────────────────────────
  console.log('\n[4] Metasploit - show msfvenom help (manual session capture needed)...');
  await clear(page);
  await typeCmd(page, 'msfvenom --list formats 2>/dev/null | head -20');
  await wait(page, 15000);
  await shot(page, '04-msfvenom-formats.png');

  // ── 05: PowerShell reverse shell - show on Kali side only ────────────
  console.log('\n[5] PowerShell shell listener setup...');
  await clear(page);
  await typeCmd(page, 'nc -lvnp 9001 &');
  await wait(page, 3000);
  await typeCmd(page, 'echo "Listener ready on port 9001 — trigger the PowerShell one-liner from Windows target" && jobs');
  await wait(page, 3000);
  await shot(page, '05-ps-reverse-shell.png');
  await typeCmd(page, 'pkill -f "nc -lvnp 9001" 2>/dev/null; echo "stopped"');
  await wait(page, 3000);

  await browser.close();
  console.log('\n✅ C2 screenshots done.');
  console.log('⚠️  Tool 4 (Meterpreter full session) requires manual capture — see guide for tmux instructions.');
}

run().catch(err => { console.error(err); process.exit(1); });
