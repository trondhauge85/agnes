import type { LlmSkill } from "../types";

export const appointmentSchedulingSkill: LlmSkill = {
  name: "schedule_appointment",
  description:
    "Structure appointment booking requests for any provider type (medical, salon, housekeeping, contractor, etc.) with provider details, services, time preferences, and integration hints.",
  promptId: "appointment_scheduling",
  responseSchema: {
    type: "object",
    properties: {
      appointments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            provider: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                specialty: { type: "string" },
                locationHint: { type: "string" },
                integration: {
                  type: "object",
                  properties: {
                    system: { type: "string" },
                    providerId: { type: "string" },
                    bookingUrl: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" }
                  }
                }
              },
              required: ["category"]
            },
            service: { type: "string" },
            notes: { type: "string" },
            timePreferences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start: { type: "string" },
                  end: { type: "string" },
                  timeZone: { type: "string" },
                  flexibility: { type: "string" },
                  priority: { type: "number" }
                }
              }
            },
            location: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                region: { type: "string" },
                postalCode: { type: "string" },
                country: { type: "string" },
                meetingUrl: { type: "string" },
                onSite: { type: "boolean" }
              }
            },
            customer: {
              type: "object",
              properties: {
                name: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                memberId: { type: "string" },
                insurance: { type: "string" }
              }
            },
            attendees: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" }
                }
              }
            },
            constraints: {
              type: "array",
              items: { type: "string" }
            },
            clarifications: {
              type: "array",
              items: { type: "string" }
            },
            confidence: { type: "number" },
            source: { type: "string" }
          },
          required: ["provider", "service", "confidence"]
        }
      }
    },
    required: ["appointments"]
  }
};
