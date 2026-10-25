import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAttachment, SajuProfile } from '../types';
import { MarkdownParser } from '../utils/markdownParser';
import { copyToClipboard, showToast } from '../utils/uiHelpers';

interface ChatViewProps {
  category: 'psychology' | 'saju' | 'custom';
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  attachedSajuProfiles?: SajuProfile[];
  onRemoveSajuProfile?: (profileId: number) => void;
  onSendMessage: (text: string, attachments: ChatAttachment[]) => void;
  onRegenerateMessage: (msgId: string) => void;
  onEditMessage: (msgId: string, newContent: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onOpenReport?: (reportContent: string) => void;
  onInputChange?: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  category,
  messages,
  isStreaming,
  streamingMessageId,
  attachedSajuProfiles = [],
  onRemoveSajuProfile,
  onSendMessage,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenReport,
  onInputChange
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<ChatAttachment[]>([]);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Local state for onboarding questions (psychology only)
  const [onboardingTone, setOnboardingTone] = useState('친구처럼 거침없이 반말로 티키타카 하기');
  const [onboardingNickname, setOnboardingNickname] = useState('');
  const [onboardingStory, setOnboardingStory] = useState('');
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPsychology = category === 'psychology';
  const isCustom = category === 'custom';

  // Check if report has been generated in psychology session
  const hasReportGenerated = isPsychology && messages.some(m => {
    if (m.role === 'model') {
      const { hasReport } = MarkdownParser.extractReport(m.content);
      return hasReport;
    }
    return false;
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (onInputChange) onInputChange(val);

    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) return;
    const trimmed = inputText.trim();
    if (!trimmed && attachedFiles.length === 0 && attachedSajuProfiles.length === 0) return;

    onSendMessage(trimmed, attachedFiles);
    setInputText('');
    setAttachedFiles([]);
    if (onInputChange) onInputChange('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');
      const isDoc = file.name.endsWith('.txt') || file.name.endsWith('.html') || file.type.includes('text');

      if (isImg) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          type: 'image',
          mimeType: file.type || 'image/jpeg',
          dataUrl,
          size: file.size
        });
      } else if (isDoc) {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        newAttachments.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          type: 'doc',
          mimeType: file.type || 'text/plain',
          content: textContent,
          size: file.size
        });
      }
    }

    setAttachedFiles(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCopyMessage = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) showToast('메시지가 복사되었습니다.');
  };

  const handleSaveEdit = (msgId: string) => {
    if (editingContent.trim()) {
      onEditMessage(msgId, editingContent.trim());
    }
    setEditingMsgId(null);
    setEditingContent('');
  };

  // Submit psychology onboarding form
  const handleSubmitOnboarding = () => {
    setOnboardingSubmitted(true);
    const answers = [
      `1. 대화 톤: ${onboardingTone}`,
      `2. 호칭: ${onboardingNickname.trim() || '친구'}`,
      `3. 이야기: ${onboardingStory.trim() || '편하게 심리 분석 시작해줘!'}`
    ].join('\n');
    onSendMessage(answers, []);
  };

  return (
    <section id={`view-${category}`} className="view-section chat-view active">
      <div id={`${category}-chat-messages`} className="chat-messages-container">
        {messages.map((msg, index) => {
          const isModel = msg.role === 'model';
          const isFirstMessage = index === 0;
          const isOnboarding = isPsychology && (msg.content.includes('__PSYCHOLOGY_ONBOARDING__') || isFirstMessage);

          // Check if assistant message has deep report
          const extractedReport = (isModel && onOpenReport) ? MarkdownParser.extractReport(msg.content) : null;
          const hasReport = extractedReport?.hasReport;

          // Check if message has choice dossier
          const choiceDossier = isModel && !hasReport ? MarkdownParser.parseChoiceDossier(msg.content, msg.id, msg.choiceState) : null;

          return (
            <div key={msg.id} className={`chat-message-row ${msg.role}-row`}>
              <div
                className={`chat-bubble ${msg.role} ${hasReport ? 'is-report-wrapper' : ''}`}
                data-msg-id={msg.id}
              >
                <div className="bubble-text-content">
                  {/* 1. Onboarding Card (Psychology only) */}
                  {isOnboarding && isModel ? (
                    <div className="onboarding-card-wrapper">
                      <div className="ai-dialogue-body">
                        본격적으로 이야기를 시작하기 전에, 가장 편안한 대화 환경부터 맞춰볼게요!
                      </div>
                      <div className="integrated-quote-section onboarding-quote-section" data-msg-id={msg.id}>
                        <div className="onboarding-question-block">
                          <div className="onboarding-q-title">1. 어떤 대화 톤이 편하신가요?</div>
                          <div className="onboarding-tone-options" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="choice-item-row onboarding-tone-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name={`tone-${msg.id}`}
                                className="choice-chk"
                                value="친구처럼 거침없이 반말로 티키타카 하기"
                                checked={onboardingTone.includes('반말')}
                                onChange={() => setOnboardingTone('친구처럼 거침없이 반말로 티키타카 하기')}
                              />
                              <span className="choice-label-text">친구처럼 거침없이 반말로 티키타카 하기</span>
                            </label>
                            <label className="choice-item-row onboarding-tone-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name={`tone-${msg.id}`}
                                className="choice-chk"
                                value="적당히 위트 있고 편안한 존댓말 쓰기"
                                checked={onboardingTone.includes('존댓말')}
                                onChange={() => setOnboardingTone('적당히 위트 있고 편안한 존댓말 쓰기')}
                              />
                              <span className="choice-label-text">적당히 위트 있고 편안한 존댓말 쓰기</span>
                            </label>
                          </div>
                        </div>

                        <div className="onboarding-question-block" style={{ marginTop: '14px' }}>
                          <div className="onboarding-q-title">2. 대화하는 동안 제가 어떤 호칭(닉네임)으로 불러드리면 좋을까요?</div>
                          <div style={{ marginTop: '6px' }}>
                            <textarea
                              className="single-underline-field"
                              rows={1}
                              placeholder="불러드릴 호칭(닉네임)"
                              value={onboardingNickname}
                              onChange={e => setOnboardingNickname(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="onboarding-question-block" style={{ marginTop: '14px' }}>
                          <div className="onboarding-q-title">3. 지금 머릿속에 가장 먼저 떠오르는 이야기 하나만 편하게 꺼내주세요!</div>
                          <div style={{ marginTop: '6px' }}>
                            <textarea
                              className="single-underline-field"
                              rows={1}
                              placeholder="재밌게 본 영화/유튜브, 직장/친구 일화, 취미, 고민 등"
                              value={onboardingStory}
                              onChange={e => setOnboardingStory(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="confirm-action-row" style={{ marginTop: '16px' }}>
                          <button
                            type="button"
                            className="btn-submit-choice-compact"
                            onClick={handleSubmitOnboarding}
                            disabled={onboardingSubmitted}
                            style={{ opacity: onboardingSubmitted ? 0.6 : 1 }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            <span>{onboardingSubmitted ? '선택 반영됨' : '선택 완료!'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : hasReport && onOpenReport ? (
                    /* 2. Report Teaser Card */
                    <div className="report-card-compact-slot">
                      <div className="report-card-text-box">
                        <span className="report-card-title-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#626756" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                            <path d="M10 9H8" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                          </svg>
                          <span>심층 분석 보고서</span>
                        </span>
                        <span className="report-card-short-desc">결과 보고서 생성이 완료되었습니다.</span>
                      </div>
                      <button
                        type="button"
                        className="circle-arrow-btn-soft"
                        title="보고서 열기"
                        onClick={() => onOpenReport(extractedReport.reportContent)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ) : choiceDossier && choiceDossier.hasChoices ? (
                    /* 3. Scenario Choice Dossier */
                    <div
                      className="choice-dossier-wrapper"
                      dangerouslySetInnerHTML={{ __html: choiceDossier.html }}
                    />
                  ) : editingMsgId === msg.id ? (
                    /* 4. In-place Edit Form */
                    <div className="msg-edit-container">
                      <textarea
                        className="modal-textarea"
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        rows={3}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn-submit-choice-compact"
                          onClick={() => handleSaveEdit(msg.id)}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          onClick={() => setEditingMsgId(null)}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 5. Standard Rich Markdown Bubble */
                    <div
                      dangerouslySetInnerHTML={{
                        __html: MarkdownParser.parse(msg.content, false)
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Outside Action Bar under bubble */}
              <div className="bubble-action-bar-outside">
                {isModel && (
                  <button
                    type="button"
                    className="bubble-action-btn btn-refresh-msg"
                    title="다시 전송 (새로고침)"
                    onClick={() => onRegenerateMessage(msg.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  className="bubble-action-btn btn-copy-msg"
                  title="전체 복사"
                  onClick={() => handleCopyMessage(msg.content)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>

                {!isFirstMessage && (
                  <>
                    <button
                      type="button"
                      className="bubble-action-btn btn-edit-msg"
                      title="메시지 수정"
                      onClick={() => {
                        setEditingMsgId(msg.id);
                        setEditingContent(msg.content);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen-line">
                        <path d="M13 21h8" />
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="bubble-action-btn btn-delete-msg"
                      title="메시지 삭제"
                      onClick={() => {
                        if (window.confirm('이 메시지를 삭제하시겠습니까?')) {
                          onDeleteMessage(msg.id);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eraser">
                        <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
                        <path d="m5.082 11.09 8.828 8.828" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {(!isPsychology || hasReportGenerated || isCustom) && (
        <div className="chat-input-bar">
          {/* Attached Saju Profiles Tags (Saju mode only) */}
          {category === 'saju' && attachedSajuProfiles.length > 0 && onRemoveSajuProfile && (
            <div id="saju-attached-tags" className="attached-tags-container">
              {attachedSajuProfiles.map(p => (
                <div key={p.id} className="tag-chip saju-chip">
                  <span>{p.name}</span>
                  {p.id && (
                    <button
                      type="button"
                      className="btn-remove-tag"
                      onClick={() => onRemoveSajuProfile(p.id!)}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Attached Files Tags (Images, Docs) */}
          {attachedFiles.length > 0 && (
            <div className="attached-tags-container">
              {attachedFiles.map(f => (
                <div key={f.id} className="tag-chip file-chip">
                  <span>{f.name}</span>
                  <button
                    type="button"
                    className="btn-remove-tag"
                    onClick={() => handleRemoveFile(f.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-input-inner">
            <input
              type="file"
              ref={fileInputRef}
              id={`file-input-${category}`}
              accept="image/*,.txt,.html,text/plain,text/html"
              className="hidden"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              multiple
            />
            <button
              type="button"
              id={`btn-attach-${category}`}
              className="btn-attach"
              aria-label="파일 첨부"
              title="파일 첨부 (사진, TXT, HTML)"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
                <path d="M5 12h14" />
              <path d="M12 5v14" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              id={`${category}-input`}
              className="chat-textarea"
              rows={1}
              placeholder={
                isPsychology
                  ? '분석 보고서에 대해 궁금한 점을 편하게 질문해주세요...'
                  : isCustom
                  ? '궁금한 점이나 생각을 자유롭게 질문해주세요...'
                  : '사주 만세력과 궁금한 내용을 입력하세요...'
              }
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              id={`btn-send-${category}`}
              className="btn-send"
              aria-label="전송"
              disabled={isStreaming}
              onClick={handleSend}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
