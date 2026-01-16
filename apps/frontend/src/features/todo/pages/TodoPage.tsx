import {
  Avatar,
  AvatarGroup,
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

const todos = [
  {
    title: "Restock pantry staples",
    notes: "Add olive oil, pasta, and oats",
    due: "Today",
    priority: "High",
    assignees: ["Ava", "Noah"]
  },
  {
    title: "Plan weekend playdate",
    notes: "Confirm with the Johnsons",
    due: "Tomorrow",
    priority: "Medium",
    assignees: ["Liam"]
  },
  {
    title: "Pay after-school club fee",
    notes: "Due before Friday",
    due: "Fri",
    priority: "High",
    assignees: ["Mia"]
  },
  {
    title: "Book dentist appointments",
    notes: "Look for afternoon slots",
    due: "Next week",
    priority: "Low",
    assignees: ["Ava", "Mia"]
  },
  {
    title: "Update family emergency contacts",
    notes: "Add daycare front desk",
    due: "Next week",
    priority: "Low",
    assignees: ["Noah"]
  }
];

export const TodoPage = () => {
  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Todo
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Keep track of household tasks, assignments, and due dates.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[
              { label: "Open", value: "8 tasks", detail: "2 due today" },
              { label: "Completed", value: "14 this week", detail: "Great momentum" },
              { label: "Shared", value: "3 people", detail: "All hands on deck" }
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
                  {stat.value}
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ p: 3, pb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Today & upcoming
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prioritized list with owners and notes.
                </Typography>
              </Box>
              <Chip label="Auto-sorted" color="primary" variant="outlined" />
            </Stack>
            <Divider />
            <List disablePadding>
              {todos.map((todo, index) => (
                <Box key={todo.title}>
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
                          {todo.title}
                        </Typography>
                        <Chip
                          label={todo.priority}
                          size="small"
                          color={todo.priority === "High" ? "error" : "default"}
                          variant={todo.priority === "High" ? "filled" : "outlined"}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {todo.notes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due {todo.due}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Owners
                      </Typography>
                      <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 28, height: 28 } }}>
                        {todo.assignees.map((assignee) => (
                          <Avatar key={assignee}>{assignee[0]}</Avatar>
                        ))}
                      </AvatarGroup>
                    </Stack>
                  </ListItem>
                  {index < todos.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
