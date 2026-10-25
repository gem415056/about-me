import React, { useMemo } from 'react';
import { MarkdownParser } from '../utils/markdownParser';

interface ReportModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onContinueTest: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  content,
  onClose,
  onContinueTest
}) => {
  if (!isOpen) return null;

  const renderedHtml = useMemo(() => {
    return MarkdownParser.parse(content, true);
  }, [content]);

  return (
    <div id="report-fullscreen-view" className="report-fullscreen" role="dialog" aria-modal="true">
      <div className="report-header">
        <h2 id="report-modal-title" className="report-header-title">심층 분석 보고서</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            id="btn-continue-test"
            className="icon-btn"
            aria-label="검사 계속 이어서 하기"
            title="검사 계속 이어서 하기"
            onClick={onContinueTest}
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
              className="lucide lucide-arrow-right"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            id="btn-close-report"
            className="icon-btn"
            aria-label="보고서 닫기"
            title="보고서 닫기"
            onClick={onClose}
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
              className="lucide lucide-x"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div
        id="report-body-content"
        className="report-body-scroll"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};
