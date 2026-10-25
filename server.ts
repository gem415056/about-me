import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper to read prompt directly from disk file
  function getPromptContent(category: string): string {
    const fileName = category === 'psychology' ? 'prompt_psychology.txt' : 'prompt_saju.txt';
    const filePath = path.join(__dirname, fileName);
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (err) {
      console.error(`[Prompt Read Error] Failed to read ${filePath}:`, err);
    }
    return '';
  }

  // Dedicated no-cache API endpoint to get prompt directly from disk
  app.get('/api/prompt/:category', (req: Request, res: Response) => {
    const category = req.params.category as string;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const content = getPromptContent(category);
    if (!content) {
      return res.status(404).json({
        error: `프롬프트 파일(${category === 'psychology' ? 'prompt_psychology.txt' : 'prompt_saju.txt'})을 찾을 수 없거나 비어 있습니다.`
      });
    }
    res.json({ category, prompt: content });
  });

  async function callGemini(modelName: string, action: string, apiKey: string, payload: any) {
    const cleanModel = modelName.replace(/^models\//, '');
    const sep = action.includes('?') ? '&' : '?';
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout
    try {
      return await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Gemini API Server Proxy Route
  app.post('/api/gemini', async (req: Request, res: Response) => {
    try {
      const apiKey = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: { message: 'Gemini API 키가 설정되지 않았습니다. 좌측 서랍의 [설정] 메뉴에서 API 키를 입력해 주세요.' }
        });
      }

      const { modelName = 'gemini-3.8-flash', payload, stream = true, category } = req.body;
      const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';

      // Inject system prompt if category provided
      if (category && (category === 'saju' || category === 'psychology')) {
        const freshPrompt = getPromptContent(category);
        if (freshPrompt) {
          if (!payload.systemInstruction) {
            payload.systemInstruction = { parts: [{ text: freshPrompt }] };
          } else if (payload.systemInstruction.parts) {
            payload.systemInstruction.parts[0] = { text: freshPrompt };
          }
        }
      }

      let response = await callGemini(modelName, action, apiKey, payload);

      // Retry without thinkingConfig if model rejects it
      if (!response.ok && payload?.generationConfig?.thinkingConfig) {
        try {
          const errClone = await response.clone().json().catch(() => ({}));
          const errMsg = errClone.error?.message || '';
          if (errMsg.toLowerCase().includes('thinking') || errMsg.toLowerCase().includes('budget')) {
            console.warn(`Model ${modelName} rejected thinkingConfig (${errMsg}). Retrying without thinkingConfig.`);
            const retryPayload = JSON.parse(JSON.stringify(payload));
            delete retryPayload.generationConfig.thinkingConfig;
            response = await callGemini(modelName, action, apiKey, retryPayload);
          }
        } catch {
          // ignore
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({} as any));
        const rawMsg = errData.error?.message || `HTTP ${response.status}`;

        let friendlyMessage = rawMsg;
        if (response.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('resource_exhausted')) {
          friendlyMessage = `Gemini API 분당 토큰/요청 한도(TPM/RPM Quota)를 일시 초과했습니다. 무료 티어는 분당 사용량이 제한되어 있으므로 1~2분 뒤 다시 시도해 주세요. (${rawMsg})`;
        } else if (response.status === 400 && rawMsg.toLowerCase().includes('api key')) {
          friendlyMessage = `Gemini API 키가 올바르지 않거나 만료되었습니다. 좌측 [설정] 메뉴에서 유효한 API 키를 확인해 주세요.`;
        } else if (response.status === 403) {
          friendlyMessage = `API 키 권한이 없거나 해당 모델에 접근할 수 없습니다. (${rawMsg})`;
        } else if (response.status === 503) {
          friendlyMessage = `Google Gemini 모델 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.`;
        }

        return res.status(response.status).json({
          error: {
            code: response.status,
            message: friendlyMessage,
            rawMessage: rawMsg,
            status: errData.error?.status
          }
        });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        if (!response.body) {
          return res.end();
        }

        const reader = response.body.getReader();
        let isClosed = false;

        req.on('close', () => {
          isClosed = true;
          reader.cancel().catch(() => {});
        });

        try {
          while (!isClosed) {
            const { done, value } = await reader.read();
            if (done || isClosed) break;
            res.write(value);
          }
        } catch (streamErr) {
          console.warn('[Gemini Proxy Stream read error]:', streamErr);
        } finally {
          if (!res.writableEnded) {
            res.end();
          }
        }
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error: any) {
      console.error('[Gemini Proxy Error]:', error);
      const isAbort = error.name === 'AbortError';
      res.status(500).json({
        error: {
          message: isAbort
            ? 'Gemini 응답 생성 시간이 초과되었습니다(3분 타임아웃). 잠시 후 다시 시도해 주세요.'
            : (error.message || '서버 처리 중 오류가 발생했습니다.')
        }
      });
    }
  });

  // Setup Vite middleware in dev or static serving in prod
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ABOUT ME server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
