// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateMinutes(text: string, industry: string): Promise<string> {
  try {
    // 新しいモデル名を使用
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
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

上記のテキストを基に、分かりやすく整理された議事録を作成してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('議事録の生成中にエラーが発生しました');
  }
}