import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { getApiErrorDescriptor } from "../../../shared/api";
import {
  fetchOidcProfile,
  getOidcProfile,
  getPreferredDisplayName
} from "../../auth/services/oidcProfileStorage";
import { createFamily } from "../services/familyApi";
import { saveFamily } from "../services/familyStorage";

const PageShell = styled.main`
  min-height: 100vh;
  padding: 1.5rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);

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
  width: min(980px, 100%);

  @media (min-width: 900px) {
    padding: 3rem;
  }
`;

const LayoutGrid = styled.div`
  display: grid;
  gap: 2.5rem;

  @media (min-width: 900px) {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }
`;

const AvatarShell = styled.div`
  position: relative;
  border-radius: 32px;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(14, 116, 144, 0.12));
  display: grid;
  gap: 1.25rem;
  justify-items: center;
`;

const AvatarPreview = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 32px;
  background: #eef2ff;
  border: 1px dashed rgba(79, 70, 229, 0.4);
  display: grid;
  place-items: center;
  overflow: hidden;
  text-align: center;
  padding: 1rem;
`;

const HiddenInput = styled.input`
  display: none;
`;

const descriptorOptions = [
  "cozy & calm",
  "always hungry",
  "outdoorsy",
  "pet obsessed",
  "night owls",
  "plant lovers",
  "creative chaos",
  "game nights",
  "budget savvy",
  "weekend explorers",
  "tiny but mighty",
  "full house",
];

const placeholderSvg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\">
      <defs>
        <linearGradient id=\"grad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">
          <stop offset=\"0%\" stop-color=\"#c7d2fe\"/>
          <stop offset=\"100%\" stop-color=\"#bae6fd\"/>
        </linearGradient>
      </defs>
      <rect width=\"300\" height=\"300\" rx=\"40\" fill=\"url(#grad)\"/>
      <text x=\"50%\" y=\"52%\" text-anchor=\"middle\" fill=\"#1e293b\" font-size=\"20\" font-family=\"Inter, Arial\">family photo</text>
    </svg>`
  );

export const CreateFamilyPage = () => {
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{
    message: string;
    messageKey: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const previewUrl = useMemo(() => photoUrl ?? placeholderSvg, [photoUrl]);

  useEffect(() => {
    let isMounted = true;
    const hydrateProfile = async () => {
      const storedProfile = getOidcProfile();
      const profile = storedProfile ?? (await fetchOidcProfile());
      if (!profile || !isMounted) {
        return;
      }
      const preferredName = getPreferredDisplayName(profile);
      if (preferredName) {
        setDisplayName((prev) => prev || preferredName);
      }
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const handleDescriptorToggle = (value: string) => {
    setSelectedDescriptors((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPhotoUrl(nextUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await createFamily({
        name: familyName,
        pictureUrl: photoUrl ?? placeholderSvg,
        creator: {
          userId: `demo-user-${Date.now()}`,
          displayName,
        },
        metadata: {
          interests: selectedDescriptors,
        },
      });

      saveFamily(response.family);
      setSuccessMessage(`Family created! You can invite everyone with code ${response.family.id}.`);
      navigate("/app/family/add", {
        replace: true,
        state: { familyId: response.family.id, familyName: response.family.name },
      });
    } catch (error) {
      const descriptor = getApiErrorDescriptor(error);
      setErrorMessage({
        message: descriptor.message,
        messageKey: descriptor.messageKey
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell>
      <ContentCard>
        <LayoutGrid>
          <Stack spacing={2}>
            <Typography variant="overline" color="primary">
              Create your family space
            </Typography>
            <Typography variant="h4" fontWeight={700} color="secondary">
              Start a shared home base in under a minute.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Give your crew a name, drop in a photo, and pick the vibes that feel like home. We will take care of the
              logistics later.
            </Typography>
            <AvatarShell>
              <AvatarPreview>
                {photoUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Family avatar preview"
                    sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "24px" }}
                  />
                ) : (
                  <Stack spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={600} color="secondary">
                      No photo yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add anything that makes you smile. We do not judge.
                    </Typography>
                  </Stack>
                )}
              </AvatarPreview>
              <label>
                <HiddenInput type="file" accept="image/*" onChange={handleFileChange} />
                <Button variant="contained">Upload a photo</Button>
              </label>
              <Typography variant="caption" color="text.secondary">
                Square photos look extra nice, but we will crop it gracefully either way.
              </Typography>
            </AvatarShell>
          </Stack>

          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack spacing={1.5}>
              <Typography variant="h5" fontWeight={600} color="secondary">
                What should we call this family?
              </Typography>
              <TextField
                label="Family name"
                placeholder="The Cozy Crew"
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Your name"
                placeholder="Avery"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                fullWidth
              />
              <Typography variant="body2" color="text.secondary">
                This shows up as the owner until everyone joins in.
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={600} color="secondary">
                Pick a few vibes that describe your people.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tap each chip you like. Mix and match, change your mind later, all good.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {descriptorOptions.map((descriptor) => {
                  const selected = selectedDescriptors.includes(descriptor);
                  return (
                    <Chip
                      key={descriptor}
                      label={descriptor}
                      variant={selected ? "filled" : "outlined"}
                      color={selected ? "primary" : "default"}
                      onClick={() => handleDescriptorToggle(descriptor)}
                      sx={{ textTransform: "capitalize" }}
                    />
                  );
                })}
              </Stack>
            </Stack>

            {errorMessage ? <Alert severity="error">{errorMessage.message}</Alert> : null}
            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting || !familyName || !displayName}
            >
              {isSubmitting ? "Creating..." : "Create family"}
            </Button>

            <Typography variant="caption" color="text.secondary">
              By continuing, you agree to keep things warm, welcoming, and just a little bit playful.
            </Typography>
          </Stack>
        </LayoutGrid>
      </ContentCard>
    </PageShell>
  );
};
