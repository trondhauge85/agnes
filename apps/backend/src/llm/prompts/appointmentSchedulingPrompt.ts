import type { PromptTemplate } from "../types";

export const appointmentSchedulingPrompt: PromptTemplate = {
  id: "appointment_scheduling",
  description:
    "Normalize appointment booking requests into structured JSON for generic providers.",
  render: ({ userMessage, context, timezone, locale }) =>
    [
      "You are an assistant that extracts appointment booking requests.",
      "Return JSON only. Identify the provider, service, time preferences, and constraints.",
      "Support any provider category (e.g., doctors, salons, housekeeping, contractors).",
      "Include integration hints (booking URL, provider IDs, contact channels) when present.",
      "If details are missing, list what clarifications are needed.",
      "Context:",
      context || "(none)",
      "Timezone:",
      timezone || "(unknown)",
      "Locale:",
      locale || "(unknown)",
      "User message:",
      userMessage || ""
    ].join("\n")
};
