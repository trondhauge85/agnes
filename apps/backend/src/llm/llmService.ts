import type {
  ContextRetriever,
  ContextStore,
  LlmProvider,
  LlmRequest,
  LlmTaskRequest,
  LlmTaskResult
} from "./types";
import { createLogger } from "@agnes/shared";
import { PromptRegistry } from "./prompts/promptRegistry";
import { SkillRegistry } from "./skills/skillRegistry";
import { ToolRegistry } from "./tools/toolRegistry";

export type LlmServiceDependencies = {
  provider: LlmProvider;
  prompts: PromptRegistry;
  skills: SkillRegistry;
  tools: ToolRegistry;
  contextStore: ContextStore;
  retriever: ContextRetriever;
};

export class LlmService {
  constructor(private readonly deps: LlmServiceDependencies) {}

  async runTask(task: LlmTaskRequest): Promise<LlmTaskResult> {
    const logger = createLogger("llm.service", {
      skillName: task.skillName
    });
    const skill = this.deps.skills.get(task.skillName);
    if (!skill) {
      throw new Error(`Unknown skill: ${task.skillName}`);
    }

    const prompt = this.deps.prompts.get(skill.promptId);
    if (!prompt) {
      throw new Error(`Unknown prompt: ${skill.promptId}`);
    }

    const tools = (skill.toolNames ?? [])
      .map((name) => this.deps.tools.get(name))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

    const contextScope = task.contextScope ?? "global";
    const contextResults = task.contextQuery
      ? this.deps.retriever.retrieve({
          scope: contextScope,
          query: task.contextQuery,
          maxTokens: 600,
          maxResults: 5
        })
      : [];

    const contextText = contextResults
      .map((result) => `- ${result.excerpt}`)
      .join("\n");

    const systemPrompt = prompt.render({
      ...task.input,
      context: contextText
    });

    const request: LlmRequest = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: task.input.userMessage ?? "" }
      ],
      tools: tools.map((tool) => tool.definition),
      responseSchema: skill.responseSchema,
      maxTokens: task.maxTokens,
      temperature: task.temperature
    };

    logger.info("llm.request", {
      data: {
        promptId: skill.promptId,
        toolNames: tools.map((tool) => tool.definition.name),
        contextScope,
        contextQuery: task.contextQuery ?? null,
        contextHits: contextResults.length,
        request
      }
    });

    const start = Date.now();
    let response;

    try {
      response = await this.deps.provider.generate(request);
    } catch (error) {
      logger.error("llm.request_failed", {
        data: {
          durationMs: Date.now() - start
        },
        error
      });
      throw error;
    }

    logger.info("llm.response", {
      data: {
        durationMs: Date.now() - start,
        response,
        contextUsed: contextResults.map((result) => result.document.id)
      }
    });

    return {
      response,
      contextUsed: contextResults.map((result) => result.document.id)
    };
  }
}
