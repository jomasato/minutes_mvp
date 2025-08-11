// types/index.ts

export interface User {
  uid: string;
  email: string;
  displayName: string;
  tokenBalance: number;
  createdAt: Date;
}

export interface Minutes {
  id: string;
  userId: string;
  title: string;
  originalText: string;
  generatedMinutes: string;
  industry: string;
  tokensUsed: number;
  createdAt: Date;
}

export interface Summary {
  id: string;
  userId: string;
  title: string;
  originalText: string;
  generatedSummary: string;
  industry: string;
  tokensUsed: number;
  createdAt: Date;
}

export interface Research {
  id: string;
  userId: string;
  title: string;
  query: string;
  results: string;
  industry: string;
  tokensUsed: number;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  tokensUsed: number;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryItem {
  id: string;
  type: 'minutes' | 'summary' | 'research' | 'chat';
  title: string;
  preview: string;
  date: string;
  tokensUsed: number;
}

export interface GenerateRequest {
  text: string;
  industry: Industry;
  type: 'minutes' | 'summary' | 'research' | 'chat';
  isFileUpload?: boolean;
  sessionId?: string; // for chat
}

export interface GenerateResponse {
  result: string;
  tokensUsed: number;
  remainingTokens: number;
  historyItem: HistoryItem;
}

export interface ErrorResponse {
  error: string;
}

export type Industry = 
  | 'general' 
  | 'tech' 
  | 'finance' 
  | 'healthcare' 
  | 'education' 
  | 'retail';

export interface TabConfig {
  id: 'minutes' | 'summary' | 'research' | 'chat';
  name: string;
  description: string;
  placeholder: string;
  buttonText: string;
  supportFiles: boolean;
}