import type {
  CommunicationProvider,
  CommunicationProviderResult,
  CommunicationRecord,
  CommunicationSendPayload,
  CommunicationStatus,
  SmsProvider,
  SmsSendGroupPayload,
  SmsSendPayload
} from "../types";
import {
  findCommunicationByIdempotencyKey,
  saveCommunication,
  updateCommunication
} from "../data/communications";
import { createLogger } from "@agnes/shared";

type CommunicationStore = {
  findByIdempotencyKey: typeof findCommunicationByIdempotencyKey;
  save: typeof saveCommunication;
  update: typeof updateCommunication;
};

type MessageServiceDependencies = {
  providers: Partial<Record<CommunicationSendPayload["channel"], CommunicationProvider>>;
  store?: CommunicationStore;
  now?: () => string;
};

const defaultStore: CommunicationStore = {
  findByIdempotencyKey: findCommunicationByIdempotencyKey,
  save: saveCommunication,
  update: updateCommunication
};

const resolveStatus = (result?: CommunicationProviderResult): CommunicationStatus =>
  result?.status ?? "sent";

const logger = createLogger("communications.service");

export const createSmsCommunicationProvider = (
  smsProvider: SmsProvider
): CommunicationProvider => ({
  channel: "sms",
  send: async (payload: CommunicationSendPayload) => {
    const recipients = payload.recipients.map((recipient) => recipient.address);
    if (recipients.length === 0) {
      logger.warn("sms.send.rejected", {
        data: {
          reason: "missing_recipients",
          idempotencyKey: payload.idempotencyKey
        }
      });
      return {
        status: "failed",
        error: "SMS payload requires at least one recipient."
      };
    }
    logger.info("sms.send.attempted", {
      data: {
        recipientCount: recipients.length,
        idempotencyKey: payload.idempotencyKey,
        messageLength: payload.message.length
      }
    });
    if (recipients.length === 1) {
      return smsProvider.sendSms({
        to: recipients[0],
        message: payload.message,
        idempotencyKey: payload.idempotencyKey
      });
    }
    return smsProvider.sendGroupSms({
      to: recipients,
      message: payload.message,
      idempotencyKey: payload.idempotencyKey
    });
  }
});

export const createMessageService = ({
  providers,
  store = defaultStore,
  now = () => new Date().toISOString()
}: MessageServiceDependencies) => {
  const sendCommunication = async (
    payload: CommunicationSendPayload
  ): Promise<CommunicationRecord> => {
    const existing = store.findByIdempotencyKey(
      payload.channel,
      payload.idempotencyKey
    );
    if (existing) {
      return existing;
    }

    const timestamp = now();
    const record: CommunicationRecord = {
      id: crypto.randomUUID(),
      channel: payload.channel,
      idempotencyKey: payload.idempotencyKey,
      status: "pending",
      recipients: payload.recipients,
      message: payload.message,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    store.save(record);

    const provider = providers[payload.channel];
    if (!provider) {
      logger.warn("communication.provider.missing", {
        data: {
          channel: payload.channel,
          idempotencyKey: payload.idempotencyKey
        }
      });
      const failed = {
        ...record,
        status: "failed",
        error: `No provider configured for ${payload.channel}.`,
        updatedAt: now()
      };
      store.update(failed);
      return failed;
    }

    try {
      logger.info("communication.send.started", {
        data: {
          channel: payload.channel,
          idempotencyKey: payload.idempotencyKey,
          recipientCount: payload.recipients.length
        }
      });
      const result = await provider.send(payload);
      const nextRecord: CommunicationRecord = {
        ...record,
        status: resolveStatus(result),
        providerMessageId: result?.providerMessageId,
        providerResponse: result?.providerResponse,
        error: result?.error,
        updatedAt: now()
      };
      store.update(nextRecord);
      logger.info("communication.send.completed", {
        data: {
          channel: payload.channel,
          idempotencyKey: payload.idempotencyKey,
          status: nextRecord.status,
          providerMessageId: nextRecord.providerMessageId,
          error: nextRecord.error
        }
      });
      return nextRecord;
    } catch (error) {
      const failed: CommunicationRecord = {
        ...record,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to send message.",
        updatedAt: now()
      };
      store.update(failed);
      logger.error("communication.send.failed", {
        data: {
          channel: payload.channel,
          idempotencyKey: payload.idempotencyKey
        },
        error
      });
      return failed;
    }
  };

  const sendSms = (payload: SmsSendPayload): Promise<CommunicationRecord> =>
    sendCommunication({
      channel: "sms",
      idempotencyKey: payload.idempotencyKey,
      message: payload.message,
      recipients: [{ address: payload.to }]
    });

  const sendSmsGroup = (
    payload: SmsSendGroupPayload
  ): Promise<CommunicationRecord> =>
    sendCommunication({
      channel: "sms",
      idempotencyKey: payload.idempotencyKey,
      message: payload.message,
      recipients: payload.to.map((address) => ({ address }))
    });

  return {
    sendCommunication,
    sendSms,
    sendSmsGroup
  };
};
