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

export interface GenerateRequest {
  text: string;
  industry: string;
  isFileUpload: boolean;
}