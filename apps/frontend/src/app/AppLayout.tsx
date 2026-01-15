import { BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const navigationItems = [
  { label: "Home", value: "/app/home" },
  { label: "Calendar", value: "/app/calendar" },
  { label: "Todo", value: "/app/todo" },
  { label: "Shopping list", value: "/app/shopping-list" },
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const current = useMemo(
    () => navigationItems.find((item) => location.pathname.startsWith(item.value))?.value ?? null,
    [location.pathname]
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box component="main" sx={{ flex: 1, pb: 9 }}>
        <Outlet />
      </Box>
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <BottomNavigation
          showLabels
          value={current}
          onChange={(_, nextValue) => {
            if (nextValue) {
              navigate(nextValue);
            }
          }}
        >
          {navigationItems.map((item) => (
            <BottomNavigationAction key={item.value} label={item.label} value={item.value} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};
