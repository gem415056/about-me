import React, { useState, useEffect } from 'react';
import { CustomPrompt } from '../types';

interface PromptModalProps {
  isOpen: boolean;
  promptToEdit: CustomPrompt | null;
  onSave: (prompt: Partial<CustomPrompt>) => void;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  promptToEdit,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (promptToEdit) {
      setTitle(promptToEdit.title || '');
      setContent(promptToEdit.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [promptToEdit, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title: title.trim() || '이름 없는 프롬프트',
        content: content.trim()
      });
    }
    onClose();
  };

  return (
    <div className="modal-backdrop-layer" onClick={handleClose}>
      <div
        id="modal-add-prompt"
        className="app-modal modal-saju-add"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {promptToEdit ? '프롬프트 수정' : '프롬프트 추가'}
          </h2>
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

        <div className="modal-body modal-saju-body">
          <div className="form-group-item">
            <label className="input-label" htmlFor="custom-prompt-title">
              프롬프트 제목
            </label>
            <input
              type="text"
              id="custom-prompt-title"
              className="modal-input"
              placeholder="예: 실존주의 철학자, 영문 교정 어시스턴트 등"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group-item saju-text-group" style={{ marginTop: '14px' }}>
            <label className="input-label" htmlFor="custom-prompt-content">
              시스템 프롬프트 (System Instruction)
            </label>
            <textarea
              id="custom-prompt-content"
              className="modal-textarea saju-text-area"
              rows={8}
              placeholder="AI에게 부여할 역할, 말투, 행동 지침, 응답 포맷 등을 자유롭게 작성하세요."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <p className="input-guide" style={{ marginTop: '6px' }}>
              창을 닫거나 완료 시 자동 저장됩니다. 선택된 프롬프트는 대화 시 AI의 시스템 지침(System Instruction)으로 주입됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
