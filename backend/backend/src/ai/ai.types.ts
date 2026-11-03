export interface AIResponse {
  content: string;
  model: string;
  timestamp: string;
}

export interface AIStatus {
  available: boolean;
  model: string;
  message: string;
  daemonReachable?: boolean;
  installedModels?: string[];
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  options?: {
    temperature?: number;
    numPredict?: number;
  };
}
