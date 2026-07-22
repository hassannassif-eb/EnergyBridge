/* Loads the application engine in the exact order of the original file:
 *   pre.js  → integration (backend routing) — dev team's database hook
 *   core.js → original main script (verbatim, unchanged)
 *   patch.js→ original "Final Patch" script (verbatim, unchanged)
 *   boot.js → integration (session, sign-out, React navigation bridge)
 * Classic (non-module) scripts, so every function stays global exactly
 * like the original single-file app. */
import '../styles/login.css';
import '../styles/navbar.css';
import '../styles/Dashboard.css';
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // preserve execution order
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

let enginePromise = null;

export function loadEngine() {
  if (!enginePromise) {
    enginePromise = loadScript('/legacy/pre.js')
      .then(() => loadScript('/legacy/core.js'))
      .then(() => loadScript('/legacy/patch.js'))
      .then(() => loadScript('/legacy/boot.js'));
  }
  return enginePromise;
}
