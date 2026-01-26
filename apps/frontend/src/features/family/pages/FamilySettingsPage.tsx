import {
  Alert,
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
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { getApiErrorDescriptor } from "../../../shared/api";
import { getSelectedFamilyId } from "../../families/services/familyStorage";
import { fetchFamilyDetail, type FamilyDetail } from "../services/familyApi";

export const FamilySettingsPage = () => {
  const familyId = getSelectedFamilyId();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!familyId) {
      return;
    }

    let isActive = true;
    const loadFamily = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchFamilyDetail(familyId);
        if (isActive) {
          setFamily(response);
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

    loadFamily();

    return () => {
      isActive = false;
    };
  }, [familyId]);

  const metadataHighlights = useMemo(() => {
    if (!family) {
      return [] as Array<{ label: string; value: string }>;
    }
    const interests = family.metadata.interests.length
      ? family.metadata.interests.join(", ")
      : "No interests yet";
    const goals = family.metadata.goals.length ? family.metadata.goals.join(", ") : "No goals yet";
    return [
      { label: "Created", value: new Date(family.createdAt).toLocaleDateString() },
      { label: "Interests", value: interests },
      { label: "Goals", value: goals }
    ];
  }, [family]);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100%" }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary">
              Family settings
            </Typography>
            <Typography variant="h6" fontWeight={700} color="secondary">
              {family?.name ?? (isLoading ? "Loading family..." : "No family selected")}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={!familyId}>
              Switch family
            </Button>
            <Button variant="contained" disabled={!familyId}>
              Add member
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {!familyId ? (
            <Alert severity="warning">Select a family to manage settings.</Alert>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

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
                        Core household details pulled from your family profile.
                      </Typography>
                    </Stack>
                    <Divider />
                    <Grid container spacing={2}>
                      {metadataHighlights.map((highlight) => (
                        <Grid key={highlight.label} item xs={12} sm={6}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {highlight.label}
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {highlight.value}
                            </Typography>
                          </Stack>
                        </Grid>
                      ))}
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Members
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {family ? `${family.members.length} total` : "—"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {family ? "Review roles in the members list." : "Awaiting family data"}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Family ID
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {family?.id ?? "—"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Use this ID to invite new members.
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
                      <ListItem disableGutters>
                        <ListItemText
                          primary="Goals"
                          secondary={
                            family?.metadata.goals.length
                              ? family.metadata.goals.join(", ")
                              : "No goals added yet"
                          }
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={family?.metadata.goals.length ? "Active" : "Empty"}
                          color={family?.metadata.goals.length ? "primary" : "default"}
                          variant="outlined"
                        />
                      </ListItem>
                      <Divider />
                      <ListItem disableGutters>
                        <ListItemText
                          primary="Interests"
                          secondary={
                            family?.metadata.interests.length
                              ? family.metadata.interests.join(", ")
                              : "No interests captured"
                          }
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={family?.metadata.interests.length ? "Active" : "Empty"}
                          color={family?.metadata.interests.length ? "primary" : "default"}
                          variant="outlined"
                        />
                      </ListItem>
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
                      Members synced from the family profile API.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" disabled={!familyId}>
                      Invite member
                    </Button>
                    <Button variant="contained" disabled={!familyId}>
                      Add member
                    </Button>
                  </Stack>
                </Stack>
                <Divider />
                <Grid container spacing={2}>
                  {family?.members.map((member) => (
                    <Grid key={member.userId} item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.light" }}>
                              {member.displayName
                                .split(" ")
                                .map((part) => part[0])
                                .join("")}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {member.displayName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {member.role}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                            <Stack spacing={1} alignItems="flex-end">
                              <Chip label={member.role} color="primary" variant="outlined" />
                              <Button size="small" variant="text" color="secondary">
                                Manage
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {!family || family.members.length === 0 ? (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        {isLoading ? "Loading members..." : "No members available yet."}
                      </Typography>
                    </Grid>
                  ) : null}
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
                      <Button variant="outlined" disabled={!familyId}>
                        Add integration
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {family
                        ? "No integrations connected yet. Connect calendars or messaging apps to get started."
                        : "Connect integrations after selecting a family."}
                    </Typography>
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
                      <Button variant="outlined" disabled={!familyId}>
                        Export
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {family
                        ? "Audit events will appear here as family actions are recorded."
                        : "Select a family to view audit events."}
                    </Typography>
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
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.light", width: 24, height: 24, fontSize: 14 }}>
                          ✓
                        </Avatar>
                        <Typography variant="body2">
                          {family ? `${family.members.length} members in this family.` : "No family selected."}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.light", width: 24, height: 24, fontSize: 14 }}>
                          ✓
                        </Avatar>
                        <Typography variant="body2">Roles can be managed per member.</Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Default permissions
                      </Typography>
                      <Typography variant="body2">
                        Owners and admins can manage schedules, view insights, and edit shared lists. Members
                        can add tasks and RSVP to events.
                      </Typography>
                      <Button variant="outlined" sx={{ alignSelf: "flex-start" }} disabled={!familyId}>
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
