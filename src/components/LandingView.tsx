import React from 'react';

interface LandingViewProps {
  onSelectCategory: (category: 'psychology' | 'saju') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSelectCategory }) => {
  return (
    <section id="view-landing" className="view-section active">
      <div className="landing-celestial-stage">
        <span className="landing-top-badge">Choose Your Portal</span>

        {/* 궤도 및 듀얼 오브 (정밀 핸드크래프트 SVG) */}
        <div className="celestial-orbit-system">
          <svg viewBox="0 0 270 270" className="orbit-c-expanded-svg" aria-hidden="true">
            {/* 은은하고 연한 본래의 앤틱 대시선 궤도 (지름 262px, r=131) */}
            <circle
              cx="135"
              cy="135"
              r="131"
              stroke="#D1CFC2"
              strokeWidth="1.1"
              strokeDasharray="4 16"
              fill="none"
              opacity="0.6"
            />
            {/* 3대 행성군 (가운데 꽉 채워진 솔리드 행성 & 서브 행성) */}
            <circle cx="135" cy="4" r="6.5" fill="#747B61" />
            <circle cx="135" cy="4" r="3.2" fill="#5A614A" />
            <circle cx="248" cy="201" r="5" fill="#8F967E" />
            <circle cx="22" cy="201" r="4.5" fill="#5A614A" />
            {/* 성운 파티클 더스트 */}
            <circle cx="195" cy="18" r="1.8" fill="#747B61" />
            <circle cx="75" cy="18" r="1.5" fill="#747B61" />
            <circle cx="264" cy="110" r="1.4" fill="#8F967E" />
            <circle cx="6" cy="110" r="1.4" fill="#5A614A" />
            <circle cx="135" cy="266" r="2" fill="#747B61" />
            <circle cx="235" cy="51" r="2.4" fill="#B2B9A8" />
            <circle cx="19" cy="74" r="1.2" fill="#8F967E" />
            <circle cx="180" cy="258" r="2.7" fill="#5A614A" />
            <circle cx="262" cy="167" r="1.9" fill="#9BA38A" />
            <circle cx="90" cy="258" r="2.3" fill="#A8B09F" />
            <circle cx="6" cy="155" r="1.6" fill="#4B533C" />
          </svg>

          {/* 오브 1: 심리학 (내면/무의식 아우라 리플 SVG) */}
          <button
            type="button"
            id="btn-start-psychology"
            className="celestial-orb-btn orb-psyche"
            aria-label="심리학 세션 시작"
            onClick={() => onSelectCategory('psychology')}
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              stroke="#747B61"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="24" cy="24" r="5" fill="#747B61" fillOpacity="0.14" />
              <path d="M14 24c0-5.523 4.477-10 10-10s10 4.477 10 10" />
              <path d="M8 24c0-8.837 7.163-16 16-16s16 7.163 16 16" />
              <path d="M17 29c1.8 3.5 4.5 5 7 5s5.2-1.5 7-5" />
              <circle cx="24" cy="24" r="1.5" fill="#747B61" />
            </svg>
            <span className="orb-title">심리학</span>
          </button>

          {/* 오브 2: 명리학 (천구 혼천의 / 천체 궤도 축 SVG) */}
          <button
            type="button"
            id="btn-start-saju"
            className="celestial-orb-btn orb-saju"
            aria-label="명리학 세션 시작"
            onClick={() => onSelectCategory('saju')}
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 48 48"
              fill="none"
              stroke="#747B61"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="24" cy="24" r="3" fill="#747B61" />
              <ellipse cx="24" cy="24" rx="17" ry="7.5" transform="rotate(-30 24 24)" />
              <ellipse cx="24" cy="24" rx="17" ry="7.5" transform="rotate(50 24 24)" />
              <line x1="24" y1="5" x2="24" y2="8.5" />
              <line x1="24" y1="39.5" x2="24" y2="43" />
              <line x1="5" y1="24" x2="8.5" y2="24" />
              <line x1="39.5" y1="24" x2="43" y2="24" />
            </svg>
            <span className="orb-title">명리학</span>
          </button>
        </div>

        {/* 가이드 텍스트 (엔터 줄바꿈 반영) */}
        <p className="landing-guide-text">
          내면의 무의식과 타고난 운명의 결,<br />
          마주하고 싶은 문을 터치하세요.
        </p>
      </div>
    </section>
  );
};
