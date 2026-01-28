export type LlmRole = "system" | "user" | "assistant" | "tool";

export type LlmMessage = {
  role: LlmRole;
  content: string;
  toolName?: string;
  toolCallId?: string;
};

export type LlmToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LlmToolResult = {
  toolName: string;
  content: string;
  isError?: boolean;
};

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type LlmRequest = {
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
};

export type LlmResponse = {
  message: LlmMessage;
  usage?: LlmUsage;
};

export type LlmProvider = {
  name: string;
  generate: (request: LlmRequest) => Promise<LlmResponse>;
};

export type PromptTemplate = {
  id: string;
  description: string;
  render: (params: Record<string, string>) => string;
};

export type LlmSkill = {
  name: string;
  description: string;
  promptId: string;
  toolNames?: string[];
  responseSchema?: Record<string, unknown>;
};

export type LlmTaskRequest = {
  skillName: string;
  input: Record<string, string>;
  contextQuery?: string;
  contextScope?: string;
  maxTokens?: number;
  temperature?: number;
};

export type LlmTaskResult = {
  response: LlmResponse;
  contextUsed?: string[];
};

export type ContextDocument = {
  id: string;
  scope: string;
  text: string;
  metadata?: Record<string, string>;
  createdAt: string;
};

export type ContextSearchResult = {
  document: ContextDocument;
  score: number;
  excerpt: string;
};

export type ContextStore = {
  addDocuments: (docs: ContextDocument[]) => void;
  listDocuments: (scope: string) => ContextDocument[];
  search: (scope: string, query: string) => ContextSearchResult[];
};

export type ContextRetriever = {
  retrieve: (options: {
    scope: string;
    query: string;
    maxTokens: number;
    maxResults: number;
  }) => ContextSearchResult[];
};

export type LlmTool = {
  definition: LlmToolDefinition;
  execute: (input: Record<string, unknown>) => Promise<LlmToolResult>;
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call: (input: Record<string, unknown>) => Promise<string>;
};

export type McpClient = {
  listTools: () => Promise<McpTool[]>;
};
