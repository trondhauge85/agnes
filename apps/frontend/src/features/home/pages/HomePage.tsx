import {
  AppBar,
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { clearSession } from "../../auth/services/authStorage";
import type { StoredFamily } from "../../families/services/familyStorage";
import {
  getSelectedFamilyId,
  getStoredFamilies,
  setSelectedFamilyId,
} from "../../families/services/familyStorage";
import {
  fetchCalendarEvents,
  fetchFamilyMeals,
  fetchFamilyTodos,
  type CalendarEvent,
  type FamilyMeal,
  type FamilyTodo,
} from "../services/homeApi";

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    dayKey: start.toISOString().split("T")[0],
  };
};

export const HomePage = () => {
  const navigate = useNavigate();
  const todayRange = useMemo(() => getTodayRange(), []);
  const [families, setFamilies] = useState<StoredFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(getSelectedFamilyId());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [todos, setTodos] = useState<FamilyTodo[]>([]);
  const [meals, setMeals] = useState<FamilyMeal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  useEffect(() => {
    const stored = getStoredFamilies();
    setFamilies(stored);
    if (!selectedFamily && stored.length > 0) {
      const next = stored[0].id;
      setSelectedFamily(next);
      setSelectedFamilyId(next);
    }
  }, [selectedFamily]);

  useEffect(() => {
    setIsLoadingCalendar(true);
    setCalendarError(null);
    fetchCalendarEvents({ start: todayRange.start, end: todayRange.end, limit: 12 })
      .then((response) => setEvents(response.events))
      .catch((error) => {
        setCalendarError(error instanceof Error ? error.message : "Calendar data is unavailable.");
        setEvents([]);
      })
      .finally(() => setIsLoadingCalendar(false));
  }, [todayRange.end, todayRange.start]);

  useEffect(() => {
    if (!selectedFamily) {
      setTodos([]);
      setMeals([]);
      return;
    }

    setIsLoadingFamily(true);
    setFamilyError(null);
    Promise.all([fetchFamilyTodos(selectedFamily), fetchFamilyMeals(selectedFamily)])
      .then(([todoResponse, mealResponse]) => {
        setTodos(todoResponse.todos);
        setMeals(mealResponse.meals);
      })
      .catch((error) => {
        setFamilyError(error instanceof Error ? error.message : "Family data is unavailable.");
        setTodos([]);
        setMeals([]);
      })
      .finally(() => setIsLoadingFamily(false));
  }, [selectedFamily]);

  const todayMeals = useMemo(
    () =>
      meals.filter((meal) => {
        if (!meal.scheduledFor) {
          return true;
        }
        return new Date(meal.scheduledFor).toISOString().startsWith(todayRange.dayKey);
      }),
    [meals, todayRange.dayKey]
  );

  const openTodos = useMemo(() => todos.filter((todo) => todo.status === "open"), [todos]);

  const selectedFamilyName =
    families.find((family) => family.id === selectedFamily)?.name ?? "No family selected";

  const summaryLines = [
    `${events.length} calendar events`,
    `${openTodos.length} open tasks`,
    `${todayMeals.length} meals planned`,
  ];

  const handleFamilyChange = (value: string) => {
    setSelectedFamily(value);
    setSelectedFamilyId(value);
  };

  const handleSignOut = () => {
    clearSession();
    setAnchorEl(null);
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box>
              <Typography variant="h6" color="secondary" fontWeight={700}>
                Agnes Home
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedFamilyName}
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="family-select-label">Family</InputLabel>
              <Select
                labelId="family-select-label"
                label="Family"
                value={selectedFamily ?? ""}
                onChange={(event) => handleFamilyChange(event.target.value)}
              >
                {families.length === 0 ? (
                  <MenuItem value="" disabled>
                    Add a family to get started
                  </MenuItem>
                ) : (
                  families.map((family) => (
                    <MenuItem key={family.id} value={family.id}>
                      {family.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Stack>
          <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} size="large">
            <Avatar sx={{ bgcolor: "primary.main" }}>A</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Settings</MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="overline" color="primary">
                    Today
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary">
                    {todayRange.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Snapshot of everything coming up.
                  </Typography>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  {summaryLines.map((line) => (
                    <Box
                      key={line}
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                        p: 2,
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        {line}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                {familyError ? (
                  <Typography variant="body2" color="error">
                    {familyError}
                  </Typography>
                ) : null}
                {calendarError ? (
                  <Typography variant="body2" color="error">
                    {calendarError}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="h6" fontWeight={700}>
                    Calendar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasks and meetings for today.
                  </Typography>
                </Stack>
                <Divider />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Events
                    </Typography>
                    {isLoadingCalendar ? (
                      <Typography variant="body2" color="text.secondary">
                        Loading events…
                      </Typography>
                    ) : events.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No calendar events scheduled.
                      </Typography>
                    ) : (
                      <List>
                        {events.map((event) => (
                          <ListItem key={event.id} alignItems="flex-start" disableGutters>
                            <ListItemText
                              primary={event.title}
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    {new Date(event.start.dateTime).toLocaleTimeString(undefined, {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}{" "}
                                    -{" "}
                                    {new Date(event.end.dateTime).toLocaleTimeString(undefined, {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </Typography>
                                  {event.location?.name ? (
                                    <Typography component="span" variant="body2" color="text.secondary">
                                      {" • "}
                                      {event.location.name}
                                    </Typography>
                                  ) : null}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Member tasks
                    </Typography>
                    {isLoadingFamily ? (
                      <Typography variant="body2" color="text.secondary">
                        Loading tasks…
                      </Typography>
                    ) : openTodos.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Everyone is all caught up.
                      </Typography>
                    ) : (
                      <List>
                        {openTodos.map((todo) => (
                          <ListItem key={todo.id} disableGutters>
                            <ListItemText
                              primary={todo.title}
                              secondary={
                                todo.assignedToUserId
                                  ? `Assigned to ${todo.assignedToUserId}`
                                  : "Unassigned"
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack spacing={0.5}>
                  <Typography variant="h6" fontWeight={700}>
                    Meal plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Planned meals for today.
                  </Typography>
                </Stack>
                <Divider />
                {isLoadingFamily ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading meals…
                  </Typography>
                ) : todayMeals.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No meals planned yet.
                  </Typography>
                ) : (
                  <List>
                    {todayMeals.map((meal) => (
                      <ListItem key={meal.id} disableGutters>
                        <ListItemText
                          primary={meal.title}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary">
                                {meal.mealType.toUpperCase()}
                                {meal.scheduledFor ? (
                                  <>
                                    {" • "}
                                    {new Date(meal.scheduledFor).toLocaleTimeString(undefined, {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </>
                                ) : (
                                  " • Anytime"
                                )}
                              </Typography>
                              {meal.assignedToUserId ? (
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {" • "}
                                  {meal.assignedToUserId}
                                </Typography>
                              ) : null}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};
