import type {
  CommunicationProvider,
  CommunicationProviderResult,
  CommunicationSendPayload
} from "../types";

type WhatsAppProviderConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
};

type WhatsAppSendResult = {
  recipient: string;
  status: CommunicationProviderResult["status"];
  providerMessageId?: string;
  error?: string;
  response?: unknown;
};

export class WhatsAppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigError";
  }
}

const DEFAULT_API_VERSION = "v19.0";
const DEFAULT_API_BASE_URL = "https://graph.facebook.com";

const resolveConfig = (
  input?: Partial<WhatsAppProviderConfig>
): WhatsAppProviderConfig => {
  const accessToken = input?.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId =
    input?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new WhatsAppConfigError(
      "WhatsApp integration is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID."
    );
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion:
      input?.apiVersion ?? process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION,
    apiBaseUrl:
      input?.apiBaseUrl ??
      process.env.WHATSAPP_API_BASE_URL ??
      DEFAULT_API_BASE_URL,
    timeoutMs: input?.timeoutMs
  };
};

const buildEndpoint = (config: WhatsAppProviderConfig): string =>
  `${config.apiBaseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: { message?: string } }).error;
  if (error?.message) {
    return error.message;
  }

  return null;
};

const sendMessage = async (
  config: WhatsAppProviderConfig,
  payload: CommunicationSendPayload,
  recipient: string,
  fetcher: typeof fetch
): Promise<WhatsAppSendResult> => {
  const controller = new AbortController();
  const timeoutId = config.timeoutMs
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : undefined;

  try {
    const response = await fetcher(buildEndpoint(config), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: {
          body: payload.message,
          preview_url: false
        }
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => undefined);
    if (!response.ok) {
      return {
        recipient,
        status: "failed",
        error:
          extractErrorMessage(data) ??
          `WhatsApp API error: ${response.status} ${response.statusText}`,
        response: data
      };
    }

    const providerMessageId =
      Array.isArray((data as { messages?: { id?: string }[] }).messages) &&
      (data as { messages?: { id?: string }[] }).messages?.[0]?.id
        ? (data as { messages?: { id?: string }[] }).messages?.[0]?.id
        : undefined;

    return {
      recipient,
      status: "sent",
      providerMessageId,
      response: data
    };
  } catch (error) {
    return {
      recipient,
      status: "failed",
      error: error instanceof Error ? error.message : "WhatsApp request failed."
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const createWhatsAppProvider = (
  inputConfig?: Partial<WhatsAppProviderConfig>,
  deps?: { fetcher?: typeof fetch }
): CommunicationProvider => {
  const config = resolveConfig(inputConfig);
  const fetcher = deps?.fetcher ?? fetch;

  return {
    channel: "whatsapp",
    send: async (payload: CommunicationSendPayload) => {
      if (payload.recipients.length === 0) {
        return {
          status: "failed",
          error: "WhatsApp payload requires at least one recipient."
        };
      }

      const results = await Promise.all(
        payload.recipients.map((recipient) =>
          sendMessage(config, payload, recipient.address, fetcher)
        )
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
            ? `Failed to send ${failures.length} WhatsApp message(s).`
            : undefined
      };
    }
  };
};
