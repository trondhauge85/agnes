export type TelegramClientConfig = {
  botToken: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
};

export type TelegramSendPayload = {
  chatId: string;
  text: string;
  parseMode?: "MarkdownV2" | "Markdown" | "HTML";
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
};

export type TelegramSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  response?: unknown;
};

export type TelegramIncomingMessage = {
  updateId: number;
  messageId: number;
  chatId: string;
  chatType?: string;
  text?: string;
  fromId?: string;
  fromUsername?: string;
  date: number;
  raw: unknown;
};

export class TelegramConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramConfigError";
  }
}

const DEFAULT_API_BASE_URL = "https://api.telegram.org";

export const resolveTelegramConfig = (
  input?: Partial<TelegramClientConfig>
): TelegramClientConfig => {
  const botToken = input?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new TelegramConfigError(
      "Telegram integration is not configured. Set TELEGRAM_BOT_TOKEN."
    );
  }

  return {
    botToken,
    apiBaseUrl: input?.apiBaseUrl ?? process.env.TELEGRAM_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    timeoutMs: input?.timeoutMs
  };
};

const buildEndpoint = (config: TelegramClientConfig): string =>
  `${config.apiBaseUrl}/bot${config.botToken}/sendMessage`;

const getErrorDescription = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const description = (payload as { description?: string }).description;
  if (description) {
    return description;
  }

  return null;
};

export const sendTelegramMessage = async (
  config: TelegramClientConfig,
  payload: TelegramSendPayload,
  fetcher: typeof fetch = fetch
): Promise<TelegramSendResult> => {
  const controller = new AbortController();
  const timeoutId = config.timeoutMs
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : undefined;

  try {
    const response = await fetcher(buildEndpoint(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: payload.chatId,
        text: payload.text,
        parse_mode: payload.parseMode,
        disable_web_page_preview: payload.disableWebPagePreview,
        reply_to_message_id: payload.replyToMessageId
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => undefined);
    if (!response.ok || (data && typeof data === "object" && (data as { ok?: boolean }).ok === false)) {
      return {
        ok: false,
        error:
          getErrorDescription(data) ??
          `Telegram API error: ${response.status} ${response.statusText}`,
        response: data
      };
    }

    const messageId = (data as { result?: { message_id?: number } }).result?.message_id;

    return {
      ok: true,
      messageId: typeof messageId === "number" ? String(messageId) : undefined,
      response: data
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram request failed."
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const getMessageFromUpdate = (update: Record<string, unknown>): Record<string, unknown> | null => {
  const message =
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post;

  return isRecord(message) ? message : null;
};

export const parseTelegramUpdate = (update: unknown): TelegramIncomingMessage | null => {
  if (!isRecord(update)) {
    return null;
  }

  const updateId = update.update_id;
  if (typeof updateId !== "number") {
    return null;
  }

  const message = getMessageFromUpdate(update);
  if (!message) {
    return null;
  }

  const messageId = message.message_id;
  if (typeof messageId !== "number") {
    return null;
  }

  const chat = isRecord(message.chat) ? message.chat : null;
  const chatIdValue = chat?.id;
  if (typeof chatIdValue !== "number" && typeof chatIdValue !== "string") {
    return null;
  }

  const from = isRecord(message.from) ? message.from : isRecord(message.sender_chat) ? message.sender_chat : null;
  const fromIdValue = from?.id;
  const fromId =
    typeof fromIdValue === "number" || typeof fromIdValue === "string"
      ? String(fromIdValue)
      : undefined;
  const fromUsername =
    typeof from?.username === "string" ? (from.username as string) : undefined;

  const text =
    typeof message.text === "string"
      ? (message.text as string)
      : typeof message.caption === "string"
        ? (message.caption as string)
        : undefined;

  const dateValue = message.date;
  if (typeof dateValue !== "number") {
    return null;
  }

  const chatType = typeof chat?.type === "string" ? (chat.type as string) : undefined;

  return {
    updateId,
    messageId,
    chatId: String(chatIdValue),
    chatType,
    text,
    fromId,
    fromUsername,
    date: dateValue,
    raw: update
  };
};
