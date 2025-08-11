// lib/tokens.ts

export const INITIAL_TOKENS = 100;
export const BASE_COST = 13;

export function calculateTokenCost(textLength: number, industry: string): number {
  let cost = BASE_COST;
  
  // 文字数による追加
  if (textLength > 5000) cost += 5;
  if (textLength > 10000) cost += 10;
  
  // 業界特化による追加
  if (industry !== 'general') cost += 5;
  
  return cost;
}