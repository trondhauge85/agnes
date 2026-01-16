import type { PromptTemplate } from "../types";

export class PromptRegistry {
  private readonly prompts = new Map<string, PromptTemplate>();

  register(prompt: PromptTemplate): void {
    this.prompts.set(prompt.id, prompt);
  }

  get(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  list(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }
}
