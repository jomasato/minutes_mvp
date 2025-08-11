// lib/ai-service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateRequest, GenerateResponse, Industry } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class AIService {
  private static instance: AIService;
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private getIndustryContext(industry: Industry): string {
    const contexts = {
      general: '一般的なビジネス',
      tech: 'IT・テクノロジー業界',
      finance: '金融業界',
      healthcare: '医療・ヘルスケア業界',
      education: '教育業界',
      retail: '小売・EC業界'
    };
    return contexts[industry] || contexts.general;
  }

  private getPromptTemplate(type: 'minutes' | 'summary' | 'research' | 'chat', industry: Industry, text: string): string {
    const industryContext = this.getIndustryContext(industry);

    const templates: Record<'minutes' | 'summary' | 'research' | 'chat', string> = {
      minutes: `
あなたは${industryContext}の専門的な議事録作成者です。
以下の文字起こしテキストから、簡潔で分かりやすい議事録を作成してください。

議事録の構成:
1. 会議概要
2. 主要議題・決定事項
3. アクションアイテム（担当者と期限）
4. 次回予定

文字起こしテキスト:
${text}

上記のテキストを基に、${industryContext}の専門用語も適切に使用し、分かりやすく整理された議事録を作成してください。
`,

      summary: `
あなたは${industryContext}の専門的な要約作成者です。
以下の文書から、重要なポイントを抽出し、簡潔で分かりやすい要約を作成してください。

要約の構成:
1. 文書の概要
2. 主要なポイント（3-5項目）
3. 重要な数値・データ（ある場合）
4. 結論・提言

文書内容:
${text}

上記の文書を基に、${industryContext}の観点から重要な要素を抽出し、構造化された要約を作成してください。
`,

      research: `
あなたは${industryContext}の専門的なリサーチャーです。
以下のトピックについて、詳細な調査と分析を行ってください。

調査内容の構成:
1. トピックの概要
2. 現在の状況・トレンド
3. 主要な課題と機会
4. 業界への影響
5. 今後の展望
6. 参考となる関連情報

調査トピック:
${text}

上記のトピックについて、${industryContext}の専門知識を活用し、包括的で実用的な分析を提供してください。
`,

      chat: `
あなたは${industryContext}に詳しい親しみやすいAIアシスタントです。
ユーザーの質問や相談に対して、専門的でありながら分かりやすく回答してください。

ユーザーのメッセージ:
${text}

${industryContext}の専門知識を活用し、実用的で有益な回答を提供してください。
`
    };

    return templates[type];
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const prompt = this.getPromptTemplate(request.type, request.industry, request.text);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      // トークン使用量を計算（簡易版）
      const tokensUsed = Math.ceil((request.text.length + generatedText.length) / 4);

      // 履歴アイテムを作成
      const historyItem = {
        id: Date.now().toString(),
        type: request.type,
        title: this.generateTitle(request.type, request.text),
        preview: generatedText.substring(0, 100) + '...',
        date: new Date().toISOString().split('T')[0],
        tokensUsed
      };

      return {
        result: generatedText,
        tokensUsed,
        remainingTokens: 0, // 実装時にユーザーの残高から計算
        historyItem
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('AI処理中にエラーが発生しました');
    }
  }

  private generateTitle(type: 'minutes' | 'summary' | 'research' | 'chat', text: string): string {
    const date = new Date().toLocaleDateString('ja-JP');
    const preview = text.substring(0, 20).replace(/\n/g, ' ');
    
    const typeNames: Record<'minutes' | 'summary' | 'research' | 'chat', string> = {
      minutes: '議事録',
      summary: '要約',
      research: 'リサーチ',
      chat: 'チャット'
    };

    return `${typeNames[type]} - ${preview}... (${date})`;
  }
}

export const aiService = AIService.getInstance();