import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",

    primary: {
      main: "#4f46e5", // modern indigo (professional SaaS color)
    },

    background: {
      default: "#0D1117", // deep navy background
      paper: "#161822",   // card/sidebar background
    },

    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },

    divider: "#1f2937",
  },

  typography: {
    fontFamily: "Inter, system-ui, Arial",
    
  },

  shape: {
    borderRadius: 10,
  
  },
});

export default theme;