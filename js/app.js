/**
 * ABOUT ME - Core Application & Navigation Stack Manager
 */

// 1. 뒤로가기 제스처 1단계 정밀 제어 관리자 (History Stack Manager)
const NavStack = {
  stack: [],

  init() {
    // 최초 상태 저장
    history.replaceState({ depth: 0, view: 'landing' }, '');

    window.addEventListener('popstate', (e) => {
      if (this.stack.length > 0) {
        // 스택에 열려있는 모달/서랍/오버레이가 있다면 가장 최근 것 하나만 닫기
        const topItem = this.stack.pop();
        if (typeof topItem.onClose === 'function') {
          topItem.onClose();
        }
      } else {
        // 스택에 요소가 없고 대화방 화면인 경우 -> 랜딩 화면으로 1단계 복귀
        if (Router.currentView !== 'landing') {
          Router.navigate('landing', false);
        }
      }
    });
  },

  // 모달, 서랍 등이 열릴 때 스택에 푸시
  push(item) {
    history.pushState({ depth: history.state ? history.state.depth + 1 : 1, id: item.id }, '');
    this.stack.push(item);
  },

  // 프로그램적으로 닫힐 때 수동 스택 팝
  pop() {
    if (this.stack.length > 0) {
      this.stack.pop();
      history.back();
    }
  }
};

// 2. 화면 전환 라우터 (Router)
const Router = {
  currentView: 'landing',

  views: {
    landing: document.getElementById('view-landing'),
    psychology: document.getElementById('view-psychology'),
    saju: document.getElementById('view-saju')
  },

  headers: {
    header1: document.getElementById('header-1'),
    header2: document.getElementById('header-2'),
    title: document.getElementById('header-title')
  },

  navigate(viewName, pushHistory = true) {
    if (!this.views[viewName]) return;

    // 모든 뷰 비활성화
    Object.values(this.views).forEach(view => {
      view.classList.remove('active');
      view.classList.add('hidden');
    });

    // 대상 뷰 활성화
    const target = this.views[viewName];
    target.classList.remove('hidden');
    // 리플로우 강제 후 active 추가로 부드러운 전환 보장
    void target.offsetWidth;
    target.classList.add('active');

    this.currentView = viewName;

    // 헤더 상태 동기화
    this.updateHeaders(viewName);

    if (pushHistory && viewName !== 'landing') {
      history.pushState({ depth: (history.state ? history.state.depth : 0) + 1, view: viewName }, '');
    }
  },

  updateHeaders(viewName) {
    if (viewName === 'landing') {
      this.headers.header1.classList.add('hidden');
      this.headers.header2.classList.add('hidden');
    } else if (viewName === 'psychology') {
      this.headers.header1.classList.remove('hidden');
      this.headers.header2.classList.add('hidden');
      this.headers.title.textContent = '𝗔𝗕𝗢𝗨𝗧 𝗠𝗘'; // 심리학에서도 항상 로고 고정
    } else if (viewName === 'saju') {
      this.headers.header1.classList.remove('hidden');
      this.headers.header2.classList.remove('hidden');
      this.headers.title.textContent = '𝗔𝗕𝗢𝗨𝗧 𝗠𝗘'; // 명리학에서도 항상 로고 고정
    }
  }
};

// 5. 모바일 가상 키보드 자석 고정 관리자 (KeyboardViewportManager)
const KeyboardViewportManager = {
  container: document.getElementById('app-container'),

  init() {
    if (!window.visualViewport) return;

    const onResize = () => {
      // visualViewport 높이에 맞춰 컨테이너의 가시 영역을 정확히 일치시킴
      const currentHeight = window.visualViewport.height;
      this.container.style.height = `${currentHeight}px`;

      // 활성화된 대화방의 스크롤을 맨 아래로 자연스럽게 유지
      const activeChatScroll = document.querySelector('.view-section.active .chat-messages-container');
      if (activeChatScroll) {
        activeChatScroll.scrollTop = activeChatScroll.scrollHeight;
      }
    };

    window.visualViewport.addEventListener('resize', onResize);
    window.visualViewport.addEventListener('scroll', onResize);
  }
};

// 7. 명리학 명식 관리 및 다중 누적 첨부 (SajuManager)
const SajuManager = {
  attachedProfiles: [], // 현재 입력창에 첨부된 명식 목록 [{id, name, imageData}]
  tempImageData: null,

  // IndexedDB로부터 명식 목록 화면 렌더링
  async renderProfilesList() {
    const listEl = document.getElementById('saju-profiles-list');
    if (!listEl) return;

    const profiles = await DB.getAll('saju_profiles');
    if (!profiles || profiles.length === 0) {
      listEl.innerHTML = '<div class="empty-list-notice">등록된 명식이 없습니다.<br>\'+\' 버튼으로 만세력을 추가하세요.</div>';
      return;
    }

    listEl.innerHTML = '';
    profiles.forEach(p => {
      const item = document.createElement('div');
      item.className = 'saju-profile-item';
      // '만세력 첨부 +' 촌스러운 텍스트 완전 제거 (순수 이름만 미니멀 렌더링)
      item.innerHTML = `<span class="saju-item-name">${p.name}</span>`;

      // [핵심] 인물을 터치할 때 서랍을 닫지 않고 입력창에 누적 첨부!
      item.addEventListener('click', () => {
        this.attachProfile(p);
      });

      listEl.appendChild(item);
    });
  },

  // 입력창에 명식 태그 누적 첨부
  attachProfile(profile) {
    this.attachedProfiles.push(profile);
    this.renderAttachedTags();
  },

  // 첨부된 태그 제거
  removeProfile(index) {
    this.attachedProfiles.splice(index, 1);
    this.renderAttachedTags();
  },

  // 입력창 상단 태그 칩 렌더링
  renderAttachedTags() {
    const container = document.getElementById('saju-attached-tags');
    if (!container) return;

    if (this.attachedProfiles.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = '';

    this.attachedProfiles.forEach((p, idx) => {
      const chip = document.createElement('div');
      chip.className = 'saju-tag-chip';
      chip.innerHTML = `
        <span>[${p.name}]의 만세력</span>
        <button type="button" class="saju-tag-remove" data-index="${idx}">✕</button>
      `;
      container.appendChild(chip);
    });

    // 태그 제거 클릭 이벤트 바인딩
    container.querySelectorAll('.saju-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        this.removeProfile(idx);
      });
    });
  },

  // 새 명식 등록 처리 (Base64 변환 후 저장)
  async saveNewProfile(name, base64Data) {
    if (!name || !base64Data) return false;
    await DB.set('saju_profiles', {
      name: name.trim(),
      imageData: base64Data,
      createdAt: Date.now()
    });
    await this.renderProfilesList();
    return true;
  }
};

