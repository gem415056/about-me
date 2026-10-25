import React from 'react';

interface HeaderProps {
  appMode: 'main' | 'custom';
  currentView: 'landing' | 'psychology' | 'saju' | 'custom_chat';
  onNavigateHome: () => void;
  onToggleLeftDrawer: () => void;
  onToggleSajuDrawer: () => void;
  onTogglePromptDrawer: () => void;
  tokenCount: number;
  tokenMax: number;
  onOpenTokenModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  currentView,
  onNavigateHome,
  onToggleLeftDrawer,
  onToggleSajuDrawer,
  onTogglePromptDrawer,
  tokenCount,
  tokenMax,
  onOpenTokenModal
}) => {
  const isSajuView = appMode === 'main' && currentView === 'saju';
  const isCustomMode = appMode === 'custom';
  const showTokenChip = currentView !== 'landing';

  return (
    <>
      <header id="header-1" className="app-header header-1">
        <button
          type="button"
          id="btn-open-left-drawer"
          className="icon-btn"
          aria-label="메뉴 열기"
          onClick={onToggleLeftDrawer}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-menu"
          >
            <path d="M4 5h16" />
            <path d="M4 12h16" />
            <path d="M4 19h16" />
          </svg>
        </button>

        <h1
          id="header-title"
          className="header-title header-logo"
          style={{ cursor: 'pointer' }}
          onClick={onNavigateHome}
          title="홈으로 복귀"
        >
          {isCustomMode ? '𝗔𝗕𝗢𝗨𝗧 𝗠𝗘 · 𝗣𝗥𝗢𝗠𝗣𝗧' : '𝗔𝗕𝗢𝗨𝗧 𝗠𝗘'}
        </h1>

        {isCustomMode ? (
          <button
            type="button"
            id="btn-toggle-prompt-drawer"
            className="icon-btn"
            aria-label="프롬프트 서랍 열기"
            title="프롬프트 설정"
            onClick={onTogglePromptDrawer}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-file-cog"
            >
              <path d="M15 8a1 1 0 0 1-1-1V2a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8z" />
              <path d="M20 8v12a2 2 0 0 1-2 2h-4.182" />
              <path d="m3.305 19.53.923-.382" />
              <path d="M4 10.592V4a2 2 0 0 1 2-2h8" />
              <path d="m4.228 16.852-.924-.383" />
              <path d="m5.852 15.228-.383-.923" />
              <path d="m5.852 20.772-.383.924" />
              <path d="m8.148 15.228.383-.923" />
              <path d="m8.53 21.696-.382-.924" />
              <path d="m9.773 16.852.922-.383" />
              <path d="m9.773 19.148.922.383" />
              <circle cx="7" cy="18" r="3" />
            </svg>
          </button>
        ) : isSajuView ? (
          <button
            type="button"
            id="btn-toggle-saju-drawer"
            className="icon-btn"
            aria-label="명식 서랍 열기"
            title="명식 선택하기"
            onClick={onToggleSajuDrawer}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-hand"
            >
              <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
              <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
      </header>

      {showTokenChip && (
        <button
          type="button"
          id="token-floating-chip"
          className="token-floating-chip"
          aria-label="토큰 통계 및 슬라이싱 설정"
          title="대화 맥락 및 토큰 설정"
          onClick={onOpenTokenModal}
        >
          <span id="token-count-display">{`${tokenCount} / ${tokenMax}`}</span>
        </button>
      )}
    </>
  );
};
