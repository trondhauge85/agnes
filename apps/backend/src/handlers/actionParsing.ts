import type { LlmService } from "../llm";
import type { ActionParseFile, ActionParseInput } from "../services/actionParsing";
import { createGeminiProvider, NullLlmProvider } from "../llm";
import { createActionParsingLlmService } from "../llm/actionParsingLlm";
import { parseActionableItems } from "../services/actionParsing";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 5;

const parseDataUrl = (
  dataUrl: string
): { mimeType: string; base64: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return { mimeType: match[1], base64: match[2] };
};

const estimateBase64Bytes = (base64: string): number => {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const isSupportedMimeType = (mimeType: string): boolean =>
  mimeType.startsWith("image/") ||
  mimeType === "application/pdf" ||
  mimeType.startsWith("text/");

const normalizeFiles = (files: unknown): { files: ActionParseFile[]; error?: string } => {
  if (!Array.isArray(files)) {
    return { files: [] };
  }

  if (files.length > MAX_FILES) {
    return { files: [], error: "Too many files provided." };
  }

  let totalBytes = 0;
  const normalized: ActionParseFile[] = [];

  for (const entry of files) {
    const file = entry as { name?: unknown; dataUrl?: unknown; mimeType?: unknown };
    const name = normalizeString(file.name ?? "");
    const dataUrl = normalizeString(file.dataUrl ?? "");
    const declaredMime = normalizeString(file.mimeType ?? "");

    if (!name || !dataUrl) {
      return { files: [], error: "Each file must include name and dataUrl." };
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return { files: [], error: "Invalid dataUrl format." };
    }

    const mimeType = declaredMime || parsed.mimeType;
    if (!mimeType || !isSupportedMimeType(mimeType)) {
      return { files: [], error: "Unsupported file type." };
    }

    const fileBytes = estimateBase64Bytes(parsed.base64);
    if (fileBytes > MAX_FILE_BYTES) {
      return { files: [], error: "File exceeds maximum size." };
    }

    totalBytes += fileBytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return { files: [], error: "Total file size exceeds maximum." };
    }

    normalized.push({ name, mimeType, dataUrl });
  }

  return { files: normalized };
};

export const buildActionParseHandler = (llmService: LlmService) =>
  async (request: Request): Promise<Response> => {
    const body = await parseJsonBody<ActionParseInput>(request);
    if (!body) {
      return createErrorResponse({
        code: "bad_request",
        message: "Expected application/json payload.",
        messageKey: "errors.request.invalid_json",
        status: 400
      });
    }

    const text = normalizeString(body.text ?? "");
    const { files, error } = normalizeFiles(body.files);
    if (error) {
      return createErrorResponse({
        code: "unprocessable_entity",
        message: error,
        messageKey: "errors.parse.invalid_file",
        status: 422
      });
    }

    if (!text && files.length === 0) {
      return createErrorResponse({
        code: "bad_request",
        message: "Provide text or a supported attachment to parse.",
        messageKey: "errors.parse.input_required",
        status: 400
      });
    }

    try {
      const result = await parseActionableItems(llmService, {
        text,
        files,
        timezone: normalizeString(body.timezone ?? "") || undefined,
        locale: normalizeString(body.locale ?? "") || undefined,
        language: normalizeString(body.language ?? "") || undefined
      });

      return createJsonResponse({
        status: "parsed",
        results: result
      });
    } catch (error) {
      return createErrorResponse({
        code: "bad_gateway",
        message: "LLM parsing failed.",
        messageKey: "errors.parse.failed",
        status: 502,
        details: { reason: error instanceof Error ? error.message : "unknown" }
      });
    }
  };

export const handleActionParse = buildActionParseHandler(
  createActionParsingLlmService(
    process.env.GEMINI_API_KEY
      ? createGeminiProvider({
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL,
          apiBaseUrl: process.env.GEMINI_API_BASE_URL
        })
      : new NullLlmProvider()
  )
);
