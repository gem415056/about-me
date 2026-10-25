import React, { useState, useRef } from 'react';
import { CustomPrompt } from '../types';

interface RightPromptDrawerProps {
  isOpen: boolean;
  prompts: CustomPrompt[];
  activePromptId: number | null;
  onSelectPrompt: (prompt: CustomPrompt) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (prompt: CustomPrompt) => void;
  onDeletePrompt: (promptId: number) => void;
  onDeleteMultiplePrompts: (promptIds: number[]) => void;
  onClose: () => void;
}

export const RightPromptDrawer: React.FC<RightPromptDrawerProps> = ({
  isOpen,
  prompts,
  activePromptId,
  onSelectPrompt,
  onOpenAddModal,
  onOpenEditModal,
  onDeletePrompt,
  onDeleteMultiplePrompts,
  onClose
}) => {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Long press timer ref
  const timerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}개의 프롬프트를 삭제하시겠습니까?`)) {
      onDeleteMultiplePrompts(selectedIds);
      setSelectedIds([]);
      setDeleteMode(false);
    }
  };

  const handleTouchStart = (prompt: CustomPrompt) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onOpenEditModal(prompt);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCardClick = (prompt: CustomPrompt) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (deleteMode && prompt.id) {
      toggleSelect(prompt.id);
    } else {
      onSelectPrompt(prompt);
    }
  };

  return (
    <>
      {isOpen && <div id="backdrop-overlay" className="backdrop-overlay" onClick={onClose} />}
      <aside
        id="right-prompt-drawer"
        className={`drawer-container drawer-right ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="drawer-content">
          <div className="saju-drawer-header">
            <span className="drawer-section-title">프롬프트 설정</span>
            <div className="saju-header-actions" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                id="btn-open-add-prompt"
                className="icon-btn"
                title="프롬프트 추가"
                onClick={onOpenAddModal}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-circle-plus"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                </svg>
              </button>
              <button
                type="button"
                id="btn-toggle-delete-prompt"
                className={`icon-btn ${deleteMode ? 'active' : ''}`}
                title="선택 삭제"
                onClick={() => {
                  setDeleteMode(!deleteMode);
                  setSelectedIds([]);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-circle-x"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </button>
            </div>
          </div>

          {deleteMode && selectedIds.length > 0 && (
            <div style={{ padding: '8px 14px' }}>
              <button
                type="button"
                className="btn-batch-delete"
                onClick={handleBatchDelete}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  background: 'rgba(180, 60, 60, 0.1)',
                  color: '#b03030',
                  borderRadius: '8px',
                  border: '1px solid rgba(180, 60, 60, 0.2)',
                  cursor: 'pointer'
                }}
              >
                선택한 프롬프트 {selectedIds.length}개 삭제
              </button>
            </div>
          )}

          <div id="custom-prompts-list" className="drawer-list-scroll">
            {prompts.length === 0 ? (
              <div className="empty-list-notice">
                등록된 프롬프트가 없습니다.<br />
                우측 상단 + 버튼을 눌러 새 프롬프트를 등록하세요.
              </div>
            ) : (
              prompts.map(p => {
                const isSelected = p.id === activePromptId;
                const isCheckedForDel = p.id ? selectedIds.includes(p.id) : false;

                return (
                  <div
                    key={p.id}
                    className={`custom-prompt-card ${isSelected ? 'active-prompt' : ''}`}
                    onClick={() => handleCardClick(p)}
                    onMouseDown={() => handleTouchStart(p)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={() => handleTouchStart(p)}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected
                        ? '1.5px solid var(--accent-sage, #747B61)'
                        : '1px solid var(--border-soft, #E5E2D6)',
                      background: isSelected
                        ? 'rgba(116, 123, 97, 0.14)'
                        : 'var(--bg-card, #FFFFFF)',
                      boxShadow: isSelected
                        ? '0 2px 12px rgba(116, 123, 97, 0.22)'
                        : 'none',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.22s ease',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {deleteMode && p.id && (
                          <input
                            type="checkbox"
                            checked={isCheckedForDel}
                            onChange={() => toggleSelect(p.id!)}
                            onClick={e => e.stopPropagation()}
                          />
                        )}
                        <span
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            fontSize: '0.94rem',
                            color: isSelected ? 'var(--accent-dark-matcha, #34402F)' : '#1E293B'
                          }}
                        >
                          {p.title}
                        </span>
                      </div>

                      {!deleteMode && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="icon-btn-minimal"
                            title="수정 (길게 누르기도 가능)"
                            onClick={e => {
                              e.stopPropagation();
                              onOpenEditModal(p);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn-minimal"
                            title="삭제"
                            onClick={e => {
                              e.stopPropagation();
                              if (p.id && window.confirm(`"${p.title}" 프롬프트를 삭제하시겠습니까?`)) {
                                onDeletePrompt(p.id);
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {p.content && (
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: isSelected ? '#4A5340' : 'var(--text-secondary, #6B7280)',
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {p.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
