// packages/vscode-extension/src/settings-manager.ts
// Gestión centralizada de configuración y secretos de la extensión

import * as vscode from 'vscode';

export type AnalysisMode = 'static' | 'ai';
export type AIProviderType = 'github-copilot' | 'openai' | 'anthropic' | 'azure-openai';

const SECRET_KEY = 'syntaxis.ai.apiKey';

export class SettingsManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  getAnalysisMode(): AnalysisMode {
    return vscode.workspace
      .getConfiguration('syntaxis')
      .get<AnalysisMode>('analysisMode', 'static');
  }

  getAIProvider(): AIProviderType {
    return vscode.workspace
      .getConfiguration('syntaxis')
      .get<AIProviderType>('ai.provider', 'github-copilot');
  }

  getAIModel(): string {
    return vscode.workspace
      .getConfiguration('syntaxis')
      .get<string>('ai.model', 'gpt-4o-mini');
  }

  getAzureEndpoint(): string {
    return vscode.workspace
      .getConfiguration('syntaxis')
      .get<string>('ai.azureEndpoint', '');
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secrets.get(SECRET_KEY);
  }

  async storeApiKey(key: string): Promise<void> {
    await this.secrets.store(SECRET_KEY, key);
  }

  async deleteApiKey(): Promise<void> {
    await this.secrets.delete(SECRET_KEY);
  }

  /** Devuelve true si el proveedor activo no necesita API key (Copilot) */
  providerRequiresApiKey(): boolean {
    return this.getAIProvider() !== 'github-copilot';
  }

  /** Valida que la config de IA esté completa para el proveedor elegido */
  async validateAIConfig(): Promise<{ valid: boolean; reason?: string }> {
    const provider = this.getAIProvider();
    if (provider === 'github-copilot') {
      return { valid: true };
    }
    const key = await this.getApiKey();
    if (!key || key.trim() === '') {
      return {
        valid: false,
        reason: `API key no configurada para ${provider}. Ejecuta "Syntaxis: Configurar API Key de IA".`,
      };
    }
    if (provider === 'azure-openai' && !this.getAzureEndpoint()) {
      return {
        valid: false,
        reason: 'Azure endpoint no configurado. Revisa syntaxis.ai.azureEndpoint en settings.',
      };
    }
    return { valid: true };
  }
}
