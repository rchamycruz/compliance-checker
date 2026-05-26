// src/ai/openai-provider.ts
// Proveedor: OpenAI (GPT-4o, GPT-4o-mini, o1, etc.)

import { AIProvider, AICompletionOptions, AIProviderError } from './ai-provider.js';

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly displayName = 'OpenAI';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o-mini',
    private readonly baseUrl: string = 'https://api.openai.com/v1',
  ) {
    if (!apiKey || apiKey.trim() === '') {
      throw new AIProviderError('API key de OpenAI no configurada.', 'NO_API_KEY');
    }
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const { systemPrompt, userPrompt, maxTokens = 4096, temperature = 0 } = options;

    const body = JSON.stringify({
      model: this.model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body,
    });

    const data = response as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIProviderError('Respuesta inesperada de OpenAI: no hay contenido.', 'PARSE_ERROR');
    }
    return content;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.complete({
        systemPrompt: 'Eres un asistente de prueba.',
        userPrompt: 'Responde solo con: {"ok":true}',
        maxTokens: 20,
      });
      return { ok: true, message: `Conexión exitosa con OpenAI (${this.model})` };
    } catch (e: any) {
      return { ok: false, message: e.message ?? 'Error desconocido' };
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<unknown> {
    let lastError: Error = new Error('Desconocido');
    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
      try {
        const res = await fetch(url, init);
        if (res.status === 429) {
          throw new AIProviderError('Rate limit de OpenAI alcanzado. Intenta en unos segundos.', 'RATE_LIMIT');
        }
        if (res.status === 401) {
          throw new AIProviderError('API key de OpenAI inválida o expirada.', 'INVALID_KEY');
        }
        if (!res.ok) {
          throw new AIProviderError(`Error HTTP ${res.status} de OpenAI.`, 'NETWORK');
        }
        return await res.json();
      } catch (e) {
        lastError = e as Error;
        if (e instanceof AIProviderError && e.code !== 'RATE_LIMIT') { throw e; }
      }
    }
    throw lastError;
  }
}
