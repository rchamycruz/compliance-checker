// src/ai/anthropic-provider.ts
// Proveedor: Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku, etc.)

import { AIProvider, AICompletionOptions, AIProviderError } from './ai-provider.js';

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly displayName = 'Anthropic (Claude)';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-3-5-haiku-latest',
  ) {
    if (!apiKey || apiKey.trim() === '') {
      throw new AIProviderError('API key de Anthropic no configurada.', 'NO_API_KEY');
    }
  }

  async complete(options: AICompletionOptions): Promise<string> {
    const { systemPrompt, userPrompt, maxTokens = 4096 } = options;

    // Anthropic requiere que el system prompt vaya fuera de messages
    const body = JSON.stringify({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const response = await this.fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    const data = response as any;
    const content = data?.content?.[0]?.text;
    if (!content) {
      throw new AIProviderError('Respuesta inesperada de Anthropic: no hay contenido.', 'PARSE_ERROR');
    }
    return content;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.complete({
        systemPrompt: 'Eres un asistente de prueba. Responde solo con JSON.',
        userPrompt: 'Responde solo con: {"ok":true}',
        maxTokens: 20,
      });
      return { ok: true, message: `Conexión exitosa con Anthropic (${this.model})` };
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
          throw new AIProviderError('Rate limit de Anthropic alcanzado. Intenta en unos segundos.', 'RATE_LIMIT');
        }
        if (res.status === 401) {
          throw new AIProviderError('API key de Anthropic inválida o expirada.', 'INVALID_KEY');
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as any;
          throw new AIProviderError(`Error HTTP ${res.status} de Anthropic: ${err?.error?.message ?? ''}`, 'NETWORK');
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
