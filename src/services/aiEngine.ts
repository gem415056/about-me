import { DB } from '../db/indexedDb';
import { ChatMessage, ChatAttachment, SajuProfile, AppSettings } from '../types';
import { TokenEstimator } from '../utils/tokenEstimator';

export const AIEngine = {
  extractBase64(dataUrl: string): { mimeType: string; data: string } {
    if (!dataUrl) return { mimeType: 'image/jpeg', data: '' };
    const commaIdx = dataUrl.indexOf(',');
    let mime = 'image/jpeg';
    let base64 = '';
    if (commaIdx !== -1 && dataUrl.startsWith('data:')) {
      mime = dataUrl.slice(5, commaIdx).split(';')[0] || 'image/jpeg';
      base64 = dataUrl.slice(commaIdx + 1).replace(/\s/g, '');
    } else {
      base64 = dataUrl.replace(/\s/g, '');
    }
    if (mime.toLowerCase() === 'image/jpg' || mime.toLowerCase() === 'image/pjpeg') {
      mime = 'image/jpeg';
    }
    return { mimeType: mime, data: base64 };
  },

  async buildContents(
    history: ChatMessage[],
    userText: string,
    attachedFiles: ChatAttachment[] = [],
    attachedSajuProfiles: SajuProfile[] = [],
    category: 'psychology' | 'saju' | 'custom' = 'custom'
  ): Promise<any[]> {
    // 1. Refine history
    const rawHistory = (history || []).filter(msg =>
      msg &&
      typeof msg.content === 'string' &&
      msg.content.trim() &&
      !msg.content.trim().startsWith('⚠️')
    );

    const alternatingHistory: any[] = [];
    let expectedRole = 'user';
    for (const msg of rawHistory) {
      const cleanContent = msg.content.replace(/\[[^\]]+의 만세력\]\s*/g, '').trim() || '.';
      const parts: any[] = [];

      // Include message attachments if present
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.dataUrl) {
            const { mimeType, data } = this.extractBase64(att.dataUrl);
            if (data) {
              parts.push({
                inlineData: { mimeType: mimeType || 'image/jpeg', data }
              });
            }
          }
          if (att.content) {
            parts.push({ text: `[첨부 파일: ${att.name}]\n${att.content}` });
          }
        }
      }

      parts.push({ text: cleanContent });

      if (msg.role === expectedRole) {
        alternatingHistory.push({
          role: msg.role,
          parts
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      } else {
        alternatingHistory.push({
          role: expectedRole,
          parts: [{ text: '.' }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
        alternatingHistory.push({
          role: msg.role,
          parts
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === 'user') {
      alternatingHistory.push({
        role: 'model',
        parts: [{ text: '.' }]
      });
    }

    // 2. Assemble current user turn
    const currentParts: any[] = [];
    let docCombinedText = '';

    for (const file of attachedFiles) {
      if (file.dataUrl) {
        const { mimeType, data } = this.extractBase64(file.dataUrl);
        if (data) {
          currentParts.push({
            inlineData: { mimeType: mimeType || 'image/jpeg', data }
          });
        }
      }
      if (file.content) {
        docCombinedText += `[첨부 파일: ${file.name}]\n${file.content}\n\n`;
      }
    }

    if (category === 'saju' && attachedSajuProfiles.length > 0) {
      for (const p of attachedSajuProfiles) {
        if (p.imageData) {
          const { mimeType, data } = this.extractBase64(p.imageData);
          if (data) {
            currentParts.push({
              inlineData: { mimeType: mimeType || 'image/jpeg', data }
            });
          }
        }
        if (p.textData && p.textData.trim()) {
          docCombinedText += `\`\`\`yaml\n${p.textData.trim()}\n\`\`\`\n\n`;
        }
      }
    }

    const cleanUserText = (userText || '').replace(/\[[^\]]+의 만세력[^\]]*\]\s*/g, '').trim();
    let finalUserText = (docCombinedText + cleanUserText).trim();
    if (!finalUserText && currentParts.length > 0) {
      finalUserText = '첨부된 파일과 정보를 바탕으로 분석해 주세요.';
    }
    if (finalUserText) {
      currentParts.push({ text: finalUserText });
    }

    // 3. Token slicing control
    const slicingConfig = await DB.get<any>('settings', 'token_slicing_config').catch(() => null);
    const isSlicingEnabled = Boolean(slicingConfig?.enabled);
    const maxTokens = isSlicingEnabled && slicingConfig?.maxTokens ? parseInt(slicingConfig.maxTokens, 10) : 50000;

    let finalHistory = alternatingHistory;
    if (isSlicingEnabled && alternatingHistory.length > 2) {
      let baseTokens = 4500;
      baseTokens += TokenEstimator.estimateTextTokens(finalUserText);
      for (const p of currentParts) {
        if (p.inlineData) baseTokens += 258;
      }

      const pairs: any[][] = [];
      for (let i = 0; i < alternatingHistory.length; i += 2) {
        if (alternatingHistory[i] && alternatingHistory[i + 1]) {
          pairs.push([alternatingHistory[i], alternatingHistory[i + 1]]);
        }
      }

      const selectedPairs: any[][] = [];
      let accumulatedTokens = baseTokens;
      for (let i = pairs.length - 1; i >= 0; i--) {
        const pair = pairs[i];
        const uText = pair[0].parts?.[0]?.text || '';
        const mText = pair[1].parts?.[0]?.text || '';
        const pairTokens = TokenEstimator.estimateTextTokens(uText) + TokenEstimator.estimateTextTokens(mText);
        if (accumulatedTokens + pairTokens <= maxTokens || selectedPairs.length === 0) {
          selectedPairs.unshift(pair);
          accumulatedTokens += pairTokens;
        } else {
          break;
        }
      }
      finalHistory = selectedPairs.flat();
    }

    return [
      ...finalHistory,
      {
        role: 'user',
        parts: currentParts
      }
    ];
  },

  async streamChat(
    category: 'psychology' | 'saju' | 'custom',
    history: ChatMessage[],
    userText: string,
    attachedFiles: ChatAttachment[] = [],
    attachedSajuProfiles: SajuProfile[] = [],
    settings: AppSettings = {},
    customPromptText?: string,
    onChunk?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const contents = await this.buildContents(history, userText, attachedFiles, attachedSajuProfiles, category);

    const modelName = settings.modelName || 'gemini-3.8-flash';
    const temperature = settings.temperature !== undefined ? settings.temperature : 0.7;

    const payload: any = {
      contents,
      generationConfig: {
        temperature
      }
    };

    // Inject custom prompt as systemInstruction if provided
    if (customPromptText && customPromptText.trim()) {
      payload.systemInstruction = {
        parts: [{ text: customPromptText.trim() }]
      };
    }

    if (settings.reasoning && settings.reasoning !== 'off') {
      payload.generationConfig.thinkingConfig = {
        thinkingBudget: settings.reasoningBudget || 1024
      };
    }

    if (settings.safety) {
      payload.safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: settings.safety.harassment || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: settings.safety.hate || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: settings.safety.sex || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: settings.safety.danger || 'BLOCK_NONE' }
      ];
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (settings.gemini_api_key) {
      headers['x-gemini-key'] = settings.gemini_api_key;
    }

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        modelName,
        payload,
        stream: true,
        category
      }),
      signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({} as any));
      const errMsg = errJson?.error?.message || `서버 오류 (HTTP ${response.status})`;
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('스트림 응답을 읽을 수 없습니다.');
    }

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const candidates = parsed?.candidates;
          if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.text) {
                fullText += part.text;
                if (onChunk) onChunk(fullText);
              }
            }
          }
        } catch {
          // ignore chunk parse errors
        }
      }
    }

    return fullText;
  }
};
