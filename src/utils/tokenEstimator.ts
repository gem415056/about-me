import { DB } from '../db/indexedDb';
import { ChatMessage, ChatAttachment, SajuProfile } from '../types';

let cachedPromptTokens: Record<string, number> = {};

export const TokenEstimator = {
  estimateTextTokens(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    let tokens = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // 1) 한글 완성형 음절 (가~힣: AC00-D7A3) -> 평균 약 1.5 토큰 (Gemini SentencePiece 기준)
      if (code >= 0xAC00 && code <= 0xD7A3) {
        tokens += 1.5;
      }
      // 2) 한글 자모 및 호환 자모 (ㄱ~ㅎ, ㅏ~ㅣ: 1100-11FF, 3130-318F) -> 약 1.5 토큰
      else if ((code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) {
        tokens += 1.5;
      }
      // 3) 한자(사주 천간/지지 등 CJK 통합 한자: 4E00-9FFF) -> 약 1.8 토큰
      else if (code >= 0x4E00 && code <= 0x9FFF) {
        tokens += 1.8;
      }
      // 4) 이모지 및 특수 서로게이트 문자 -> 약 2.0 토큰
      else if (code >= 0xD800 && code <= 0xDFFF) {
        tokens += 2.0;
      }
      // 5) 기타 다국어 유니코드 문자 (code > 255) -> 약 1.5 토큰
      else if (code > 255) {
        tokens += 1.5;
      }
      // 6) 공백 및 줄바꿈 -> 약 0.3 토큰
      else if (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t') {
        tokens += 0.3;
      }
      // 7) 영문 알파벳, 숫자, 기본 기호 (ASCII: 0-127) -> 영문 3.5~4자당 1토큰 (글자당 약 0.28 토큰)
      else {
        tokens += 0.28;
      }
    }
    return Math.ceil(tokens);
  },

  estimateImageTokens(): number {
    return 258; // Gemini standard image token estimate
  },

  async calculateCurrentTokens(
    category: 'psychology' | 'saju' | 'custom' | 'landing',
    messages: ChatMessage[] = [],
    currentInput = '',
    attachments: ChatAttachment[] = [],
    attachedSajuProfiles: SajuProfile[] = [],
    customPromptContent = ''
  ): Promise<number> {
    if (category === 'landing' || !category) return 0;

    let promptTokens = 0;
    if (category === 'custom') {
      promptTokens = customPromptContent ? this.estimateTextTokens(customPromptContent) : 0;
    } else {
      promptTokens = category === 'psychology' ? 14000 : 7000;
      try {
        const promptData = await DB.get<any>('prompts', category);
        if (promptData?.content) {
          promptTokens = this.estimateTextTokens(promptData.content);
        } else if (cachedPromptTokens[category]) {
          promptTokens = cachedPromptTokens[category];
        } else {
          fetch(`/api/prompt/${category}`)
            .then(r => r.json())
            .then(d => {
              if (d?.prompt) {
                cachedPromptTokens[category] = this.estimateTextTokens(d.prompt);
              }
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    let historyTokens = 0;
    for (const msg of messages) {
      if (msg && msg.content && !msg.content.startsWith('⚠️')) {
        historyTokens += this.estimateTextTokens(msg.content);
      }
      if (msg && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.dataUrl || att.mimeType?.startsWith('image/')) {
            historyTokens += this.estimateImageTokens();
          }
          if (att.content) {
            historyTokens += this.estimateTextTokens(att.content);
          }
        }
      }
    }

    let currentInputTokens = 0;
    if (currentInput) {
      currentInputTokens = this.estimateTextTokens(currentInput);
    }

    let attachedTokens = 0;
    for (const att of attachments) {
      if (att.dataUrl || att.mimeType?.startsWith('image/')) {
        attachedTokens += this.estimateImageTokens();
      }
      if (att.content) {
        attachedTokens += this.estimateTextTokens(att.content);
      }
    }

    if (category === 'saju') {
      for (const p of attachedSajuProfiles) {
        if (p.imageData) attachedTokens += this.estimateImageTokens();
        if (p.textData) attachedTokens += this.estimateTextTokens(p.textData);
      }
    }

    return Math.ceil(promptTokens + historyTokens + currentInputTokens + attachedTokens);
  }
};
