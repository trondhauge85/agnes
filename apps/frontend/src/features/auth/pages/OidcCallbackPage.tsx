import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";

import { apiRequest } from "../../../shared/api/client";
import { getApiErrorDescriptor } from "../../../shared/api";
import { hasStoredFamily } from "../../families/services/familyStorage";
import { hasStoredProfile } from "../../profile/services/profileStorage";
import { setTokenSession } from "../services/authStorage";
import {
  clearOidcProfile,
  saveOidcProfile,
  type OidcProfile
} from "../services/oidcProfileStorage";

type OidcCallbackResponse = {
  status: string;
  provider: string;
  sessionToken: string;
  profile: OidcProfile;
};

const PageShell = styled.main`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
`;

const ContentCard = styled(Box)`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
  padding: 2.5rem;
  width: min(520px, 100%);
`;

const getQueryValue = (value: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const OidcCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      const provider = getQueryValue(searchParams.get("provider")) ?? "google";
      const profile: OidcProfile = {
        displayName: getQueryValue(searchParams.get("name")),
        givenName: getQueryValue(searchParams.get("given_name")),
        familyName: getQueryValue(searchParams.get("family_name")),
        email: getQueryValue(searchParams.get("email")),
        phoneNumber: getQueryValue(searchParams.get("phone")),
        pictureUrl: getQueryValue(searchParams.get("picture"))
      };

      try {
        const response = await apiRequest<OidcCallbackResponse>("/auth/oidc/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            profile
          })
        });

        if (!isMounted) {
          return;
        }

        clearOidcProfile();
        saveOidcProfile(response.profile);
        setTokenSession(response.sessionToken, true);

        const destination = hasStoredProfile()
          ? hasStoredFamily()
            ? "/app/home"
            : "/app/create-family"
          : "/app/profile";
        navigate(destination, { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const descriptor = getApiErrorDescriptor(error);
        setErrorMessage(descriptor.message);
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <PageShell>
      <ContentCard>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <CircularProgress />
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={600} color="secondary">
              Finishing your sign-in
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We are syncing your profile details from your identity provider.
            </Typography>
          </Stack>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        </Stack>
      </ContentCard>
    </PageShell>
  );
};
