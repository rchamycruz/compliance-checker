// src/agents/ai/csa-ai-agent.ts
// Agente IA especialista en Ley 21.663 — usa CSA Skill

import { AIProvider } from '../../ai/ai-provider.js';
import { csaSkill } from '../skills/csa-skill.js';
import { BaseAIAgent } from './base-ai-agent.js';

export class CSAAIAgent extends BaseAIAgent {
  readonly name = 'CSA Agent (Ley 21.663)';

  constructor(provider: AIProvider) {
    super(csaSkill, provider);
  }
}
