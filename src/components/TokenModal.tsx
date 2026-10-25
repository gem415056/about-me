import React from 'react';

interface TokenModalProps {
  isOpen: boolean;
  enabled: boolean;
  maxTokens: number;
  onToggleEnabled: (enabled: boolean) => void;
  onChangeMaxTokens: (tokens: number) => void;
  onClose: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  enabled,
  maxTokens,
  onToggleEnabled,
  onChangeMaxTokens,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-layer" onClick={onClose}>
      <div
        id="modal-token-settings"
        className="app-modal modal-token-config"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">대화 맥락 및 토큰 설정</h2>
          <button
            type="button"
            className="btn-close-modal icon-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-x"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body spacious-body">
          <div className="token-config-info-card">
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              기본 권장 토큰(50,000)을 초과하더라도 모든 대화가 온전히 전송됩니다.<br />
              API 분당 사용량 한도(429)를 고려하여 대화 길이를 제한하려면 슬라이싱을 켜세요.
            </p>
          </div>

          <div
            className="toggle-setting-row"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}
          >
            <div>
              <label
                className="input-label"
                style={{ marginBottom: '2px', cursor: 'pointer' }}
                htmlFor="toggle-token-slicing"
              >
                대화 토큰 슬라이싱 제한
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                지정 토큰을 초과하면 이전 대화 텍스트만 오래된 순으로 잘라냅니다.
              </span>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                id="toggle-token-slicing"
                checked={enabled}
                onChange={e => onToggleEnabled(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {enabled && (
            <div id="token-slicing-input-group" className="form-group-item">
              <label className="input-label" htmlFor="input-max-tokens">
                슬라이싱 기준 토큰 수
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  id="input-max-tokens"
                  className="modal-input"
                  placeholder="50000"
                  min="1000"
                  step="1000"
                  value={maxTokens}
                  onChange={e => onChangeMaxTokens(parseInt(e.target.value, 10) || 50000)}
                  style={{ paddingRight: '50px' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }}
                >
                  토큰
                </span>
              </div>
              <p className="input-guide">
                사진, 만세력 이미지, 첨부 문서는 항상 100% 무손실 보존되며, 순수 대화 텍스트만 슬라이싱됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
