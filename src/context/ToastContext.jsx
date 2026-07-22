import { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// Small toast helper (MUI Snackbar), mirrors V14's toast(msg, type).
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [state, setState] = useState({ open: false, msg: '', severity: 'success' });

  const toast = useCallback((msg, type = 'success') => {
    const severity = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success';
    setState({ open: true, msg, severity });
  }, []);

  const close = () => setState((s) => ({ ...s, open: false }));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={3500}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={close} severity={state.severity} variant="filled" sx={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>
          {state.msg}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
