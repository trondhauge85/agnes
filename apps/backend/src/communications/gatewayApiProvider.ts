import type { SmsProvider, SmsProviderResult } from "../types";

type GatewayApiConfig = {
  apiKey: string;
  apiSecret: string;
  smsSender: string;
  apiBaseUrl?: string;
};

type GatewayApiSmsResponse = {
  ids?: string[];
  message?: string;
  error?: string;
  errors?: unknown;
};

const DEFAULT_GATEWAY_API_BASE_URL = "https://gatewayapi.com";

const buildGatewayApiHeaders = (
  config: GatewayApiConfig,
  idempotencyKey?: string
) => {
  const encoded = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString(
    "base64"
  );
  const headers = new Headers({
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json"
  });
  if (idempotencyKey) {
    headers.set("X-Request-Id", idempotencyKey);
  }
  return headers;
};

const parseGatewayApiResponse = async (
  response: Response
): Promise<GatewayApiSmsResponse | undefined> => {
  if (!response.body) {
    return undefined;
  }
  try {
    return (await response.json()) as GatewayApiSmsResponse;
  } catch {
    return undefined;
  }
};

const resolveErrorMessage = (
  response: Response,
  payload?: GatewayApiSmsResponse
): string => {
  if (payload?.error) {
    return payload.error;
  }
  if (payload?.message) {
    return payload.message;
  }
  if (payload?.errors) {
    return "GatewayAPI request failed.";
  }
  return response.statusText || `GatewayAPI request failed with ${response.status}.`;
};

const resolveProviderResult = (
  response: Response,
  payload?: GatewayApiSmsResponse
): SmsProviderResult => ({
  status: response.ok ? "sent" : "failed",
  providerMessageId: Array.isArray(payload?.ids) ? payload?.ids?.[0] : undefined,
  providerResponse: payload ? { ...payload } : undefined,
  error: response.ok ? undefined : resolveErrorMessage(response, payload)
});

const sendGatewayApiSms = async (
  config: GatewayApiConfig,
  recipients: string[],
  message: string,
  idempotencyKey?: string
): Promise<SmsProviderResult> => {
  const response = await fetch(
    `${config.apiBaseUrl ?? DEFAULT_GATEWAY_API_BASE_URL}/rest/mtsms`,
    {
      method: "POST",
      headers: buildGatewayApiHeaders(config, idempotencyKey),
      body: JSON.stringify({
        sender: config.smsSender,
        message,
        recipients: recipients.map((recipient) => ({ msisdn: recipient }))
      })
    }
  );

  const payload = await parseGatewayApiResponse(response);
  return resolveProviderResult(response, payload);
};

export const createGatewayApiSmsProvider = (config: GatewayApiConfig): SmsProvider => ({
  sendSms: async (payload) =>
    sendGatewayApiSms(
      config,
      [payload.to],
      payload.message,
      payload.idempotencyKey
    ),
  sendGroupSms: async (payload) =>
    sendGatewayApiSms(
      config,
      payload.to,
      payload.message,
      payload.idempotencyKey
    )
});

export const createGatewayApiConfigFromEnv = (): GatewayApiConfig | null => {
  const apiKey = process.env.GATEWAYAPI_KEY;
  const apiSecret = process.env.GATEWAYAPI_SECRET;
  const smsSender = process.env.GATEWAYAPI_SMS_SENDER;
  if (!apiKey || !apiSecret || !smsSender) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    smsSender,
    apiBaseUrl: process.env.GATEWAYAPI_API_BASE_URL
  };
};
