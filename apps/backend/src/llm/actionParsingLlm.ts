import type { LlmProvider } from "./types";
import { ContextStoreRetriever } from "./context/retriever";
import { InMemoryContextStore } from "./context/contextStore";
import { LlmService } from "./llmService";
import { PromptRegistry } from "./prompts/promptRegistry";
import { SkillRegistry } from "./skills/skillRegistry";
import { ToolRegistry } from "./tools/toolRegistry";
import { actionableExtractionPrompt } from "./prompts/actionableExtractionPrompt";
import { actionableExtractionSkill } from "./skills/actionableExtractionSkill";

export const createActionParsingLlmService = (provider: LlmProvider): LlmService => {
  const prompts = new PromptRegistry();
  prompts.register(actionableExtractionPrompt);

  const skills = new SkillRegistry();
  skills.register(actionableExtractionSkill);

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
