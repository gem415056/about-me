/**
 * App Check & Vertex AI 정밀 진단 모바일 플로팅 모듈
 * (디버그 완료 후 이 파일과 index.html의 로드 스크립트 1줄만 삭제하면 깔끔히 원복됩니다)
 */
(function () {
  if (typeof window === 'undefined') return;

  // 1. 플로팅 UI 및 스타일 동적 주입
  const style = document.createElement('style');
  style.textContent = `
    #ac-debug-fab {
      position: fixed;
      bottom: 84px;
      right: 16px;
      z-index: 999999;
      background: #4A533B;
      color: #FAF8F2;
      border: 1.5px solid #8F967E;
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: sans-serif;
    }
    #ac-debug-fab:active { transform: scale(0.96); }
    #ac-debug-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.65);
      z-index: 1000000;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    }
    #ac-debug-modal.hidden { display: none !important; }
    .ac-debug-card {
      background: #FAF8F2;
      width: 100%;
      max-width: 540px;
      height: 85vh;
      border-radius: 18px 18px 0 0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .ac-debug-header {
      padding: 14px 18px;
      background: #4A533B;
      color: #FAF8F2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 15px;
    }
    .ac-debug-close {
      background: transparent;
      border: none;
      color: #FAF8F2;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
    }
    .ac-debug-body {
      padding: 14px 16px;
      overflow-y: auto;
      flex: 1;
      font-size: 12px;
      color: #2A3022;
      line-height: 1.5;
    }
    .ac-btn-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ac-action-btn {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      border: none;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }
    .ac-btn-run { background: #5D664D; color: white; }
    .ac-btn-clear { background: #D1CFC2; color: #2A3022; }
    .ac-log-box {
      background: #20241A;
      color: #E6EAD8;
      border-radius: 8px;
      padding: 12px;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 11px;
      max-height: 52vh;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .ac-tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      margin-right: 4px;
    }
    .ac-tag-success { background: #388E3C; color: white; }
    .ac-tag-warn { background: #F57C00; color: white; }
    .ac-tag-err { background: #D32F2F; color: white; }
    .ac-tag-info { background: #1976D2; color: white; }
  `;
  document.head.appendChild(style);

  // 2. DOM 요소 생성
  const fab = document.createElement('button');
  fab.id = 'ac-debug-fab';
  fab.innerHTML = '🛠️ AppCheck 진단';

  const modal = document.createElement('div');
  modal.id = 'ac-debug-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="ac-debug-card">
      <div class="ac-debug-header">
        <span>🛠️ App Check & Vertex AI 정밀 진단기</span>
        <button class="ac-debug-close" id="btn-close-ac-debug">✕</button>
      </div>
      <div class="ac-debug-body">
        <div class="ac-btn-row">
          <button class="ac-action-btn ac-btn-run" id="btn-run-ac-test">🚀 실시간 정밀 진단 실행</button>
          <button class="ac-action-btn ac-btn-clear" id="btn-purge-ac-cache">🗑️ 토큰 캐시 강제 소거</button>
        </div>
        <div style="margin-bottom: 8px; font-weight: 600; color: #5D664D;">
          접속 도메인: <code style="background:#E2DDD2; padding:2px 5px; border-radius:4px;">${window.location.hostname}</code>
        </div>
        <div id="ac-log-content" class="ac-log-box">진단 실행 버튼을 누르면 Firebase 설정, Enterprise 토큰 발급, JWT 디코딩, Vertex AI REST 직결 테스트를 순차 실행합니다.</div>
      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(modal);

  // 3. 이벤트 핸들러
  fab.addEventListener('click', () => modal.classList.remove('hidden'));
  modal.querySelector('#btn-close-ac-debug').addEventListener('click', () => modal.classList.add('hidden'));

  const logBox = modal.querySelector('#ac-log-content');
  function appendLog(text) {
    logBox.textContent += '\n' + text;
    logBox.scrollTop = logBox.scrollHeight;
  }
  function clearLog() {
    logBox.textContent = '';
  }

  // 독립 내장 파서 (app.js 캐시 상태와 무관하게 100% 자가 동작)
  function selfParseConfig(configStr) {
    if (!configStr || typeof configStr !== 'string') return null;
    const str = (configStr || '').trim();
    if (!str) return null;

    let parsed = {};

    try {
      if (str.startsWith('{') && str.endsWith('}')) {
        parsed = JSON.parse(str);
      }
    } catch (e) {}

    if (Object.keys(parsed).length === 0) {
      try {
        const braceMatch = str.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          const candidate = braceMatch[0]
            .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
            .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
            .replace(/:\s*['`]([^'`\r\n]*)['`]/g, ':"$1"')
            .replace(/,\s*([}\]])/g, '$1');
          parsed = JSON.parse(candidate);
        }
      } catch (e) {}
    }

    const extract = (key) => {
      if (parsed[key]) return String(parsed[key]).trim();
      const m = str.match(new RegExp('["\']?' + key + '["\']?\\s*[:=]\\s*["\'`]?([^"\'`\\r\\n,;]+)["\'`]?', 'i'));
      if (m) return m[1].trim();
      return '';
    };

    let apiKey = extract('apiKey') || extract('api_key');
    let projectId = extract('projectId') || extract('project_id');
    let appId = extract('appId') || extract('app_id') || extract('applicationId');
    let authDomain = extract('authDomain') || extract('auth_domain');
    let storageBucket = extract('storageBucket') || extract('storage_bucket');
    let messagingSenderId = extract('messagingSenderId') || extract('messaging_sender_id') || extract('senderId');
    let location = extract('location') || 'us-central1';

    if (!apiKey) {
      const apiMatch = str.match(/AIzaSy[a-zA-Z0-9_\-+]{33}/);
      if (apiMatch) apiKey = apiMatch[0];
    }

    if (!appId) {
      const appMatch = str.match(/1:[0-9]{8,16}:web:[a-zA-Z0-9]{8,40}/);
      if (appMatch) appId = appMatch[0];
    }

    if (!messagingSenderId && appId) {
      const parts = appId.split(':');
      if (parts.length >= 2 && /^[0-9]+$/.test(parts[1])) {
        messagingSenderId = parts[1];
      }
    }

    if (!projectId) {
      const hostMatch = str.match(/([a-z0-9][a-z0-9-]{3,60})\.(?:firebaseapp\.com|appspot\.com|firebasestorage\.app)/i);
      if (hostMatch) projectId = hostMatch[1];
    }

    if (!authDomain && projectId) authDomain = `${projectId}.firebaseapp.com`;
    if (!storageBucket && projectId) storageBucket = `${projectId}.firebasestorage.app`;

    const RECAPTCHA_ENTERPRISE_KEY = '6LeGSOctAAAAADaJswGotMksEEfheFfTJe_FhV9X';

    if (!projectId || !apiKey) return null;

    return {
      apiKey,
      projectId,
      appId: appId || `1:${messagingSenderId || '123'}:web:aboutme`,
      authDomain,
      storageBucket,
      messagingSenderId: messagingSenderId || '',
      location,
      recaptchaSiteKey: RECAPTCHA_ENTERPRISE_KEY,
      isEnterprise: true
    };
  }

  // JWT 디코더 헬퍼
  function parseJwt(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // 캐시 강제 소거 버튼
  modal.querySelector('#btn-purge-ac-cache').addEventListener('click', async () => {
    clearLog();
    appendLog('[작업] IndexedDB 및 메모리 캐시 토큰 강제 소거 중...');
    try {
      if (window.DB) {
        await window.DB.delete('settings', 'app_check_cached_token');
      }
      if (window.VertexManager) {
        window.VertexManager.cachedTokenData = null;
      }
      appendLog('✅ 캐시가 성공적으로 완전히 삭제되었습니다.');
    } catch (e) {
      appendLog('❌ 캐시 삭제 실패: ' + e.message);
    }
  });

  // 정밀 진단 실행
  modal.querySelector('#btn-run-ac-test').addEventListener('click', async () => {
    clearLog();
    appendLog('=== 🔍 App Check & Vertex AI 정밀 진단 시작 ===');
    appendLog(`[0] 현재 접속 호스트: ${window.location.hostname}`);
    appendLog(`[0] 현재 프로토콜/포트: ${window.location.protocol}//${window.location.host}`);

    // [1단계] 설정 추출 검증
    appendLog('\n--- [1] Firebase 설정 분석 ---');
    const activeTextareaVal = document.getElementById('setting-vertex-config')?.value?.trim() || '';
    const vertexSetting = window.DB ? await window.DB.get('settings', 'vertex_config') : null;
    const vertexConfigStr = activeTextareaVal || vertexSetting?.value?.trim() || '';

    if (activeTextareaVal && window.DB) {
      // 모달 입력창의 최신 내용을 DB에도 즉시 동기화
      await window.DB.set('settings', { id: 'vertex_config', value: activeTextareaVal, updatedAt: Date.now() }).catch(() => {});
    }

    if (!vertexConfigStr) {
      appendLog('❌ [경고] Firebase Config 텍스트가 비어 있습니다.');
      appendLog('👉 좌측 서랍 ➔ [설정] ➔ [Vertex AI] 탭에 Firebase Config 스크립트를 붙여넣어 주세요.');
      return;
    }

    appendLog(`• 읽어온 설정 텍스트 길이: ${vertexConfigStr.length}자`);
    appendLog(`• 설정 텍스트 미리보기: ${vertexConfigStr.substring(0, 100).replace(/\n/g, ' ')}...`);

    const config = (window.VertexManager && window.VertexManager.parseConfig)
      ? window.VertexManager.parseConfig(vertexConfigStr)
      : selfParseConfig(vertexConfigStr);

    if (!config) {
      appendLog('❌ [실패] Firebase Config 파싱에 실패했습니다.');
      appendLog('• 이유: apiKey 또는 projectId를 텍스트에서 감지하지 못했습니다.');
      appendLog('• 입력된 원문:\n' + vertexConfigStr);
      return;
    }

    appendLog(`• Project ID: ${config.projectId || '(누락!)'}`);
    appendLog(`• API Key: ${config.apiKey ? config.apiKey.substring(0, 8) + '...' : '(누락!)'}`);
    appendLog(`• App ID: ${config.appId || '(누락!)'}`);
    appendLog(`• Auth Domain: ${config.authDomain || '(없음)'}`);
    appendLog(`• 하드코딩된 Enterprise SiteKey: ${config.recaptchaSiteKey}`);

    if (!config.appId || config.appId.includes('aboutme')) {
      appendLog('\n⚠️ [주의/핵심 원인 가능성]');
      appendLog('Firebase Config에 고유한 Web "appId" (예: 1:104984219221:web:abcdef...)가 누락되어 있습니다!');
      appendLog('Firebase App Check는 프로젝트의 특정 Web App ID에 reCAPTCHA를 등록하는 방식입니다.');
      appendLog('설정 텍스트에 "appId: \'1:...\'"가 누락되면 토큰 발급 시 Google 서버가 invalid로 판정할 수 있습니다.');
    }

    // [2단계] Enterprise SDK 초기화 및 신규 토큰 강제 발급 (독립 실행)
    appendLog('\n--- [2] reCAPTCHA Enterprise 토큰 발급 테스트 ---');
    let token = null;
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js");
      const { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app-check.js");

      let app = getApps().find(a => a.name === 'AboutMeVertexApp');
      if (!app) {
        app = initializeApp({
          apiKey: config.apiKey,
          projectId: config.projectId,
          appId: config.appId,
          authDomain: config.authDomain,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId
        }, 'AboutMeVertexApp');
      }
      appendLog('• Firebase App 초기화 확인: ' + app.name);

      let appCheck = window.VertexManager?.appCheckInstance;
      if (!appCheck) {
        try {
          const provider = new ReCaptchaEnterpriseProvider(config.recaptchaSiteKey);
          appCheck = initializeAppCheck(app, {
            provider: provider,
            isTokenAutoRefreshEnabled: true
          });
        } catch (acInitErr) {
          appCheck = window.VertexManager?.appCheckInstance;
        }
      }
      appendLog('• ReCaptchaEnterpriseProvider 연결 완료 (' + config.recaptchaSiteKey.substring(0, 8) + '...)');

      appendLog('• 구글 서버로 토큰 강제 발급(forceRefresh=true) 요청 중...');
      const tokenResult = await getToken(appCheck, true);
      token = tokenResult?.token;
      if (!token) {
        appendLog('❌ 토큰이 반환되지 않았습니다 (null).');
        return;
      }
      appendLog(`✅ App Check 토큰 발급 성공!\n  길이: ${token.length}자\n  미리보기: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    } catch (err) {
      appendLog(`❌ 토큰 발급 실패: ${err.message}`);
      return;
    }

    // [3단계] JWT 클레임 디코딩 분석
    appendLog('\n--- [3] 토큰(JWT) 내부 클레임 역추적 분석 ---');
    const claims = parseJwt(token);
    if (!claims) {
      appendLog('⚠️ 토큰이 일반적인 JWT 형식이 아니거나 디코딩할 수 없습니다.');
    } else {
      appendLog(`• 발급자 (iss): ${claims.iss || 'N/A'}`);
      appendLog(`• 대상 앱 ID (sub): ${claims.sub || 'N/A'}`);
      appendLog(`• 대상 프로젝트 (aud): ${JSON.stringify(claims.aud || [])}`);
      appendLog(`• 발급 시간 (iat): ${new Date((claims.iat || 0) * 1000).toLocaleString()}`);
      appendLog(`• 만료 시간 (exp): ${new Date((claims.exp || 0) * 1000).toLocaleString()}`);

      if (claims.sub) {
        appendLog(`\n👉 토큰의 대상 App ID: [${claims.sub}]`);
        if (config.appId && claims.sub !== config.appId) {
          appendLog(`⚠️ [불일치 경고] 설정의 App ID(${config.appId})와 토큰의 sub(${claims.sub})가 일치하지 않습니다!`);
        }
      }
    }

    // [4단계] 실제 Vertex AI 엔드포인트 REST 직결 테스트
    appendLog('\n--- [4] Google Vertex AI 엔드포인트 실제 직결 테스트 ---');
    const cleanModel = 'gemini-2.5-flash';
    const testUrl = `https://firebasevertexai.googleapis.com/v1beta/projects/${config.projectId}/locations/global/publishers/google/models/${cleanModel}:generateContent?key=${config.apiKey}`;
    appendLog(`• 호출 URL: ${testUrl.replace(config.apiKey, '***')}`);

    const payload = {
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      generationConfig: { maxOutputTokens: 5 }
    };

    try {
      appendLog('• X-Firebase-AppCheck 헤더를 포함하여 요청 전송 중...');
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': token
        },
        body: JSON.stringify(payload)
      });

      appendLog(`• HTTP 응답 상태: ${res.status} ${res.statusText}`);
      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        appendLog('🎉 [대성공!] Vertex AI가 App Check 토큰을 완벽하게 수락했습니다!');
        appendLog(`• 모델 응답: ${JSON.stringify(resData.candidates?.[0]?.content?.parts?.[0]?.text || 'OK')}`);
      } else {
        appendLog('❌ [거절됨] Vertex AI 서버 오류 응답:');
        appendLog(JSON.stringify(resData, null, 2));

        const errMsg = resData.error?.message || '';
        if (errMsg.includes('Firebase App Check token is invalid')) {
          appendLog('\n🔎 [정밀 진단 결론]');
          appendLog('1. reCAPTCHA Enterprise 콘솔에 등록된 키와 Firebase 콘솔 [App Check] 탭의 [reCAPTCHA Enterprise] 등록 항목이 서로 다른 프로젝트이거나,');
          appendLog('2. Firebase 콘솔 [App Check] 탭에 등록된 Web App ID가 현재 앱의 App ID와 다릅니다.');
          appendLog('3. Firebase 콘솔 ➔ 빌드 ➔ App Check ➔ Apps 탭에서 현재 Web 앱이 reCAPTCHA Enterprise로 등록되어 있는지 확인해 주세요.');
        }
      }
    } catch (fetchErr) {
      appendLog(`❌ 네트워크/통신 오류: ${fetchErr.message}`);
    }

    appendLog('\n=== 🏁 진단 완료 ===');
  });
})();
