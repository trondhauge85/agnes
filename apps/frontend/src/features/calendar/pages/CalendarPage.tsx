import { Box, Container, Typography } from "@mui/material";

export const CalendarPage = () => {
  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your upcoming events will appear here.
        </Typography>
      </Container>
    </Box>
  );
};
