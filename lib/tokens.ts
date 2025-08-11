// lib/tokens.ts

export const INITIAL_TOKENS = 100;

// ベースコスト（操作の種類による）
export const BASE_COSTS = {
  minutes: 15,    // 議事録作成
  summary: 10,    // 要約作成
  research: 20,   // リサーチ
  chat: 5         // チャット
} as const;

// 業界特化による追加コスト
export const INDUSTRY_MULTIPLIERS = {
  general: 1.0,
  tech: 1.1,
  finance: 1.2,
  healthcare: 1.3,
  education: 1.1,
  retail: 1.1
} as const;

export function calculateTokenCost(
  textLength: number, 
  type: 'minutes' | 'summary' | 'research' | 'chat',
  industry: 'general' | 'tech' | 'finance' | 'healthcare' | 'education' | 'retail'
): number {
  let baseCost: number = BASE_COSTS[type];
  
  // 文字数による追加コスト
  if (textLength > 1000) baseCost += 5;
  if (textLength > 5000) baseCost += 10;
  if (textLength > 10000) baseCost += 15;
  
  // 業界特化による乗数
  const finalCost = Math.ceil(baseCost * INDUSTRY_MULTIPLIERS[industry]);
  
  return finalCost;
}

export function formatTokenBalance(balance: number): string {
  return `${balance.toLocaleString()} ポイント`;
}

export function canAffordOperation(
  balance: number,
  textLength: number,
  type: 'minutes' | 'summary' | 'research' | 'chat',
  industry: 'general' | 'tech' | 'finance' | 'healthcare' | 'education' | 'retail'
): boolean {
  const cost = calculateTokenCost(textLength, type, industry);
  return balance >= cost;
}