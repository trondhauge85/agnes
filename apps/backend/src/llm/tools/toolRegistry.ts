import type { LlmTool } from "../types";

export class ToolRegistry {
  private readonly tools = new Map<string, LlmTool>();

  register(tool: LlmTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  list(): LlmTool[] {
    return Array.from(this.tools.values());
  }

  get(name: string): LlmTool | undefined {
    return this.tools.get(name);
  }
}
