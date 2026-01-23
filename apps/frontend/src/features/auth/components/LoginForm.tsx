import { Button, Checkbox, Divider, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { setSessionCookie, setTokenSession } from "../services/authStorage";
import { hasStoredFamily } from "../../families/services/familyStorage";
import { hasStoredProfile } from "../../profile/services/profileStorage";
import { apiRequest } from "../../../shared/api/client";

type LoginFormState = {
  email: string;
  password: string;
  remember: boolean;
  useCookie: boolean;
};

type AuthProvider = {
  id: string;
  type: "oauth" | "passwordless";
  displayName: string;
};

type AuthProvidersResponse = {
  providers: AuthProvider[];
};

type OAuthStartResponse = {
  authUrl: string;
};

type OidcProvider = {
  id: string;
  displayName: string;
};

const FormCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
  padding: 2.5rem;
  width: min(440px, 100%);
`;

const fallbackOidcProviders: OidcProvider[] = [
  { id: "google", displayName: "Google" },
  { id: "apple", displayName: "Apple" },
  { id: "facebook", displayName: "Facebook" }
];

export const LoginForm = () => {
  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    remember: true,
    useCookie: false,
  });
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>(fallbackOidcProviders);
  const [oidcLoading, setOidcLoading] = useState<string | null>(null);
  const [oidcError, setOidcError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    apiRequest<AuthProvidersResponse>("/auth/providers")
      .then((response) => {
        if (!isMounted) {
          return;
        }
        const oauthProviders = response.providers
          .filter((provider) => provider.type === "oauth")
          .map((provider) => ({
            id: provider.id,
            displayName: provider.displayName
          }));
        if (oauthProviders.length > 0) {
          setOidcProviders(oauthProviders);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOidcProviders(fallbackOidcProviders);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field: keyof LoginFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = field === "remember" || field === "useCookie" ? event.target.checked : event.target.value;
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fakeToken = `demo-${Date.now()}`;

    if (state.useCookie) {
      setSessionCookie(fakeToken);
    } else {
      setTokenSession(fakeToken, state.remember);
    }

    const destination = hasStoredProfile()
      ? hasStoredFamily()
        ? "/app/home"
        : "/app/create-family"
      : "/app/profile";
    navigate(destination, { replace: true });
  };

  const handleOidcStart = async (providerId: string) => {
    setOidcError(null);
    setOidcLoading(providerId);
    try {
      const redirectUrl = new URL("/auth/oidc/callback", window.location.origin);
      redirectUrl.searchParams.set("provider", providerId);
      const redirectUri = redirectUrl.toString();
      const response = await apiRequest<OAuthStartResponse>("/auth/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          redirectUri,
          state: crypto.randomUUID()
        })
      });
      if (response.authUrl) {
        window.location.assign(response.authUrl);
      } else {
        setOidcError("OIDC is unavailable right now. Please try again.");
      }
    } catch {
      setOidcError("OIDC is unavailable right now. Please try again.");
    } finally {
      setOidcLoading(null);
    }
  };

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700} color="secondary">
              Welcome back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to continue building with Agnes.
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              Continue with OIDC
            </Typography>
            <Stack spacing={1.5}>
              {oidcProviders.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outlined"
                  size="large"
                  onClick={() => handleOidcStart(provider.id)}
                  disabled={oidcLoading !== null}
                  data-testid={`oidc-provider-${provider.id}`}
                >
                  {oidcLoading === provider.id
                    ? `Connecting to ${provider.displayName}...`
                    : `Continue with ${provider.displayName}`}
                </Button>
              ))}
            </Stack>
            {oidcError ? (
              <Typography variant="caption" color="error" data-testid="oidc-error">
                {oidcError}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                You will be redirected to your identity provider to complete the sign-in.
              </Typography>
            )}
          </Stack>

          <Divider>or</Divider>

          <TextField
            label="Email"
            type="email"
            value={state.email}
            onChange={handleChange("email")}
            autoComplete="email"
            required
            fullWidth
          />

          <TextField
            label="Password"
            type="password"
            value={state.password}
            onChange={handleChange("password")}
            autoComplete="current-password"
            required
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between">
            <FormControlLabel
              control={<Checkbox checked={state.remember} onChange={handleChange("remember")} />}
              label="Remember me"
            />
            <FormControlLabel
              control={<Checkbox checked={state.useCookie} onChange={handleChange("useCookie")} />}
              label="Use cookie-based session"
            />
          </Stack>

          <Button type="submit" variant="contained" size="large">
            Sign in
          </Button>

          <Typography variant="caption" color="text.secondary">
            Cookie-based sessions are ideal for server-rendered flows, while token sessions enable native and API-first
            clients.
          </Typography>
        </Stack>
      </form>
    </FormCard>
  );
};
