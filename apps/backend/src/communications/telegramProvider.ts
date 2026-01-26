import type {
  CommunicationProvider,
  CommunicationProviderResult,
  CommunicationSendPayload
} from "../types";
import {
  resolveTelegramConfig,
  sendTelegramMessage,
  type TelegramClientConfig,
  type TelegramSendResult
} from "@agnes/shared";

type TelegramProviderConfig = TelegramClientConfig;

const formatSendResult = (result: TelegramSendResult) => ({
  status: result.ok ? "sent" : "failed",
  providerMessageId: result.messageId,
  error: result.ok ? undefined : result.error,
  response: result.response
});

export const createTelegramProvider = (
  inputConfig?: Partial<TelegramProviderConfig>,
  deps?: { fetcher?: typeof fetch }
): CommunicationProvider => {
  const config = resolveTelegramConfig(inputConfig);
  const fetcher = deps?.fetcher ?? fetch;

  return {
    channel: "telegram",
    send: async (payload: CommunicationSendPayload) => {
      if (payload.recipients.length === 0) {
        return {
          status: "failed",
          error: "Telegram payload requires at least one recipient."
        };
      }

      const results = await Promise.all(
        payload.recipients.map(async (recipient) => {
          const response = await sendTelegramMessage(
            config,
            { chatId: recipient.address, text: payload.message },
            fetcher
          );
          return {
            recipient: recipient.address,
            ...formatSendResult(response)
          };
        })
      );

      const failures = results.filter((result) => result.status === "failed");
      const providerMessageId =
        results.length === 1 ? results[0].providerMessageId : undefined;
      const status: CommunicationProviderResult["status"] =
        failures.length > 0 ? "failed" : "sent";

      return {
        status,
        providerMessageId,
        providerResponse: {
          results
        },
        error:
          failures.length > 0
            ? `Failed to send ${failures.length} Telegram message(s).`
            : undefined
      };
    }
  };
};
