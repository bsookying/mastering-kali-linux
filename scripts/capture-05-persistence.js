/**
 * capture-05-persistence.js
 * Windows techniques run via netexec -x on the target.
 * Linux techniques run via SSH.
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
const SHOTS_DIR     = path.join(__dirname, '..', 'guides', 'screenshots', '05-persistence');

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

  // ── 01: schtasks via netexec ──────────────────────────────────────────────
  console.log('\n[1] schtasks (via netexec)...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "schtasks /create /tn RangeDemo /tr cmd.exe /sc onlogon /ru SYSTEM /f && schtasks /query /tn RangeDemo"');
  await wait(page, 20000);
  await shot(page, '01-schtasks.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "schtasks /delete /tn RangeDemo /f"');
  await wait(page, 10000);

  // ── 02: sc.exe service ───────────────────────────────────────────────────
  console.log('\n[2] sc.exe service (via netexec)...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "sc create RangeDemo binPath= cmd.exe start= auto && sc query RangeDemo"');
  await wait(page, 20000);
  await shot(page, '02-sc-service.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "sc delete RangeDemo"');
  await wait(page, 10000);

  // ── 03: Registry run key ─────────────────────────────────────────────────
  console.log('\n[3] Registry run key (via netexec)...');
  await clear(page);
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "reg add \\"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\" /v RangeDemo /t REG_SZ /d cmd.exe /f && reg query \\"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\" /v RangeDemo"');
  await wait(page, 20000);
  await shot(page, '03-registry-run.png');
  // Cleanup
  await typeCmd(page, 'netexec smb <WIN_CLIENT_IP> -u <USERNAME> -p \'<PASSWORD>\' -x "reg delete \\"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\" /v RangeDemo /f"');
  await wait(page, 10000);

  // ── 04: crontab on Linux ─────────────────────────────────────────────────
  console.log('\n[4] crontab on Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "(crontab -l 2>/dev/null; echo '* * * * * whoami > /tmp/rangedemo.txt') | crontab - && crontab -l"`);
  await wait(page, 15000);
  await shot(page, '04-crontab.png');
  // Cleanup
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "crontab -r 2>/dev/null; echo cleaned"`);
  await wait(page, 5000);

  // ── 05: systemd timer on Linux ───────────────────────────────────────────
  console.log('\n[5] systemd service on Linux target...');
  await clear(page);
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "echo -e '[Unit]\\nDescription=Range Demo\\n[Service]\\nExecStart=/bin/sh -c whoami\\n[Install]\\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/rangedemo.service && sudo systemctl daemon-reload && sudo systemctl enable rangedemo.service && systemctl list-unit-files | grep rangedemo"`);
  await wait(page, 20000);
  await shot(page, '05-systemd.png');
  // Cleanup
  await typeCmd(page, `ssh -o StrictHostKeyChecking=no ${VARS.USERNAME}@${VARS.LINUX_IP} "sudo systemctl disable rangedemo.service 2>/dev/null; sudo rm -f /etc/systemd/system/rangedemo.service; sudo systemctl daemon-reload; echo cleaned"`);
  await wait(page, 10000);

  await browser.close();
  console.log('\n✅ Persistence screenshots done.');
}

run().catch(err => { console.error(err); process.exit(1); });