// 8. 경량 마크다운 파서 & 보고서 감지 엔진 (MarkdownParser)
const MarkdownParser = {
  parse(text) {
    if (!text) return '';

    // HTML 특수문자 이스케이프
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. 인용구 (> 문장) 처리 - 다크 웜톤 박스
    html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
    // 연속된 blockquote 병합
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // 2. 볼드체 (**텍스트**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. 이탤릭 (*텍스트*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 4. 줄바꿈 (\n)
    html = html.replace(/\n/g, '<br>');

    return html;
  },

  // 보고서 태그 분리 및 검출
  extractReport(rawText) {
    const reportRegex = /\[REPORT_START\]([\s\S]*?)\[REPORT_END\]/;
    const match = rawText.match(reportRegex);

    if (match) {
      return {
        hasReport: true,
        reportContent: match[1].trim(),
        chatContent: rawText.replace(reportRegex, '').trim()
      };
    }
    return {
      hasReport: false,
      reportContent: '',
      chatContent: rawText
    };
  }
};

// 10. AI 멀티모달 통신 엔진 (AIEngine)
const AIEngine = {
  // Base64 Data URL에서 MIME 타입과 순수 바이너리 데이터 추출
  extractBase64(dataUrl) {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], data: matches[2] };
    }
    return { mimeType: 'image/jpeg', data: dataUrl };
  },

  // 멀티모달 페이로드 빌더 (프라이버시 엄수: 이름 제외, 이미지만 패키징)
  buildContents(history, userText, attachedProfiles = []) {
    const contents = [];

    // 이전 대화 내역 포맷팅
    history.forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    // 현재 사용자 턴 조립
    const currentParts = [];

    // [핵심] 첨부된 명식 이미지가 있는 경우 이름은 완전히 제외하고 순수 이미지 바이너리만 첨부
    if (attachedProfiles && attachedProfiles.length > 0) {
      attachedProfiles.forEach(profile => {
        const { mimeType, data } = this.extractBase64(profile.imageData);
        currentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
      });
    }

    // 사용자 텍스트 질문 추가
    currentParts.push({ text: userText });
    contents.push({ role: 'user', parts: currentParts });

    return contents;
  },

  // AI 응답 요청 실행
  async sendRequest({ category, userText, history, attachedProfiles, onChunk, onComplete, onError }) {
    try {
      // 1. 설정 및 프롬프트 로드
      const geminiSetting = await DB.get('settings', 'gemini_api_key');
      const generalSetting = await DB.get('settings', 'general_settings');
      const promptData = await DB.get('prompts', category);

      const apiKey = geminiSetting?.value?.trim();
      const outputMode = generalSetting?.outputMode || 'stream';
      const systemInstruction = promptData?.content?.trim() || '';

      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다. 좌측 서랍의 [설정] 메뉴에서 API 키를 먼저 입력해 주세요.');
      }

      // 2. 페이로드 생성
      const contents = this.buildContents(history, userText, attachedProfiles);
      const payload = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      // 3. 모드별 API 엔드포인트 분기 (스트리밍 vs 일시 출력)
      const modelName = 'gemini-1.5-flash';
      const endpoint = outputMode === 'stream'
        ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `통신 오류 (상태 코드: ${response.status})`);
      }

      // 4-A. 일시 출력 (Batch) 방식
      if (outputMode === 'batch') {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성하지 못했습니다.';
        if (onComplete) onComplete(text);
        return;
      }

      // 4-B. 스트리밍 (Stream SSE) 방식
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 미완성된 마지막 줄 보존

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.substring(6);
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunk) {
                accumulatedText += chunk;
                if (onChunk) onChunk(accumulatedText, chunk);
              }
            } catch (err) {
              // 불완전 JSON 패킷 무시
            }
          }
        }
      }

      if (onComplete) onComplete(accumulatedText);

    } catch (error) {
      console.error('[AIEngine 오류]:', error);
      if (onError) onError(error.message || '요청 처리 중 오류가 발생했습니다.');
    }
  }
};

// 9. 전체화면 보고서 오버레이 관리자 (ReportController)
const ReportController = {
  view: document.getElementById('report-fullscreen-view'),
  body: document.getElementById('report-body-content'),
  isOpen: false,

  open(reportRawText) {
    if (this.isOpen) return;
    this.isOpen = true;

    // 보고서 마크다운 파싱 렌더링
    this.body.innerHTML = MarkdownParser.parse(reportRawText);
    this.view.classList.remove('hidden');

    // 뒤로가기 스택에 보고서 닫기 등록 (모바일 뒤로가기 시 1단계 닫힘 보장)
    NavStack.push({
      id: 'report-fullscreen-view',
      onClose: () => this.close(false)
    });
  },

  close(triggerBack = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.view.classList.add('hidden');
    this.body.innerHTML = '';

    if (triggerBack) {
      NavStack.pop();
    }
  }
};

