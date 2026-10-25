export interface ChatSession {
  id: string;
  category: 'psychology' | 'saju' | 'custom';
  title: string;
  createdAt: number;
  updatedAt: number;
  promptId?: number; // Linked custom prompt ID if category === 'custom'
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'doc';
  mimeType: string;
  dataUrl?: string; // For images
  content?: string; // For text/html docs
  size?: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'model';
  content: string;
  hasImages?: boolean;
  attachments?: ChatAttachment[];
  choiceState?: any;
  timestamp: number;
}

export interface SajuProfile {
  id?: number;
  name: string;
  imageData?: string;
  textData?: string;
  createdAt: number;
}

export interface CustomPrompt {
  id?: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface AppSettings {
  gemini_api_key?: string;
  modelName?: string;
  reasoning?: string;
  reasoningBudget?: number;
  temperature?: number;
  outputMode?: string;
  safety?: {
    harassment?: string;
    hate?: string;
    sex?: string;
    danger?: string;
  };
  vertex_config?: {
    projectId?: string;
    region?: string;
  };
  firestore_config?: {
    configText?: string;
    projectId?: string;
    apiKey?: string;
  };
  token_slicing?: {
    enabled: boolean;
    maxTokens: number;
  };
  selected_home_design?: number; // 1 to 10
}
