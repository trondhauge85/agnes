import type { LlmProvider } from "../../llm";
import {
  ContextStoreRetriever,
  InMemoryContextStore,
  LlmService,
  PromptRegistry,
  SkillRegistry,
  ToolRegistry,
  familySummaryPrompt,
  familySummarySkill
} from "../../llm";

export const createFamilySummaryLlmService = (
  provider: LlmProvider
): LlmService => {
  const prompts = new PromptRegistry();
  prompts.register(familySummaryPrompt);

  const skills = new SkillRegistry();
  skills.register(familySummarySkill);

  const tools = new ToolRegistry();
  const contextStore = new InMemoryContextStore();
  const retriever = new ContextStoreRetriever(contextStore);

  return new LlmService({
    provider,
    prompts,
    skills,
    tools,
    contextStore,
    retriever
  });
};
