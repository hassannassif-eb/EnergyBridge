import { memo } from 'react';
import loginStub from './login-stub.html?raw';
import overlays from './overlays.html?raw';
import modals from './modals.html?raw';

/** Global chrome the engine expects to exist:
 *  - the old login screen, kept in the DOM but permanently hidden
 *    (several engine functions reference its elements; login itself is
 *    now handled by the dev team's software)
 *  - loading / sync overlays
 *  - the shared modal, WAN details popup, and toast (verbatim). */
const LegacyChrome = memo(
  () => (
    <>
      <div style={{ display: 'none' }} aria-hidden="true"
           dangerouslySetInnerHTML={{ __html: loginStub }} />
      <div style={{ display: 'contents' }}
           dangerouslySetInnerHTML={{ __html: overlays }} />
      <div style={{ display: 'contents' }}
           dangerouslySetInnerHTML={{ __html: modals }} />
    </>
  ),
  () => true // never re-render — the engine owns this DOM
);
export default LegacyChrome;
