import { createTheme } from '@mui/material/styles';

// MUI theme mapped onto the original V14 design tokens so MUI
// components (dialogs, snackbars, checkboxes...) blend with the
// ported CSS. The layout/tables keep the original stylesheet.
export const tokens = {
  bg: '#0d1117', bg2: '#161b22', bg3: '#1c2128',
  border: '#30363d', border2: '#444c56',
  text: '#e6edf3', text2: '#8b949e', text3: '#6e7681',
  accent: '#00b4d8', accent2: '#0077b6',
  green: '#3fb950', red: '#f85149', yellow: '#d29922',
  purple: '#bc8cff', orange: '#ffa657', teal: '#2dd4bf'
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: tokens.bg, paper: tokens.bg2 },
    primary: { main: tokens.accent, dark: tokens.accent2 },
    error: { main: tokens.red },
    success: { main: tokens.green },
    warning: { main: tokens.yellow },
    divider: tokens.border,
    text: { primary: tokens.text, secondary: tokens.text2 }
  },
  typography: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 13
  },
  shape: { borderRadius: 8 },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: tokens.bg2,
          border: `1px solid ${tokens.border}`,
          borderRadius: 12
        }
      }
    },
    MuiCheckbox: {
      styleOverrides: { root: { color: tokens.text3, padding: 4 } }
    },
    MuiRadio: {
      styleOverrides: { root: { color: tokens.text3, padding: 4 } }
    }
  }
});
