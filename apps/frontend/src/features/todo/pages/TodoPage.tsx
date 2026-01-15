import { Box, Container, Typography } from "@mui/material";

export const TodoPage = () => {
  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Todo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Keep track of household tasks and assignments.
        </Typography>
      </Container>
    </Box>
  );
};
