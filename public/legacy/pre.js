/* ============================================================
 * EB IP Manager v14 — Integration layer (part 1 of 2)
 * Loads BEFORE the original application engine (core.js).
 *
 * ▶▶▶ DEV TEAM: THIS IS YOUR DATABASE INTEGRATION POINT ◀◀◀
 *
 * The original app sent every backend request as:
 *     POST { action, user, password, payload }  →  Google Apps Script
 *
 * All of that traffic is now routed to  window.EB_BACKEND(action, payload).
 * Replace the DEFAULT_BACKEND below (or assign your own function to
 * window.EB_BACKEND before this file loads) and connect it to your
 * database / API. Return a plain object; shapes are documented per action.
 *
 * Until you do, the app runs fully in-memory: every add/edit/delete works
 * and persists for the browser session (nothing is saved permanently).
 * ============================================================ */
(function () {
  'use strict';

  // The engine reads its backend URL from localStorage at load time.
  // We seed a sentinel value so the app never shows the old
  // "First-time setup — paste your Apps Script URL" banner, and so we can
  // recognize and intercept every backend call below.
  var EB_SENTINEL_URL = 'https://script.google.com/__eb_react_backend__';
  try { localStorage.setItem('eb_api_url', EB_SENTINEL_URL); } catch (e) {}

  /* ------------------------------------------------------------
   * DEFAULT in-memory backend (dev team replaces this)
   * ------------------------------------------------------------
   * Response shapes the app expects:
   *
   * 'login'          → { ok:true, role:'admin'|'editor'|'viewer', perms:{...} }
   * 'getAll'         → { ok:true, data:{ subnets:{}, internalSubnets:{},
   *                       wan:[], tunnels:[], vpn:[], vlans:[],
   *                       vlanCdnList:[], vlanReservedRanges:[], dspList:[] } }
   * 'getCredentials' → { ok:true, data:[...], nodeTypes:[...], categories:[...] }
   * every write action (assign, saveWan, saveVlan, saveDSP, saveCredential,
   * deleteX, batchX, ...) → { ok:true }   (or { ok:false, error:'message' })
   * ------------------------------------------------------------ */
  function DEFAULT_BACKEND(action, payload) {
    // The app's live in-memory state is the engine's top-level `let db`
    // (classic scripts share the global lexical scope, so we can read it
    // here at call time). NOTE: window.db is a different, mostly-empty
    // object — do not use it.
    var _db = (typeof db !== 'undefined') ? db : {};

    if (action === 'login') {
      // Grant every permission EXCEPT the removed User Permissions page.
      // PERM_KEYS is defined by the engine (available by the time login runs).
      var perms = {};
      var keys = (typeof PERM_KEYS !== 'undefined') ? PERM_KEYS : [];
      keys.forEach(function (k) { perms[k] = true; });
      perms.manageUsers = false;   // page removed — dev team's software owns users
      perms.seeUsers = false;
      var auth = window.EB_AUTH || {};
      return { ok: true, role: auth.role || 'editor', perms: auth.perms || perms };
    }

    if (action === 'getAll') {
      // Echo the live in-memory state back, so the periodic background
      // refresh keeps whatever was edited during this session.
      return { ok: true, data: {
        subnets: _db.subnets || {},
        internalSubnets: _db.internalSubnets || {},
        wan: _db.wan || [],
        tunnels: _db.tunnels || [],
        vpn: _db.vpn || [],
        vlans: _db.vlans || [],
        vlanCdnList: _db.vlanCdnList || [],
        vlanReservedRanges: _db.vlanReservedRanges || [],
        dspList: _db.dspList || []
      } };
    }

    if (action === 'getCredentials') {
      return { ok: true,
        data: _db.credentials || [],
        nodeTypes: _db.credNodeTypes || undefined,
        categories: _db.credCategories || undefined };
    }

    // Every write action: acknowledge. The app already updated its own
    // in-memory state optimistically; the dev team's real backend should
    // persist `payload` here and return { ok:true }.
    if (!DEFAULT_BACKEND._warned) {
      DEFAULT_BACKEND._warned = true;
      console.info('[EB IP Manager] Running with the in-memory demo backend. ' +
        'Data is NOT saved permanently. Dev team: implement window.EB_BACKEND ' +
        '(see public/legacy/pre.js).');
    }
    return { ok: true };
  }

  if (!window.EB_BACKEND) window.EB_BACKEND = DEFAULT_BACKEND;

  /* ------------------------------------------------------------
   * Route ALL of the original app's backend calls (both its api()
   * helper and its direct fetch() calls) into window.EB_BACKEND,
   * without modifying a single line of the original engine.
   * ------------------------------------------------------------ */
  var _nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (url === EB_SENTINEL_URL) {
      var action = '', payload = {};
      try {
        var body = JSON.parse((opts && opts.body) || '{}');
        action = body.action || '';
        payload = body.payload || {};
      } catch (e) {}
      return Promise.resolve(window.EB_BACKEND(action, payload)).then(function (result) {
        return new Response(JSON.stringify(result || { ok: false, error: 'Empty backend response' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
    }
    return _nativeFetch(url, opts);
  };
})();
