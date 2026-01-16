import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useMemo } from "react";

import { getSelectedFamilyId, getStoredFamilies } from "../../families/services/familyStorage";

const memberRoster = [
  { name: "Alex Johnson", role: "Family admin", status: "Active", lastSeen: "Online now" },
  { name: "Priya Patel", role: "Caregiver", status: "Active", lastSeen: "2 hours ago" },
  { name: "Milo Johnson", role: "Teen member", status: "Pending invite", lastSeen: "Invited yesterday" },
  { name: "Nora Kim", role: "Grandparent", status: "Active", lastSeen: "1 day ago" },
];

const integrations = [
  { name: "WhatsApp", status: "Connected", description: "Meal reminders & family alerts." },
  { name: "Google Calendar", status: "Connected", description: "Sync schedules and events." },
  { name: "Apple Health", status: "Not connected", description: "Share wellness data with caregivers." },
  { name: "Amazon Alexa", status: "Not connected", description: "Voice access for lists and routines." },
];

const auditEntries = [
  { action: "Added Milo Johnson to the family", actor: "Alex Johnson", timestamp: "Today, 9:12 AM" },
  { action: "Connected WhatsApp integration", actor: "Alex Johnson", timestamp: "Yesterday, 4:45 PM" },
  { action: "Updated household quiet hours", actor: "Priya Patel", timestamp: "Yesterday, 2:20 PM" },
  { action: "Exported grocery list", actor: "Alex Johnson", timestamp: "Mar 19, 11:02 AM" },
];

const preferences = [
  { label: "Daily digest email", detail: "Sent at 7:00 AM", status: "Enabled" },
  { label: "Urgent SMS alerts", detail: "Fall detection, security, meds", status: "Enabled" },
  { label: "Quiet hours", detail: "9:00 PM - 6:30 AM", status: "Enabled" },
  { label: "Shared grocery budget", detail: "$220 / month", status: "Tracking" },
];

const securityNotes = [
  "2 admins, 2 standard members",
  "Family PIN required for purchases",
  "Device access approved by admin",
];

export const FamilySettingsPage = () => {
  const families = useMemo(() => getStoredFamilies(), []);
  const selectedFamilyId = getSelectedFamilyId();
  const selectedFamily = families.find((family) => family.id === selectedFamilyId);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary">
              Family settings
            </Typography>
            <Typography variant="h6" fontWeight={700} color="secondary">
              {selectedFamily?.name ?? "No family selected"}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined">Switch family</Button>
            <Button variant="contained">Add member</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack spacing={1}>
                      <Typography variant="h5" fontWeight={700} color="secondary">
                        Household overview
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Manage core household details, contact points, and safety configuration.
                      </Typography>
                    </Stack>
                    <Divider />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Address
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            245 Oakridge Lane
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            San Mateo, CA 94401
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Time zone
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            Pacific Time (PT)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Quiet hours: 9:00 PM - 6:30 AM
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Primary contact
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            Alex Johnson
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            alex.johnson@example.com
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Emergency protocol
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            Call +1 (415) 555-0182
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Backup: Priya Patel
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={700} color="secondary">
                      Preferences & safeguards
                    </Typography>
                    <List disablePadding>
                      {preferences.map((item, index) => (
                        <Box key={item.label}>
                          <ListItem disableGutters>
                            <ListItemText
                              primary={item.label}
                              secondary={item.detail}
                              primaryTypographyProps={{ fontWeight: 600 }}
                            />
                            <Chip label={item.status} color="primary" variant="outlined" />
                          </ListItem>
                          {index < preferences.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} color="secondary">
                      Members & access
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assign roles, manage invitations, and revoke access instantly.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined">Invite member</Button>
                    <Button variant="contained">Add member</Button>
                  </Stack>
                </Stack>
                <Divider />
                <Grid container spacing={2}>
                  {memberRoster.map((member) => (
                    <Grid key={member.name} item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.light" }}>
                              {member.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {member.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {member.role}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.lastSeen}
                              </Typography>
                            </Box>
                            <Stack spacing={1} alignItems="flex-end">
                              <Chip label={member.status} color={member.status === "Active" ? "success" : "warning"} />
                              <Button size="small" variant="text" color="secondary">
                                Manage
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700} color="secondary">
                        Integrations
                      </Typography>
                      <Button variant="outlined">Add integration</Button>
                    </Stack>
                    <List disablePadding>
                      {integrations.map((integration, index) => (
                        <Box key={integration.name}>
                          <ListItem disableGutters alignItems="flex-start">
                            <ListItemText
                              primary={integration.name}
                              secondary={integration.description}
                              primaryTypographyProps={{ fontWeight: 600 }}
                            />
                            <Stack spacing={1} alignItems="flex-end">
                              <Chip
                                label={integration.status}
                                color={integration.status === "Connected" ? "success" : "default"}
                                variant={integration.status === "Connected" ? "filled" : "outlined"}
                              />
                              <Button size="small" variant="text">
                                {integration.status === "Connected" ? "Manage" : "Connect"}
                              </Button>
                            </Stack>
                          </ListItem>
                          {index < integrations.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700} color="secondary">
                        Audit log
                      </Typography>
                      <Button variant="outlined">Export</Button>
                    </Stack>
                    <List disablePadding>
                      {auditEntries.map((entry, index) => (
                        <Box key={entry.action}>
                          <ListItem disableGutters>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "secondary.light" }}>
                                {entry.actor
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={entry.action}
                              secondary={`${entry.actor} • ${entry.timestamp}`}
                              primaryTypographyProps={{ fontWeight: 600 }}
                            />
                          </ListItem>
                          {index < auditEntries.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700} color="secondary">
                  Security & roles
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Access overview
                      </Typography>
                      {securityNotes.map((note) => (
                        <Stack key={note} direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ bgcolor: "primary.light", width: 24, height: 24, fontSize: 14 }}>
                            ✓
                          </Avatar>
                          <Typography variant="body2">{note}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Default permissions
                      </Typography>
                      <Typography variant="body2">
                        Caregivers can manage schedules, view health insights, and edit shopping lists. Teens
                        can add tasks and RSVP to events but cannot modify integrations.
                      </Typography>
                      <Button variant="outlined" sx={{ alignSelf: "flex-start" }}>
                        Update roles
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};
