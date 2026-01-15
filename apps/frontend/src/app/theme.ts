import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4f46e5",
    },
    secondary: {
      main: "#0f172a",
    },
    background: {
      default: "#f8fafc",
    },
  },
  typography: {
    fontFamily: "\"Inter\", system-ui, -apple-system, sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
});
