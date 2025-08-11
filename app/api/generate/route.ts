// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { generateMinutes } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { text, industry, userId, cost } = await request.json();

    // 入力検証
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'テキストが入力されていません' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'ユーザー認証が必要です' },
        { status: 401 }
      );
    }

    // 議事録を生成
    const minutes = await generateMinutes(text, industry);

    // 実際のアプリではここでFirestoreに保存処理を行う
    // const minutesRef = await addDoc(collection(db, 'minutes'), {...});

    return NextResponse.json({
      minutes,
      remainingTokens: 100 - cost // 仮の値（実際はDBから取得）
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // エラーの種類に応じて適切なレスポンスを返す
    if (error instanceof Error) {
      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'APIキーが設定されていません' },
          { status: 500 }
        );
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API利用制限に達しました。しばらく後でお試しください' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: '議事録の生成に失敗しました' },
      { status: 500 }
    );
  }
}