// src/agents/ai/dpa-ai-agent.ts
// Agente IA especialista en Ley 21.719 — usa DPA Skill

import { AIProvider } from '../../ai/ai-provider.js';
import { dpaSkill } from '../skills/dpa-skill.js';
import { BaseAIAgent } from './base-ai-agent.js';

export class DPAAIAgent extends BaseAIAgent {
  readonly name = 'DPA Agent (Ley 21.719)';

  constructor(provider: AIProvider) {
    super(dpaSkill, provider);
  }
}
