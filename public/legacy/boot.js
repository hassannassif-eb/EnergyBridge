/* ============================================================
 * EB IP Manager v14 — Integration layer (part 2 of 2)
 * Loads AFTER the original application engine (core.js + patch.js).
 *
 * ▶▶▶ DEV TEAM: THIS IS YOUR LOGIN / AUTH INTEGRATION POINT ◀◀◀
 *
 * The original login page was removed. Before this script loads, your
 * software can define:
 *
 *   window.EB_AUTH = {
 *     username: 'joe',                  // shown in the topbar
 *     role: 'admin'|'editor'|'viewer',  // optional (default 'editor')
 *     perms: { ... },                   // optional — full permission object
 *                                       //   (see PERM_KEYS / PERM_LABELS in core.js;
 *                                       //    the same 39-key permission system is intact)
 *     onSignOut: function(){ ... }      // called when the user clicks Sign out
 *   };
 *
 * If EB_AUTH is not provided, the app runs as a full-access user named
 * "dev-team" with the User Permissions page disabled.
 * ============================================================ */
(function () {
  'use strict';

  var auth = window.EB_AUTH || {};

  /* ---- Session (replaces the removed login page) -------------------- */
  function buildFullPerms() {
    var perms = {};
    var keys = (typeof PERM_KEYS !== 'undefined') ? PERM_KEYS : [];
    keys.forEach(function (k) { perms[k] = true; });
    perms.manageUsers = false;  // User Permissions page removed
    perms.seeUsers = false;
    return perms;
  }

  // `session` is a top-level `let` in core.js — classic scripts share the
  // global lexical scope, so this assignment reaches the engine directly.
  session = {
  username: sessionStorage.getItem("username")  ,
    password: '',
    role: auth.role || 'editor',
    perms: auth.perms || buildFullPerms()
  };

  /* ---- Sign out → dev team hook (login page no longer exists) ------- */
  window.confirmSignOut = function () {
    if (typeof auth.onSignOut === 'function') { auth.onSignOut(); return; }
    toast('Sign-out is handled by your main software', 'success');
  };
  window.doLogout = window.confirmSignOut;
  window.logout = window.confirmSignOut;

  /* ---- Navigation bridge: engine → React ---------------------------- */
  // Save the engine's final (fully patched) showPage. React section
  // components call this original to actually render a page.
  var _showPageOriginal = window.showPage;

  // Every navigation the engine triggers (sidebar clicks, dashboard cards,
  // in-table links, post-save redirects) now flows to React, which mounts
  // the matching section component; that component then invokes the
  // original showPage. Behavior and page state logic are unchanged.
  window.showPage = function (page, param) {
    if (page === 'users') return; // page removed — handled by dev team's software
    document.dispatchEvent(new CustomEvent('eb:navigate', { detail: { page: page, param: param || null } }));
  };

  /* ---- Boot (replaces the old post-login step) ----------------------- */
  window.__EB = {
    showPage: _showPageOriginal,
    // Live application data (the engine's `let db`) — handy for the dev team.
    getDb: function () { return (typeof db !== 'undefined') ? db : null; },
    booted: false,
    boot: function () {
      if (window.__EB.booted) return;
      window.__EB.booted = true;
      // Same sequence the original app ran after a successful login:
      loadAllData().then(function () { showApp(); });
    }
  };
})();
