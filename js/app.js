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
  backdrop: document.getElementById('backdrop-overlay'),
  isOpenLeft: false,

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
  Router.navigate('landing', false);

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

  // 암전 오버레이 터치 시: 모달이 열려있으면 모달 닫기, 서랍이 열려있으면 서랍 닫기
  const backdrop = document.getElementById('backdrop-overlay');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (ModalController.activeModalId) {
        ModalController.close(true);
      } else if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(true);
      }
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
