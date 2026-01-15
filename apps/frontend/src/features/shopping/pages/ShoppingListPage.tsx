import { Box, Container, Typography } from "@mui/material";

export const ShoppingListPage = () => {
  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Shopping list
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Plan groceries and household essentials here.
        </Typography>
      </Container>
    </Box>
  );
};
