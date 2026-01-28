import {
  AppBar,
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  CircularProgress,
  Divider,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";

import { clearSession } from "../../auth/services/authStorage";
import { getApiErrorDescriptor } from "../../../shared/api";
import type { StoredFamily } from "../../families/services/familyStorage";
import {
  getSelectedFamilyId,
  getStoredFamilies,
  setSelectedFamilyId,
} from "../../families/services/familyStorage";
import {
  fetchCalendarEvents,
  parseActionableItems,
  createCalendarEvent,
  createFamilyShoppingItem,
  createFamilyTodo,
  fetchFamilyMeals,
  fetchFamilyTodos,
  type ActionParseEvent,
  type ActionParseShoppingItem,
  type ActionParseTodo,
  type CalendarEvent,
  type FamilyMeal,
  type FamilyTodo,
} from "../services/homeApi";

const trackingPatterns = [
  /\b1Z[0-9A-Z]{16}\b/g,
  /\b[A-Z]{2}[0-9]{9}US\b/g,
  /\b\d{12}\b/g,
  /\b\d{15}\b/g,
  /\b\d{20,22}\b/g,
];

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const DEFAULT_EVENT_DURATION_MINUTES = 60;

const extractTrackingNumbers = (value: string) => {
  if (!value) {
    return [];
  }

  const normalized = value.toUpperCase();
  const compact = normalized.replace(/[\s-]/g, "");
  const matches = new Set<string>();

  const recordMatches = (text: string) => {
    trackingPatterns.forEach((pattern) => {
      const found = text.match(pattern);
      if (found) {
        found.forEach((match) => matches.add(match));
      }
    });
  };

  recordMatches(normalized);
  recordMatches(compact);

  return Array.from(matches);
};

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

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const withDefaultEventEnd = (event: ActionParseEvent): ActionParseEvent | null => {
  if (!event.start?.dateTime) {
    return null;
  }
  if (event.end?.dateTime) {
    return event;
  }
  const parsedStart = new Date(event.start.dateTime);
  if (Number.isNaN(parsedStart.getTime())) {
    return null;
  }
  parsedStart.setMinutes(parsedStart.getMinutes() + DEFAULT_EVENT_DURATION_MINUTES);
  return {
    ...event,
    end: {
      dateTime: parsedStart.toISOString(),
      timeZone: event.end?.timeZone ?? event.start.timeZone,
    },
  };
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "Unscheduled";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getIsoWeekNumber = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
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
  const [familyError, setFamilyError] = useState<{
    message: string;
    messageKey: string;
  } | null>(null);
  const [calendarError, setCalendarError] = useState<{
    message: string;
    messageKey: string;
  } | null>(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [note, setNote] = useState("");
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [addInputError, setAddInputError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<{ message: string; messageKey: string } | null>(
    null
  );
  const [parseResults, setParseResults] = useState<{
    todos: ActionParseTodo[];
    shoppingItems: ActionParseShoppingItem[];
    events: ActionParseEvent[];
  } | null>(null);
  const [parseSelections, setParseSelections] = useState<Record<string, boolean>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmittingParse, setIsSubmittingParse] = useState(false);
  const trackingNumbers = useMemo(() => extractTrackingNumbers(note), [note]);
  const selectedFamilyInfo = useMemo(
    () => families.find((family) => family.id === selectedFamily) ?? null,
    [families, selectedFamily]
  );

  const handleFileSelection = (files: FileList | null) => {
    if (!files) {
      return;
    }
    const nextFiles = Array.from(files);
    if (nextFiles.length > MAX_FILES) {
      setAddInputError(`You can upload up to ${MAX_FILES} files at a time.`);
      return;
    }
    const hasOversized = nextFiles.some((file) => file.size > MAX_FILE_BYTES);
    if (hasOversized) {
      setAddInputError("Each file must be under 5 MB.");
      return;
    }
    const totalBytes = nextFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setAddInputError("Total attachments must be under 15 MB.");
      return;
    }
    setAddInputError(null);
    setDroppedFiles(nextFiles);
    setParseResults(null);
    setParseSelections({});
    setParseError(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files);
  };

  useEffect(() => {
    const stored = getStoredFamilies();
    setFamilies(stored);
    if (!selectedFamily && stored.length > 0) {
      const next = stored[0].id;
      setSelectedFamily(next);
      setSelectedFamilyId(next);
    }
  }, [selectedFamily]);

  const refreshCalendar = async () => {
    if (!selectedFamily) {
      setEvents([]);
      return;
    }
    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const response = await fetchCalendarEvents({
        familyId: selectedFamily,
        start: todayRange.start,
        end: todayRange.end,
        limit: 12
      });
      setEvents(response.events);
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setCalendarError({
        message: descriptor.message,
        messageKey: descriptor.messageKey
      });
      setEvents([]);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const refreshFamily = async (familyId: string | null) => {
    if (!familyId) {
      setTodos([]);
      setMeals([]);
      return;
    }

    setIsLoadingFamily(true);
    setFamilyError(null);
    try {
      const [todoResponse, mealResponse] = await Promise.all([
        fetchFamilyTodos(familyId),
        fetchFamilyMeals(familyId)
      ]);
      setTodos(todoResponse.todos);
      setMeals(mealResponse.meals);
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setFamilyError({
        message: descriptor.message,
        messageKey: descriptor.messageKey
      });
      setTodos([]);
      setMeals([]);
    } finally {
      setIsLoadingFamily(false);
    }
  };

  useEffect(() => {
    refreshCalendar();
  }, [todayRange.end, todayRange.start, selectedFamily]);

  useEffect(() => {
    refreshFamily(selectedFamily);
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

  const selectedParseCount = Object.values(parseSelections).filter(Boolean).length;
  const formatConfidence = (confidence: number) => `${Math.round(confidence * 100)}%`;
  const canAnalyze = Boolean(note.trim()) || droppedFiles.length > 0;

  const handleFamilyChange = (value: string) => {
    setSelectedFamily(value);
    setSelectedFamilyId(value);
  };

  const handleSignOut = () => {
    clearSession();
    setAnchorEl(null);
    navigate("/login", { replace: true });
  };

  const resetAddState = () => {
    setIsAddOpen(false);
    setNote("");
    setDroppedFiles([]);
    setIsDragging(false);
    setAddInputError(null);
    setParseError(null);
    setParseResults(null);
    setParseSelections({});
    setIsParsing(false);
    setIsSubmittingParse(false);
  };

  const openAddModal = () => {
    setIsAddOpen(true);
    setNote("");
    setDroppedFiles([]);
    setIsDragging(false);
    setAddInputError(null);
    setParseError(null);
    setParseResults(null);
    setParseSelections({});
    setIsParsing(false);
    setIsSubmittingParse(false);
  };

  const handleParse = async () => {
    if (!note.trim() && droppedFiles.length === 0) {
      setAddInputError("Add some text or files to analyze.");
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setAddInputError(null);

    try {
      const files = await Promise.all(
        droppedFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl: await readFileAsDataUrl(file)
        }))
      );

      const response = await parseActionableItems({
        text: note.trim() || undefined,
        files: files.length > 0 ? files : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: selectedFamilyInfo?.preferredLanguage || navigator.language,
        language: selectedFamilyInfo?.preferredLanguage || navigator.language,
        context: {
          currentDateTime: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: selectedFamilyInfo?.preferredLanguage || navigator.language,
          weekday: new Date().toLocaleDateString(undefined, { weekday: "long" }),
          weekNumber: getIsoWeekNumber(new Date()),
          sourceMetadata: {
            fileCount: files.length,
            fileNames: files.map((file) => file.name),
            hasText: Boolean(note.trim())
          }
        }
      });

      setParseResults(response.results);
      const selections: Record<string, boolean> = {};
      response.results.todos.forEach((item) => {
        selections[item.id] = true;
      });
      response.results.shoppingItems.forEach((item) => {
        selections[item.id] = true;
      });
      response.results.events.forEach((item) => {
        selections[item.id] = true;
      });
      setParseSelections(selections);
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setParseError({ message: descriptor.message, messageKey: descriptor.messageKey });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitParsedItems = async () => {
    if (!parseResults) {
      return;
    }

    const selectedTodos = parseResults.todos.filter((item) => parseSelections[item.id]);
    const selectedShoppingItems = parseResults.shoppingItems.filter(
      (item) => parseSelections[item.id]
    );
    const selectedEvents = parseResults.events.filter((item) => parseSelections[item.id]);
    const normalizedEvents = selectedEvents
      .map(withDefaultEventEnd)
      .filter((event): event is ActionParseEvent => Boolean(event));

    if (
      selectedTodos.length === 0 &&
      selectedShoppingItems.length === 0 &&
      normalizedEvents.length === 0
    ) {
      setParseError({ message: "Select at least one item to add.", messageKey: "errors.parse.none" });
      return;
    }

    if (!selectedFamily && (selectedTodos.length > 0 || selectedShoppingItems.length > 0)) {
      setParseError({
        message: "Select a family before adding todos or shopping items.",
        messageKey: "errors.parse.family_required"
      });
      return;
    }

    setIsSubmittingParse(true);
    setParseError(null);

    try {
      const tasks: Promise<unknown>[] = [];

      if (selectedFamily) {
        selectedTodos.forEach((todo) => {
          tasks.push(
            createFamilyTodo(selectedFamily, {
              title: todo.title,
              notes: todo.notes
            })
          );
        });
        selectedShoppingItems.forEach((item) => {
          tasks.push(
            createFamilyShoppingItem(selectedFamily, {
              title: item.title,
              notes: item.notes
            })
          );
        });
      }

      if (selectedFamily) {
        normalizedEvents.forEach((event) => {
          if (event.start && event.end) {
            tasks.push(
              createCalendarEvent(
                {
                  title: event.title,
                  description: event.description,
                  start: event.start,
                  end: event.end,
                  location: event.location,
                  recurrence: event.recurrence
                },
                { familyId: selectedFamily }
              )
            );
          }
        });
      }

      const results = await Promise.allSettled(tasks);
      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length > 0) {
        throw failures[0].reason;
      }

      await Promise.all([refreshFamily(selectedFamily), refreshCalendar()]);
      resetAddState();
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setParseError({ message: descriptor.message, messageKey: descriptor.messageKey });
    } finally {
      setIsSubmittingParse(false);
    }
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)" },
        }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Settings</MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate("/app/family/settings");
          }}
        >
          Family settings
        </MenuItem>
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
                    {familyError.message}
                  </Typography>
                ) : null}
                {calendarError ? (
                  <Typography variant="body2" color="error">
                    {calendarError.message}
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
                                todo.assignedToUserIds && todo.assignedToUserIds.length > 0
                                  ? `Assigned to ${todo.assignedToUserIds.join(", ")}`
                                  : todo.assignedToUserId
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

      <Fab
        color="primary"
        aria-label="Add"
        onClick={openAddModal}
        sx={{
          position: "fixed",
          right: { xs: 16, md: 32 },
          bottom: { xs: 16, md: 32 },
          boxShadow: "0 12px 30px rgba(37, 99, 235, 0.35)",
          textTransform: "none",
          fontWeight: 600,
          px: 3,
          borderRadius: "999px",
        }}
        variant="extended"
      >
        + Add
      </Fab>

      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          inset: 0,
          bgcolor: "rgba(15, 23, 42, 0.5)",
          opacity: isAddOpen ? 1 : 0,
          pointerEvents: isAddOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
          zIndex: 1200,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
        }}
        onClick={resetAddState}
      >
        <Paper
          elevation={4}
          onClick={(event) => event.stopPropagation()}
          sx={{
            width: "min(720px, 100%)",
            borderRadius: 4,
            bgcolor: "#ffffff",
            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.25)",
            p: { xs: 3, md: 4 },
            transform: isAddOpen ? "translateY(0)" : "translateY(24px)",
            transition: "transform 320ms ease",
          }}
        >
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h5" fontWeight={700}>
                Add something new
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capture a note, drop in a file, or record a quick voice memo.
              </Typography>
            </Stack>

            <TextField
              label="Write a note"
              multiline
              minRows={3}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setParseResults(null);
                setParseSelections({});
                setParseError(null);
                setAddInputError(null);
              }}
              placeholder="What do you want to remember or share?"
              sx={{
                bgcolor: "#f8fafc",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
            />

            <Stack
              spacing={1}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                p: 2,
                bgcolor: "#f8fafc",
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Detected tracking numbers
              </Typography>
              {trackingNumbers.length > 0 ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {trackingNumbers.map((trackingNumber) => (
                    <Chip
                      key={trackingNumber}
                      label={trackingNumber}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: "#e2e8f0" }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Paste a UPS, FedEx, or USPS tracking number in your note to detect it automatically.
                </Typography>
              )}
            </Stack>

            <Stack
              spacing={2}
              sx={{
                borderRadius: 3,
                border: "1px dashed",
                borderColor: isDragging ? "primary.main" : "#cbd5f5",
                bgcolor: isDragging ? "rgba(37, 99, 235, 0.08)" : "#f8fafc",
                p: 3,
                transition: "all 200ms ease",
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Drag & drop a file
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PDFs, photos, or audio clips are all welcome.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                <Box>
                  <input
                    id="add-file-input"
                    type="file"
                    hidden
                    onChange={(event) => handleFileSelection(event.target.files)}
                  />
                  <label htmlFor="add-file-input">
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 3,
                        py: 1.25,
                        borderRadius: "999px",
                        bgcolor: "primary.main",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 12px 20px rgba(37, 99, 235, 0.35)",
                      }}
                    >
                      Upload file
                    </Box>
                  </label>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  or drop it here
                </Typography>
              </Stack>
              {droppedFiles.length > 0 ? (
                <Stack spacing={0.5}>
                  {droppedFiles.map((file) => (
                    <Typography key={file.name} variant="body2" color="text.secondary">
                      {file.name}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
            </Stack>

            <Stack
              spacing={2}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                p: 3,
                bgcolor: "#ffffff",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Read it in sound
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload a voice note or record something quick.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                <Box>
                  <input
                    id="audio-input"
                    type="file"
                    hidden
                    accept="audio/*"
                    onChange={(event) => handleFileSelection(event.target.files)}
                  />
                  <label htmlFor="audio-input">
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 3,
                        py: 1.25,
                        borderRadius: "999px",
                        bgcolor: "#0f172a",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Upload audio
                    </Box>
                  </label>
                </Box>
                <Box
                  sx={{
                    px: 3,
                    py: 1.25,
                    borderRadius: "999px",
                    border: "1px solid #e2e8f0",
                    color: "text.secondary",
                    fontWeight: 600,
                  }}
                >
                  Record soon
                </Box>
              </Stack>
            </Stack>

            {addInputError ? (
              <Alert severity="warning">{addInputError}</Alert>
            ) : null}
            {parseError ? <Alert severity="error">{parseError.message}</Alert> : null}

            <Stack
              spacing={2}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                p: 3,
                bgcolor: "#ffffff",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Suggested actions
                </Typography>
                {isParsing ? <CircularProgress size={20} /> : null}
              </Stack>

              {!parseResults && !isParsing ? (
                <Typography variant="body2" color="text.secondary">
                  Run analysis to turn your note or attachments into actionable todos, shopping
                  items, and calendar events.
                </Typography>
              ) : null}

              {parseResults ? (
                <Stack spacing={2}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Todos
                    </Typography>
                    {parseResults.todos.length > 0 ? (
                      <List disablePadding>
                        {parseResults.todos.map((todo) => (
                          <ListItem
                            key={todo.id}
                            disableGutters
                            alignItems="flex-start"
                            secondaryAction={
                              <Chip label={formatConfidence(todo.confidence)} size="small" />
                            }
                          >
                            <Checkbox
                              checked={Boolean(parseSelections[todo.id])}
                              onChange={() =>
                                setParseSelections((prev) => ({
                                  ...prev,
                                  [todo.id]: !prev[todo.id]
                                }))
                              }
                            />
                            <ListItemText
                              primary={todo.title}
                              secondary={[todo.notes, todo.source].filter(Boolean).join(" • ")}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No todos detected yet.
                      </Typography>
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Shopping items
                    </Typography>
                    {parseResults.shoppingItems.length > 0 ? (
                      <List disablePadding>
                        {parseResults.shoppingItems.map((item) => (
                          <ListItem
                            key={item.id}
                            disableGutters
                            alignItems="flex-start"
                            secondaryAction={
                              <Chip label={formatConfidence(item.confidence)} size="small" />
                            }
                          >
                            <Checkbox
                              checked={Boolean(parseSelections[item.id])}
                              onChange={() =>
                                setParseSelections((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }))
                              }
                            />
                            <ListItemText
                              primary={item.title}
                              secondary={[item.notes, item.source].filter(Boolean).join(" • ")}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No shopping items detected yet.
                      </Typography>
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Calendar events
                    </Typography>
                    {parseResults.events.length > 0 ? (
                      <List disablePadding>
                        {parseResults.events.map((event) => (
                          <ListItem
                            key={event.id}
                            disableGutters
                            alignItems="flex-start"
                            secondaryAction={
                              <Chip label={formatConfidence(event.confidence)} size="small" />
                            }
                          >
                            <Checkbox
                              checked={Boolean(parseSelections[event.id])}
                              onChange={() =>
                                setParseSelections((prev) => ({
                                  ...prev,
                                  [event.id]: !prev[event.id]
                                }))
                              }
                            />
                            <ListItemText
                              primary={event.title}
                              secondary={[
                                event.start?.dateTime ? formatDateTime(event.start.dateTime) : null,
                                event.end?.dateTime ? `to ${formatDateTime(event.end.dateTime)}` : null,
                                event.description,
                                event.location?.name,
                                event.location?.address,
                                event.source
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No calendar events detected yet.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              ) : null}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
              <Box
                component="button"
                type="button"
                onClick={resetAddState}
                style={{
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  padding: "10px 24px",
                  background: "transparent",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </Box>
              <Box
                component="button"
                type="button"
                onClick={handleParse}
                disabled={isParsing || !canAnalyze}
                style={{
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  padding: "10px 24px",
                  background: "transparent",
                  fontWeight: 600,
                  cursor: isParsing || !canAnalyze ? "not-allowed" : "pointer",
                  opacity: isParsing || !canAnalyze ? 0.7 : 1,
                }}
              >
                {parseResults ? "Re-run analysis" : "Analyze"}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={handleSubmitParsedItems}
                disabled={isSubmittingParse || selectedParseCount === 0}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "10px 24px",
                  background:
                    isSubmittingParse || selectedParseCount === 0
                      ? "#cbd5f5"
                      : "linear-gradient(135deg, #2563eb, #4f46e5)",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor:
                    isSubmittingParse || selectedParseCount === 0 ? "not-allowed" : "pointer",
                  boxShadow:
                    isSubmittingParse || selectedParseCount === 0
                      ? "none"
                      : "0 16px 30px rgba(37, 99, 235, 0.35)",
                }}
              >
                {isSubmittingParse ? "Adding..." : `Add ${selectedParseCount || ""}`.trim()}
              </Box>
            </Stack>
          </Stack>
        </Paper>
      </Paper>
    </Box>
  );
};
