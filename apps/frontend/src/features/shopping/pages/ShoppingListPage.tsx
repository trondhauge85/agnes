import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { getApiErrorDescriptor } from "../../../shared/api";
import { getSelectedFamilyId } from "../../families/services/familyStorage";
import { fetchFamilyShoppingItems, type FamilyShoppingItem } from "../services/shoppingApi";

export const ShoppingListPage = () => {
  const familyId = getSelectedFamilyId();
  const [items, setItems] = useState<FamilyShoppingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!familyId) {
      return;
    }

    let isActive = true;
    const loadItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchFamilyShoppingItems(familyId);
        if (isActive) {
          setItems(response.items);
        }
      } catch (err) {
        if (isActive) {
          const descriptor = getApiErrorDescriptor(err);
          setError(descriptor.message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      isActive = false;
    };
  }, [familyId]);

  const summary = useMemo(() => {
    const openCount = items.filter((item) => item.status === "open").length;
    const completedCount = items.filter((item) => item.status === "completed").length;
    return { openCount, completedCount };
  }, [items]);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Shopping list
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track groceries, household essentials, and shared purchases.
            </Typography>
          </Box>

          {!familyId ? (
            <Alert severity="warning">Select a family to view shopping items.</Alert>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[
              { label: "Open", value: `${summary.openCount} items`, detail: "Need attention" },
              { label: "Completed", value: `${summary.completedCount} items`, detail: "Done recently" }
            ].map((stat) => (
              <Paper
                key={stat.label}
                elevation={0}
                sx={{
                  flex: 1,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2.5
                }}
              >
                <Typography variant="overline" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {isLoading ? "Loading..." : stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.detail}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Paper
            elevation={0}
            sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
          >
            <Stack spacing={1} sx={{ p: 3, pb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Current list
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Items pulled from your family shopping list.
              </Typography>
            </Stack>
            <Divider />
            <List disablePadding>
              {isLoading ? (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    Loading shopping items...
                  </Typography>
                </ListItem>
              ) : items.length === 0 ? (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    No shopping items yet. Add items in your companion app.
                  </Typography>
                </ListItem>
              ) : (
                items.map((item, index) => (
                  <Box key={item.id}>
                    <ListItem
                      sx={{
                        px: 3,
                        py: 2.5,
                        alignItems: "flex-start",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {item.title}
                          </Typography>
                          <Chip
                            label={item.status === "completed" ? "Completed" : "Open"}
                            size="small"
                            color={item.status === "completed" ? "success" : "warning"}
                            variant="outlined"
                          />
                        </Stack>
                        {item.notes ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {item.notes}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                        <Typography variant="caption" color="text.secondary">
                          Quantity
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.quantity !== undefined ? `${item.quantity}` : "—"} {item.unit ?? ""}
                        </Typography>
                      </Stack>
                    </ListItem>
                    {index < items.length - 1 && <Divider component="li" />}
                  </Box>
                ))
              )}
            </List>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