// 13. Firestore 1MB 슬라이스 분할 백업/복원 엔진 (CloudBackupManager)
const CloudBackupManager = {
  // 사용자가 입력한 Firebase Config 텍스트에서 projectId와 apiKey 추출
  parseFirebaseConfig(configStr) {
    if (!configStr) return null;
    try {
      // 1. 순수 JSON 형식 시도
      const parsed = JSON.parse(configStr);
      if (parsed.projectId && parsed.apiKey) return parsed;
    } catch (e) {
      // 2. JS 객체 리터럴 형식 정규식 추출 시도
      const projectIdMatch = configStr.match(/projectId\s*:\s*["']([^"']+)["']/);
      const apiKeyMatch = configStr.match(/apiKey\s*:\s*["']([^"']+)["']/);
      if (projectIdMatch && apiKeyMatch) {
        return {
          projectId: projectIdMatch[1],
          apiKey: apiKeyMatch[1]
        };
      }
    }
    return null;
  },

  // 전체 IndexedDB 데이터 패키징 (API 설정, 프롬프트, 명식 이미지, 대화 내역 전체)
  async exportFullDatabase() {
    const dump = {
      prompts: await DB.getAll('prompts'),
      settings: await DB.getAll('settings'),
      saju_profiles: await DB.getAll('saju_profiles'),
      chat_sessions: await DB.getAll('chat_sessions'),
      chat_messages: await DB.getAll('chat_messages'),
      exportedAt: Date.now()
    };
    return JSON.stringify(dump);
  },

  // 1MB 제한 극복: 문자열을 800KB(약 800,000자) 안전 크기로 분할
  sliceIntoChunks(str, chunkSize = 750000) {
    const chunks = [];
    let i = 0;
    while (i < str.length) {
      chunks.push(str.slice(i, i + chunkSize));
      i += chunkSize;
    }
    return chunks;
  },

  // 클라우드 백업 실행
  async backup() {
    const firestoreSetting = await DB.get('settings', 'firestore_config');
    const config = this.parseFirebaseConfig(firestoreSetting?.value);

    if (!config || !config.projectId || !config.apiKey) {
      alert('Firestore 설정이 비어있거나 올바르지 않습니다.\n좌측 서랍 ➔ [설정] ➔ [Firestore] 탭에 Firebase Config를 먼저 입력해 주세요.');
      return;
    }

    const backupKey = prompt('백업에 사용할 고유 복원 코드(비밀번호)를 입력하세요.\n(다른 기기에서 이 코드로 복원합니다):');
    if (!backupKey || !backupKey.trim()) return;
    const cleanKey = encodeURIComponent(backupKey.trim());

    try {
      // 1. 전체 로컬 DB 패키징 및 슬라이스 분할
      const fullJson = await this.exportFullDatabase();
      const chunks = this.sliceIntoChunks(fullJson);
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

      // 2. 메타데이터 문서 저장
      const metaUrl = `${baseUrl}/about_me_backups/${cleanKey}?key=${config.apiKey}`;
      const metaPayload = {
        fields: {
          totalChunks: { integerValue: chunks.length.toString() },
          totalBytes: { integerValue: fullJson.length.toString() },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      };

      const metaRes = await fetch(metaUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaPayload)
      });

      if (!metaRes.ok) {
        throw new Error(`메타데이터 저장 실패 (상태 코드: ${metaRes.status})`);
      }

      // 3. 분할된 청크 순차 업로드
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkUrl = `${baseUrl}/about_me_backups/${cleanKey}/chunks/part_${idx}?key=${config.apiKey}`;
        const chunkPayload = {
          fields: {
            chunkIndex: { integerValue: idx.toString() },
            data: { stringValue: chunks[idx] }
          }
        };

        const chunkRes = await fetch(chunkUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunkPayload)
        });

        if (!chunkRes.ok) {
          throw new Error(`청크 ${idx + 1}/${chunks.length} 업로드 실패`);
        }
      }

      alert(`✅ 백업이 성공적으로 완료되었습니다!\n총 ${chunks.length}개의 조각으로 안전하게 분할 저장되었습니다.\n복원 코드: ${backupKey.trim()}`);
    } catch (err) {
      console.error('[백업 오류]:', err);
      alert(`⚠️ 백업 실패: ${err.message}`);
    }
  },

  // 클라우드 복원 실행
  async restore() {
    const firestoreSetting = await DB.get('settings', 'firestore_config');
    const config = this.parseFirebaseConfig(firestoreSetting?.value);

    if (!config || !config.projectId || !config.apiKey) {
      alert('Firestore 설정이 비어있거나 올바르지 않습니다.\n좌측 서랍 ➔ [설정] ➔ [Firestore] 탭에 Firebase Config를 먼저 입력해 주세요.');
      return;
    }

    const backupKey = prompt('복원할 백업 고유 코드(비밀번호)를 입력하세요:');
    if (!backupKey || !backupKey.trim()) return;
    const cleanKey = encodeURIComponent(backupKey.trim());

    try {
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

      // 1. 메타데이터 조회
      const metaUrl = `${baseUrl}/about_me_backups/${cleanKey}?key=${config.apiKey}`;
      const metaRes = await fetch(metaUrl);

      if (!metaRes.ok) {
        throw new Error('해당 복원 코드의 백업 데이터를 찾을 수 없습니다.');
      }

      const metaData = await metaRes.json();
      const totalChunks = parseInt(metaData.fields?.totalChunks?.integerValue || '1', 10);

      // 2. 분할 청크 순차 다운로드 및 병합
      let reconstructedJson = '';
      for (let idx = 0; idx < totalChunks; idx++) {
        const chunkUrl = `${baseUrl}/about_me_backups/${cleanKey}/chunks/part_${idx}?key=${config.apiKey}`;
        const chunkRes = await fetch(chunkUrl);

        if (!chunkRes.ok) {
          throw new Error(`청크 ${idx + 1}/${totalChunks} 복원 실패`);
        }

        const chunkData = await chunkRes.json();
        const partText = chunkData.fields?.data?.stringValue || '';
        reconstructedJson += partText;
      }

      // 3. JSON 역직렬화 및 IndexedDB 트랜잭션 복원
      const restored = JSON.parse(reconstructedJson);

      if (restored.prompts) {
        for (const item of restored.prompts) await DB.set('prompts', item);
      }
      if (restored.settings) {
        for (const item of restored.settings) await DB.set('settings', item);
      }
      if (restored.saju_profiles) {
        for (const item of restored.saju_profiles) await DB.set('saju_profiles', item);
      }
      if (restored.chat_sessions) {
        for (const item of restored.chat_sessions) await DB.set('chat_sessions', item);
      }
      if (restored.chat_messages) {
        for (const item of restored.chat_messages) await DB.set('chat_messages', item);
      }

      // 4. UI 최신화
      await SajuManager.renderProfilesList();
      await SessionManager.renderSessionList('psychology');
      await SessionManager.renderSessionList('saju');

      alert('🎉 모든 데이터(API 설정, 프롬프트, 만세력 사진, 대화 기록)가 완벽하게 복원되었습니다!');
      location.reload(); // 복원된 최신 환경으로 완전 새로고침
    } catch (err) {
      console.error('[복원 오류]:', err);
      alert(`⚠️ 복원 실패: ${err.message}`);
    }
  }
};

