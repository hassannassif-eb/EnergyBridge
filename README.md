# EB IP Manager v14 — React Edition (Phase 2)

Your EB IP Manager as a React application. **All sections work exactly as in
your V14 file** — Dashboard, Real IP Subnets, Internal (Fake IP), WAN
Solutions, VLAN Tracking, IP Tunnels, VPN, DSP Providers, Client Search, and
Credentials — with the same look, tables, filters, pagination, modals, and
Excel export.

**Removed on purpose (as requested):**
- The **login page** — your dev team's software handles users and login.
- The **User Permissions page** — same reason. (The 39-key permission system
  is still inside the code, ready for the dev team to connect.)

## How to run it

Needs Node.js (https://nodejs.org — LTS version).

1. Open a terminal in this folder
2. `npm install`   (first time only)
3. `npm run dev`   → open the address it prints
4. `npm run build` → production website in `dist/` for any web server

The app opens straight to the Dashboard — no login. Right now it runs with an
**in-memory demo backend**: you can add/edit/delete everything and it works,
but the data resets when you close the page. Permanent saving is the dev
team's database step.

## Test it yourself

`node test/smoke.mjs` — boots the whole app and checks 35 things
(every section renders, navigation works, adding data works, background
refresh keeps your edits, and more).

## ▶ FOR THE DEV TEAM — the two integration points

Everything you need to connect is in **two small files**, heavily commented:

| File | What you connect there |
|---|---|
| `public/legacy/pre.js` | **The database.** Implement `window.EB_BACKEND(action, payload)`. Every read/write the app makes arrives here as one call with an action name and payload. Response shapes are documented in the file. Replace the default in-memory version with calls to your API. |
| `public/legacy/boot.js` | **Login / users.** Provide `window.EB_AUTH = { username, role, perms, onSignOut }` from your software before the app loads. The original permission system (`PERM_KEYS` in core.js) is intact — pass a perms object and every button/section obeys it exactly as in V14. |

## Project structure

```
src/
  sections/          ← one React component per section (your migration seams)
    Dashboard.jsx, RealIpSubnet.jsx, FakeIpSubnet.jsx, WanSolutions.jsx,
    VlanTracking.jsx, IpTunnels.jsx, Vpn.jsx, DspProviders.jsx,
    ClientSearch.jsx, Credentials.jsx
  engine/
    SectionHost.jsx  ← bridge: a section asks the proven V14 engine to render it
    loadEngine.js    ← loads the engine scripts in the original order
  chrome/            ← topbar / sidebar / modals (original markup, verbatim)
  legacy/app.css     ← original V14 styles, byte-identical
public/legacy/
  core.js            ← original V14 main script — BYTE-IDENTICAL, do not edit
  patch.js           ← original V14 "Final Patch" — BYTE-IDENTICAL, do not edit
  pre.js             ← integration: DATABASE hook (dev team edits this)
  boot.js            ← integration: AUTH hook (dev team edits this)
test/smoke.mjs       ← 35-check functional test
```

### How the dev team converts a section to "pure React" later
Each file in `src/sections/` is that section's seam. To take one over,
rewrite its component with real JSX/state and stop using `SectionHost` for
it — all other sections keep running on the proven engine. The corresponding
original logic to port lives in `core.js`/`patch.js` (search for
`renderWan`, `renderVlan`, etc.). One section at a time, zero big-bang risk.
