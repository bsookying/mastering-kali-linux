/**
 * capture-03-lateral-movement.js
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '03-lateral-movement');

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

  // ── 01: evil-winrm ───────────────────────────────────────────────────────
  console.log('\n[1] evil-winrm...');
  await clear(page);
  await typeCmd(page, 'evil-winrm -i <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\'');
  await wait(page, 20000);
  await typeCmd(page, 'whoami');
  await wait(page, 5000);
  await shot(page, '01-evil-winrm.png');
  await typeCmd(page, 'exit');
  await wait(page, 3000);

  // ── 02: netexec PTH ──────────────────────────────────────────────────────
  console.log('\n[2] netexec PTH sweep...');
  await clear(page);
  await typeCmd(page, 'netexec smb <SUBNET_CIDR> -u <USERNAME> -p \'<PASSWORD>\'');
  await wait(page, 30000);
  await shot(page, '02-netexec-pth.png');

  // ── 03: psexec ───────────────────────────────────────────────────────────
  console.log('\n[3] impacket-psexec...');
  await clear(page);
  await typeCmd(page, 'impacket-psexec <DOMAIN>/<USERNAME>:\'<PASSWORD>\'@<WIN_CLIENT_IP> -c "whoami && hostname"');
  await wait(page, 30000);
  await shot(page, '03-psexec.png');

  // ── 04: wmiexec ──────────────────────────────────────────────────────────
  console.log('\n[4] impacket-wmiexec...');
  await clear(page);
  await typeCmd(page, 'impacket-wmiexec <DOMAIN>/<USERNAME>:\'<PASSWORD>\'@<WIN_CLIENT_IP> "whoami && hostname"');
  await wait(page, 30000);
  await shot(page, '04-wmiexec.png');

  // ── 05: smbexec ──────────────────────────────────────────────────────────
  console.log('\n[5] impacket-smbexec...');
  await clear(page);
  await typeCmd(page, 'impacket-smbexec <DOMAIN>/<USERNAME>:\'<PASSWORD>\'@<WIN_CLIENT_IP>');
  await wait(page, 20000);
  await typeCmd(page, 'whoami');
  await wait(page, 10000);
  await shot(page, '05-smbexec.png');
  await page.keyboard.press('Control+C');
  await wait(page, 2000);

  await browser.close();
  console.log('\n✅ Lateral movement screenshots done.');
}

run().catch(err => { console.error(err); process.exit(1); });
