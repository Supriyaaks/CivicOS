import axios from 'axios';
import { AIResponse, AIStatus } from './ai.types';

class OllamaClient {
  private get baseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  }

  private get model(): string {
    return process.env.OLLAMA_MODEL || 'llama3.2:latest';
  }

  private get timeoutMs(): number {
    return parseInt(process.env.OLLAMA_TIMEOUT_MS || '45000', 10);
  }

  private get isEnabled(): boolean {
    return process.env.OLLAMA_ENABLED !== 'false';
  }

  async checkAvailability(): Promise<AIStatus> {
    if (!this.isEnabled) {
      return {
        available: false,
        model: this.model,
        message: 'Ollama integration is disabled via OLLAMA_ENABLED=false.',
        daemonReachable: false,
        installedModels: []
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 2500, // Short timeout so failure never blocks requests
      });

      const rawModels = response.data?.models || [];
      const installedModels: string[] = rawModels.map((m: any) => m.name || m.model || '');
      const modelPrefix = this.model.split(':')[0];

      const hasModel = installedModels.some((name: string) => 
        name === this.model || 
        name === `${this.model}:latest` ||
        name === modelPrefix ||
        name.startsWith(modelPrefix)
      );

      if (!hasModel) {
        const availableListStr = installedModels.length > 0 
          ? `Installed models: [${installedModels.join(', ')}].`
          : 'No models currently installed in Ollama.';

        return {
          available: false,
          model: this.model,
          message: `Ollama daemon is reachable on port 11434, but configured model '${this.model}' is not pulled. ${availableListStr} Run 'ollama pull ${this.model}' to enable LLM generation.`,
          daemonReachable: true,
          installedModels
        };
      }

      return {
        available: true,
        model: this.model,
        message: `Ollama is active and model '${this.model}' is loaded.`,
        daemonReachable: true,
        installedModels
      };
    } catch (error: any) {
      return {
        available: false,
        model: this.model,
        message: 'Could not connect to Ollama service (daemon offline on port 11434).',
        daemonReachable: false,
        installedModels: []
      };
    }
  }

  async generateResponse(prompt: string, systemPrompt: string = ''): Promise<AIResponse> {
    if (!this.isEnabled) {
      throw new Error('Ollama is disabled via configuration.');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
      }, {
        timeout: this.timeoutMs,
      });

      return {
        content: response.data.response,
        model: this.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Ollama request timed out after ${this.timeoutMs / 1000} seconds.`);
      }
      throw new Error(`Ollama API Error: ${error.response?.data?.error || error.message}`);
    }
  }
}

export const ollamaClient = new OllamaClient();
