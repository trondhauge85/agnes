import {
  Avatar,
  AvatarGroup,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getApiErrorDescriptor } from "../../../shared/api";
import { getSelectedFamilyId } from "../../families/services/familyStorage";
import { fetchCalendarEvents, type CalendarEvent } from "../../home/services/homeApi";

const buildRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

const formatDayLabel = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  if (normalized.getTime() === today.getTime()) {
    return `Today · ${normalized.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (normalized.getTime() === tomorrow.getTime()) {
    return `Tomorrow · ${normalized.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return normalized.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start) {
    return "Unscheduled";
  }
  const startDate = new Date(start);
  const startLabel = startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!end) {
    return startLabel;
  }
  const endDate = new Date(end);
  const endLabel = endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
};

const getEventHost = (event: CalendarEvent) => {
  const organizer = event.participants.find((participant) => participant.organizer);
  if (organizer?.displayName) {
    return organizer.displayName;
  }
  if (organizer?.email) {
    return organizer.email;
  }
  return event.participants[0]?.displayName ?? event.participants[0]?.email ?? "Shared calendar";
};

export const CalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<{
    message: string;
    messageKey: string;
  } | null>(null);
  const [selectedFamilyId] = useState(() => getSelectedFamilyId());

  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedFamilyId) {
        setEvents([]);
        return;
      }
      setIsLoading(true);
      setCalendarError(null);
      try {
        const range = buildRange();
        const response = await fetchCalendarEvents({
          familyId: selectedFamilyId,
          start: range.start,
          end: range.end
        });
        setEvents(response.events);
      } catch (error) {
        const descriptor = getApiErrorDescriptor(error);
        setCalendarError({ message: descriptor.message, messageKey: descriptor.messageKey });
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [selectedFamilyId]);

  const groupedDays = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const start = event.start?.dateTime;
      if (!start) {
        return;
      }
      const date = new Date(start);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = date.toISOString().split("T")[0];
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, dayEvents]) => {
        const date = new Date(`${dayKey}T00:00:00`);
        const sorted = [...dayEvents].sort((left, right) => {
          const leftTime = left.start?.dateTime ?? "";
          const rightTime = right.start?.dateTime ?? "";
          return leftTime.localeCompare(rightTime);
        });
        return {
          key: dayKey,
          label: formatDayLabel(date),
          summary: `${sorted.length} event${sorted.length === 1 ? "" : "s"}`,
          events: sorted
        };
      });
  }, [events]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const daysWithEvents = groupedDays.length;
    const mostActive = groupedDays.reduce(
      (best, current) => (current.events.length > best.events.length ? current : best),
      groupedDays[0]
    );
    const locationCount = events.filter(
      (event) => event.location?.name || event.location?.address || event.location?.meetingUrl
    ).length;

    return [
      {
        label: "Next 7 days",
        value: `${totalEvents} event${totalEvents === 1 ? "" : "s"}`,
        detail: `${daysWithEvents} day${daysWithEvents === 1 ? "" : "s"} with plans`
      },
      {
        label: "Most active day",
        value: mostActive
          ? new Date(`${mostActive.key}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long"
            })
          : "No events yet",
        detail: mostActive ? `${mostActive.events.length} event${mostActive.events.length === 1 ? "" : "s"}` : "Add events to see peaks"
      },
      {
        label: "Locations added",
        value: `${locationCount} event${locationCount === 1 ? "" : "s"}`,
        detail: "Meetings with places or links"
      }
    ];
  }, [events, groupedDays]);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Calendar
            </Typography>
            <Typography variant="body1" color="text.secondary">
              A clear view of each day, with everyone&apos;s responsibilities.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {stats.map((stat) => (
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

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack spacing={0}>
              {isLoading && (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading events…
                  </Typography>
                </Stack>
              )}
              {!isLoading && calendarError && (
                <Box sx={{ px: 3, py: 3 }}>
                  <Alert severity="error">{calendarError.message}</Alert>
                </Box>
              )}
              {!isLoading && !calendarError && groupedDays.length === 0 && (
                <Box sx={{ px: 3, py: 4 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    No upcoming events
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Events from your selected family calendar will appear here once they&apos;re scheduled.
                  </Typography>
                </Box>
              )}
              {!isLoading &&
                !calendarError &&
                groupedDays.map((day, index) => (
                  <Box key={day.key}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      sx={{ px: 3, py: 2.5 }}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {day.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {day.summary}
                        </Typography>
                      </Box>
                      <Chip label="Shared calendar" size="small" variant="outlined" />
                    </Stack>
                    <Divider />
                    <Stack spacing={2} sx={{ px: 3, py: 2.5 }}>
                      {day.events.map((event) => {
                        const location =
                          event.location?.name ??
                          event.location?.address ??
                          event.location?.meetingUrl ??
                          "No location yet";
                        const attendees = event.participants
                          .map((participant) => participant.displayName ?? participant.email)
                          .filter((value): value is string => Boolean(value));
                        return (
                          <Paper
                            key={event.id}
                            elevation={0}
                            sx={{
                              borderRadius: 2.5,
                              border: "1px solid",
                              borderColor: "divider",
                              p: 2
                            }}
                          >
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={2}
                              alignItems={{ xs: "flex-start", md: "center" }}
                              justifyContent="space-between"
                            >
                              <Box>
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {event.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatTimeRange(event.start?.dateTime, event.end?.dateTime)} · {location}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Hosted by {getEventHost(event)}
                                </Typography>
                              </Box>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                  Attendees
                                </Typography>
                                {attendees.length > 0 ? (
                                  <AvatarGroup
                                    max={4}
                                    sx={{ "& .MuiAvatar-root": { width: 28, height: 28 } }}
                                  >
                                    {attendees.map((attendee) => (
                                      <Avatar key={attendee}>{attendee[0]}</Avatar>
                                    ))}
                                  </AvatarGroup>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    None yet
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                    {index < groupedDays.length - 1 && <Divider />}
                  </Box>
                ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
