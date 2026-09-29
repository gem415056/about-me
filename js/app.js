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
document.addEventListener('DOMContentLoaded', () => {
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

  // 암전 오버레이 터치 시 서랍 닫기
  const backdrop = document.getElementById('backdrop-overlay');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(true);
      }
    });
  }
});
