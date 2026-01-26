import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { getApiErrorDescriptor } from "../../../shared/api";
import {
  completeCalendarOAuth,
  fetchCalendarProviders,
  fetchCalendars,
  selectCalendar,
  startCalendarOAuth,
  type CalendarInfo,
  type CalendarProvider,
} from "../../calendar/services/calendarApi";
import {
  getSelectedFamilyId,
  getStoredFamilies,
} from "../../families/services/familyStorage";

const PageShell = styled.main`
  min-height: 100vh;
  padding: 2.5rem 1.5rem 4rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
`;

const ContentCard = styled(Card)`
  max-width: 960px;
  margin: 0 auto;
  border-radius: 24px;
`;

const providerLabels: Record<string, string> = {
  google: "Google Calendar",
};

const formatProviderLabel = (provider: string): string =>
  providerLabels[provider] ?? `${provider.slice(0, 1).toUpperCase()}${provider.slice(1)}`;

const CALENDAR_OAUTH_MESSAGE = "agnes-calendar-oauth";

export const CalendarSetupPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedFamilyId = getSelectedFamilyId() ?? "";
  const routedFamilyId = (location.state as { familyId?: string } | null)?.familyId ?? "";
  const familyId = routedFamilyId || storedFamilyId;
  const familyName =
    getStoredFamilies().find((family) => family.id === familyId)?.name ?? "your family";

  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider>("");
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarDescription, setNewCalendarDescription] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectUri = useMemo(
    () => `http://localhost:3000/redirect/google`,//`${window.location.origin}/calendar/oauth/callback`,
    []
  );

  useEffect(() => {
    let isMounted = true;
    const loadProviders = async () => {
      try {
        const response = await fetchCalendarProviders();
        if (!isMounted) {
          return;
        }
        setProviders(response.providers);
        setSelectedProvider((prev) => prev || response.providers[0] || "");
      } catch (error) {
        const descriptor = getApiErrorDescriptor(error);
        setConnectionError(descriptor.message);
      }
    };

    loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }
    setCalendars([]);
    setSelectedCalendarId(null);
    refreshCalendars(selectedProvider).catch(() => null);
  }, [selectedProvider]);

  const refreshCalendars = async (provider: CalendarProvider) => {
    const response = await fetchCalendars({ provider, familyId });
    setCalendars(response.calendars);
    setSelectedCalendarId(response.selectedCalendarId);
    return response;
  };

  const waitForOAuthCode = (
    popup: Window,
    expectedState: string | null
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("OAuth popup timed out."));
      }, 120000);

      const interval = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error("The OAuth window was closed before finishing."));
        }
      }, 500);

      const handler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        const data = event.data as {
          type?: string;
          code?: string | null;
          state?: string | null;
          error?: string | null;
        };
        if (!data || data.type !== CALENDAR_OAUTH_MESSAGE) {
          return;
        }

        if (expectedState && data.state && data.state !== expectedState) {
          cleanup();
          reject(new Error("OAuth state mismatch."));
          return;
        }

        if (data.error) {
          cleanup();
          reject(new Error(data.error));
          return;
        }

        if (!data.code) {
          cleanup();
          reject(new Error("No authorization code returned."));
          return;
        }

        cleanup();
        resolve(data.code);
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        window.clearInterval(interval);
        window.removeEventListener("message", handler);
      };

      window.addEventListener("message", handler);
    });

  const handleConnect = async () => {
    if (!selectedProvider) {
      setConnectionError("Pick a calendar provider before connecting.");
      return;
    }

    setConnectionError(null);
    setSuccessMessage(null);
    setIsConnecting(true);

    try {
      const state = crypto.randomUUID();
      const response = await startCalendarOAuth({
        provider: selectedProvider,
        redirectUri,
        state,
      });

      const popup = window.open(
        response.authUrl,
        "agnes-calendar-oauth",
        "width=520,height=700"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups to connect your calendar.");
      }

      const code = await waitForOAuthCode(popup, response.state ?? state);
      await completeCalendarOAuth({
        provider: selectedProvider,
        authorizationCode: code,
        redirectUri,
      });
      await refreshCalendars(selectedProvider);
      setSuccessMessage("Calendar provider connected.");
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setConnectionError(descriptor.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCalendarPick = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setNewCalendarName("");
  };

  const handleNewCalendarNameChange = (value: string) => {
    setNewCalendarName(value);
    if (value.trim()) {
      setSelectedCalendarId(null);
    }
  };

  const handleSelectCalendar = async () => {
    if (!selectedProvider) {
      setSelectionError("Pick a calendar provider first.");
      return;
    }

    if (!selectedCalendarId && !newCalendarName.trim()) {
      setSelectionError("Select an existing calendar or name a new one.");
      return;
    }

    setSelectionError(null);
    setIsSelecting(true);
    setSuccessMessage(null);

    try {
      const response = await selectCalendar({
        provider: selectedProvider,
        familyId,
        calendarId: selectedCalendarId ?? undefined,
        name: newCalendarName.trim() || undefined,
        description: newCalendarDescription.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      setSelectedCalendarId(response.calendar.id);
      setNewCalendarName("");
      setNewCalendarDescription("");
      setSuccessMessage(
        `Calendar linked to ${familyName}. You can change this any time.`
      );
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setSelectionError(descriptor.message);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleContinue = () => {
    navigate("/app/family/add");
  };

  if (!familyId) {
    return (
      <PageShell>
        <Alert severity="error">No family selected. Please create a family first.</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ContentCard elevation={2}>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="overline" color="primary">
                Onboarding
              </Typography>
              <Typography variant="h4" fontWeight={700} color="secondary">
                Connect a shared calendar
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Pick the calendar provider for {familyName}. You can link one shared
                calendar per family, and invite anyone with access.
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                Choose your calendar provider
              </Typography>
              <FormControl>
                <RadioGroup
                  value={selectedProvider}
                  onChange={(event) =>
                    setSelectedProvider(event.target.value as CalendarProvider)
                  }
                >
                  {providers.map((provider) => (
                    <FormControlLabel
                      key={provider}
                      value={provider}
                      control={<Radio />}
                      label={formatProviderLabel(provider)}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleConnect}
                disabled={!selectedProvider || isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect provider"}
              </Button>
              {connectionError ? <Alert severity="error">{connectionError}</Alert> : null}
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                Pick an existing calendar
              </Typography>
              {calendars.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Connect a provider to load available calendars.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {calendars.map((calendar) => (
                    <Card
                      key={calendar.id}
                      variant={selectedCalendarId === calendar.id ? "outlined" : undefined}
                      sx={{
                        borderColor:
                          selectedCalendarId === calendar.id ? "primary.main" : undefined,
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Radio
                            checked={selectedCalendarId === calendar.id}
                            onChange={() => handleCalendarPick(calendar.id)}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {calendar.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {calendar.description ?? "No description"}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                              <Chip label={calendar.timezone} size="small" variant="outlined" />
                              {calendar.primary ? (
                                <Chip label="Primary" size="small" color="primary" />
                              ) : null}
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                Or create a new family calendar
              </Typography>
              <TextField
                label="New calendar name"
                placeholder="Agnes Family Calendar"
                value={newCalendarName}
                onChange={(event) => handleNewCalendarNameChange(event.target.value)}
                fullWidth
              />
              <TextField
                label="Description"
                placeholder="Shared events and routines"
                value={newCalendarDescription}
                onChange={(event) => setNewCalendarDescription(event.target.value)}
                fullWidth
              />
              <TextField
                label="Timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleSelectCalendar}
                disabled={isSelecting || (!selectedCalendarId && !newCalendarName.trim())}
              >
                {isSelecting ? "Saving..." : "Save calendar choice"}
              </Button>
              {selectionError ? <Alert severity="error">{selectionError}</Alert> : null}
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="flex-end">
              <Button variant="text" onClick={() => navigate("/app/home")}>
                Skip for now
              </Button>
              <Button variant="contained" onClick={handleContinue}>
                Continue to family invites
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </ContentCard>
    </PageShell>
  );
};
