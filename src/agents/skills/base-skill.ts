// src/agents/skills/base-skill.ts
// Sistema de Skills: cada skill encapsula el conocimiento experto de una ley

import { Finding, LawName } from '../../types/index.js';

export interface LawArticle {
  id: string;
  number: string;
  title: string;
  text: string;
  technicalImplication: string;
}

export interface SkillExample {
  description: string;
  badCode: string;
  goodCode: string;
  findingType: string;
}

export interface AgentSkill {
  id: string;
  lawName: LawName;
  agentPersona: string;       // "Eres un experto en Ley X..."
  knowledgeBase: LawArticle[];
  outputSchema: string;       // JSON schema que el LLM debe respetar
  fewShotExamples: SkillExample[];

  /** Construye el system prompt completo inyectando el conocimiento de la ley */
  buildSystemPrompt(): string;

  /** Construye el user prompt con el código a analizar */
  buildUserPrompt(code: string, filePath: string, fileType: string): string;

  /** Parsea la respuesta JSON del LLM a Finding[] */
  parseResponse(rawJson: string, filePath: string): Finding[];
}

/** Extrae JSON del texto (el LLM a veces añade markdown fences) */
export function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { return fenceMatch[1].trim(); }
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) { return arrMatch[0]; }
  return raw.trim();
}
