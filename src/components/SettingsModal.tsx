import React, { useState } from 'react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onSaveSettings,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'vertex' | 'firestore' | 'general'>('gemini');
  const [geminiKey, setGeminiKey] = useState(settings.gemini_api_key || '');
  const [modelName, setModelName] = useState(settings.modelName || 'gemini-3.8-flash');
  const [reasoning, setReasoning] = useState(settings.reasoning || 'off');
  const [reasoningBudget, setReasoningBudget] = useState(settings.reasoningBudget || 1024);
  const [temperature, setTemperature] = useState(settings.temperature !== undefined ? settings.temperature : 0.7);
  const [outputMode, setOutputMode] = useState(settings.outputMode || 'markdown');

  const [harassment, setHarassment] = useState(settings.safety?.harassment || 'BLOCK_NONE');
  const [hate, setHate] = useState(settings.safety?.hate || 'BLOCK_NONE');
  const [sex, setSex] = useState(settings.safety?.sex || 'BLOCK_NONE');
  const [danger, setDanger] = useState(settings.safety?.danger || 'BLOCK_NONE');

  const [vertexProject, setVertexProject] = useState(settings.vertex_config?.projectId || '');
  const [vertexRegion, setVertexRegion] = useState(settings.vertex_config?.region || 'us-central1');

  const [firestoreConfig, setFirestoreConfig] = useState(settings.firestore_config?.configText || '');

  if (!isOpen) return null;

  const handleClose = () => {
    onSaveSettings({
      gemini_api_key: geminiKey.trim(),
      modelName,
      reasoning,
      reasoningBudget,
      temperature,
      outputMode,
      safety: {
        harassment,
        hate,
        sex,
        danger
      },
      vertex_config: {
        projectId: vertexProject.trim(),
        region: vertexRegion.trim()
      },
      firestore_config: {
        configText: firestoreConfig.trim()
      }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop-layer" onClick={handleClose}>
      <div
        id="modal-settings"
        className="app-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">설정</h2>
          <button
            type="button"
            className="btn-close-modal icon-btn"
            onClick={handleClose}
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

        <div className="modal-tab-bar" style={{ display: 'flex', borderBottom: '1px solid var(--border-soft)', padding: '0 16px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'gemini' ? 'active' : ''}`}
            onClick={() => setActiveTab('gemini')}
            style={{ padding: '10px 14px', borderBottom: activeTab === 'gemini' ? '2px solid var(--accent-sage)' : 'none' }}
          >
            Gemini API
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'vertex' ? 'active' : ''}`}
            onClick={() => setActiveTab('vertex')}
            style={{ padding: '10px 14px', borderBottom: activeTab === 'vertex' ? '2px solid var(--accent-sage)' : 'none' }}
          >
            Vertex AI
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'firestore' ? 'active' : ''}`}
            onClick={() => setActiveTab('firestore')}
            style={{ padding: '10px 14px', borderBottom: activeTab === 'firestore' ? '2px solid var(--accent-sage)' : 'none' }}
          >
            백업 설정
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            style={{ padding: '10px 14px', borderBottom: activeTab === 'general' ? '2px solid var(--accent-sage)' : 'none' }}
          >
            일반
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px' }}>
          {activeTab === 'gemini' && (
            <div className="tab-pane active">
              <div className="form-group-item">
                <label className="input-label" htmlFor="setting-gemini-key">
                  Gemini API 키
                </label>
                <input
                  type="password"
                  id="setting-gemini-key"
                  className="modal-input"
                  placeholder="AI Studio API 키 입력"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                />
                <p className="input-guide">
                  입력된 API 키는 브라우저 내부 IndexedDB에만 암호화되어 안전하게 보관됩니다.
                </p>
              </div>

              <div className="form-group-item" style={{ marginTop: '14px' }}>
                <label className="input-label" htmlFor="select-gemini-model">
                  모델 선택
                </label>
                <select
                  id="select-gemini-model"
                  className="modal-input"
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (권장)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                </select>
              </div>

              <div className="form-group-item" style={{ marginTop: '14px' }}>
                <label className="input-label" htmlFor="select-reasoning">
                  추론 (Thinking) 설정
                </label>
                <select
                  id="select-reasoning"
                  className="modal-input"
                  value={reasoning}
                  onChange={e => setReasoning(e.target.value)}
                >
                  <option value="off">끄기 (Off)</option>
                  <option value="auto">자동 (Auto)</option>
                </select>
              </div>

              {reasoning !== 'off' && (
                <div className="form-group-item" style={{ marginTop: '12px' }}>
                  <label className="input-label" htmlFor="input-reasoning-budget">
                    추론 예산 (Budget)
                  </label>
                  <input
                    type="number"
                    id="input-reasoning-budget"
                    className="modal-input"
                    value={reasoningBudget}
                    onChange={e => setReasoningBudget(parseInt(e.target.value, 10) || 1024)}
                    min={128}
                    max={8192}
                  />
                </div>
              )}

              <div style={{ marginTop: '18px' }}>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  안전 필터 설정
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      괴롭힘
                    </span>
                    <select
                      className="modal-input"
                      value={harassment}
                      onChange={e => setHarassment(e.target.value)}
                    >
                      <option value="BLOCK_NONE">차단 안함</option>
                      <option value="BLOCK_ONLY_HIGH">높은 위험만</option>
                      <option value="BLOCK_MEDIUM_AND_ABOVE">보통 이상</option>
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      증오 발언
                    </span>
                    <select
                      className="modal-input"
                      value={hate}
                      onChange={e => setHate(e.target.value)}
                    >
                      <option value="BLOCK_NONE">차단 안함</option>
                      <option value="BLOCK_ONLY_HIGH">높은 위험만</option>
                      <option value="BLOCK_MEDIUM_AND_ABOVE">보통 이상</option>
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      성적 표현
                    </span>
                    <select
                      className="modal-input"
                      value={sex}
                      onChange={e => setSex(e.target.value)}
                    >
                      <option value="BLOCK_NONE">차단 안함</option>
                      <option value="BLOCK_ONLY_HIGH">높은 위험만</option>
                      <option value="BLOCK_MEDIUM_AND_ABOVE">보통 이상</option>
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      위험 콘텐츠
                    </span>
                    <select
                      className="modal-input"
                      value={danger}
                      onChange={e => setDanger(e.target.value)}
                    >
                      <option value="BLOCK_NONE">차단 안함</option>
                      <option value="BLOCK_ONLY_HIGH">높은 위험만</option>
                      <option value="BLOCK_MEDIUM_AND_ABOVE">보통 이상</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vertex' && (
            <div className="tab-pane active">
              <div className="form-group-item">
                <label className="input-label">GCP 프로젝트 ID</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="my-gcp-project-id"
                  value={vertexProject}
                  onChange={e => setVertexProject(e.target.value)}
                />
              </div>
              <div className="form-group-item" style={{ marginTop: '12px' }}>
                <label className="input-label">리전 (Region)</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="us-central1"
                  value={vertexRegion}
                  onChange={e => setVertexRegion(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'firestore' && (
            <div className="tab-pane active">
              <div className="form-group-item">
                <label className="input-label">Firebase Config JSON</label>
                <textarea
                  className="modal-textarea"
                  rows={6}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "my-app"\n}`}
                  value={firestoreConfig}
                  onChange={e => setFirestoreConfig(e.target.value)}
                />
                <p className="input-guide">
                  클라우드 자동 동기화용 Firebase Web App 설정 객체를 붙여넣으세요.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="tab-pane active">
              <div className="form-group-item">
                <label className="input-label">온도 (Temperature): {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group-item" style={{ marginTop: '14px' }}>
                <label className="input-label">출력 모드</label>
                <select
                  className="modal-input"
                  value={outputMode}
                  onChange={e => setOutputMode(e.target.value)}
                >
                  <option value="markdown">마크다운 리치 뷰 (권장)</option>
                  <option value="plain">단순 텍스트</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
