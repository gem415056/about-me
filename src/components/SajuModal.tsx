import React, { useState, useEffect } from 'react';
import { SajuProfile } from '../types';

interface SajuModalProps {
  isOpen: boolean;
  profileToEdit: SajuProfile | null;
  onSave: (profile: Partial<SajuProfile>) => void;
  onClose: () => void;
}

export const SajuModal: React.FC<SajuModalProps> = ({
  isOpen,
  profileToEdit,
  onSave,
  onClose
}) => {
  const [name, setName] = useState('');
  const [textData, setTextData] = useState('');

  useEffect(() => {
    if (profileToEdit) {
      setName(profileToEdit.name || '');
      setTextData(profileToEdit.textData || '');
    } else {
      setName('');
      setTextData('');
    }
  }, [profileToEdit, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (name.trim() || textData.trim()) {
      onSave({
        name: name.trim() || '이름 없음',
        textData: textData.trim()
      });
    }
    onClose();
  };

  return (
    <div className="modal-backdrop-layer" onClick={handleClose}>
      <div
        id="modal-add-saju"
        className="app-modal modal-saju-add"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-saju-title" className="modal-title">
            {profileToEdit ? '명식 수정' : '명식 추가'}
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
            <label className="input-label" htmlFor="saju-profile-name">
              이름
            </label>
            <input
              type="text"
              id="saju-profile-name"
              className="modal-input"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group-item saju-text-group">
            <label className="input-label" htmlFor="saju-profile-text">
              만세력 텍스트 (YAML 등)
            </label>
            <textarea
              id="saju-profile-text"
              className="modal-textarea saju-text-area"
              rows={7}
              placeholder={`만세력 정보를 YAML 또는 텍스트 형식으로 입력하세요.\n예시:\n생년월일: 1995-03-20 10:30 (양력, 여)\n대운수: 4\n사주:\n  시: 己巳\n  일: 甲子\n  월: 己卯\n  년: 乙亥`}
              value={textData}
              onChange={e => setTextData(e.target.value)}
            />
            <p className="input-guide" style={{ marginTop: '6px' }}>
              창을 닫으면 자동으로 저장됩니다. 대화 시 이름은 전송되지 않으며, 오직 만세력 내용만 코드블럭으로 AI에게 안전하게 전달됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
