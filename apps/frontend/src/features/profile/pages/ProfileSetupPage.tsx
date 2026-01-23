import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { hasStoredFamily } from "../../families/services/familyStorage";
import {
  fetchOidcProfile,
  getOidcProfile,
  getPreferredDisplayName
} from "../../auth/services/oidcProfileStorage";
import { createProfileId, getStoredProfile, saveProfile } from "../services/profileStorage";

const PageShell = styled.main`
  min-height: 100vh;
  padding: 1.5rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);

  @media (min-width: 900px) {
    padding: 3rem 4rem;
  }
`;

const ContentCard = styled.section`
  background: #ffffff;
  border-radius: 28px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
  margin: 0 auto;
  padding: 2rem;
  width: min(720px, 100%);

  @media (min-width: 900px) {
    padding: 3rem;
  }
`;

export const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const storedProfile = getStoredProfile();
  const [username, setUsername] = useState(storedProfile?.username ?? "");
  const [userId, setUserId] = useState(storedProfile?.id ?? createProfileId());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateProfile = async () => {
      const profile = getOidcProfile() ?? (await fetchOidcProfile());
      if (!profile || !isMounted) {
        return;
      }
      const preferredName = getPreferredDisplayName(profile);
      if (preferredName) {
        setUsername((prev) => prev || preferredName);
      }
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage("Please choose a username.");
      return;
    }

    const nextProfile = {
      id: userId,
      username: username.trim()
    };
    saveProfile(nextProfile);
    const destination = hasStoredFamily() ? "/app/home" : "/app/create-family";
    navigate(destination, { replace: true });
  };

  return (
    <PageShell>
      <ContentCard>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Stack spacing={1}>
            <Typography variant="overline" color="primary">
              Step 1 of 2
            </Typography>
            <Typography variant="h4" fontWeight={700} color="secondary">
              Create your profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Pick the name your family will see. We will keep your unique ID tucked away behind the scenes.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <TextField
              label="Username"
              placeholder="Avery"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              fullWidth
              required
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Your profile ID is generated automatically and stays hidden from the family experience.
              </Typography>
            </Box>
          </Stack>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <Button type="submit" variant="contained" size="large">
            Continue to family setup
          </Button>
        </Stack>
      </ContentCard>
    </PageShell>
  );
};
