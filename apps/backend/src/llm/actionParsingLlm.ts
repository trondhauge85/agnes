import type { LlmProvider } from "./types";
import { ContextStoreRetriever } from "./context/retriever";
import { InMemoryContextStore } from "./context/contextStore";
import { LlmService } from "./llmService";
import { PromptRegistry } from "./prompts/promptRegistry";
import { SkillRegistry } from "./skills/skillRegistry";
import { ToolRegistry } from "./tools/toolRegistry";
import { actionableExtractionPrompt } from "./prompts/actionableExtractionPrompt";
import { appointmentSchedulingPrompt } from "./prompts/appointmentSchedulingPrompt";
import { actionableExtractionSkill } from "./skills/actionableExtractionSkill";
import { appointmentSchedulingSkill } from "./skills/appointmentSchedulingSkill";

export const createActionParsingLlmService = (provider: LlmProvider): LlmService => {
  const prompts = new PromptRegistry();
  prompts.register(actionableExtractionPrompt);
  prompts.register(appointmentSchedulingPrompt);

  const skills = new SkillRegistry();
  skills.register(actionableExtractionSkill);
  skills.register(appointmentSchedulingSkill);

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
