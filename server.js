import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from project root
app.use(express.static(__dirname));

async function callGemini(modelName, action, apiKey, payload) {
  const cleanModel = modelName.replace(/^models\//, '');
  const sep = action.includes('?') ? '&' : '?';
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${apiKey}`;
  return await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Gemini API Server Proxy Route
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: { message: 'Gemini API 키가 설정되지 않았습니다. 좌측 서랍의 [설정] 메뉴에서 API 키를 입력해 주세요.' }
      });
    }

    const { modelName = 'gemini-3.8-flash', payload, stream = true } = req.body;
    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';

    console.log(`[Gemini Proxy Call] Model: "${modelName}" | ThinkingConfig: ${JSON.stringify(payload?.generationConfig?.thinkingConfig)} | Temp: ${payload?.generationConfig?.temperature} | Stream: ${stream}`);

    let response = await callGemini(modelName, action, apiKey, payload);

    // If thinkingConfig causes an error on models that do not support it, retry without thinkingConfig
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
      } catch (e) {
        // Continue with original response if clone fails
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errData);
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = response.body.getReader();
      let isClosed = false;

      req.on('close', () => {
        isClosed = true;
        reader.cancel().catch(() => {});
      });

      while (!isClosed) {
        const { done, value } = await reader.read();
        if (done || isClosed) break;
        res.write(value);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[Gemini Proxy Error]:', error);
    res.status(500).json({
      error: { message: error.message || '서버 처리 중 오류가 발생했습니다.' }
    });
  }
});

// Fallback all other routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ABOUT ME server running on http://0.0.0.0:${PORT}`);
});
