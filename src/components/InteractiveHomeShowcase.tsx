import React, { useState } from 'react';
import { CustomPrompt } from '../types';
import { showToast } from '../utils/uiHelpers';

interface InteractiveHomeShowcaseProps {
  prompts: CustomPrompt[];
  activePrompt: CustomPrompt | null;
  onSelectPrompt: (prompt: CustomPrompt) => void;
  onStartChat: () => void;
  onOpenPromptDrawer: () => void;
  savedDesignId?: number;
  onSaveDesignPreference: (designId: number) => void;
}

export const InteractiveHomeShowcase: React.FC<InteractiveHomeShowcaseProps> = ({
  prompts,
  activePrompt,
  onSelectPrompt,
  onStartChat,
  onOpenPromptDrawer,
  savedDesignId = 1,
  onSaveDesignPreference
}) => {
  const [currentDesign, setCurrentDesign] = useState<number>(savedDesignId);

  const designNames = [
    '1. 모노리스 천체 오브',
    '2. 에테르 프롬프트 캐러셀',
    '3. 선(Zen) 타이포그래피',
    '4. 천체 성운 나침반',
    '5. 스튜디오 프리셋 타일',
    '6. 공명 파동 링',
    '7. 미니멀 엠프티 캔버스',
    '8. 아카이브 연대기 피드',
    '9. 코스믹 아틀라스',
    '10. 모던 스튜디오 런치패드'
  ];

  const handleApplyDesign = (id: number) => {
    onSaveDesignPreference(id);
    showToast(`"${designNames[id - 1]}" 디자인이 기본 홈으로 적용되었습니다.`);
  };

  return (
    <div className="home-showcase-container" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. 상단 인터랙티브 디자인 테스팅 바 */}
      <div
        className="design-tester-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          background: 'rgba(244, 241, 234, 0.94)',
          borderBottom: '1px solid var(--border-soft, #E5E2D6)',
          zIndex: 20,
          backdropFilter: 'blur(8px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-dark-matcha, #34402F)' }}>
            디자인 테스터:
          </span>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', maxWidth: 'calc(100vw - 180px)', padding: '2px 0' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentDesign(num)}
                title={designNames[num - 1]}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: currentDesign === num ? '1.5px solid #5A614A' : '1px solid #D6D3C7',
                  background: currentDesign === num ? '#5A614A' : '#FAF8F2',
                  color: currentDesign === num ? '#FAF8F2' : '#4B533C',
                  fontSize: '0.76rem',
                  fontWeight: currentDesign === num ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleApplyDesign(currentDesign)}
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid #747B61',
            background: 'rgba(116, 123, 97, 0.12)',
            color: '#34402F',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ✓ {currentDesign}번으로 확정
        </button>
      </div>

      {/* 2. 각 디자인별 메인 스테이지 렌더링 */}
      <div style={{ flex: 1, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* [디자인 1] 모노리스 천체 오브 (Monolith Resonance) */}
        {currentDesign === 1 && (
          <div className="landing-celestial-stage" style={{ padding: '30px 16px', margin: 'auto' }}>
            <span className="landing-top-badge">Custom Dialogue Portal</span>
            <div className="celestial-orbit-system">
              <svg viewBox="0 0 270 270" className="orbit-c-expanded-svg" aria-hidden="true">
                <circle cx="135" cy="135" r="131" stroke="#D1CFC2" strokeWidth="1.2" strokeDasharray="3 14" fill="none" opacity="0.7" />
                <circle cx="135" cy="135" r="95" stroke="#E2DFD2" strokeWidth="0.8" strokeDasharray="2 10" fill="none" opacity="0.5" />
                <circle cx="135" cy="4" r="6" fill="#747B61" />
                <circle cx="248" cy="201" r="5" fill="#8F967E" />
                <circle cx="22" cy="201" r="4.5" fill="#5A614A" />
                <circle cx="135" cy="266" r="3" fill="#747B61" />
                <circle cx="19" cy="74" r="2" fill="#8F967E" />
              </svg>

              <button
                type="button"
                className="celestial-orb-btn"
                style={{ width: '136px', height: '136px', border: '1.5px solid rgba(116, 123, 97, 0.4)' }}
                onClick={onStartChat}
                aria-label="대화 시작하기"
              >
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#5A614A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="11" r="1" fill="#5A614A"/>
                  <circle cx="8" cy="11" r="1" fill="#5A614A"/>
                  <circle cx="16" cy="11" r="1" fill="#5A614A"/>
                </svg>
                <span className="orb-title" style={{ marginTop: '8px' }}>대화 시작</span>
              </button>
            </div>
            <p className="landing-guide-text">
              {activePrompt ? `현재 지침: ${activePrompt.title}` : '원하는 지침을 부여하고 자유롭게 대화를 시작하세요.'}<br />
              중앙 오브를 터치하거나 우측 상단에서 프롬프트를 설정하세요.
            </p>
          </div>
        )}

        {/* [디자인 2] 에테르 프롬프트 캐러셀 (Ether Swiper) */}
        {currentDesign === 2 && (
          <div style={{ padding: '36px 20px', maxWidth: '500px', margin: 'auto', width: '100%' }}>
            <span className="landing-top-badge" style={{ display: 'inline-block', marginBottom: '16px' }}>Select Prompt Card</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2A3022', margin: '0 0 8px 0' }}>어떤 페르소나와 이야기 나눌까요?</h2>
            <p style={{ fontSize: '0.82rem', color: '#666B59', margin: '0 0 22px 0' }}>우측 서랍에서 등록한 맞춤 프롬프트 카드들이 나열됩니다.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(prompts.length > 0 ? prompts : [
                { id: 1, title: '심층 사유 및 글쓰기 조력자', content: '글의 논리와 통찰을 날카롭게 다듬어주는 파트너', createdAt: Date.now() },
                { id: 2, title: '자유 대화 (기본 어시스턴트)', content: '별도 지침 없이 명확하고 유연하게 답변하는 모드', createdAt: Date.now() }
              ]).map((p: any) => {
                const isSelected = activePrompt?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPrompt(p)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #747B61' : '1px solid #E5E2D6',
                      background: isSelected ? 'rgba(116, 123, 97, 0.12)' : '#FFFFFF',
                      boxShadow: isSelected ? '0 4px 14px rgba(116, 123, 97, 0.16)' : '0 2px 6px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn-submit-choice-compact"
                style={{ width: '100%', padding: '12px 18px', fontSize: '0.92rem' }}
                onClick={onStartChat}
              >
                이 프롬프트로 대화 시작하기
              </button>
            </div>
          </div>
        )}

        {/* [디자인 3] 선(Zen) 타이포그래피 & 플로팅 알약 */}
        {currentDesign === 3 && (
          <div style={{ padding: '60px 24px', maxWidth: '440px', margin: 'auto', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#88917A', display: 'block', marginBottom: '14px' }}>
              Quiet Dialogue Space
            </span>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 400, color: '#2B3124', lineHeight: 1.7, margin: '0 0 28px 0', fontFamily: 'serif' }}>
              어떤 생각이든,<br />
              <strong style={{ fontWeight: 600, color: '#4B533C' }}>당신의 언어</strong>로 온전히 시작하세요.
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#777C6D', lineHeight: 1.6, marginBottom: '40px' }}>
              지침이 필요하다면 우측 상단 설정을 열고,<br />
              준비되었다면 언제든 대화를 열어보세요.
            </p>
            <button
              type="button"
              onClick={onStartChat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                borderRadius: '30px',
                background: '#5A614A',
                color: '#FAF8F2',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(90, 97, 74, 0.28)',
                transition: 'transform 0.18s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
              <span>새 대화 시작하기</span>
            </button>
          </div>
        )}

        {/* [디자인 4] 천체 성운 나침반 (Celestial Astrolabe) */}
        {currentDesign === 4 && (
          <div style={{ padding: '40px 16px', margin: 'auto', textAlign: 'center' }}>
            <span className="landing-top-badge">Astrolabe Dial</span>
            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '20px auto' }}>
              <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%', animation: 'spin 60s linear infinite' }}>
                <circle cx="110" cy="110" r="105" stroke="#C9C6B8" strokeWidth="1" strokeDasharray="2 6" fill="none" />
                <circle cx="110" cy="110" r="88" stroke="#747B61" strokeWidth="1.2" strokeDasharray="6 12" fill="none" opacity="0.6" />
                <line x1="110" y1="5" x2="110" y2="215" stroke="#D1CFC2" strokeWidth="0.8" />
                <line x1="5" y1="110" x2="215" y2="110" stroke="#D1CFC2" strokeWidth="0.8" />
                <circle cx="110" cy="22" r="3.5" fill="#5A614A" />
                <circle cx="198" cy="110" r="3.5" fill="#5A614A" />
                <circle cx="110" cy="198" r="3.5" fill="#5A614A" />
                <circle cx="22" cy="110" r="3.5" fill="#5A614A" />
              </svg>
              <button
                type="button"
                onClick={onStartChat}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FAF8F2 0%, #EDE9DE 100%)',
                  border: '1.5px solid #747B61',
                  boxShadow: '0 4px 16px rgba(116, 123, 97, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A614A" strokeWidth="2">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"/>
                </svg>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#34402F', marginTop: '4px' }}>탐구 시작</span>
              </button>
            </div>
            <p className="landing-guide-text">나침반을 터치하여 사유의 항로를 탐색하세요.</p>
          </div>
        )}

        {/* [디자인 5] 스튜디오 프리셋 타일 (Studio Tiles) */}
        {currentDesign === 5 && (
          <div style={{ padding: '30px 20px', maxWidth: '480px', margin: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#2B3124' }}>프롬프트 스튜디오 타일</h3>
                <span style={{ fontSize: '0.78rem', color: '#747B61' }}>원터치로 즉시 대화 진입</span>
              </div>
              <button
                type="button"
                onClick={onOpenPromptDrawer}
                className="icon-btn-minimal"
                title="프롬프트 목록 열기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14"/><path d="M5 12h14"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {[
                { title: '사유와 성찰', desc: '내면의 생각을 깊이 있게 되짚어보기' },
                { title: '언어 및 문장 교정', desc: '글의 어조와 문맥을 매끄럽게 다듬기' },
                { title: '아이디어 브레인스톰', desc: '새로운 발상과 관점 확장' },
                { title: '자유 질의응답', desc: '형식에 얽매이지 않는 빠른 소통' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={onStartChat}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E2D6',
                    cursor: 'pointer',
                    transition: 'border 0.2s, transform 0.2s',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#747B61'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E2D6'}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', lineHeight: 1.4 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-submit-choice-compact"
              style={{ width: '100%', padding: '12px' }}
              onClick={onStartChat}
            >
              새 빈 대화 시작
            </button>
          </div>
        )}

        {/* [디자인 6] 공명 파동 링 (Resonance Ripple) */}
        {currentDesign === 6 && (
          <div style={{ padding: '50px 16px', margin: 'auto', textAlign: 'center' }}>
            <span className="landing-top-badge">Resonance Field</span>
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '28px auto' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '1px solid rgba(116, 123, 97, 0.3)',
                  animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '25px',
                  borderRadius: '50%',
                  border: '1.2px solid rgba(116, 123, 97, 0.5)',
                  animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.6s'
                }}
              />
              <button
                type="button"
                onClick={onStartChat}
                style={{
                  position: 'absolute',
                  inset: '50px',
                  borderRadius: '50%',
                  background: '#747B61',
                  color: '#FAF8F2',
                  border: 'none',
                  boxShadow: '0 6px 20px rgba(116, 123, 97, 0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            </div>
            <p className="landing-guide-text">파동의 중심을 터치하여 공명을 시작하세요.</p>
          </div>
        )}

        {/* [디자인 7] 미니멀 엠프티 캔버스 (Zen Canvas) */}
        {currentDesign === 7 && (
          <div style={{ padding: '60px 20px 20px', maxWidth: '480px', margin: 'auto', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ textAlign: 'center', margin: 'auto 0' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3A4230', letterSpacing: '4px', marginBottom: '8px' }}>
                𝗔𝗕𝗢𝗨𝗧 𝗠𝗘
              </div>
              <div style={{ fontSize: '0.84rem', color: '#777C6D', lineHeight: 1.5 }}>
                조건 없는 지침과 열린 사유의 방
              </div>
            </div>

            <div style={{ width: '100%', marginBottom: '24px' }}>
              <div
                onClick={onStartChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1.2px solid #D6D3C7',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.86rem', color: '#888D7F' }}>무엇이든 물어보거나 생각을 적어보세요...</span>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#747B61', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* [디자인 8] 아카이브 쇼케이스 피드 (Chronicle Feed) */}
        {currentDesign === 8 && (
          <div style={{ padding: '28px 18px', maxWidth: '480px', margin: 'auto', width: '100%' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#747B61', marginBottom: '4px' }}>CHRONICLE & PROMPT</div>
            <h2 style={{ fontSize: '1.18rem', fontWeight: 600, color: '#2B3124', margin: '0 0 16px 0' }}>맞춤 대화 아카이브</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                onClick={onStartChat}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1.5px dashed #747B61',
                  background: 'rgba(116, 123, 97, 0.05)',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#4B533C' }}>+ 새 대화 세션 생성</div>
                <div style={{ fontSize: '0.76rem', color: '#777C6D', marginTop: '2px' }}>지정된 시스템 프롬프트로 질의응답</div>
              </div>

              {prompts.slice(0, 3).map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPrompt(p);
                    onStartChat();
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E2D6',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B', marginBottom: '2px' }}>{p.title}</div>
                  <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>터치하여 즉시 실행</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [디자인 9] 코스믹 아틀라스 (Cosmic Atlas) */}
        {currentDesign === 9 && (
          <div style={{ padding: '40px 16px', margin: 'auto', textAlign: 'center' }}>
            <span className="landing-top-badge">Cosmic Atlas Node</span>
            <div style={{ position: 'relative', width: '240px', height: '180px', margin: '24px auto' }}>
              <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%' }}>
                <line x1="40" y1="50" x2="120" y2="90" stroke="#C9C6B8" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="120" y1="90" x2="200" y2="40" stroke="#C9C6B8" strokeWidth="1.2" strokeDasharray="3 3"/>
                <line x1="120" y1="90" x2="120" y2="150" stroke="#C9C6B8" strokeWidth="1.2" strokeDasharray="3 3"/>
                <circle cx="40" cy="50" r="5" fill="#747B61"/>
                <circle cx="200" cy="40" r="4" fill="#8F967E"/>
                <circle cx="120" cy="150" r="4.5" fill="#5A614A"/>
                <circle cx="120" cy="90" r="14" fill="#5A614A" fillOpacity="0.12" stroke="#5A614A" strokeWidth="1.5"/>
                <circle cx="120" cy="90" r="5" fill="#5A614A"/>
              </svg>
            </div>
            <button
              type="button"
              className="btn-submit-choice-compact"
              style={{ padding: '12px 28px' }}
              onClick={onStartChat}
            >
              성간 사유의 문 열기
            </button>
          </div>
        )}

        {/* [디자인 10] 모던 스튜디오 런치패드 (Studio Launchpad) */}
        {currentDesign === 10 && (
          <div style={{ padding: '40px 20px', maxWidth: '440px', margin: 'auto', width: '100%', textAlign: 'center' }}>
            <div
              onClick={onOpenPromptDrawer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '16px',
                background: 'rgba(116, 123, 97, 0.1)',
                border: '1px solid rgba(116, 123, 97, 0.25)',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5A614A' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34402F' }}>
                {activePrompt ? `지침: ${activePrompt.title}` : '설정된 지침 없음 (터치하여 변경)'}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#2B3124', margin: '0 0 10px 0' }}>
              프롬프트 런치패드
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#666B59', margin: '0 0 32px 0' }}>
              선택된 시스템 프롬프트가 주입되어 최적화된 상태로 대화가 시작됩니다.
            </p>

            <button
              type="button"
              onClick={onStartChat}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#5A614A',
                color: '#FAF8F2',
                border: '4px solid rgba(250, 248, 242, 0.8)',
                boxShadow: '0 8px 24px rgba(90, 97, 74, 0.3)',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.18s ease'
              }}
            >
              LAUNCH
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
