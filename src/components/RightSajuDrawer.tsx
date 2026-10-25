import React, { useState } from 'react';
import { SajuProfile } from '../types';

interface RightSajuDrawerProps {
  isOpen: boolean;
  profiles: SajuProfile[];
  attachedProfileIds: number[];
  onToggleAttachProfile: (profile: SajuProfile) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (profile: SajuProfile) => void;
  onDeleteProfile: (profileId: number) => void;
  onDeleteMultipleProfiles: (profileIds: number[]) => void;
  onClose: () => void;
}

export const RightSajuDrawer: React.FC<RightSajuDrawerProps> = ({
  isOpen,
  profiles,
  attachedProfileIds,
  onToggleAttachProfile,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteProfile,
  onDeleteMultipleProfiles,
  onClose
}) => {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}개의 명식을 삭제하시겠습니까?`)) {
      onDeleteMultipleProfiles(selectedIds);
      setSelectedIds([]);
      setDeleteMode(false);
    }
  };

  return (
    <>
      {isOpen && <div id="backdrop-overlay" className="backdrop-overlay" onClick={onClose} />}
      <aside
        id="right-saju-drawer"
        className={`drawer-container drawer-right ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="drawer-content">
          <div className="saju-drawer-header">
            <span className="drawer-section-title">명식 선택하기</span>
            <div className="saju-header-actions" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                id="btn-open-add-saju"
                className="icon-btn"
                title="명식 추가"
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
                id="btn-toggle-delete-saju"
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
                선택한 명식 {selectedIds.length}개 삭제
              </button>
            </div>
          )}

          <div id="saju-profiles-list" className="drawer-list-scroll">
            {profiles.length === 0 ? (
              <div className="empty-list-notice">
                등록된 명식이 없습니다.<br />
                우측 상단 + 버튼을 눌러 명식을 추가하세요.
              </div>
            ) : (
              profiles.map(p => {
                const isAttached = p.id ? attachedProfileIds.includes(p.id) : false;
                const isSelectedForDel = p.id ? selectedIds.includes(p.id) : false;

                return (
                  <div
                    key={p.id}
                    className={`saju-profile-card ${isAttached ? 'selected' : ''}`}
                    onClick={() => {
                      if (deleteMode && p.id) {
                        toggleSelect(p.id);
                      } else {
                        onToggleAttachProfile(p);
                      }
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isAttached
                        ? '1.5px solid var(--accent-sage, #747B61)'
                        : '1px solid var(--border-soft, #E5E2D6)',
                      background: isAttached ? 'rgba(116, 123, 97, 0.08)' : 'var(--bg-card, #FFFFFF)',
                      marginBottom: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {deleteMode && p.id && (
                          <input
                            type="checkbox"
                            checked={isSelectedForDel}
                            onChange={() => toggleSelect(p.id!)}
                            onClick={e => e.stopPropagation()}
                          />
                        )}
                        <span style={{ fontWeight: 600, fontSize: '0.94rem' }}>{p.name}</span>
                        {isAttached && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              background: '#747B61',
                              color: '#FFF',
                              borderRadius: '10px'
                            }}
                          >
                            첨부됨
                          </span>
                        )}
                      </div>

                      {!deleteMode && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="icon-btn-minimal"
                            title="수정"
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
                              if (p.id && window.confirm(`"${p.name}" 명식을 삭제하시겠습니까?`)) {
                                onDeleteProfile(p.id);
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {p.textData && (
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary, #6B7280)',
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontFamily: 'monospace'
                        }}
                      >
                        {p.textData}
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
