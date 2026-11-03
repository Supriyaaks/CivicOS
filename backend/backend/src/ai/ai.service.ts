import { ollamaClient } from './ollama.client';
import { AIResponse, AIStatus, AIRequest } from './ai.types';

class AIService {
  async checkAIAvailability(): Promise<AIStatus> {
    return await ollamaClient.checkAvailability();
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const { prompt, systemPrompt = '', options } = request;

    // In Phase 1, we pass through the options or use defaults
    // The ollamaClient handles the HTTP communication
    return await ollamaClient.generateResponse(prompt, systemPrompt);
  }
}

export const aiService = new AIService();
