import type { LlmSkill } from "../types";

export class SkillRegistry {
  private readonly skills = new Map<string, LlmSkill>();

  register(skill: LlmSkill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): LlmSkill | undefined {
    return this.skills.get(name);
  }

  list(): LlmSkill[] {
    return Array.from(this.skills.values());
  }
}
