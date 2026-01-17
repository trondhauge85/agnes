export type AssistantIdentity = {
  name: string;
  version: string;
};

export const defaultIdentity: AssistantIdentity = {
  name: "agnes",
  version: "0.1.0"
};

export {
  configureLogging,
  createLogger,
  resetLogging,
  setLogLevel,
  setLogTransport,
  type LogContext,
  type LogData,
  type LogDetails,
  type LogPayload,
  type LogTransport
} from "./logging";

export * from "./apiErrors";
