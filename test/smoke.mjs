/* Functional smoke test — boots the full EB IP Manager engine in jsdom
 * with the exact DOM the React app renders, then exercises every section
 * and a live add/edit operation. Run: node test/smoke.mjs */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');

// ---- Assemble the DOM exactly as the React app renders it ----
const bodyHtml = `
<div id="root">
  <div style="display:none" aria-hidden="true">${read('src/chrome/login-stub.html')}</div>
  ${read('src/chrome/overlays.html')}
  ${read('src/chrome/modals.html')}
  ${read('src/chrome/topbar.html')}
  <div class="layout" id="app-layout" style="display:none">
    ${read('src/chrome/sidebar.html')}
    <div class="main" id="main-content"></div>
  </div>
</div>`;

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;

// jsdom lacks a few browser globals the app uses — provide real ones
window.fetch = (...a) => globalThis.fetch(...a); // pre.js wraps this; sentinel calls never reach the network
window.Response = globalThis.Response;
window.alert = (m) => console.log('  [alert]', String(m).split('\n')[0]);
window.confirm = () => true;

// ---- Load the four scripts in the same order as loadEngine.js ----
for (const f of ['pre.js', 'core.js', 'patch.js', 'boot.js']) {
  const s = document.createElement('script');
  s.textContent = read('public/legacy/' + f);
  document.body.appendChild(s);
}

// ---- Simulate the React bridge (App.jsx + SectionHost) ----
let currentRoute = null;
document.addEventListener('eb:navigate', (e) => {
  currentRoute = e.detail;
  document.getElementById('main-content').innerHTML = ''; // section remount
  window.__EB.showPage(e.detail.page, e.detail.param);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

// ---- Boot (same call App.jsx makes) ----
window.__EB.boot();
await sleep(300); // loadAllData is async

const mc = () => document.getElementById('main-content').innerHTML;

console.log('— Boot & session —');
check("engine booted without crashing", !!window.__EB.getDb());
check('session created (no login page)', window.__EB.booted === true);
check('topbar shown', document.getElementById('topbar').style.display === 'flex');
check('app layout shown', document.getElementById('app-layout').style.display === 'flex');
check('user label = dev-team', document.getElementById('user-label').textContent === 'dev-team');
check('login screen hidden', document.getElementById('login-screen').classList.contains('hidden'));
check('setup banner NOT shown', !document.getElementById('setup-banner').classList.contains('show'));

console.log('— Sidebar —');
check('4 Real IP subnets in nav', document.querySelectorAll('#subnet-nav-items .nav-item').length === 4);
check('Internal nav rendered', document.getElementById('internal-nav-items').innerHTML.length > 0);
check('User Permissions nav absent', !document.getElementById('nav-users'));
check('all main nav items visible', ['nav-wan','nav-vlan','nav-tunnels','nav-vpn','nav-credentials','nav-search','nav-dsp']
  .every(id => document.getElementById(id) && document.getElementById(id).style.display !== 'none'));

console.log('— Dashboard (first page) —');
check('routed to dashboard', currentRoute && currentRoute.page === 'dashboard');
check('dashboard rendered stat cards', mc().includes('stat-card'));

console.log('— Navigate to every section (delegated clicks, like real use) —');
const clickNav = (id) => { document.getElementById(id).dispatchEvent(new window.Event('click', { bubbles: true })); };
const cases = [
  ['nav-wan', 'WAN Solutions'], ['nav-vlan', 'VLAN'], ['nav-tunnels', 'Tunnels'],
  ['nav-vpn', 'VPN'], ['nav-credentials', 'Credentials'], ['nav-search', 'Client Search'], ['nav-dsp', 'DSP'],
];
for (const [id, expect] of cases) {
  clickNav(id);
  await sleep(20);
  check(`${id} → page renders "${expect}"`, mc().includes(expect));
  check(`${id} → nav item marked active`, document.getElementById(id).classList.contains('active'));
}
// Real IP subnet page via its dynamic nav item
clickNav('nav-subnet-5-100-240-0');
await sleep(20);
check('Real IP subnet page renders', mc().includes('5.100.240.0') && mc().includes('table'));
check('subnet nav active', document.getElementById('nav-subnet-5-100-240-0').classList.contains('active'));

console.log('— Live data operation (add a DSP provider, in-memory backend) —');
clickNav('nav-dsp');
await sleep(20);
const before = window.__EB.getDb().dspList.length;
window.openAddDSP();
check('Add DSP modal opened', document.getElementById('modal-overlay').classList.contains('open'));
document.getElementById('f_dsp_name').value = 'TESTNET';
await window.doAddDSP();
await sleep(50);
check('DSP added to in-memory data', window.__EB.getDb().dspList.length === before + 1 && window.__EB.getDb().dspList.includes('TESTNET'));
check('DSP page shows new provider', mc().includes('TESTNET'));
check('sidebar DSP badge updated', document.getElementById('badge-dsp').textContent === String(before + 1));

console.log('— Silent 30s refresh must NOT wipe in-session edits —');
window.__test_refresh_done = false;
// invoke the same getAll round-trip the background timer runs
await window.fetch('https://script.google.com/__eb_react_backend__', { method: 'POST',
  body: JSON.stringify({ action: 'getAll', payload: {} }) })
  .then(r => r.json()).then(res => {
    check('getAll echoes live data (TESTNET survives refresh)', res.ok && res.data.dspList.includes('TESTNET'));
  });

console.log('— Sign out is a safe hook (no dead login screen) —');
window.confirmSignOut();
check('app still visible after sign-out click', document.getElementById('app-layout').style.display === 'flex');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
