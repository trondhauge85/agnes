import type { CommunicationChannel, CommunicationRecord } from "../types";

const communications = new Map<string, CommunicationRecord>();
const idempotencyIndex = new Map<string, string>();

const buildIdempotencyKey = (
  channel: CommunicationChannel,
  idempotencyKey: string
): string => `${channel}:${idempotencyKey}`;

export const findCommunicationByIdempotencyKey = (
  channel: CommunicationChannel,
  idempotencyKey: string
): CommunicationRecord | null => {
  const recordId = idempotencyIndex.get(
    buildIdempotencyKey(channel, idempotencyKey)
  );
  if (!recordId) {
    return null;
  }
  return communications.get(recordId) ?? null;
};

export const saveCommunication = (record: CommunicationRecord): void => {
  communications.set(record.id, record);
  idempotencyIndex.set(
    buildIdempotencyKey(record.channel, record.idempotencyKey),
    record.id
  );
};

export const updateCommunication = (record: CommunicationRecord): void => {
  communications.set(record.id, record);
};
