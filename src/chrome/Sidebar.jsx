import { memo } from 'react';
import html from './sidebar.html?raw';

/** Sidebar — original markup, verbatim, minus the removed "User Permissions"
 *  entry. The engine fills the Real IP / Internal subnet lists, badges, and
 *  active highlighting exactly as in V14. */
const Sidebar = memo(
  () => <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />,
  () => true // never re-render — the engine owns this DOM
);
export default Sidebar;
