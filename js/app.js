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
      this.headers.title.textContent = '심리학으로 알아보기';
    } else if (viewName === 'saju') {
      this.headers.header1.classList.remove('hidden');
      this.headers.header2.classList.remove('hidden');
      this.headers.title.textContent = 'ABOUT ME';
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
      item.innerHTML = `
        <span class="saju-item-name">${p.name}</span>
        <span class="saju-item-badge">만세력 첨부 +</span>
      `;

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

// 6. 대화 UI 헬퍼 및 자동 스크롤 (ChatUI)
const ChatUI = {
  // 메시지 말풍선 화면 추가 (마크다운 및 보고서 감지 적용)
  appendMessage(containerId, role, rawContent) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    if (role === 'model') {
      const extracted = MarkdownParser.extractReport(rawContent);

      // 일반 대화 내용 파싱 렌더링
      if (extracted.chatContent) {
        bubble.innerHTML = MarkdownParser.parse(extracted.chatContent);
      }

      // [요구사항] 보고서 감지 시: 말풍선에는 '분석 보고서 열기' 카드만 간단히 표시
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

        bubble.appendChild(reportCard);
      }
    } else {
      bubble.textContent = rawContent;
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

  // 텍스트에어리어 입력 시 내용에 맞춰 높이 자동 조절
  document.querySelectorAll('.chat-textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });

  // 랜딩 화면 버튼 이벤트 바인딩
  const btnPsychology = document.getElementById('btn-start-psychology');
  const btnSaju = document.getElementById('btn-start-saju');

  if (btnPsychology) {
    btnPsychology.addEventListener('click', () => {
      Router.navigate('psychology');
    });
  }

  if (btnSaju) {
    btnSaju.addEventListener('click', () => {
      Router.navigate('saju');
    });
  }

  // 좌측 서랍 열기 버튼 (헤더 1 햄버거 버튼)
  const btnOpenLeftDrawer = document.getElementById('btn-open-left-drawer');
  if (btnOpenLeftDrawer) {
    btnOpenLeftDrawer.addEventListener('click', () => {
      DrawerController.openLeft();
    });
  }

  // 암전 오버레이 터치 시 열린 창 닫기
  const backdrop = document.getElementById('backdrop-overlay');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (ModalController.activeModalId) {
        ModalController.close(true);
      } else if (DrawerController.isOpenRight) {
        DrawerController.closeRight(true);
      } else if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(true);
      }
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
