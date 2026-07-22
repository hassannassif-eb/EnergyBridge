import { useLayoutEffect } from 'react';

/**
 * SectionHost — renders one section of the app.
 *
 * Every section component (Dashboard, WAN, VLAN Tracking, ...) mounts this
 * host. It provides the section's content area (#main-content, same id and
 * class as the original app) and asks the original, fully-tested engine to
 * render the section into it — pixel-for-pixel and behavior-for-behavior
 * identical to the V14 single-file app.
 *
 * DEV TEAM: to take over a section with real JSX later, replace its
 * component in src/sections/ — everything else keeps working.
 */
export default function SectionHost({ page, param = null }) {
  useLayoutEffect(() => {
    if (window.__EB) window.__EB.showPage(page, param);
  }, [page, param]);

  return <div className="main" id="main-content"></div>;
}
