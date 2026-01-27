import type {
  CommunicationProvider,
  CommunicationProviderResult,
  CommunicationSendPayload,
  SmsProvider,
  SmsProviderResult
} from "../types";
import { createLogger } from "@agnes/shared";

type BrevoConfig = {
  apiKey: string;
  smsSender: string;
  emailSender: string;
  emailSenderName?: string;
  emailSubject?: string;
};

type BrevoSmsResponse = {
  messageId?: string;
  error?: string;
  message?: string;
};

type BrevoEmailResponse = {
  messageId?: string;
  error?: string;
  message?: string;
};

const logger = createLogger("communications.brevo");

const buildBrevoHeaders = (apiKey: string, idempotencyKey?: string) => {
  const headers = new Headers({
    "api-key": apiKey,
    "content-type": "application/json"
  });
  if (idempotencyKey) {
    headers.set("x-request-id", idempotencyKey);
  }
  return headers;
};

const resolveErrorMessage = (
  response: Response,
  payload?: BrevoSmsResponse | BrevoEmailResponse
): string => {
  if (payload?.error) {
    return payload.error;
  }
  if (payload?.message) {
    return payload.message;
  }
  return response.statusText || `Brevo request failed with ${response.status}.`;
};

const parseBrevoResponse = async <T extends BrevoSmsResponse | BrevoEmailResponse>(
  response: Response
): Promise<T | undefined> => {
  if (!response.body) {
    return undefined;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

const resolveProviderResult = (
  response: Response,
  payload?: BrevoSmsResponse | BrevoEmailResponse
): CommunicationProviderResult => ({
  status: response.ok ? "sent" : "failed",
  providerMessageId: payload?.messageId,
  providerResponse: payload ? { ...payload } : undefined,
  error: response.ok ? undefined : resolveErrorMessage(response, payload)
});

const logBrevoResponse = (
  action: string,
  response: Response,
  result: CommunicationProviderResult,
  idempotencyKey?: string
) => {
  logger.info(action, {
    data: {
      ok: response.ok,
      status: response.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
      idempotencyKey
    }
  });
};

export const createBrevoSmsProvider = (config: BrevoConfig): SmsProvider => {
  const sendSingleSms = async (
    to: string,
    message: string,
    idempotencyKey?: string
  ): Promise<SmsProviderResult> => {
    logger.info("sms.brevo.requested", {
      data: {
        idempotencyKey,
        recipient: to.length <= 4 ? to : `${"*".repeat(to.length - 4)}${to.slice(-4)}`,
        messageLength: message.length
      }
    });
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: buildBrevoHeaders(config.apiKey, idempotencyKey),
      body: JSON.stringify({
        sender: config.smsSender,
        recipient: to,
        content: message
      })
    });
    const payload = await parseBrevoResponse<BrevoSmsResponse>(response);
    const result = resolveProviderResult(response, payload);
    logBrevoResponse("sms.brevo.responded", response, result, idempotencyKey);
    return result;
  };

  return {
    sendSms: async (payload) =>
      sendSingleSms(payload.to, payload.message, payload.idempotencyKey),
    sendGroupSms: async (payload) => {
      const results = await Promise.all(
        payload.to.map((recipient, index) =>
          sendSingleSms(
            recipient,
            payload.message,
            `${payload.idempotencyKey}-${index + 1}`
          )
        )
      );
      const failed = results.filter((result) => result.status !== "sent");
      return {
        status: failed.length === 0 ? "sent" : "failed",
        providerMessageId: results.find((result) => result.providerMessageId)
          ?.providerMessageId,
        providerResponse: { results },
        error: failed.length > 0 ? failed[0]?.error : undefined
      };
    }
  };
};

export const createBrevoEmailProvider = (config: BrevoConfig): CommunicationProvider => ({
  channel: "email",
  send: async (payload: CommunicationSendPayload) => {
    const recipients = payload.recipients.map((recipient) => ({
      email: recipient.address,
      name: recipient.name
    }));
    if (recipients.length === 0) {
      logger.warn("email.brevo.rejected", {
        data: {
          reason: "missing_recipients",
          idempotencyKey: payload.idempotencyKey
        }
      });
      return {
        status: "failed",
        error: "Email payload requires at least one recipient."
      };
    }

    logger.info("email.brevo.requested", {
      data: {
        idempotencyKey: payload.idempotencyKey,
        recipientCount: recipients.length,
        messageLength: payload.message.length
      }
    });
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: buildBrevoHeaders(config.apiKey, payload.idempotencyKey),
      body: JSON.stringify({
        sender: {
          email: config.emailSender,
          name: config.emailSenderName
        },
        to: recipients,
        subject: config.emailSubject ?? "Agnes verification",
        textContent: payload.message
      })
    });

    const payloadResponse = await parseBrevoResponse<BrevoEmailResponse>(response);
    const result = resolveProviderResult(response, payloadResponse);
    logBrevoResponse(
      "email.brevo.responded",
      response,
      result,
      payload.idempotencyKey
    );
    return result;
  }
});

export const createBrevoConfigFromEnv = (): BrevoConfig | null => {
  const apiKey = process.env.BREVO_API_KEY;
  const smsSender = process.env.BREVO_SMS_SENDER;
  const emailSender = process.env.BREVO_EMAIL_SENDER;
  if (!apiKey || (!smsSender && !emailSender)) {
    return null;
  }

  return {
    apiKey,
    smsSender: smsSender ?? "",
    emailSender: emailSender ?? "",
    emailSenderName: process.env.BREVO_EMAIL_SENDER_NAME,
    emailSubject: process.env.BREVO_EMAIL_SUBJECT
  };
};
