// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { GenerateRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body: GenerateRequest & { userId: string } = await request.json();

    // 入力検証
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'テキストが入力されていません' },
        { status: 400 }
      );
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'ユーザー認証が必要です' },
        { status: 401 }
      );
    }

    if (!['minutes', 'summary', 'research', 'chat'].includes(body.type)) {
      return NextResponse.json(
        { error: '無効なリクエストタイプです' },
        { status: 400 }
      );
    }

    // AI処理を実行
    const result = await aiService.generate({
      text: body.text,
      industry: body.industry,
      type: body.type,
      isFileUpload: body.isFileUpload,
      sessionId: body.sessionId
    });

    // 実際のアプリケーションでは、ここでFirestoreに保存
    // const docRef = await addDoc(collection(db, body.type), {
    //   userId: body.userId,
    //   ...result,
    //   createdAt: new Date()
    // });

    // ユーザーのトークン残高を更新
    // await updateDoc(doc(db, 'users', body.userId), {
    //   tokenBalance: increment(-result.tokensUsed)
    // });

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);
    
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
      { error: 'AI処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}