import type { LlmTool, McpClient } from "./types";

export const loadMcpTools = async (client: McpClient): Promise<LlmTool[]> => {
  const tools = await client.listTools();
  return tools.map((tool) => ({
    definition: {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    },
    async execute(input: Record<string, unknown>) {
      const content = await tool.call(input);
      return {
        toolName: tool.name,
        content
      };
    }
  }));
};
