/**
 * capture-01-discovery.js
 * Runs each discovery tool in the Kali ttyd terminal and captures screenshots.
 * Credentials and IPs are loaded from secrets/range.env — never hardcoded here.
 *
 * Usage:
 *   node scripts/capture-01-discovery.js
 *
 * secrets/range.env format:
 *   DC_IP=x.x.x.x
 *   WIN_CLIENT_IP=x.x.x.x
 *   LINUX_IP=x.x.x.x
 *   KALI_IP=x.x.x.x
 *   SUBNET_CIDR=x.x.x.x/xx
 *   DOMAIN=yourdomain.local
 *   USERNAME=administrator
 *   PASSWORD=...
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

// ── Load range variables from secrets/range.env ──────────────────────────────
const ENV_FILE = path.join(__dirname, '..', 'secrets', 'range.env');
if (!fs.existsSync(ENV_FILE)) {
  console.error(`Missing: ${ENV_FILE}\nCreate it with DC_IP, WIN_CLIENT_IP, LINUX_IP, KALI_IP, SUBNET_CIDR, DOMAIN, USERNAME, PASSWORD`);
  process.exit(1);
}
const VARS = Object.fromEntries(
  fs.readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const KALI_TERMINAL = `http://${VARS.KALI_IP}:7681`;
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '01-discovery');

// ── Helpers ──────────────────────────────────────────────────────────────────
function sub(cmd) {
  return cmd.replace(/<(\w+)>/g, (_, k) => VARS[k] ?? `<${k}>`);
}

async function typeCmd(page, cmd) {
  await page.click('.xterm-helper-textarea, canvas, textarea').catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.type(sub(cmd), { delay: 30 });
  await page.keyboard.press('Enter');
}

async function waitForPrompt(page, timeout = 90000) {
  await page.waitForFunction(() => {
    const text = document.querySelector('.xterm-rows')?.innerText ?? '';
    const lines = text.trim().split('\n');
    const last  = lines.filter(l => l.trim()).slice(-1)[0] ?? '';
    return last.includes('$') || last.includes('#');
  }, { timeout });
}

async function shot(page, filename, waitMs = 500) {
  await page.waitForTimeout(waitMs);
  const p = path.join(SHOTS_DIR, filename);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${filename}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page    = await (await browser.newContext()).newPage();
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(KALI_TERMINAL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // ── 01: Ping sweep ──────────────────────────────────────────────────────
  console.log('\n[1] nmap ping sweep...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'sudo nmap -sn <SUBNET_CIDR>');
  await waitForPrompt(page, 60000);
  await shot(page, '01-nmap-ping-sweep.png');

  // ── 02: Port scan — DC ──────────────────────────────────────────────────
  console.log('\n[2] nmap port scan DC...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'sudo nmap -sV -sC -p 22,53,80,88,135,139,389,443,445,464,636,3268,3269,3389,5985 <DC_IP>');
  await waitForPrompt(page, 120000);
  await shot(page, '02-nmap-portscan-dc.png');

  // ── 02b: Port scan — Linux ──────────────────────────────────────────────
  console.log('\n[2b] nmap port scan Linux...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'sudo nmap -sV -sC -p 22,80,443,3306,5432,8080,8443 <LINUX_IP>');
  await waitForPrompt(page, 60000);
  await shot(page, '02-nmap-portscan-linux.png');

  // ── 03: SMB scripts ─────────────────────────────────────────────────────
  console.log('\n[3] nmap SMB scripts...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'sudo nmap -p 445 --script smb2-security-mode,smb-os-discovery,smb-enum-shares <DC_IP>');
  await waitForPrompt(page, 60000);
  await shot(page, '03-nmap-smb-scripts.png');

  // ── 04: enum4linux-ng ───────────────────────────────────────────────────
  console.log('\n[4] enum4linux-ng (allow ~2 min)...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'enum4linux-ng -A <DC_IP>');
  await waitForPrompt(page, 180000);
  await shot(page, '04-enum4linux-full.png');

  // Show users section specifically
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'enum4linux-ng -A <DC_IP> 2>/dev/null | grep -A 30 "users via RPC"');
  await waitForPrompt(page, 180000);
  await shot(page, '04-enum4linux-users.png');

  // ── 05: netexec sweep ───────────────────────────────────────────────────
  console.log('\n[5] netexec SMB sweep...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'netexec smb <SUBNET_CIDR>');
  await waitForPrompt(page, 60000);
  await shot(page, '05-netexec-smb-sweep.png');

  // netexec user enum
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'netexec smb <DC_IP> -u <USERNAME> -p <PASSWORD> --users');
  await waitForPrompt(page, 60000);
  await shot(page, '05-netexec-users.png');

  // ── 06: bloodhound-python ───────────────────────────────────────────────
  console.log('\n[6] bloodhound-python collection (allow 5 min)...');
  await typeCmd(page, 'clear');
  await page.waitForTimeout(500);
  await typeCmd(page, 'mkdir -p /tmp/bh-output && bloodhound-python -u <USERNAME> -p <PASSWORD> -d <DOMAIN> -ns <DC_IP> -c All --zip -o /tmp/bh-output');
  await waitForPrompt(page, 600000);
  await shot(page, '06-bloodhound-collection.png');

  await browser.close();
  console.log('\n✅ Done — screenshots saved to guides/screenshots/01-discovery/');
}

run().catch(err => { console.error(err); process.exit(1); });
