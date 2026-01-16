import { Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { setSessionCookie, setTokenSession } from "../services/authStorage";
import { hasStoredFamily } from "../../families/services/familyStorage";

type LoginFormState = {
  email: string;
  password: string;
  remember: boolean;
  useCookie: boolean;
};

const FormCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
  padding: 2.5rem;
  width: min(440px, 100%);
`;

export const LoginForm = () => {
  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    remember: true,
    useCookie: false,
  });
  const navigate = useNavigate();

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

    const destination = hasStoredFamily() ? "/app/home" : "/app/create-family";
    navigate(destination, { replace: true });
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
