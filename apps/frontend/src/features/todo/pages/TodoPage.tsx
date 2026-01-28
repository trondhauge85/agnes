import {
  Alert,
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
import { useEffect, useMemo, useState } from "react";

import { getApiErrorDescriptor } from "../../../shared/api";
import { getSelectedFamilyId } from "../../families/services/familyStorage";
import { fetchFamilyDetail } from "../../family/services/familyApi";
import { fetchFamilyTodos, type FamilyTodo } from "../../home/services/homeApi";

export const TodoPage = () => {
  const familyId = getSelectedFamilyId();
  const [todos, setTodos] = useState<FamilyTodo[]>([]);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!familyId) {
      return;
    }

    let isActive = true;
    const loadTodos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [todoResponse, family] = await Promise.all([
          fetchFamilyTodos(familyId),
          fetchFamilyDetail(familyId)
        ]);
        if (!isActive) {
          return;
        }
        setTodos(todoResponse.todos);
        const memberMap = family.members.reduce<Record<string, string>>((acc, member) => {
          acc[member.userId] = member.displayName;
          return acc;
        }, {});
        setAssignees(memberMap);
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

    loadTodos();

    return () => {
      isActive = false;
    };
  }, [familyId]);

  const summary = useMemo(() => {
    const openCount = todos.filter((todo) => todo.status === "open").length;
    const completedCount = todos.filter((todo) => todo.status === "completed").length;
    return {
      openCount,
      completedCount,
      totalCount: todos.length
    };
  }, [todos]);

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

          {!familyId ? (
            <Alert severity="warning">Select a family to view todos.</Alert>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[
              { label: "Open", value: `${summary.openCount} tasks`, detail: "Awaiting action" },
              { label: "Completed", value: `${summary.completedCount} tasks`, detail: "Recently wrapped up" },
              { label: "All", value: `${summary.totalCount} tasks`, detail: "Across the family" }
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
              {isLoading ? (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    Loading todos...
                  </Typography>
                </ListItem>
              ) : todos.length === 0 ? (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    No todos yet. Add items in your family dashboard to see them here.
                  </Typography>
                </ListItem>
              ) : (
                todos.map((todo, index) => {
                  const assigneeIds =
                    todo.assignedToUserIds && todo.assignedToUserIds.length > 0
                      ? todo.assignedToUserIds
                      : todo.assignedToUserId
                        ? [todo.assignedToUserId]
                        : [];
                  const assigneeNames =
                    assigneeIds.length > 0
                      ? assigneeIds.map((id) => assignees[id] ?? "Assigned member")
                      : ["Unassigned"];
                  const assigneeLabel = assigneeIds.length
                    ? assigneeNames.join(", ")
                    : "Unassigned";
                  const dueDateLabel = todo.dueDate
                    ? `Due ${new Date(todo.dueDate).toLocaleDateString()}`
                    : null;
                  return (
                    <Box key={todo.id}>
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
                              label={todo.status === "completed" ? "Completed" : "Open"}
                              size="small"
                              color={todo.status === "completed" ? "success" : "warning"}
                              variant="outlined"
                            />
                          </Stack>
                          {todo.notes ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {todo.notes}
                            </Typography>
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            Updated {new Date(todo.updatedAt).toLocaleDateString()}
                            {dueDateLabel ? ` • ${dueDateLabel}` : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            Owners
                          </Typography>
                          <AvatarGroup max={2} sx={{ "& .MuiAvatar-root": { width: 28, height: 28 } }}>
                            {assigneeNames.map((name) => (
                              <Avatar key={name}>{name.slice(0, 1)}</Avatar>
                            ))}
                          </AvatarGroup>
                          <Typography variant="body2" color="text.secondary">
                            {assigneeLabel}
                          </Typography>
                        </Stack>
                      </ListItem>
                      {index < todos.length - 1 && <Divider component="li" />}
                    </Box>
                  );
                })
              )}
            </List>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
