import {
  Alert,
  Avatar,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { getApiErrorDescriptor } from "../../../shared/api";
import { joinFamily } from "../services/familyApi";
import {
  getSelectedFamilyId,
  getStoredFamilies,
  saveFamily,
} from "../../families/services/familyStorage";
import {
  fetchOidcProfile,
  getOidcProfile,
  getPreferredDisplayName
} from "../../auth/services/oidcProfileStorage";

type FormState = {
  familyId: string;
  addedByUserId: string;
  memberUserId: string;
  displayName: string;
  phoneNumber: string;
  age: string;
  photoFile: File | null;
};

const PageShell = styled.main`
  min-height: 100vh;
  padding: 3rem 1.5rem 4rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
`;

const ContentCard = styled(Paper)`
  max-width: 880px;
  margin: 0 auto;
  padding: 2.5rem;
  border-radius: 24px;
`;

const PhotoButton = styled(Button)`
  align-self: flex-start;
`;

export const AddFamilyMemberPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedFamilyId = getSelectedFamilyId() ?? "";
  const storedFamilyName =
    getStoredFamilies().find((family) => family.id === storedFamilyId)?.name ?? "your family";
  const routedFamilyId = (location.state as { familyId?: string } | null)?.familyId ?? "";

  const initialFormState: FormState = {
    familyId: routedFamilyId || storedFamilyId,
    addedByUserId: "",
    memberUserId: "",
    displayName: "",
    phoneNumber: "",
    age: "",
    photoFile: null,
  };
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState<{
    message: string;
    messageKey: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photoPreview = useMemo(() => {
    if (!form.photoFile) {
      return null;
    }
    return URL.createObjectURL(form.photoFile);
  }, [form.photoFile]);

  useEffect(() => {
    let isMounted = true;
    const hydrateProfile = async () => {
      const storedProfile = getOidcProfile();
      const profile = storedProfile ?? (await fetchOidcProfile());
      if (!profile || !isMounted) {
        return;
      }

      const preferredName = getPreferredDisplayName(profile);
      setForm((prev) => ({
        ...prev,
        displayName: prev.displayName || preferredName || prev.displayName,
        memberUserId: prev.memberUserId || profile.email || prev.memberUserId,
        addedByUserId: prev.addedByUserId || profile.email || prev.addedByUserId,
        phoneNumber: prev.phoneNumber || profile.phoneNumber || prev.phoneNumber
      }));
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, photoFile: file }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.familyId || !form.addedByUserId || !form.memberUserId || !form.displayName) {
      setError({
        message: "Family ID, member ID, display name, and added by user ID are required.",
        messageKey: "errors.family.join_required_fields"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await joinFamily({
        familyId: form.familyId,
        userId: form.memberUserId,
        displayName: form.displayName,
        addedByUserId: form.addedByUserId,
      });

      saveFamily(response.family);
      const joinedName = response.member?.displayName ?? form.displayName;
      setSuccessMessage(`Added ${joinedName} to ${response.family.name}.`);
      setForm((prev) => ({
        ...prev,
        memberUserId: "",
        displayName: "",
        phoneNumber: "",
        age: "",
        photoFile: null,
      }));
    } catch (submitError) {
      const descriptor = getApiErrorDescriptor(submitError);
      setError({
        message: descriptor.message,
        messageKey: descriptor.messageKey
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell>
      <ContentCard elevation={2}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="overline" color="primary">
              Family management
            </Typography>
            <Typography variant="h4" fontWeight={700} color="secondary">
              Add a family member
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Invite someone into {storedFamilyName} by completing their profile and the required family metadata.
            </Typography>
          </Stack>

          <Divider />

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
                <Avatar
                  src={photoPreview ?? undefined}
                  sx={{ width: 96, height: 96, bgcolor: "primary.light", fontSize: 36 }}
                >
                  {form.displayName ? form.displayName.slice(0, 1) : "?"}
                </Avatar>
                <Stack spacing={1} flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Profile photo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload a square image to help the family recognize this member.
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <PhotoButton variant="contained" component="label">
                      Choose image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handlePhotoChange}
                      />
                    </PhotoButton>
                    <Button
                      variant="text"
                      disabled={!form.photoFile}
                      onClick={() => setForm((prev) => ({ ...prev, photoFile: null }))}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </Stack>

              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Profile details
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Full name"
                    value={form.displayName}
                    onChange={handleChange("displayName")}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Member user ID"
                    value={form.memberUserId}
                    onChange={handleChange("memberUserId")}
                    helperText="Required by the family join API."
                    fullWidth
                    required
                  />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Phone number"
                    value={form.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    type="tel"
                    fullWidth
                    placeholder="Optional"
                    helperText="Stored locally for now."
                  />
                  <TextField
                    label="Age"
                    value={form.age}
                    onChange={handleChange("age")}
                    type="number"
                    inputProps={{ min: 0 }}
                    fullWidth
                    placeholder="Optional"
                    helperText="Stored locally for now."
                  />
                </Stack>
              </Stack>

              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Family permissions
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Family ID"
                    value={form.familyId}
                    onChange={handleChange("familyId")}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Added by user ID"
                    value={form.addedByUserId}
                    onChange={handleChange("addedByUserId")}
                    fullWidth
                    required
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  The join API only accepts the member ID, display name, and the admin/owner who is adding them.
                </Typography>
              </Stack>

              {error ? <Alert severity="error">{error.message}</Alert> : null}
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setForm(initialFormState);
                  }}
                >
                  Reset form
                </Button>
                <Button
                  variant="text"
                  type="button"
                  onClick={() => navigate("/app/home")}
                  disabled={!storedFamilyId}
                >
                  Continue to home
                </Button>
                <Button variant="contained" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding member..." : "Add member"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </ContentCard>
    </PageShell>
  );
};
