/**
 * OpenAI Client Singleton
 * Kết nối với OpenAI API (hoặc compatible endpoint)
 */

import OpenAI from 'openai';

// Singleton instance
let openaiInstance: OpenAI | null = null;

/**
 * Lấy OpenAI client singleton
 * Sử dụng env vars: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY chưa được cấu hình. Vui lòng thêm vào .env');
    }

    openaiInstance = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }

  return openaiInstance;
}

/**
 * Lấy model name từ env hoặc mặc định
 */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

/**
 * Reset client (dùng cho testing)
 */
export function resetOpenAIClient(): void {
  openaiInstance = null;
}
