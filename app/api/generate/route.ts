// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { generateMinutes } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { text, industry, userId, cost } = await request.json();

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
    return NextResponse.json(
      { error: '議事録の生成に失敗しました' },
      { status: 500 }
    );
  }
}