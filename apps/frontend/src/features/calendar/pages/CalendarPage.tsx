import {
  Avatar,
  AvatarGroup,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";

const calendarDays = [
  {
    date: "Today · Oct 12",
    summary: "3 events",
    events: [
      {
        title: "Morning drop-off",
        time: "8:00 AM",
        location: "Northside Elementary",
        host: "Ava",
        attendees: ["Ava", "Noah"]
      },
      {
        title: "Design sync",
        time: "11:30 AM",
        location: "Kitchen table (virtual)",
        host: "Mia",
        attendees: ["Mia"]
      },
      {
        title: "Piano lesson",
        time: "4:15 PM",
        location: "Harmony Studio",
        host: "Liam",
        attendees: ["Liam", "Ava"]
      }
    ]
  },
  {
    date: "Tomorrow · Oct 13",
    summary: "2 events",
    events: [
      {
        title: "Grocery pickup window",
        time: "9:00 AM",
        location: "Market Square",
        host: "Noah",
        attendees: ["Noah"]
      },
      {
        title: "Soccer practice",
        time: "6:00 PM",
        location: "Community Field",
        host: "Mia",
        attendees: ["Mia", "Liam"]
      }
    ]
  },
  {
    date: "Fri · Oct 14",
    summary: "1 event",
    events: [
      {
        title: "Family dinner",
        time: "7:30 PM",
        location: "Casa Verde",
        host: "Ava",
        attendees: ["Ava", "Mia", "Noah"]
      }
    ]
  }
];

export const CalendarPage = () => {
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
            {[
              { label: "Next 7 days", value: "12 events", detail: "4 shared" },
              { label: "Most active day", value: "Tuesday", detail: "5 events" },
              { label: "Flexible", value: "2 open slots", detail: "Evening windows" }
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

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack spacing={0}>
              {calendarDays.map((day, index) => (
                <Box key={day.date}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ px: 3, py: 2.5 }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {day.date}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {day.summary}
                      </Typography>
                    </Box>
                    <Chip label="Shared calendar" size="small" variant="outlined" />
                  </Stack>
                  <Divider />
                  <Stack spacing={2} sx={{ px: 3, py: 2.5 }}>
                    {day.events.map((event) => (
                      <Paper
                        key={event.title}
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
                              {event.time} · {event.location}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Hosted by {event.host}
                            </Typography>
                          </Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                              Attendees
                            </Typography>
                            <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 28, height: 28 } }}>
                              {event.attendees.map((attendee) => (
                                <Avatar key={attendee}>{attendee[0]}</Avatar>
                              ))}
                            </AvatarGroup>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                  {index < calendarDays.length - 1 && <Divider />}
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};