// 12. 대화 세션 및 기록 저장소 관리자 (SessionManager)
const SessionManager = {
  // 날짜/시각 기반 기본 세션 제목 생성 (예: 2025. 05. 15. 14:30 대화)
  generateDefaultTitle() {
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    return `${m}.${d} ${h}:${min} 대화`;
  },

  // 새 세션 생성
  async createNewSession(category) {
    const sessionId = `session_${category}_${Date.now()}`;
    const newSession = {
      id: sessionId,
      category: category,
      title: this.generateDefaultTitle(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await DB.set('chat_sessions', newSession);
    await this.renderSessionList(category);
    return newSession;
  },

  // 특정 세션으로 대화방 전환 및 메시지 복원
  async loadSession(sessionId) {
    const session = await DB.get('chat_sessions', sessionId);
    if (!session) return;

    ChatManager.currentSessionId = session.id;
    ChatManager.activeHistory = [];

    const isPsychology = session.category === 'psychology';
    const containerId = isPsychology ? 'psychology-chat-messages' : 'saju-chat-messages';
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 화면 전환
    Router.navigate(session.category);

    // 해당 세션의 모든 메시지 가져오기
    const messages = await DB.getByIndex('chat_messages', 'sessionId', sessionId);
    messages.sort((a, b) => a.timestamp - b.timestamp);

    messages.forEach(msg => {
      ChatUI.appendMessage(containerId, msg.role, msg.content, msg.id);
      ChatManager.activeHistory.push({ role: msg.role, content: msg.content });
    });

    await this.renderSessionList(session.category);
  },

  // 메시지 1건을 DB에 영구 저장
  async saveMessage(sessionId, role, content) {
    if (!sessionId) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await DB.set('chat_messages', {
      id: msgId,
      sessionId: sessionId,
      role: role,
      content: content,
      timestamp: Date.now()
    });

    // 세션 갱신일 업데이트
    const session = await DB.get('chat_sessions', sessionId);
    if (session) {
      session.updatedAt = Date.now();
      await DB.set('chat_sessions', session);
    }
  },

  // 좌측 서랍 내 세션 리스트 렌더링
  async renderSessionList(category) {
    const listEl = document.getElementById(category === 'psychology' ? 'psychology-chat-list' : 'saju-chat-list');
    if (!listEl) return;

    const allSessions = await DB.getAll('chat_sessions');
    const filtered = allSessions
      .filter(s => s.category === category)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-list-notice">기록된 대화가 없습니다.</div>';
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach(session => {
      const item = document.createElement('div');
      item.className = `chat-session-item ${session.id === ChatManager.currentSessionId ? 'active' : ''}`;
      
      const dateStr = new Date(session.updatedAt).toLocaleDateString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      item.innerHTML = `
        <div class="session-info">
          <span class="session-title">${session.title}</span>
          <span class="session-date">${dateStr}</span>
        </div>
        <div class="session-actions">
          <button type="button" class="session-action-btn btn-edit-title" title="제목 수정">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
          </button>
          <button type="button" class="session-action-btn btn-delete-session" title="대화 삭제">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // 대화방 불러오기 클릭
      item.querySelector('.session-info').addEventListener('click', () => {
        DrawerController.closeLeft(true);
        this.loadSession(session.id);
      });

      // 제목 수정 클릭
      item.querySelector('.btn-edit-title').addEventListener('click', async (e) => {
        e.stopPropagation();
        const newTitle = prompt('대화방 제목을 입력하세요:', session.title);
        if (newTitle && newTitle.trim()) {
          session.title = newTitle.trim();
          session.isCustomTitle = true; // 사용자가 직접 수정한 제목 표시 플래그
          session.updatedAt = Date.now();
          await DB.set('chat_sessions', session);
          await this.renderSessionList(category);
        }
      });

      // 대화방 삭제 클릭
      item.querySelector('.btn-delete-session').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('이 대화 기록을 완전히 삭제하시겠습니까?')) {
          // 세션 및 메시지 DB 삭제
          await DB.delete('chat_sessions', session.id);
          const msgs = await DB.getByIndex('chat_messages', 'sessionId', session.id);
          for (const m of msgs) {
            await DB.delete('chat_messages', m.id);
          }

          // 현재 열려있던 대화방이면 새 대화로 초기화
          if (ChatManager.currentSessionId === session.id) {
            startFreshChat(category);
          } else {
            await this.renderSessionList(category);
          }
        }
      });

      listEl.appendChild(item);
    });
  }
};

// 11. 대화 세션 및 메시지 송수신 매니저 (ChatManager)
const ChatManager = {
  currentSessionId: null,
  activeHistory: [],
  isGenerating: false,

  // 메시지 전송 프로세스
  async sendMessage(category) {
    if (this.isGenerating) return;

    const isPsychology = category === 'psychology';
    const inputEl = document.getElementById(isPsychology ? 'psychology-input' : 'saju-input');
    const sendBtn = document.getElementById(isPsychology ? 'btn-send-psychology' : 'btn-send-saju');
    const containerId = isPsychology ? 'psychology-chat-messages' : 'saju-chat-messages';

    const text = inputEl.value.trim();
    const attachedProfiles = isPsychology ? [] : [...SajuManager.attachedProfiles];

    // 입력값 유효성 검사 (명리학의 경우 이미지만 첨부하고 질문하는 것도 허용)
    if (!text && attachedProfiles.length === 0) return;

    // 1. 전송 UI 상태 잠금
    this.isGenerating = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    // 활성 세션이 없으면 자동 생성
    if (!this.currentSessionId) {
      const newSession = await SessionManager.createNewSession(category);
      this.currentSessionId = newSession.id;
    }

    // 2. 사용자 말풍선 표시 및 DB 영구 저장
    let displayUserText = text;
    if (!isPsychology && attachedProfiles.length > 0) {
      const tagPrefix = attachedProfiles.map(p => `[${p.name}의 만세력]`).join(' ');
      displayUserText = `${tagPrefix}\n${text}`.trim();
    }
    const userMsgId = `msg_${Date.now()}_u`;
    ChatUI.appendMessage(containerId, 'user', displayUserText, userMsgId);
    await DB.set('chat_messages', {
      id: userMsgId,
      sessionId: this.currentSessionId,
      role: 'user',
      content: displayUserText,
      timestamp: Date.now()
    });

    // [핵심] 첫 질문일 때: 사용자가 제목을 수정한 적 없다면 첫 질문을 바탕으로 세션 제목 자동 업데이트 (AI Studio 스타일)
    const currentSession = await DB.get('chat_sessions', this.currentSessionId);
    if (currentSession && !currentSession.isCustomTitle && this.activeHistory.length === 0) {
      const autoTitle = text.slice(0, 18).trim() + (text.length > 18 ? '...' : '');
      if (autoTitle) {
        currentSession.title = autoTitle;
        await DB.set('chat_sessions', currentSession);
        await SessionManager.renderSessionList(category);
      }
    }

    // 3. 첨부 태그 컨테이너 초기화 (전송 완료 후 비우기)
    if (!isPsychology) {
      SajuManager.attachedProfiles = [];
      SajuManager.renderAttachedTags();
    }

    // 4. AI 답변 말풍선 미리 생성 (로딩/스트리밍 표시용)
    const modelBubble = ChatUI.appendMessage(containerId, 'model', '생각하는 중...');
    let hasScrolledToTop = false;

    // 5. AI 통신 호출
    await AIEngine.sendRequest({
      category: category,
      userText: text || '만세력을 바탕으로 사주를 분석해 주세요.',
      history: this.activeHistory,
      attachedProfiles: attachedProfiles,

      // 스트리밍 청크 수신 시
      onChunk: (accumulatedText) => {
        // [요구사항] AI 응답이 생성되기 시작하면 말풍선을 화면 최상단으로 주욱 올리는 애니메이션 1회 실행
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
          hasScrolledToTop = true;
        }

        const extracted = MarkdownParser.extractReport(accumulatedText);
        modelBubble.innerHTML = MarkdownParser.parse(extracted.chatContent || '답변 작성 중...');
      },

      // 통신 완료 시 (일시 출력 & 스트리밍 완료 공통)
      onComplete: async (finalText) => {
        // 일시 출력 모드일 때 스크롤 애니메이션 실행
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
        }

        // 최종 마크다운 및 보고서 카드 렌더링
        const extracted = MarkdownParser.extractReport(finalText);
        modelBubble.innerHTML = MarkdownParser.parse(extracted.chatContent || '');

        if (extracted.hasReport) {
          const reportCard = document.createElement('div');
          reportCard.className = 'report-card-summary';
          reportCard.innerHTML = `
            <div class="report-card-info">
              <span class="report-card-title">심층 분석 보고서</span>
              <span class="report-card-desc">전문 분석 결과가 도착했습니다.</span>
            </div>
            <button type="button" class="btn-open-report">분석 보고서 열기</button>
          `;
          reportCard.querySelector('.btn-open-report').addEventListener('click', () => {
            ReportController.open(extracted.reportContent);
          });
          modelBubble.appendChild(reportCard);
        }

        // 메모리 히스토리 업데이트 및 DB 영구 저장
        this.activeHistory.push({ role: 'user', content: displayUserText });
        this.activeHistory.push({ role: 'model', content: finalText });

        const modelMsgId = `msg_${Date.now()}_m`;
        modelBubble.dataset.msgId = modelMsgId;
        await DB.set('chat_messages', {
          id: modelMsgId,
          sessionId: this.currentSessionId,
          role: 'model',
          content: finalText,
          timestamp: Date.now()
        });

        // 세션 갱신일 업데이트 및 목록 새로고침
        const sess = await DB.get('chat_sessions', this.currentSessionId);
        if (sess) {
          sess.updatedAt = Date.now();
          await DB.set('chat_sessions', sess);
        }
        await SessionManager.renderSessionList(category);

        // 잠금 해제
        this.isGenerating = false;
        sendBtn.disabled = false;
      },

      // 오류 발생 시
      onError: (errMsg) => {
        modelBubble.innerHTML = `<span style="color: #9C413D;">⚠️ ${errMsg}</span>`;
        this.isGenerating = false;
        sendBtn.disabled = false;
      }
    });
  }
};

// 6. 대화 UI 헬퍼 및 자동 스크롤 (ChatUI)
const ChatUI = {
  // 메시지 말풍선 화면 추가 (수정/삭제 액션 버튼 및 인라인 편집 탑재)
  appendMessage(containerId, role, rawContent, msgId = null, isGreeting = false) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    if (msgId) bubble.dataset.msgId = msgId;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bubble-text-content';

    let currentRaw = rawContent;

    const renderInnerContent = () => {
      if (role === 'model') {
        const extracted = MarkdownParser.extractReport(currentRaw);
        contentDiv.innerHTML = MarkdownParser.parse(extracted.chatContent || '');

        if (extracted.hasReport) {
          const reportCard = document.createElement('div');
          reportCard.className = 'report-card-summary';
          reportCard.innerHTML = `
            <div class="report-card-info">
              <span class="report-card-title">심층 분석 보고서</span>
              <span class="report-card-desc">전문 분석 결과가 도착했습니다.</span>
            </div>
            <button type="button" class="btn-open-report">분석 보고서 열기</button>
          `;
          reportCard.querySelector('.btn-open-report').addEventListener('click', () => {
            ReportController.open(extracted.reportContent);
          });
          contentDiv.appendChild(reportCard);
        }
      } else {
        contentDiv.innerHTML = MarkdownParser.parse(currentRaw);
      }
    };

    renderInnerContent();
    bubble.appendChild(contentDiv);

    // 시스템 첫 인사말이 아닐 때만 수정/삭제 버튼 제공
    if (!isGreeting) {
      const actionBar = document.createElement('div');
      actionBar.className = 'bubble-action-bar';
      actionBar.innerHTML = `
        <button type="button" class="bubble-action-btn btn-edit-msg" title="메시지 수정">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line"><path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
        </button>
        <button type="button" class="bubble-action-btn btn-delete-msg" title="메시지 삭제">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>
        </button>
      `;

      // 수정 클릭 시 인라인 텍스트에어리어 전환
      actionBar.querySelector('.btn-edit-msg').addEventListener('click', () => {
        contentDiv.classList.add('hidden');
        actionBar.classList.add('hidden');

        const editForm = document.createElement('div');
        editForm.className = 'bubble-edit-form';
        editForm.innerHTML = `
          <textarea class="bubble-edit-textarea">${currentRaw}</textarea>
          <div class="bubble-edit-actions">
            <button type="button" class="btn-bubble-cancel">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              <span>취소</span>
            </button>
            <button type="button" class="btn-bubble-confirm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
              <span>확인</span>
            </button>
          </div>
        `;

        // 취소 클릭
        editForm.querySelector('.btn-bubble-cancel').addEventListener('click', () => {
          editForm.remove();
          contentDiv.classList.remove('hidden');
          actionBar.classList.remove('hidden');
        });

        // 확인 클릭: DB 저장 및 다음 Payload에 완벽 반영
        editForm.querySelector('.btn-bubble-confirm').addEventListener('click', async () => {
          const updatedText = editForm.querySelector('.bubble-edit-textarea').value.trim();
          if (!updatedText) return;

          currentRaw = updatedText;
          renderInnerContent();

          // 1. IndexedDB 업데이트
          if (msgId) {
            const msgObj = await DB.get('chat_messages', msgId);
            if (msgObj) {
              msgObj.content = updatedText;
              await DB.set('chat_messages', msgObj);
            }
          }

          // 2. [핵심] 활성 메모리 히스토리 동기화 (다음 AI 전송 시 수정본으로 전송!)
          const historyIdx = ChatManager.activeHistory.findIndex(h => h.role === role && h.content === rawContent);
          if (historyIdx !== -1) {
            ChatManager.activeHistory[historyIdx].content = updatedText;
          }

          editForm.remove();
          contentDiv.classList.remove('hidden');
          actionBar.classList.remove('hidden');
        });

        bubble.appendChild(editForm);
      });

      // 삭제 클릭
      actionBar.querySelector('.btn-delete-msg').addEventListener('click', async () => {
        if (confirm('이 메시지를 삭제하시겠습니까?')) {
          if (msgId) {
            await DB.delete('chat_messages', msgId);
          }
          // 메모리 히스토리에서도 즉시 제거
          const historyIdx = ChatManager.activeHistory.findIndex(h => h.role === role && h.content === currentRaw);
          if (historyIdx !== -1) {
            ChatManager.activeHistory.splice(historyIdx, 1);
          }
          bubble.remove();
        }
      });

      bubble.appendChild(actionBar);
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
  },

  // [요구사항] AI의 답변 도착 완료 시 답변 말풍선을 화면 최상단으로 주욱 올리는 부드러운 스크롤 애니메이션
  scrollToMessageTop(bubbleEl) {
    if (!bubbleEl) return;
    const container = bubbleEl.closest('.chat-messages-container');
    if (!container) return;

    // 해당 말풍선의 container 기준 상대 offset 계산
    const bubbleTop = bubbleEl.offsetTop - 12; // 상단 여백 12px 확보
    container.scrollTo({
      top: bubbleTop,
      behavior: 'smooth'
    });
  }
};

// 4. 모달 관리자 & 닫힘 시 일괄 저장 (ModalController)
const ModalController = {
  container: document.getElementById('modal-container'),
  activeModalId: null,

  async open(modalId) {
    if (this.activeModalId) return;

    // 열기 전 DB에서 최신 데이터 로드하여 폼 채우기
    await this.loadFormData(modalId);

    this.activeModalId = modalId;
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    this.container.classList.remove('hidden');
    modalEl.classList.remove('hidden');

    // 암전 활성화 (서랍이 열려있지 않은 경우 암전 활성화)
    DrawerController.backdrop.classList.remove('hidden');
    void DrawerController.backdrop.offsetWidth;
    DrawerController.backdrop.classList.add('active');

    // 뒤로가기 스택에 모달 닫기 등록
    NavStack.push({
      id: modalId,
      onClose: () => this.close(false)
    });
  },

  async close(triggerBack = true) {
    if (!this.activeModalId) return;

    const modalId = this.activeModalId;
    const modalEl = document.getElementById(modalId);

    // [핵심] 모달이 닫히는 바로 이 순간 IndexedDB에 일괄 저장 수행
    await this.saveFormData(modalId);

    if (modalEl) modalEl.classList.add('hidden');
    this.container.classList.add('hidden');
    this.activeModalId = null;

    // 만약 서랍이 열려있지 않다면 암전도 함께 닫기
    if (!DrawerController.isOpenLeft) {
      DrawerController.backdrop.classList.remove('active');
      setTimeout(() => {
        if (!DrawerController.isOpenLeft && !this.activeModalId) {
          DrawerController.backdrop.classList.add('hidden');
        }
      }, 280);
    }

    if (triggerBack) {
      NavStack.pop();
    }
  },

  // 폼 데이터 IndexedDB로부터 로드
  async loadFormData(modalId) {
    try {
      if (modalId === 'modal-prompts') {
        const psychPrompt = await DB.get('prompts', 'psychology');
        const sajuPrompt = await DB.get('prompts', 'saju');
        document.getElementById('prompt-psychology-input').value = psychPrompt?.content || '';
        document.getElementById('prompt-saju-input').value = sajuPrompt?.content || '';
      } else if (modalId === 'modal-settings') {
        const geminiKey = await DB.get('settings', 'gemini_api_key');
        const vertexConfig = await DB.get('settings', 'vertex_config');
        const firestoreConfig = await DB.get('settings', 'firestore_config');
        const general = await DB.get('settings', 'general_settings');

        document.getElementById('setting-gemini-key').value = geminiKey?.value || '';
        document.getElementById('setting-vertex-config').value = vertexConfig?.value || '';
        document.getElementById('setting-firestore-config').value = firestoreConfig?.value || '';

        // 드롭다운 모드 복원
        const outputMode = general?.outputMode || 'stream';
        const labelText = outputMode === 'batch' ? '일시 출력 (답변 완성 후 한번에 표시)' : '스트리밍 출력 (실시간 생성)';
        document.getElementById('dropdown-selected-text').textContent = labelText;
        document.querySelectorAll('#dropdown-output-menu .dropdown-item').forEach(item => {
          item.classList.toggle('selected', item.dataset.value === outputMode);
        });
      }
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    }
  },

  // 폼 데이터 IndexedDB로 최종 일괄 저장 (실시간 타자 중 저장 방지)
  async saveFormData(modalId) {
    try {
      if (modalId === 'modal-prompts') {
        const psychVal = document.getElementById('prompt-psychology-input').value;
        const sajuVal = document.getElementById('prompt-saju-input').value;
        await DB.set('prompts', { id: 'psychology', content: psychVal, updatedAt: Date.now() });
        await DB.set('prompts', { id: 'saju', content: sajuVal, updatedAt: Date.now() });
      } else if (modalId === 'modal-settings') {
        const geminiVal = document.getElementById('setting-gemini-key').value;
        const vertexVal = document.getElementById('setting-vertex-config').value;
        const firestoreVal = document.getElementById('setting-firestore-config').value;
        const selectedItem = document.querySelector('#dropdown-output-menu .dropdown-item.selected');
        const outputMode = selectedItem ? selectedItem.dataset.value : 'stream';

        await DB.set('settings', { id: 'gemini_api_key', value: geminiVal, updatedAt: Date.now() });
        await DB.set('settings', { id: 'vertex_config', value: vertexVal, updatedAt: Date.now() });
        await DB.set('settings', { id: 'firestore_config', value: firestoreVal, updatedAt: Date.now() });
        await DB.set('settings', { id: 'general_settings', outputMode: outputMode, updatedAt: Date.now() });
      } else if (modalId === 'modal-add-saju') {
        // [요구사항] 명식 추가 창이 닫힐 때 이름과 이미지가 있으면 자동 저장!
        const nameInput = document.getElementById('saju-profile-name');
        const name = nameInput ? nameInput.value.trim() : '';
        if (name && SajuManager.tempImageData) {
          await SajuManager.saveNewProfile(name, SajuManager.tempImageData);
          nameInput.value = '';
          const previewContainer = document.getElementById('saju-image-preview');
          if (previewContainer) previewContainer.classList.add('hidden');
          SajuManager.tempImageData = null;
        }
      }
    } catch (e) {
      console.error('데이터 저장 실패:', e);
    }
  }
};

// 3. 서랍 및 오버레이 UI 컨트롤러 (DrawerController)
const DrawerController = {
  leftDrawer: document.getElementById('left-drawer'),
  rightDrawer: document.getElementById('right-saju-drawer'),
  btnToggleSaju: document.getElementById('btn-toggle-saju-drawer'),
  backdrop: document.getElementById('backdrop-overlay'),
  isOpenLeft: false,
  isOpenRight: false,

  openRight() {
    if (this.isOpenRight) return;
    this.isOpenRight = true;
    this.rightDrawer.classList.add('open');
    this.btnToggleSaju.classList.add('open');
    this.rightDrawer.setAttribute('aria-hidden', 'false');

    // 헤더 2 아래부터 암전 적용 클래스 추가
    this.backdrop.classList.add('saju-mode-dim');
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('active');

    // 우측 서랍 열릴 때 최신 명식 목록 자동 로드
    SajuManager.renderProfilesList();

    NavStack.push({
      id: 'right-saju-drawer',
      onClose: () => this.closeRight(false)
    });
  },

  closeRight(triggerBack = true) {
    if (!this.isOpenRight) return;
    this.isOpenRight = false;
    this.rightDrawer.classList.remove('open');
    this.btnToggleSaju.classList.remove('open');
    this.rightDrawer.setAttribute('aria-hidden', 'true');
    this.backdrop.classList.remove('active');

    setTimeout(() => {
      if (!this.isOpenRight && !this.isOpenLeft) {
        this.backdrop.classList.remove('saju-mode-dim');
        this.backdrop.classList.add('hidden');
      }
    }, 280);

    if (triggerBack) {
      NavStack.pop();
    }
  },

  openLeft() {
    if (this.isOpenLeft) return;
    this.isOpenLeft = true;

    // 좌측 서랍 열릴 때 대화 기록 리스트 최신 상태로 갱신
    SessionManager.renderSessionList('psychology');
    SessionManager.renderSessionList('saju');
    this.leftDrawer.classList.add('open');
    this.leftDrawer.setAttribute('aria-hidden', 'false');
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('active');

    // 뒤로가기 스택에 서랍 닫기 등록
    NavStack.push({
      id: 'left-drawer',
      onClose: () => this.closeLeft(false)
    });
  },

  closeLeft(triggerBack = true) {
    if (!this.isOpenLeft) return;
    this.isOpenLeft = false;
    this.leftDrawer.classList.remove('open');
    this.leftDrawer.setAttribute('aria-hidden', 'true');
    this.backdrop.classList.remove('active');

    setTimeout(() => {
      if (!this.isOpenLeft) {
        this.backdrop.classList.add('hidden');
      }
    }, 280);

    if (triggerBack) {
      NavStack.pop();
    }
  }
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // IndexedDB 초기화
  try {
    await DB.init();
  } catch (err) {
    console.error('IndexedDB 로드 오류:', err);
  }

  NavStack.init();
  KeyboardViewportManager.init(); // 가상 키보드 자석 고정 초기화
  Router.navigate('landing', false);

  // 전송 버튼 클릭 바인딩 (엔터키는 전송하지 않고 순수 줄바꿈으로 유지)
  const psychInput = document.getElementById('psychology-input');
  const sajuInput = document.getElementById('saju-input');
  const btnSendPsych = document.getElementById('btn-send-psychology');
  const btnSendSaju = document.getElementById('btn-send-saju');

  if (psychInput && btnSendPsych) {
    btnSendPsych.addEventListener('click', () => ChatManager.sendMessage('psychology'));
  }

  if (sajuInput && btnSendSaju) {
    btnSendSaju.addEventListener('click', () => ChatManager.sendMessage('saju'));
  }

  document.querySelectorAll('.chat-textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });

  // 랜딩 화면 버튼 이벤트 바인딩
  const btnPsychology = document.getElementById('btn-start-psychology');
  const btnSaju = document.getElementById('btn-start-saju');

  // 첫 진입 시 화면 전용 초기 안내 메시지 템플릿 (Payload 전송에는 포함되지 않음)
  const INITIAL_GREETINGS = {
    psychology: `본격적으로 이야기를 시작하기 전에, 가장 편안한 대화 환경부터 맞춰볼게요!\n\n1. 어떤 대화 톤이 편하신가요?\n- 친구처럼 거침없이 반말로 티키타카 하기\n- 적당히 위트 있고 편안한 존댓말 쓰기\n\n2. 대화하는 동안 제가 어떤 호칭(닉네임)으로 불러드리면 좋을까요?\n\n3. 지금 머릿속에 가장 먼저 떠오르는 이야기 하나만 편하게 꺼내주세요!\n(재밌게 본 영화/드라마/유튜브, 친구나 직장에서 겪은 웃기거나 빡쳤던 일화, 나만의 독특한 취미나 덕질, 요즘 느끼는 인간관계의 피로감이나 고민 등... 어떤 이야기든 좋습니다.)`,
    saju: `명리학으로 심층 분석할 만세력과 궁금하신 내용을 함께 전송해주세요!`
  };

  // 새 대화 시작 함수
  const startFreshChat = async (category) => {
    ChatManager.currentSessionId = null;
    ChatManager.activeHistory = [];
    const containerId = category === 'psychology' ? 'psychology-chat-messages' : 'saju-chat-messages';
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    const newSession = await SessionManager.createNewSession(category);
    ChatManager.currentSessionId = newSession.id;
    Router.navigate(category);

    // [요구사항] 대화방 화면에 첫 안내 AI 말풍선 자동 출력 (Payload에는 미포함)
    if (INITIAL_GREETINGS[category]) {
      ChatUI.appendMessage(containerId, 'model', INITIAL_GREETINGS[category], null, true);
    }
  };

  if (btnPsychology) {
    btnPsychology.addEventListener('click', () => startFreshChat('psychology'));
  }

  if (btnSaju) {
    btnSaju.addEventListener('click', () => startFreshChat('saju'));
  }

  // 좌측 서랍 내 '+ 새 대화' 버튼
  const btnNewPsych = document.getElementById('btn-new-psychology-chat');
  const btnNewSaju = document.getElementById('btn-new-saju-chat');

  if (btnNewPsych) {
    btnNewPsych.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      startFreshChat('psychology');
    });
  }

  if (btnNewSaju) {
    btnNewSaju.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      startFreshChat('saju');
    });
  }

  // 좌측 서랍 열기 버튼 (헤더 1 햄버거 버튼)
  const btnOpenLeftDrawer = document.getElementById('btn-open-left-drawer');
  if (btnOpenLeftDrawer) {
    btnOpenLeftDrawer.addEventListener('click', () => {
      DrawerController.openLeft();
    });
  }

  // 암전 오버레이 터치 시: 대화방을 이탈하지 않고 오직 열린 서랍/모달만 닫기
  const backdrop = document.getElementById('backdrop-overlay');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (ModalController.activeModalId) {
        ModalController.close(false); // 라우터 이탈 없이 모달만 안전하게 닫기
      } else if (DrawerController.isOpenRight) {
        DrawerController.closeRight(false); // 서랍만 닫기
      } else if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(false); // 서랍만 닫기
      }
    });
  }

  // 헤더 1 로고 터치 시 어디서든 홈(랜딩 화면)으로 복귀
  const headerLogo = document.getElementById('header-title');
  if (headerLogo) {
    headerLogo.addEventListener('click', () => {
      // 열린 서랍이나 모달이 있다면 닫고
      if (DrawerController.isOpenLeft) DrawerController.closeLeft(false);
      if (DrawerController.isOpenRight) DrawerController.closeRight(false);
      if (ModalController.activeModalId) ModalController.close(false);
      Router.navigate('landing');
    });
  }

  // 헤더 2 '명식 선택하기' 아코디언 버튼 토글
  const btnToggleSaju = document.getElementById('btn-toggle-saju-drawer');
  if (btnToggleSaju) {
    btnToggleSaju.addEventListener('click', () => {
      if (DrawerController.isOpenRight) {
        DrawerController.closeRight(true);
      } else {
        DrawerController.openRight();
      }
    });
  }

  // 명식 서랍 내 '+' 추가 버튼 클릭 시 모달 열기
  const btnOpenAddSaju = document.getElementById('btn-open-add-saju');
  if (btnOpenAddSaju) {
    btnOpenAddSaju.addEventListener('click', () => {
      DrawerController.closeRight(false);
      ModalController.open('modal-add-saju');
    });
  }

  // 이미지 파일 선택 처리
  const fileInput = document.getElementById('saju-image-file');
  const btnSelectImage = document.getElementById('btn-select-saju-image');
  const previewContainer = document.getElementById('saju-image-preview');
  const previewImg = document.getElementById('saju-preview-img');
  const previewFileName = document.getElementById('saju-file-name');

  if (btnSelectImage && fileInput) {
    btnSelectImage.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        SajuManager.tempImageData = event.target.result;
        previewImg.src = event.target.result;
        previewFileName.textContent = file.name;
        previewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  // 명식 등록 저장 버튼 이벤트
  const btnSaveSaju = document.getElementById('btn-save-saju-profile');
  if (btnSaveSaju) {
    btnSaveSaju.addEventListener('click', async () => {
      const nameInput = document.getElementById('saju-profile-name');
      const name = nameInput.value.trim();

      if (!name) {
        alert('이름을 입력해 주세요.');
        return;
      }
      if (!SajuManager.tempImageData) {
        alert('만세력 사진을 선택해 주세요.');
        return;
      }

      await SajuManager.saveNewProfile(name, SajuManager.tempImageData);

      // 입력 필드 초기화
      nameInput.value = '';
      fileInput.value = '';
      previewContainer.classList.add('hidden');
      SajuManager.tempImageData = null;

      // 모달 닫고 우측 서랍 다시 열기
      await ModalController.close(true);
      DrawerController.openRight();
    });
  }

  // 좌측 서랍 하단 툴바 버튼 이벤트 바인딩
  const btnOpenPrompts = document.getElementById('btn-open-prompts-modal');
  if (btnOpenPrompts) {
    btnOpenPrompts.addEventListener('click', () => {
      DrawerController.closeLeft(false); // 서랍 닫고
      ModalController.open('modal-prompts'); // 프롬프트 팝업 열기
    });
  }

  const btnOpenApi = document.getElementById('btn-open-api-modal');
  if (btnOpenApi) {
    btnOpenApi.addEventListener('click', () => {
      DrawerController.closeLeft(false); // 서랍 닫고
      ModalController.open('modal-settings'); // 설정 팝업 열기
    });
  }

  // 클라우드 백업 버튼
  const btnBackup = document.getElementById('btn-cloud-backup');
  if (btnBackup) {
    btnBackup.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      CloudBackupManager.backup();
    });
  }

  // 클라우드 복원 버튼
  const btnRestore = document.getElementById('btn-cloud-restore');
  if (btnRestore) {
    btnRestore.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      CloudBackupManager.restore();
    });
  }

  // 모달 내부 닫기(✕) 버튼 클릭 이벤트
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      ModalController.close(true);
    });
  });

  // 전체화면 보고서 닫기(✕) 버튼 이벤트
  const btnCloseReport = document.getElementById('btn-close-report');
  if (btnCloseReport) {
    btnCloseReport.addEventListener('click', () => {
      ReportController.close(true);
    });
  }

  // 모달 탭 전환 이벤트 바인딩
  document.querySelectorAll('.modal-tabs').forEach(tabGroup => {
    tabGroup.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab-btn');
      if (!tabBtn) return;

      const targetTabId = tabBtn.dataset.tab;
      const modalEl = tabBtn.closest('.app-modal');

      // 탭 버튼 active 토글
      modalEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      // 탭 컨텐츠 전환
      modalEl.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === targetTabId);
        content.classList.toggle('hidden', content.id !== targetTabId);
      });
    });
  });

  // 일반 설정 탭: 커스텀 드롭다운 동작 바인딩
  const dropdownBtn = document.getElementById('dropdown-output-btn');
  const dropdownMenu = document.getElementById('dropdown-output-menu');
  const selectedText = document.getElementById('dropdown-selected-text');

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
      dropdownBtn.classList.toggle('open');
    });

    dropdownMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;

      dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedText.textContent = item.textContent;

      dropdownMenu.classList.add('hidden');
      dropdownBtn.classList.remove('open');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
      dropdownBtn.classList.remove('open');
    });
  }
});
