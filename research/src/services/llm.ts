import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

// ─── LLM Service ──────────────────────────────────────────────────────────────
// Points at TokenRouter with Anthropic-compatible API

const MAX_TOKENS = 8192;
const MODEL = process.env.LLM_MODEL ?? 'anthropic/claude-opus-4.7';
const BASE_URL = process.env.ANTHROPIC_BASE_URL ?? 'https://api.tokenrouter.com/v1';
export class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: BASE_URL,
    });

    logger.info('[LLM] Service initialized', { model: MODEL, baseUrl: BASE_URL });
  }

  async completeGemini(messages: Message[], options: LLMOptions = {}): Promise<string> {
    const { systemPrompt } = options
    const userContent = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
    
    const body: any = {
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] }
    }

    const _geminiKey = process.env.GEMINI_API_KEY ?? ''
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${_geminiKey}`,
      body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
    )

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')
    return text
  }

  async complete(messages: Message[], options: LLMOptions = {}): Promise<string> {

    const { maxTokens = MAX_TOKENS, temperature = 0.7, systemPrompt } = options;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
  }  // end complete

  async streamToString(
    messages: Message[],
    options: LLMOptions = {},
  ): Promise<string> {
    return this.complete(messages, options);
  }

  async prompt(userMessage: string, systemPrompt?: string, options: LLMOptions = {}): Promise<string> {
    return this.complete(
      [{ role: 'user', content: userMessage }],
      { ...options, systemPrompt }
    );
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _llm: LLMService | null = null;

export function getLLM(): LLMService {
  if (!_llm) throw new Error('[LLM] Not initialized — call initLLM() first');
  return _llm;
}

export function initLLM(): LLMService {
  _llm = new LLMService();
  return _llm;
}
