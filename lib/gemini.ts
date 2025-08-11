// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateMinutes(text: string, industry: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `
あなたは${industry}業界の専門的な議事録作成者です。
以下の文字起こしテキストから、簡潔で分かりやすい議事録を作成してください。

議事録の構成:
1. 会議概要
2. 主要議題・決定事項
3. アクションアイテム
4. 次回予定

文字起こしテキスト:
${text}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}