// src/ai/ai-provider.ts
// Abstracción del proveedor de IA — todos los providers implementan esta interfaz

export interface AICompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;

  /** Envía un prompt al LLM y retorna el texto de respuesta */
  complete(options: AICompletionOptions): Promise<string>;

  /** Verifica que la conexión y credenciales son válidas */
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export type AIProviderType = 'github-copilot' | 'openai' | 'anthropic' | 'azure-openai';

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  model?: string;
  azureEndpoint?: string;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'NETWORK' | 'PARSE_ERROR' | 'NO_COPILOT',
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
