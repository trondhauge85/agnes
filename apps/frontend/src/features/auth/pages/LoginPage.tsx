import { Stack, Typography } from "@mui/material";
import styled from "styled-components";

import { LoginForm } from "../components/LoginForm";

const PageShell = styled.main`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: radial-gradient(circle at top, rgba(79, 70, 229, 0.12), transparent 55%),
    linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
`;

const ContentStack = styled.div`
  display: grid;
  gap: 2.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: center;
  width: min(960px, 100%);
`;

const BrandPanel = styled.section`
  display: grid;
  gap: 1.5rem;
`;

export const LoginPage = () => {
  return (
    <PageShell>
      <ContentStack>
        <BrandPanel>
          <Typography variant="overline" color="primary">
            Agnes Assistant
          </Typography>
          <Typography variant="h3" fontWeight={700} color="secondary">
            Start every conversation with context.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect your workspace, sync your notes, and let Agnes surface what you need when you need it.
          </Typography>
        </BrandPanel>
        <Stack alignItems={{ xs: "stretch", md: "flex-end" }}>
          <LoginForm />
        </Stack>
      </ContentStack>
    </PageShell>
  );
};
