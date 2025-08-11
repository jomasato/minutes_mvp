'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, MessageSquare, FileText, Search, BookOpen, Clock, Send, Upload, X, History, LogOut } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { TabConfig, Industry, HistoryItem, GenerateResponse, ErrorResponse } from '@/types';

const INITIAL_TOKENS = 100;

export default function AIToolsHub() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<'minutes' | 'summary' | 'research' | 'chat'>('minutes');
  const [input, setInput] = useState('');
  const [industry, setIndustry] = useState<Industry>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<string>('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firebase Auth の監視
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        await loadUserData(user.uid);
      } else {
        setUser(null);
        setTokenBalance(0);
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setTokenBalance(userData.tokenBalance || 0);
        // 履歴も読み込む（実装時）
      }
    } catch (error) {
      console.error('ユーザーデータの読み込みエラー:', error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoginLoading(true);
    try {
      const authResult = await signInWithEmailAndPassword(auth, email, password);
      const user = authResult.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.email?.split('@')[0] || 'ユーザー',
          tokenBalance: INITIAL_TOKENS,
          createdAt: new Date()
        });
        setTokenBalance(INITIAL_TOKENS);
      }
    } catch (error: any) {
      console.error('メールログインエラー:', error);
      let errorMessage = 'ログインに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      }
      
      alert(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const authResult = await signInWithPopup(auth, provider);
      const user = authResult.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          tokenBalance: INITIAL_TOKENS,
          createdAt: new Date()
        });
        setTokenBalance(INITIAL_TOKENS);
      }
    } catch (error) {
      console.error('Googleログインエラー:', error);
      alert('Googleログインに失敗しました');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const tabs: TabConfig[] = [
    { 
      id: 'minutes', 
      name: '議事録作成', 
      description: '音声や文字起こしから議事録を生成',
      placeholder: '会議の文字起こしテキストをここに貼り付けてください...',
      buttonText: '議事録を生成',
      supportFiles: true
    },
    { 
      id: 'summary', 
      name: '要約作成', 
      description: '長文書類を要約して整理',
      placeholder: '要約したい文書の内容をここに貼り付けてください...',
      buttonText: '要約を生成',
      supportFiles: true
    },
    { 
      id: 'research', 
      name: 'リサーチャー', 
      description: '情報収集と分析をサポート',
      placeholder: '調査したいトピックや質問を入力してください...',
      buttonText: 'リサーチを実行',
      supportFiles: false
    },
    { 
      id: 'chat', 
      name: 'AIチャット', 
      description: 'AIアシスタントとの対話',
      placeholder: 'AIアシスタントに質問や相談をしてください...',
      buttonText: '送信',
      supportFiles: false
    }
  ];

  const industries = [
    { value: 'general' as const, label: '一般' },
    { value: 'tech' as const, label: 'IT・テック' },
    { value: 'finance' as const, label: '金融' },
    { value: 'healthcare' as const, label: '医療・ヘルスケア' },
    { value: 'education' as const, label: '教育' },
    { value: 'retail' as const, label: '小売・EC' }
  ];

  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 10);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !user) return;
    
    const estimatedTokens = estimateTokens(input);
    if (tokenBalance < estimatedTokens) {
      alert(`トークンが不足しています。必要: ${estimatedTokens}、残高: ${tokenBalance}`);
      return;
    }

    setIsLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: input,
          industry,
          type: activeTab,
          userId: user.uid,
          isFileUpload: false
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new Error(errorData.error || 'エラーが発生しました');
      }

      const successData = data as GenerateResponse;

      setResult(successData.result);
      setHistory(prev => [successData.historyItem, ...prev]);
      setTokenBalance(prev => prev - successData.tokensUsed);
      setInput('');
      
      // ユーザーのトークン残高を更新
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          tokenBalance: tokenBalance - successData.tokensUsed
        });
      }

    } catch (error) {
      console.error('生成エラー:', error);
      alert(error instanceof Error ? error.message : 'AI処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileResult = e.target?.result;
      if (typeof fileResult === 'string') {
        setInput(fileResult);
      }
    };
    reader.readAsText(file);
  };

  const currentTab = tabs.find(t => t.id === activeTab)!;

  // ログインしていない場合
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="p-3 bg-blue-600 rounded-lg inline-block mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Tools Hub</h1>
            <p className="text-gray-600">AIツールを使って作業効率を向上させましょう</p>
          </div>
          
          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
          >
            Googleでログイン
          </button>
          
          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>
          
          {/* Email Login Toggle */}
          {!showEmailLogin ? (
            <button
              onClick={() => setShowEmailLogin(true)}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              メール・パスワードでログイン
            </button>
          ) : (
            <div>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loginLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ログイン中...
                    </div>
                  ) : (
                    'ログイン'
                  )}
                </button>
              </form>
              
              <button
                onClick={() => {
                  setShowEmailLogin(false);
                  setEmail('');
                  setPassword('');
                }}
                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                戻る
              </button>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">テストアカウント</p>
                <p className="text-xs text-blue-600">
                  Email: test@example.com<br />
                  Password: testpass123
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">AI Tools Hub</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                履歴
              </button>
              
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{tokenBalance} ポイント</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user.displayName}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="ログアウト"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">AIツール</h3>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.id === 'minutes' ? FileText : 
                              tab.id === 'summary' ? BookOpen :
                              tab.id === 'research' ? Search : MessageSquare;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setInput('');
                        setResult('');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs text-gray-500">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Recent History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">最近の履歴</h3>
              </div>
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {history.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.preview}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-3 text-center text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">履歴がありません</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Input Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {currentTab.id === 'minutes' && <FileText className="w-5 h-5 text-blue-600" />}
                  {currentTab.id === 'summary' && <BookOpen className="w-5 h-5 text-blue-600" />}
                  {currentTab.id === 'research' && <Search className="w-5 h-5 text-blue-600" />}
                  {currentTab.id === 'chat' && <MessageSquare className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentTab.name}</h2>
                  <p className="text-sm text-gray-600">{currentTab.description}</p>
                </div>
              </div>

              {activeTab !== 'chat' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    業界・分野を選択
                  </label>
                  <div className="relative">
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value as Industry)}
                      className="w-full appearance-none bg-white px-4 py-3 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors hover:border-gray-400 text-gray-900"
                    >
                      {industries.map(ind => (
                        <option key={ind.value} value={ind.value} className="text-gray-900">{ind.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容を入力
                </label>
                
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentTab.placeholder}
                    className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-colors hover:border-gray-400 text-gray-900 placeholder-gray-500"
                    disabled={isLoading}
                  />
                  
                  {currentTab.supportFiles && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="ファイルをアップロード"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.docx,.pdf"
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  推定消費: <span className="font-medium text-gray-900">{estimateTokens(input)} ポイント</span>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {currentTab.buttonText}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Area */}
            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">生成結果</h3>
                    <p className="text-sm text-gray-600">AIが生成した{currentTab.name}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {result}
                  </pre>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(result)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    コピー
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([result], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${currentTab.name}_${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    ダウンロード
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">作業履歴</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {history.length > 0 ? (
                <div className="grid gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{item.tokensUsed}pt</span>
                          <span className="text-sm text-gray-500">{item.date}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{item.preview}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {tabs.find(t => t.id === item.type)?.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">履歴がありません</h3>
                  <p className="text-gray-600">AIツールを使用すると、ここに履歴が表示されます。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>