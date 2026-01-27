import { createMessageService, createSmsCommunicationProvider } from "./messageService";
import {
  createBrevoConfigFromEnv,
  createBrevoEmailProvider,
  createBrevoSmsProvider
} from "./brevoProvider";
import {
  createGatewayApiConfigFromEnv,
  createGatewayApiSmsProvider
} from "./gatewayApiProvider";
import { createTelegramProvider } from "./telegramProvider";
import type { CommunicationChannel, CommunicationProvider } from "../types";

export const createDefaultMessageService = () => {
  const brevoConfig = createBrevoConfigFromEnv();
  const gatewayConfig = createGatewayApiConfigFromEnv();

  const providers: Partial<Record<CommunicationChannel, CommunicationProvider>> = {};

  if (brevoConfig?.emailSender) {
    providers.email = createBrevoEmailProvider(brevoConfig);
  }

  if (gatewayConfig?.smsSender) {
    const smsProvider = createGatewayApiSmsProvider(gatewayConfig);
    providers.sms = createSmsCommunicationProvider(smsProvider);
  } else if (brevoConfig?.smsSender) {
    const smsProvider = createBrevoSmsProvider(brevoConfig);
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
