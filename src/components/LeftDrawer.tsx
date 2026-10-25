import React, { useState } from 'react';
import { ChatSession } from '../types';

interface LeftDrawerProps {
  isOpen: boolean;
  appMode: 'main' | 'custom';
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteMultipleSessions: (sessionIds: string[]) => void;
  onOpenSettings: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onOpenCustomTab: () => void;
  onClose: () => void;
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  isOpen,
  appMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onDeleteMultipleSessions,
  onOpenSettings,
  onBackup,
  onRestore,
  onOpenCustomTab,
  onClose
}) => {
  const isCustomMode = appMode === 'custom';

  // State for main mode
  const [psychDeleteMode, setPsychDeleteMode] = useState(false);
  const [psychSelectedIds, setPsychSelectedIds] = useState<string[]>([]);
  const [sajuDeleteMode, setSajuDeleteMode] = useState(false);
  const [sajuSelectedIds, setSajuSelectedIds] = useState<string[]>([]);

  // State for custom mode
  const [customDeleteMode, setCustomDeleteMode] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);

  const psychSessions = sessions.filter(s => s.category === 'psychology');
  const sajuSessions = sessions.filter(s => s.category === 'saju');
  const customSessions = sessions.filter(s => s.category === 'custom');

  const togglePsychSelect = (id: string) => {
    setPsychSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchDeletePsych = () => {
    if (psychSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${psychSelectedIds.length}개의 심리학 대화를 삭제하시겠습니까?`)) {
      onDeleteMultipleSessions(psychSelectedIds);
      setPsychSelectedIds([]);
      setPsychDeleteMode(false);
    }
  };

  const toggleSajuSelect = (id: string) => {
    setSajuSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchDeleteSaju = () => {
    if (sajuSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${sajuSelectedIds.length}개의 명리학 대화를 삭제하시겠습니까?`)) {
      onDeleteMultipleSessions(sajuSelectedIds);
      setSajuSelectedIds([]);
      setSajuDeleteMode(false);
    }
  };

  const toggleCustomSelect = (id: string) => {
    setCustomSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchDeleteCustom = () => {
    if (customSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${customSelectedIds.length}개의 대화를 삭제하시겠습니까?`)) {
      onDeleteMultipleSessions(customSelectedIds);
      setCustomSelectedIds([]);
      setCustomDeleteMode(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div id="backdrop-overlay" className="backdrop-overlay" onClick={onClose} />
      )}
      <aside
        id="left-drawer"
        className={`drawer-container drawer-left ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="drawer-content">
          <div className="drawer-floating-sheet">
            {/* Custom Mode: Single Unified '대화 기록' Section */}
            {isCustomMode ? (
              <section className="drawer-section">
                <div className="drawer-section-header">
                  <span className="drawer-section-title">대화 기록</span>
                  <button
                    type="button"
                    className={`icon-btn-minimal ${customDeleteMode ? 'active' : ''}`}
                    title="대화 다중 선택 삭제"
                    onClick={() => {
                      setCustomDeleteMode(!customDeleteMode);
                      setCustomSelectedIds([]);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trash"
                    >
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {customDeleteMode && customSelectedIds.length > 0 && (
                  <div style={{ padding: '6px 12px' }}>
                    <button
                      type="button"
                      className="btn-batch-delete"
                      onClick={handleBatchDeleteCustom}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        background: 'rgba(180, 60, 60, 0.1)',
                        color: '#b03030',
                        borderRadius: '8px',
                        border: '1px solid rgba(180, 60, 60, 0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      선택 삭제 ({customSelectedIds.length}개)
                    </button>
                  </div>
                )}

                <div id="custom-chat-list" className="drawer-list-scroll">
                  {customSessions.length === 0 ? (
                    <div className="empty-list-notice">기록된 대화가 없습니다.</div>
                  ) : (
                    customSessions.map(session => (
                      <div
                        key={session.id}
                        className={`drawer-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                        onClick={() => {
                          if (customDeleteMode) {
                            toggleCustomSelect(session.id);
                          } else {
                            onSelectSession(session);
                            onClose();
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {customDeleteMode && (
                            <input
                              type="checkbox"
                              checked={customSelectedIds.includes(session.id)}
                              onChange={() => toggleCustomSelect(session.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          )}
                          <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.title || '새 대화'}
                          </span>
                        </div>
                        {!customDeleteMode && (
                          <button
                            type="button"
                            className="icon-btn-minimal"
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm('이 대화를 삭제하시겠습니까?')) {
                                onDeleteSession(session.id);
                              }
                            }}
                            title="삭제"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : (
              /* Main Mode: Psychology and Saju sections */
              <>
                {/* 1. 심리학 대화 기록 섹션 */}
                <section className="drawer-section">
                  <div className="drawer-section-header">
                    <span className="drawer-section-title">심리학 대화 기록</span>
                    <button
                      type="button"
                      id="btn-delete-mode-psych"
                      className={`icon-btn-minimal ${psychDeleteMode ? 'active' : ''}`}
                      title="대화 다중 선택 삭제"
                      onClick={() => {
                        setPsychDeleteMode(!psychDeleteMode);
                        setPsychSelectedIds([]);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-trash"
                      >
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  {psychDeleteMode && psychSelectedIds.length > 0 && (
                    <div style={{ padding: '6px 12px' }}>
                      <button
                        type="button"
                        className="btn-batch-delete"
                        onClick={handleBatchDeletePsych}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          background: 'rgba(180, 60, 60, 0.1)',
                          color: '#b03030',
                          borderRadius: '8px',
                          border: '1px solid rgba(180, 60, 60, 0.2)',
                          cursor: 'pointer'
                        }}
                      >
                        선택 삭제 ({psychSelectedIds.length}개)
                      </button>
                    </div>
                  )}

                  <div id="psychology-chat-list" className="drawer-list-scroll">
                    {psychSessions.length === 0 ? (
                      <div className="empty-list-notice">기록된 대화가 없습니다.</div>
                    ) : (
                      psychSessions.map(session => (
                        <div
                          key={session.id}
                          className={`drawer-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                          onClick={() => {
                            if (psychDeleteMode) {
                              togglePsychSelect(session.id);
                            } else {
                              onSelectSession(session);
                              onClose();
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            marginBottom: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            {psychDeleteMode && (
                              <input
                                type="checkbox"
                                checked={psychSelectedIds.includes(session.id)}
                                onChange={() => togglePsychSelect(session.id)}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                            <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {session.title || '새 심리학 대화'}
                            </span>
                          </div>
                          {!psychDeleteMode && (
                            <button
                              type="button"
                              className="icon-btn-minimal"
                              onClick={e => {
                                e.stopPropagation();
                                if (window.confirm('이 대화를 삭제하시겠습니까?')) {
                                onDeleteSession(session.id);
                                }
                              }}
                              title="삭제"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <div className="drawer-inner-divider"></div>

                {/* 2. 명리학 대화 기록 섹션 */}
                <section className="drawer-section">
                  <div className="drawer-section-header">
                    <span className="drawer-section-title">명리학 대화 기록</span>
                    <button
                      type="button"
                      id="btn-delete-mode-saju"
                      className={`icon-btn-minimal ${sajuDeleteMode ? 'active' : ''}`}
                      title="대화 다중 선택 삭제"
                      onClick={() => {
                        setSajuDeleteMode(!sajuDeleteMode);
                        setSajuSelectedIds([]);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-trash"
                      >
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  {sajuDeleteMode && sajuSelectedIds.length > 0 && (
                    <div style={{ padding: '6px 12px' }}>
                      <button
                        type="button"
                        className="btn-batch-delete"
                        onClick={handleBatchDeleteSaju}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          background: 'rgba(180, 60, 60, 0.1)',
                          color: '#b03030',
                          borderRadius: '8px',
                          border: '1px solid rgba(180, 60, 60, 0.2)',
                          cursor: 'pointer'
                        }}
                      >
                        선택 삭제 ({sajuSelectedIds.length}개)
                      </button>
                    </div>
                  )}

                  <div id="saju-chat-list" className="drawer-list-scroll">
                    {sajuSessions.length === 0 ? (
                      <div className="empty-list-notice">기록된 대화가 없습니다.</div>
                    ) : (
                      sajuSessions.map(session => (
                        <div
                          key={session.id}
                          className={`drawer-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                          onClick={() => {
                            if (sajuDeleteMode) {
                              toggleSajuSelect(session.id);
                            } else {
                              onSelectSession(session);
                              onClose();
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            marginBottom: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            {sajuDeleteMode && (
                              <input
                                type="checkbox"
                                checked={sajuSelectedIds.includes(session.id)}
                                onChange={() => toggleSajuSelect(session.id)}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                            <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {session.title || '새 명리학 대화'}
                            </span>
                          </div>
                          {!sajuDeleteMode && (
                            <button
                              type="button"
                              className="icon-btn-minimal"
                              onClick={e => {
                                e.stopPropagation();
                                if (window.confirm('이 대화를 삭제하시겠습니까?')) {
                                  onDeleteSession(session.id);
                                }
                              }}
                              title="삭제"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* 3. 하단 툴바: 좌측 독립 message-circle 아이콘, 우측 정렬 3개 버튼 */}
          <div
            className="drawer-bottom-toolbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px'
            }}
          >
            {/* 좌측 독립 배치: message-circle 아이콘 (새 탭에서 맞춤 프롬프트 대화 모드 열기) */}
            <button
              type="button"
              id="btn-open-custom-mode"
              className="toolbar-btn"
              title="새 탭으로 맞춤 프롬프트 대화 모드 열기"
              onClick={() => {
                onOpenCustomTab();
                onClose();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCustomMode ? '#34402F' : 'var(--text-secondary, #6B7280)'
              }}
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
                className="lucide lucide-message-circle preview-icon"
              >
                <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
              </svg>
            </button>

            {/* 우측 정렬 그룹: 설정, 클라우드 백업, 클라우드 복원 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                id="btn-open-api-modal"
                className="toolbar-btn"
                title="설정"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
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
                  className="lucide lucide-key-round"
                >
                  <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
                  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                id="btn-cloud-backup"
                className="toolbar-btn"
                title="데이터 백업"
                onClick={onBackup}
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
                  className="lucide lucide-cloud-upload"
                >
                  <path d="M12 13v8" />
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="m8 17 4-4 4 4" />
                </svg>
              </button>
              <button
                type="button"
                id="btn-cloud-restore"
                className="toolbar-btn"
                title="데이터 복원"
                onClick={onRestore}
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
                  className="lucide lucide-cloud-download"
                >
                  <path d="M12 13v8l-4-4" />
                  <path d="m12 21 4-4" />
                  <path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
