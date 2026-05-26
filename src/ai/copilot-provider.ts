// src/ai/copilot-provider.ts
// Proveedor: GitHub Copilot via VS Code Language Model API (vscode.lm)
// No requiere API key — usa la suscripción Copilot del usuario en VS Code.
//
// NOTA: Este provider solo funciona dentro de la extensión VS Code.
// En el contexto del CLI/Node (src/), no hay vscode.lm disponible.
// La extensión lo instancia directamente usando el objeto `vscode` importado.

import { AIProvider, AICompletionOptions, AIProviderError } from './ai-provider.js';

/**
 * Interfaz mínima compatible con vscode.lm para no depender del paquete @types/vscode
 * en src/ (que es el núcleo CLI, no la extensión).
 */
export interface VscodeLmApi {
  selectChatModels(selector: { vendor: string; family: string }): Promise<VscodeLmModel[]>;
}

export interface VscodeLmModel {
  sendRequest(
    messages: VscodeLmMessage[],
    options: Record<string, unknown>,
    token?: unknown,
  ): Promise<{ stream: AsyncIterable<{ part?: unknown }> } | AsyncIterable<{ part?: unknown }>>;
}

export interface VscodeLmMessage {
  role: string;
  content: string;
}

export class CopilotProvider implements AIProvider {
  readonly id = 'github-copilot';
  readonly displayName = 'GitHub Copilot';

  constructor(private readonly vscodeLm: VscodeLmApi) {}

  async complete(options: AICompletionOptions): Promise<string> {
    const { systemPrompt, userPrompt } = options;

    // Seleccionar el mejor modelo Copilot disponible (GPT-4o con fallback a gpt-4)
    let model: VscodeLmModel | undefined;
    for (const family of ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet']) {
      const models = await this.vscodeLm.selectChatModels({ vendor: 'copilot', family });
      if (models.length > 0) { model = models[0]; break; }
    }

    if (!model) {
      throw new AIProviderError(
        'GitHub Copilot no está disponible. Asegúrate de tener Copilot activo en VS Code.',
        'NO_COPILOT',
      );
    }

    // Combinar system + user en el formato que acepta vscode.lm
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const messages: VscodeLmMessage[] = [{ role: 'user', content: combinedPrompt }];

    try {
      const response = await (model as any).sendRequest(messages, {});
      return await this.collectStream(response);
    } catch (e: any) {
      if (e instanceof AIProviderError) { throw e; }
      throw new AIProviderError(
        `Error de GitHub Copilot: ${e?.message ?? 'desconocido'}`,
        'NETWORK',
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const models = await this.vscodeLm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
      if (models.length === 0) {
        return { ok: false, message: 'GitHub Copilot no disponible. Verifica tu suscripción.' };
      }
      return { ok: true, message: 'GitHub Copilot disponible y listo.' };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Error al verificar Copilot' };
    }
  }

  /** Acumula el stream de tokens en un string */
  private async collectStream(response: any): Promise<string> {
    const chunks: string[] = [];
    const iterable = response?.stream ?? response;

    for await (const part of iterable) {
      // La API vscode.lm retorna LanguageModelTextPart o similar
      const text = part?.value ?? part?.text ?? (typeof part === 'string' ? part : '');
      if (text) { chunks.push(text); }
    }

    return chunks.join('');
  }
}
