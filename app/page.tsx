'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { calculateTokenCost, INITIAL_TOKENS } from '@/lib/tokens';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [text, setText] = useState('');
  const [industry, setIndustry] = useState('general');
  const [generatedMinutes, setGeneratedMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Googleログイン
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // ユーザー情報を確認・作成
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // 新規ユーザー
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          tokenBalance: INITIAL_TOKENS,
          createdAt: new Date()
        });
        setTokenBalance(INITIAL_TOKENS);
      } else {
        setTokenBalance(userDoc.data().tokenBalance);
      }
      
      setUser(user);
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました');
    }
  };

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  // 議事録生成
  const handleGenerate = async () => {
    if (!user || !text) {
      alert('ログインしてテキストを入力してください');
      return;
    }

    const cost = calculateTokenCost(text.length, industry);
    
    if (tokenBalance < cost) {
      alert(`トークンが不足しています。必要: ${cost}、残高: ${tokenBalance}`);
      return;
    }

    setLoading(true);
    try {
      // APIを呼び出し
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          industry,
          userId: user.uid,
          cost
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedMinutes(data.minutes);
      setTokenBalance(data.remainingTokens);
      
      // ユーザーのトークン残高を更新
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tokenBalance: data.remainingTokens
      });

    } catch (error) {
      console.error('生成エラー:', error);
      alert('議事録の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">議事録生成アプリ</h1>
      
      {!user ? (
        <div className="text-center">
          <div className="bg-red-500 text-white p-4 m-4">
  Tailwindテスト：背景が赤で文字が白なら正常
</div>
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Googleでログイン
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-right">
            <span className="text-sm">ようこそ、{user.displayName}さん</span>
            <br />
            <span className="text-lg font-semibold">残高: {tokenBalance} トークン</span>
          </div>

          <div className="space-y-4">
            {/* 業界選択 */}
            <div>
              <label className="block text-sm font-medium mb-2">業界選択</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="general">一般</option>
                <option value="construction">建築</option>
                <option value="it">IT</option>
                <option value="medical">医療</option>
              </select>
            </div>

            {/* テキスト入力 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                文字起こしテキスト
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-40 p-2 border rounded"
                placeholder="議事録にしたいテキストを入力..."
              />
            </div>

            {/* ファイルアップロード */}
            <div>
              <label className="block text-sm font-medium mb-2">
                またはファイルをアップロード
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="block w-full text-sm"
              />
            </div>

            {/* 生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={loading || !text}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? '生成中...' : `議事録を生成 (${calculateTokenCost(text.length, industry)} トークン)`}
            </button>

            {/* 生成結果 */}
            {generatedMinutes && (
              <div className="mt-8 p-4 bg-gray-100 rounded">
                <h2 className="text-xl font-semibold mb-4">生成された議事録</h2>
                <div className="whitespace-pre-wrap">{generatedMinutes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}