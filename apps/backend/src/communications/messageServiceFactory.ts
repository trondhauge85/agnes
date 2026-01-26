import { createMessageService, createSmsCommunicationProvider } from "./messageService";
import {
  createBrevoConfigFromEnv,
  createBrevoEmailProvider,
  createBrevoSmsProvider
} from "./brevoProvider";
import { createTelegramProvider } from "./telegramProvider";
import type { CommunicationChannel, CommunicationProvider } from "../types";

export const createDefaultMessageService = () => {
  const config = createBrevoConfigFromEnv();
  if (!config) {
    return null;
  }

  const providers: Partial<Record<CommunicationChannel, CommunicationProvider>> = {};

  if (config.emailSender) {
    providers.email = createBrevoEmailProvider(config);
  }

  if (config.smsSender) {
    const smsProvider = createBrevoSmsProvider(config);
    providers.sms = createSmsCommunicationProvider(smsProvider);
  }

  if (process.env.TELEGRAM_BOT_TOKEN) {
    providers.telegram = createTelegramProvider();
  }

  if (Object.keys(providers).length === 0) {
    return null;
  }

  return createMessageService({ providers });
};
