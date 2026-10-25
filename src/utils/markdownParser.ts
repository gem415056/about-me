// @ts-nocheck
// ABOUT ME - Markdown and Visual Chart Parser
import { copyToClipboard, showToast } from './uiHelpers';
import { DB } from '../db/indexedDb';

const enneaSampleDataMap = {
  '5w6': {
    "도출유형": "5w6 (6번 날개를 쓰는 탐구자)",
    "1번_완벽주의자": 45, "2번_조력가": 20, "3번_성취가": 30, "4번_예술가": 52, "5번_탐구자": 95,
    "6번_충실가": 80, "7번_열정가": 38, "8번_도전가": 25, "9번_평화주의자": 48,
    "장본능센터": 24, "가슴감정센터": 26, "머리사고센터": 50,
    "왼쪽날개_4번": 35, "오른쪽날개_6번": 65,
    "자기보존": 88, "일대일": 45, "사회적": 62,
    "통합_성장에너지": 82, "분열_스트레스반응": 32
  },
  '2w3': {
    "도출유형": "2w3 (3번 날개를 쓰는 조력가)",
    "1번_완벽주의자": 30, "2번_조력가": 92, "3번_성취가": 78, "4번_예술가": 40, "5번_탐구자": 25,
    "6번_충실가": 50, "7번_열정가": 65, "8번_도전가": 35, "9번_평화주의자": 55,
    "장본능센터": 28, "가슴감정센터": 52, "머리사고센터": 20,
    "왼쪽날개_1번": 30, "오른쪽날개_3번": 70,
    "자기보존": 42, "일대일": 75, "사회적": 85,
    "통합_성장에너지": 75, "분열_스트레스반응": 48
  },
  '8w7': {
    "도출유형": "8w7 (7번 날개를 쓰는 도전가)",
    "1번_완벽주의자": 40, "2번_조력가": 25, "3번_성취가": 70, "4번_예술가": 20, "5번_탐구자": 50,
    "6번_충실가": 35, "7번_열정가": 82, "8번_도전가": 96, "9번_평화주의자": 30,
    "장본능센터": 54, "가슴감정센터": 22, "머리사고센터": 24,
    "왼쪽날개_7번": 68, "오른쪽날개_9번": 32,
    "자기보존": 78, "일대일": 88, "사회적": 50,
    "통합_성장에너지": 85, "분열_스트레스반응": 58
  },
  '9w1': {
    "도출유형": "9w1 (1번 날개를 쓰는 평화주의자)",
    "1번_완벽주의자": 72, "2번_조력가": 55, "3번_성취가": 30, "4번_예술가": 45, "5번_탐구자": 50,
    "6번_충실가": 60, "7번_열정가": 35, "8번_도전가": 28, "9번_평화주의자": 94,
    "장본능센터": 58, "가슴감정센터": 22, "머리사고센터": 20,
    "왼쪽날개_8번": 25, "오른쪽날개_1번": 75,
    "자기보존": 80, "일대일": 52, "사회적": 68,
    "통합_성장에너지": 76, "분열_스트레스반응": 28
  }
};

// 10% 단위 정밀 스펙트럼 말차 색상 추출 함수
function get10PercentColor(score) {
  const val = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
  if (val >= 90) return '#34402F'; // 90~100% 딥 말차 포레스트
  if (val >= 80) return '#404E3A'; // 80~89%
  if (val >= 70) return '#4D5D46'; // 70~79%
  if (val >= 60) return '#5A6C53'; // 60~69%
  if (val >= 50) return '#687B60'; // 50~59%
  if (val >= 40) return '#778A6E'; // 40~49%
  if (val >= 30) return '#889B7F'; // 30~39%
  if (val >= 20) return '#99AC91'; // 20~29%
  if (val >= 10) return '#ABC0A4'; // 10~19%
  return '#C0D0BA';                // 0~9% 소프트 세이지
}

const TYPE_NAMES = ["완벽주의자", "조력가", "성취가", "예술가", "탐구자", "충실가", "열정가", "도전가", "평화주의자"];

function formatWingTitle(key) {
  if (!key || typeof key !== 'string') return '날개';
  const match = key.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 9) {
      return `${num}번 (${TYPE_NAMES[num - 1]})`;
    }
  }
  return key.replace(/^(왼쪽날개|오른쪽날개|주날개|보조날개)[_:\s]*/, '') || key;
}

// 1열: 9개 유형 스펙트럼 9각형 레이더 차트 (꼭짓점 외곽 간격 확보, 5/6 우측정렬·3/4 좌측정렬, 상하좌우 완벽 일치 5.5px 패딩 배지)
function generateRadarSvgHtml(data) {
  const centerX = 260, centerY = 215, maxRadius = 140, numPoints = 9;

  function getTypeScore(typeNum) {
    if (!data || typeof data !== 'object') return 0;
    const key = Object.keys(data).find(k => {
      if (k.startsWith(`${typeNum}번`) || k.startsWith(`${typeNum}.`)) return true;
      if (k.includes(`${typeNum}번`)) return true;
      if (k === `${typeNum}` || k === `유형${typeNum}` || k === `Type ${typeNum}`) return true;
      return false;
    });
    return key ? (parseInt(data[key], 10) || 0) : 0;
  }

  function getEnneaTextWidth(str) {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 255) {
        w += 13.2; // 한글 글리프 너비 (13.5px 규격)
      } else if (str[i] === ' ' || str[i] === '(' || str[i] === ')') {
        w += 4.5;
      } else {
        w += 7.8; // 숫자 및 영문
      }
    }
    return w;
  }

  // 정통 에니어그램 좌표계: 9번이 맨 위(-90도 = 12시 방향), 시계방향 1번(-50도), 2번(-10도)...
  function getCoords(typeNum, value) {
    const step = (typeNum % 9);
    const angle = (-Math.PI / 2) + (step * (2 * Math.PI / numPoints));
    const r = (value / 100) * maxRadius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  }

  let scores = [];
  for (let i = 1; i <= 9; i++) scores.push(getTypeScore(i));

  // 주 유형 (1위) & 부 유형 (2위) 판별
  const sortedScores = [...scores].sort((a, b) => b - a);
  const primaryVal = sortedScores[0];
  const secondaryVal = sortedScores[1] !== undefined ? sortedScores[1] : -1;

  let svgContent = '';

  // 동심 9각형 배경 가이드 격자선 (25%, 50%, 75%, 100%)
  [0.25, 0.50, 0.75, 1.0].forEach(lvl => {
    let polygonPoints = [];
    for (let i = 1; i <= numPoints; i++) {
      const pt = getCoords(i, lvl * 100);
      polygonPoints.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }
    svgContent += `<polygon points="${polygonPoints.join(' ')}" fill="none" stroke="${lvl === 1.0 ? '#E2DFD2' : '#EAE7DB'}" stroke-width="${lvl === 1.0 ? '1.0' : '0.8'}" stroke-dasharray="${lvl === 1.0 ? 'none' : '2,2'}"/>`;
  });

  // 중심 방사선
  for (let i = 1; i <= numPoints; i++) {
    const outerPt = getCoords(i, 100);
    svgContent += `<line x1="${centerX}" y1="${centerY}" x2="${outerPt.x.toFixed(1)}" y2="${outerPt.y.toFixed(1)}" stroke="#EAE7DB" stroke-width="0.8"/>`;
  }

  // 사용자 실질 데이터 폴리곤 계산 (1번부터 9번까지 순서대로)
  let userPoints = [];
  for (let i = 1; i <= numPoints; i++) {
    const val = scores[i - 1];
    const pt = getCoords(i, val);
    userPoints.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  }

  // 3대 에너지 센터의 가장 진하고 큰 영역(#4D5C45)과 일치하는 짙은 차트 내부 채움색
  svgContent += `
    <polygon points="${userPoints.join(' ')}" fill="rgba(77, 92, 69, 0.52)" stroke="#4D5C45" stroke-width="1.3" stroke-linejoin="round"/>
  `;

  // 9개 꼭짓점별 정밀 라벨 및 수치% 배치 (9, 1, 2, 7, 8번 외곽 균등 여백 확장)
  for (let i = 1; i <= numPoints; i++) {
    const val = scores[i - 1];
    const typeTitle = `${i}번 (${TYPE_NAMES[i - 1]})`;

    const isPrimary = (val === primaryVal && val > 0);
    const isSecondary = (!isPrimary && val === secondaryVal && val > 0);

    let textAnchor = "start";
    let xNum = 0, yNum = 0, xText = 0, yText = 0;

    if (i === 9) {
      // 9번: 꼭짓점(260, 75) 직상단 충분한 여백 확보
      textAnchor = "middle";
      xNum = 260;
      yNum = 48;
      xText = 260;
      yText = 24;
    } else if (i === 1) {
      // 1번: 꼭짓점(350, 108) 외측 충분한 여백 확보
      textAnchor = "start";
      xNum = 372;
      yNum = 104;
      xText = 372;
      yText = 82;
    } else if (i === 2) {
      // 2번: 꼭짓점(398, 191) 외측 충분한 여백 확보
      textAnchor = "start";
      xNum = 422;
      yNum = 196;
      xText = 422;
      yText = 174;
    } else if (i === 3) {
      // 3번: 꼭짓점(381, 285) 외측, 하단 좌측정렬 (시작점 일치: textAnchor="start")
      textAnchor = "start";
      xNum = 402;
      yNum = 298;
      xText = 402;
      yText = 320;
    } else if (i === 4) {
      // 4번: 꼭짓점(308, 347) 외측 여백 확보, 하단 좌측정렬 (시작점 일치: textAnchor="start")
      textAnchor = "start";
      xNum = 324;
      yNum = 368;
      xText = 324;
      yText = 390;
    } else if (i === 5) {
      // 5번: 꼭짓점(212, 347) 외측 여백 확보, 하단 우측정렬 (끝점 일치: textAnchor="end")
      textAnchor = "end";
      xNum = 196;
      yNum = 368;
      xText = 196;
      yText = 390;
    } else if (i === 6) {
      // 6번: 꼭짓점(139, 285) 외측, 하단 우측정렬 (끝점 일치: textAnchor="end")
      textAnchor = "end";
      xNum = 118;
      yNum = 298;
      xText = 118;
      yText = 320;
    } else if (i === 7) {
      // 7번: 꼭짓점(122, 191) 외측 충분한 여백 확보 (끝점 일치: textAnchor="end")
      textAnchor = "end";
      xNum = 98;
      yNum = 196;
      xText = 98;
      yText = 174;
    } else if (i === 8) {
      // 8번: 꼭짓점(170, 108) 외측 충분한 여백 확보 (끝점 일치: textAnchor="end")
      textAnchor = "end";
      xNum = 148;
      yNum = 104;
      xText = 148;
      yText = 82;
    }

    // 상하패딩(5.5px)과 좌우패딩(5.5px)이 완벽히 일치하는 정밀 배지 (날개 주도권 폰트 규격 적용)
    const textW = getEnneaTextWidth(typeTitle);
    const pad = 5.5;
    const badgeW = Math.round(textW + pad * 2);
    const badgeH = 23;
    const badgeRx = 5.0;

    let badgeRectX = 0;
    let badgeTextX = 0;

    if (textAnchor === 'start') {
      badgeRectX = xText - pad;
      badgeTextX = xText + textW / 2;
    } else if (textAnchor === 'end') {
      badgeRectX = xText - textW - pad;
      badgeTextX = xText - textW / 2;
    } else {
      badgeRectX = xText - badgeW / 2;
      badgeTextX = xText;
    }
    const badgeRectY = yText - 11.5;

    if (isPrimary) {
      svgContent += `
        <rect x="${badgeRectX.toFixed(1)}" y="${badgeRectY.toFixed(1)}" width="${badgeW}" height="${badgeH}" rx="${badgeRx}" fill="#384534" />
        <text x="${badgeTextX.toFixed(1)}" y="${yText}" text-anchor="middle" dominant-baseline="central" font-size="13.5px" font-weight="800" fill="#FAF8F2">
          ${typeTitle}
        </text>
      `;
    } else if (isSecondary) {
      svgContent += `
        <rect x="${badgeRectX.toFixed(1)}" y="${badgeRectY.toFixed(1)}" width="${badgeW}" height="${badgeH}" rx="${badgeRx}" fill="#72846A" />
        <text x="${badgeTextX.toFixed(1)}" y="${yText}" text-anchor="middle" dominant-baseline="central" font-size="13.5px" font-weight="700" fill="#FAF8F2">
          ${typeTitle}
        </text>
      `;
    } else {
      svgContent += `
        <text x="${xText}" y="${yText}" text-anchor="${textAnchor}" dominant-baseline="central" font-size="13.5px" font-weight="600" fill="#525B49">
          ${typeTitle}
        </text>
      `;
    }

    // 꼭짓점에 안착되는 숫자% (날개 주도권 수치 규격 적용)
    let numColor = '#35523A';
    let numWeight = '700';
    let numSize = '13px';
    if (isPrimary) {
      numColor = '#243C28';
      numWeight = '800';
      numSize = '13.5px';
    } else if (isSecondary) {
      numColor = '#35523A';
      numWeight = '800';
      numSize = '13px';
    }

    svgContent += `
      <text x="${xNum}" y="${yNum}" text-anchor="${textAnchor}" dominant-baseline="central" font-size="${numSize}" font-weight="${numWeight}" fill="${numColor}">
        ${val}%
      </text>
    `;
  }

  return `<svg viewBox="0 0 520 430" width="100%" height="100%" style="display: block; margin: 0 auto; max-width: 500px;">${svgContent}</svg>`;
}

// 2열 좌측: 3대 에너지 센터 대형 도넛 차트 (가슴/장 텍스트 유지 및 수치 톤온톤 짙게 보정)
function generateCentersDonutSvg(gut, heart, head) {
  const cX = 110, cY = 110, r = 70;
  const circumference = 2 * Math.PI * r;
  const total = (gut + heart + head) || 1;

  const pGut = gut / total;
  const pHeart = heart / total;
  const pHead = head / total;

  const lenGut = pGut * circumference;
  const lenHeart = pHeart * circumference;
  const lenHead = pHead * circumference;

  const offsetGut = 0;
  const offsetHeart = -lenGut;
  const offsetHead = -(lenGut + lenHeart);

  // 슬라이스별 각도 및 중심 좌표 계산
  const aGut = pGut * (2 * Math.PI);
  const aHeart = pHeart * (2 * Math.PI);
  const aHead = pHead * (2 * Math.PI);

  const midGut = -Math.PI / 2 + (aGut / 2);
  const midHeart = -Math.PI / 2 + aGut + (aHeart / 2);
  const midHead = -Math.PI / 2 + aGut + aHeart + (aHead / 2);

  const ptGut = { x: cX + r * Math.cos(midGut), y: cY + r * Math.sin(midGut) };
  const ptHeart = { x: cX + r * Math.cos(midHeart), y: cY + r * Math.sin(midHeart) };
  const ptHead = { x: cX + r * Math.cos(midHead), y: cY + r * Math.sin(midHead) };

  const slices = [
    { name: '장', val: gut, len: lenGut, offset: offsetGut, pt: ptGut },
    { name: '가슴', val: heart, len: lenHeart, offset: offsetHeart, pt: ptHeart },
    { name: '머리', val: head, len: lenHead, offset: offsetHead, pt: ptHead }
  ];

  const sorted = [...slices].sort((a, b) => b.val - a.val);

  const rankStrokes = ['#4D5C45', '#8E9E85', '#D0DCD0'];

  sorted.forEach((item, rank) => {
    item.stroke = rankStrokes[rank] || '#D0DCD0';
    // 톤온톤 미감 배색:
    // 머리: 1위 깊은 말차 -> 웜크림 텍스트 / 소프트 말차 수치
    // 가슴: 텍스트 그대로(#2A3022) / 가슴 수치(#283222)
    // 장: 가슴보다는 아주 살짝 연하고 기존보다 진한 톤 -> 장 텍스트(#384330), 장 수치(#343F2D)
    if (item.name === '머리') {
      item.textFill = '#FAF8F2';
      item.pctFill = '#D2DEC9';
    } else if (item.name === '가슴') {
      item.textFill = '#2A3022';
      item.pctFill = '#283222';
    } else if (item.name === '장') {
      item.textFill = '#384330';
      item.pctFill = '#343F2D';
    } else {
      item.textFill = '#2A3022';
      item.pctFill = '#343F2D';
    }
  });

  // 중앙 주도형 텍스트 및 간략 설명
  let dominantTitle = '머리 주도형';
  let dominantDesc = '사고·관찰 중심';
  if (gut >= heart && gut >= head) {
    dominantTitle = '장 주도형';
    dominantDesc = '본능·직관 중심';
  } else if (heart >= gut && heart >= head) {
    dominantTitle = '가슴 주도형';
    dominantDesc = '감정·공감 중심';
  }

  let ringsSvg = '';
  slices.forEach(s => {
    ringsSvg += `
      <circle cx="${cX}" cy="${cY}" r="${r}" fill="none" stroke="${s.stroke}" stroke-width="48"
              stroke-dasharray="${s.len.toFixed(2)} ${circumference.toFixed(2)}"
              stroke-dashoffset="${s.offset.toFixed(2)}" />
    `;
  });

  let labelsSvg = '';
  slices.forEach(s => {
    if (s.val >= 4) {
      labelsSvg += `
        <text x="${s.pt.x.toFixed(1)}" y="${s.pt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central">
          <tspan x="${s.pt.x.toFixed(1)}" dy="-7" font-size="12px" font-weight="800" fill="${s.textFill}">${s.name}</tspan>
          <tspan x="${s.pt.x.toFixed(1)}" dy="15" font-size="10.5px" font-weight="800" fill="${s.pctFill}">${s.val}%</tspan>
        </text>
      `;
    }
  });

  return `
    <svg viewBox="0 0 220 220" style="display: block; margin: 0 auto; width: 100%; max-width: 250px; height: auto;">
      <g transform="rotate(-90 ${cX} ${cY})">
        <circle cx="${cX}" cy="${cY}" r="${r}" fill="none" stroke="#EAE8DF" stroke-width="48" />
        ${ringsSvg}
      </g>

      <!-- 도넛 링 밴드 내부 라벨 (숫자가 텍스트보다 1.5px 작고 색상 차등) -->
      ${labelsSvg}

      <!-- 중앙 속 링 내부 주도형 타이포그래피 -->
      <text x="${cX}" y="${cY - 6}" text-anchor="middle" dominant-baseline="central" font-size="13px" font-weight="800" fill="#2A3022">${dominantTitle}</text>
      <text x="${cX}" y="${cY + 10}" text-anchor="middle" dominant-baseline="central" font-size="9.5px" font-weight="600" fill="#626756">${dominantDesc}</text>
    </svg>
  `;
}

// 전용 에니어그램 완성형 3개 열(Row) 리포트 카드 HTML 생성기
function generateFullEnneagramReportHtml(data) {
  if (!data || typeof data !== 'object') return '';
  const typeLabel = data['도출유형'] || '';
  const gut = parseInt(data['장본능센터'] ?? data['장본능'] ?? data['장'] ?? data['gut'] ?? 0, 10) || 0;
  const heart = parseInt(data['가슴감정센터'] ?? data['가슴감정'] ?? data['가슴'] ?? data['heart'] ?? 0, 10) || 0;
  const head = parseInt(data['머리사고센터'] ?? data['머리사고'] ?? data['머리'] ?? data['head'] ?? 0, 10) || 0;

  const leftKey = Object.keys(data).find(k => k.includes('왼쪽날개') || k.includes('주날개')) || '왼쪽날개';
  const rightKey = Object.keys(data).find(k => k.includes('오른쪽날개') || k.includes('보조날개')) || '오른쪽날개';
  const leftTitle = formatWingTitle(leftKey);
  const rightTitle = formatWingTitle(rightKey);
  const leftVal = parseInt(data[leftKey] ?? 50, 10) || 50;
  const rightVal = parseInt(data[rightKey] ?? 50, 10) || 50;

  const sp = parseInt(data['자기보존'] ?? data['sp'] ?? 0, 10) || 0;
  const sx = parseInt(data['일대일'] ?? data['일대일/친밀'] ?? data['친밀'] ?? data['sx'] ?? 0, 10) || 0;
  const so = parseInt(data['사회적'] ?? data['사회'] ?? data['so'] ?? 0, 10) || 0;

  const intVal = parseInt(data['통합_성장에너지'] ?? data['통합'] ?? data['통합_성장'] ?? data['성장'] ?? 0, 10) || 0;
  const disVal = parseInt(data['분열_스트레스반응'] ?? data['분열'] ?? data['분열_스트레스'] ?? data['스트레스'] ?? 0, 10) || 0;

  return `
    <div class="report-card-container">
      <div class="report-card-header">
        <h4 class="report-card-title">무의식적 욕구 및 에니어그램 프로파일</h4>
        ${typeLabel ? `<div class="report-card-type-label" style="font-size: 0.95rem; font-weight: 700; color: #5B6B54; margin-top: 6px;">${typeLabel}</div>` : ''}
      </div>

      <!-- 1열: 9개 유형 스펙트럼 (확대 9각형, 얇은 선, 꼭짓점 외곽 배치) -->
      <div style="background: #FAF8F2; border: 1.5px solid #D8D6C9; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;">
        <div style="font-size: 0.86rem; font-weight: 700; color: #2A3022; border-bottom: 1px solid #EAE8DF; padding-bottom: 6px; margin-bottom: 10px;">
          9개 유형별 스펙트럼
        </div>
        <div style="width: 100%; max-width: 480px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          ${generateRadarSvgHtml(data)}
        </div>
      </div>

      <!-- 2열: 2개 영역 (좌측: 3대 에너지 센터 대형 도넛 / 우측: 날개주도권 & 정서적 탄력성 정가운데 점선) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        
        <!-- 2열 좌측: 3대 에너지 센터 -->
        <div style="background: #FAF8F2; border: 1.5px solid #D8D6C9; border-radius: 14px; padding: 14px; display: flex; flex-direction: column;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #2A3022; border-bottom: 1px solid #EAE8DF; padding-bottom: 6px; margin-bottom: 8px;">
            3대 에너지 센터
          </div>
          <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center;">
            ${generateCentersDonutSvg(gut, heart, head)}
          </div>
        </div>

        <!-- 2열 우측: 날개 주도권 및 정서적 탄력성 (정가운데 점선 기준 상하 완벽 대칭 & 수직 중앙 정렬) -->
        <div style="background: #FAF8F2; border: 1.5px solid #D8D6C9; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
          
          <!-- 상단: 날개 주도권 (수직 중앙 정렬, n번 (유형이름) 표기, 단극 그래프 2개) -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 4px 0;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #2A3022; margin-bottom: 6px;">
              날개 주도권
            </div>

            <div class="unipolar-item-row" style="margin-bottom: 5px;">
              <div class="unipolar-meta-row" style="font-size: 0.78rem;">
                <span>${leftTitle}</span>
                <span style="font-weight: 700; color: #2A3022;">${leftVal}%</span>
              </div>
              <div class="unipolar-track" style="height: 8px;">
                <div class="unipolar-fill-bar" style="width: ${leftVal}%; background: ${get10PercentColor(leftVal)};"></div>
              </div>
            </div>

            <div class="unipolar-item-row" style="margin-bottom: 0;">
              <div class="unipolar-meta-row" style="font-size: 0.78rem;">
                <span>${rightTitle}</span>
                <span style="font-weight: 700; color: #2A3022;">${rightVal}%</span>
              </div>
              <div class="unipolar-track" style="height: 8px;">
                <div class="unipolar-fill-bar" style="width: ${rightVal}%; background: ${get10PercentColor(rightVal)};"></div>
              </div>
            </div>
          </div>

          <!-- 우측 영역 정가운데 구분 점선 -->
          <div style="border-top: 1px dashed #DCD9CE; width: 100%; margin: 6px 0;"></div>

          <!-- 하단: 정서적 탄력성 (수직 중앙 정렬, 전문적 심리 역동 제목, 단극 그래프 2개) -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 4px 0;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #2A3022; margin-bottom: 6px;">
              정서적 탄력성
            </div>

            <div class="unipolar-item-row" style="margin-bottom: 5px;">
              <div class="unipolar-meta-row" style="font-size: 0.78rem;">
                <span>통합/성장</span>
                <span style="font-weight: 700; color: #2A3022;">${intVal}%</span>
              </div>
              <div class="unipolar-track" style="height: 8px;">
                <div class="unipolar-fill-bar" style="width: ${intVal}%; background: ${get10PercentColor(intVal)};"></div>
              </div>
            </div>

            <div class="unipolar-item-row" style="margin-bottom: 0;">
              <div class="unipolar-meta-row" style="font-size: 0.78rem;">
                <span>분열/스트레스</span>
                <span style="font-weight: 700; color: #2A3022;">${disVal}%</span>
              </div>
              <div class="unipolar-track" style="height: 8px;">
                <div class="unipolar-fill-bar" style="width: ${disVal}%; background: ${get10PercentColor(disVal)};"></div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- 3열: 본능 삼원소 (MBTI 인지기능 게이지바 디자인 100% 동일, 10% 색상 차등) -->
      <div style="background: #FAF8F2; border: 1.5px solid #D8D6C9; border-radius: 14px; padding: 14px 16px; margin-bottom: 0;">
        <div style="font-size: 0.86rem; font-weight: 700; color: #2A3022; border-bottom: 1px solid #EAE8DF; padding-bottom: 6px; margin-bottom: 10px;">
          본능 삼원소 (Instinctual Subtypes)
        </div>

        <div class="unipolar-item-row" style="margin-bottom: 10px;">
          <div class="unipolar-meta-row"><span>자기보존 (sp)</span><span style="font-weight: 700; color: #2A3022;">${sp}%</span></div>
          <div class="unipolar-track"><div class="unipolar-fill-bar" style="width: ${sp}%; background: ${get10PercentColor(sp)};"></div></div>
        </div>
        
        <div class="unipolar-item-row" style="margin-bottom: 10px;">
          <div class="unipolar-meta-row"><span>일대일/친밀 (sx)</span><span style="font-weight: 700; color: #2A3022;">${sx}%</span></div>
          <div class="unipolar-track"><div class="unipolar-fill-bar" style="width: ${sx}%; background: ${get10PercentColor(sx)};"></div></div>
        </div>

        <div class="unipolar-item-row" style="margin-bottom: 0;">
          <div class="unipolar-meta-row"><span>사회적 (so)</span><span style="font-weight: 700; color: #2A3022;">${so}%</span></div>
          <div class="unipolar-track"><div class="unipolar-fill-bar" style="width: ${so}%; background: ${get10PercentColor(so)};"></div></div>
        </div>
      </div>

    </div>
  `;
}

// Global exposure
if (typeof window !== 'undefined') {
  window.enneaSampleDataMap = enneaSampleDataMap;
  window.generateFullEnneagramReportHtml = generateFullEnneagramReportHtml;
  window.get10PercentColor = get10PercentColor;
  window.formatWingTitle = formatWingTitle;
}

// 8. 경량 마크다운 파서 & 안전화된 보고서 감지 & 게이지 비주얼 렌더러 (MarkdownParser)
const MarkdownParser = {
  // [핵심 1] 안전화된 보고서 분리 추출기 (보고서 발견 시 대화창에는 일체 텍스트 미노출, 전문 수집)
  extractReport(rawText) {
    if (!rawText) return { hasReport: false, reportContent: '', chatContent: '' };

    // 패턴 A: [REPORT_START] 감지 (시작 태그부터 끝까지 또는 마지막 [REPORT_END] 전까지 전량 수집)
    const startMatch = rawText.match(/\[REPORT_START\]/i);
    if (startMatch) {
      const startIndex = startMatch.index + startMatch[0].length;
      let body = rawText.substring(startIndex);
      // [REPORT_END] 태그가 존재하면 그 직전까지만 잘라내고, 없으면 본문 전체 유지
      const endTagIdx = body.search(/\[REPORT_END\]/i);
      if (endTagIdx !== -1) {
        body = body.substring(0, endTagIdx);
      }
      return {
        hasReport: true,
        reportContent: body.trim(),
        chatContent: ''
      };
    }

    // 패턴 B: AI가 실수로 [REPORT_START] 태그를 빼먹은 경우 자동 구출
    const implicitRegex = /(?:#+\s*1부|(?:\*\*|\[)?1부(?:\*\*|\])?\s*[\.:\-\–]|#+\s*심층\s*분석\s*보고서|(?:\*\*|\[)?심층\s*분석\s*보고서(?:\*\*|\])?)([\s\S]*)/i;
    const implicitMatch = rawText.match(implicitRegex);

    if (implicitMatch) {
      const reportStartIdx = implicitMatch.index;
      let body = rawText.substring(reportStartIdx);
      const endTagIdx = body.search(/\[REPORT_END\]/i);
      if (endTagIdx !== -1) {
        body = body.substring(0, endTagIdx);
      }
      return {
        hasReport: true,
        reportContent: body.trim(),
        chatContent: ''
      };
    }

    return {
      hasReport: false,
      reportContent: '',
      chatContent: rawText
    };
  },

  // [핵심 2] 마크다운 테이블 파서 (isReport===true일 때만 게이지 표 지원, 일반 대화는 무조건 표준 표)
  parseMarkdownTable(text, isReport = false) {
    return text.replace(/(?:^[ \t]*\|?[^\n]+\|[^\n]*(?:\n|$)){2,}/gm, (tableMarkdown) => {
      const rawLines = tableMarkdown.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (rawLines.length < 2) return tableMarkdown;

      // 구분선 행(예: | :--- | :--- | :---: | 또는 |---|---|) 탐지
      let separatorIdx = rawLines.findIndex((l, idx) => idx > 0 && /^[|:\s-]+$/.test(l));

      let headerLine = rawLines[0];
      let dataLines = [];

      if (separatorIdx !== -1) {
        dataLines = rawLines.filter((l, idx) => idx !== 0 && idx !== separatorIdx);
      } else {
        dataLines = rawLines.slice(1);
      }

      const splitCells = (line) => {
        let cells = line.split('|').map(s => s.trim());
        if (cells.length > 0 && cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        return cells;
      };

      const headers = splitCells(headerLine);
      if (headers.length === 0) return tableMarkdown;

      // 게이지 표 여부 감지: 오직 보고서(isReport === true) 모드에서 실제 아스키 게이지 기호(░, █ 등)나 게이지 명시 헤더가 있을 때만 게이지 표 적용
      const hasAsciiGauge = /[░█■□▪▫▓▒▰▱●○]/.test(tableMarkdown);
      const hasGaugeHeader = /게이지|스펙트럼|시각화|차트|그래프/i.test(headerLine);
      const hasGauge = isReport && (hasAsciiGauge || hasGaugeHeader);

      let tableHtml = `\n\n<div class="report-table-wrapper"><table class="${hasGauge ? 'report-gauge-table' : 'report-standard-table'}">`;
      tableHtml += `<thead><tr>`;
      headers.forEach((h, idx) => {
        let colClass = '';
        if (hasGauge) {
          if (/게이지|스펙트럼|시각화|차트|그래프/i.test(h)) {
            colClass = 'col-gauge-track';
          } else if (idx === 0) {
            colClass = 'col-label';
          } else if (headers.length === 4 && idx === 1) {
            colClass = 'col-sub-label';
          } else if (/백분율|비율|점수|퍼센트|%/i.test(h)) {
            colClass = 'col-percent';
          }
        }
        tableHtml += `<th class="${colClass}">${this.parseInline(h)}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      dataLines.forEach(line => {
        const cells = splitCells(line);
        if (cells.length === 0) return;

        const percentMatch = line.match(/(\d+)%/);
        const percentVal = percentMatch ? Math.min(100, Math.max(0, parseInt(percentMatch[1], 10))) : null;

        tableHtml += `<tr>`;
        cells.forEach((cell, idx) => {
          const isGaugeCell = /[░█■□▪▫▓▒▰▱●○]/.test(cell) || (hasGauge && /게이지|스펙트럼|시각화|차트|그래프/i.test(headers[idx] || ''));

          if (isGaugeCell) {
            let finalPercent = percentVal;
            if (finalPercent === null) {
              const totalLen = cell.length || 20;
              const firstFill = cell.search(/[█■▓▰●#]/);
              finalPercent = firstFill !== -1 ? Math.round((firstFill / totalLen) * 100) : 50;
            }

            // 사용자 지적 완벽 반영:
            // 1. 중간에만 까만 네모 (스펙트럼 포인터): 앞에 빈 칸이 오고 중간/끝에 채운 블록이 오는 경우
            // 2. 지점까지 쭉 검정 사각형 (프로그레스 바): 처음부터 채운 블록이 쭉 이어지는 경우
            const isPointer = /^[░\s□▫▱○-]+[█■▓▰●#]/.test(cell);

            if (isPointer) {
              tableHtml += `<td class="col-gauge-track">
                <div class="gauge-visual-track gauge-type-pointer">
                  <div class="gauge-pointer-thumb" style="left: ${finalPercent}%;"></div>
                </div>
              </td>`;
            } else {
              tableHtml += `<td class="col-gauge-track">
                <div class="gauge-visual-track gauge-type-bar">
                  <div class="gauge-visual-bar" style="width: ${finalPercent}%;"></div>
                </div>
              </td>`;
            }
          } else if (/^\d+%$/.test(cell.replace(/\s/g, ''))) {
            tableHtml += `<td class="col-percent">${this.parseInline(cell)}</td>`;
          } else {
            let colClass = '';
            if (hasGauge) {
              if (idx === 0) colClass = 'col-label';
              else if (headers.length === 4 && idx === 1) colClass = 'col-sub-label';
            }
            tableHtml += `<td class="${colClass}">${this.parseInline(cell)}</td>`;
          }
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table></div>\n\n`;
      return tableHtml;
    });
  },

  // [핵심 3] 불릿 및 순서 목록 파서 (AI 원본 번호 & 하위/하위하위 다계층 6px 마이크로 인덴트)
  parseLists(text, saveBlock = null) {
    // 1. 번호 매겨진 목록 (1. 2. 3. 또는 1) 2) 3)) 및 내부 다계층 서브 불릿(*, -) 중첩 파싱
    const lines = text.split('\n');
    const newLines = [];
    let inNumberedItem = false;
    let currentNum = '';
    let currentIndent = 0;
    let currentContentLines = [];
    let currentNumberedGroup = [];

    // SVG 불릿 아이콘 (말차 테마 일치, 아이폰/안드로이드 기기별 폰트 왜곡 방지 및 네모/세모 동일 비율)
    const SVG_BULLETS = {
      dash: '<svg class="bullet-svg bullet-svg-dash" viewBox="0 0 10 10" style="width: 0.7em; height: 0.7em; display: block;" aria-hidden="true"><rect x="1" y="4" width="8" height="2" rx="1" fill="currentColor"/></svg>',
      square: '<svg class="bullet-svg bullet-svg-square" viewBox="0 0 10 10" style="width: 0.7em; height: 0.7em; display: block;" aria-hidden="true"><rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor"/></svg>',
      arrow: '<svg class="bullet-svg bullet-svg-arrow" viewBox="0 0 10 10" style="width: 0.7em; height: 0.7em; display: block;" aria-hidden="true"><polygon points="2,2 8,5 2,8" fill="currentColor"/></svg>'
    };

    const flushNumberedItem = () => {
      if (inNumberedItem) {
        let innerHtml = '';
        for (let j = 0; j < currentContentLines.length; j++) {
          const part = currentContentLines[j];
          if (!part) {
            innerHtml += '<br>';
          } else if (part.startsWith('<div class="md-sub-bullet')) {
            innerHtml += part;
          } else {
            if (innerHtml && !innerHtml.endsWith('<br>') && !innerHtml.endsWith('</div>')) {
              innerHtml += '<br>';
            }
            innerHtml += this.parseInline(part);
          }
        }
        let level = 1;
        if (currentIndent >= 6) level = 3;
        else if (currentIndent >= 2) level = 2;
        currentNumberedGroup.push(`<div class="md-numbered-item num-level-${level}"><span class="md-num-label">${currentNum}</span><div class="md-num-content">${innerHtml.trim()}</div></div>`);
        inNumberedItem = false;
        currentNum = '';
        currentIndent = 0;
        currentContentLines = [];
      }
    };

    const flushNumberedGroup = () => {
      flushNumberedItem();
      if (currentNumberedGroup.length > 0) {
        const groupHtml = `<div class="md-numbered-group">${currentNumberedGroup.join('')}</div>\n`;
        newLines.push(saveBlock ? saveBlock(groupHtml) : groupHtml);
        currentNumberedGroup = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numMatch = line.match(/^([ \t]*)(\d{1,2}[\.\)])[ \t]+(.*)/);
      const subBulletMatch = line.match(/^([ \t]+)([*•\-])[ \t]+(.*)/);

      if (numMatch) {
        const indentSpaces = numMatch[1].replace(/\t/g, '    ').length;
        flushNumberedItem();
        inNumberedItem = true;
        currentNum = numMatch[2];
        currentIndent = indentSpaces;
        currentContentLines = [numMatch[3]];
      } else if (inNumberedItem && subBulletMatch) {
        const indentSpaces = subBulletMatch[1].replace(/\t/g, '    ').length;
        if (indentSpaces > currentIndent) {
          const relativeIndent = indentSpaces - currentIndent;
          let level = 1;
          let dotSymbol = SVG_BULLETS.dash;
          if (relativeIndent >= 7) {
            level = 3;
            dotSymbol = SVG_BULLETS.arrow;
          } else if (relativeIndent >= 5) {
            level = 2;
            dotSymbol = SVG_BULLETS.square;
          } else {
            level = 1;
            dotSymbol = SVG_BULLETS.dash;
          }

          const subContent = this.parseInline(subBulletMatch[3]);
          currentContentLines.push(`<div class="md-sub-bullet sub-level-${level}"><span class="md-sub-bullet-dot">${dotSymbol}&#8203;</span><div class="md-bullet-content md-sub-bullet-text">${subContent}</div></div>`);
        } else {
          flushNumberedGroup();
          newLines.push(line);
        }
      } else if (inNumberedItem) {
        const trimmed = line.trim();
        if (!trimmed) {
          let nextAction = 'end';
          for (let k = i + 1; k < lines.length; k++) {
            const nextTrimmed = lines[k].trim();
            if (!nextTrimmed) continue;
            if (/^[ \t]+[*•\-]/.test(lines[k])) {
              nextAction = 'keep_sub';
            } else if (/^[ \t]*\d{1,2}[\.\)][ \t]+/.test(lines[k])) {
              nextAction = 'keep_group';
            }
            break;
          }

          if (nextAction === 'keep_sub') {
            // 서브 불릿 대기
          } else if (nextAction === 'keep_group') {
            flushNumberedItem();
          } else {
            flushNumberedGroup();
            newLines.push(line);
          }
        } else if (/^[ \t]{0,1}(?:[#>\-*]|```|<h[1-6]|<table|<div|<blockquote|<hr)/i.test(line)) {
          // 최상위 블록 요소가 오면 번호 목록 종료
          flushNumberedGroup();
          newLines.push(line);
        } else {
          // 서브 불릿의 이어지는 줄이거나 번호 항목의 본문 이어짐 (들여쓰기가 있는 경우)
          const lastIdx = currentContentLines.length - 1;
          if (lastIdx >= 0 && currentContentLines[lastIdx].startsWith('<div class="md-sub-bullet') && /^[ \t]{4,}/.test(line)) {
            currentContentLines[lastIdx] = currentContentLines[lastIdx].replace('</div></div>', `<br>${line.trim()}</div></div>`);
          } else if (/^[ \t]+/.test(line)) {
            currentContentLines.push(line.replace(/^[ \t]+/, ''));
          } else {
            // 들여쓰기 없는 일반 텍스트 줄이 오면 번호 목록 종료하고 일반 텍스트로 처리
            flushNumberedGroup();
            newLines.push(line);
          }
        }
      } else {
        flushNumberedGroup();
        newLines.push(line);
      }
    }
    flushNumberedGroup();
    text = newLines.join('\n');

    // 2. 최상위 및 순수 불릿 목록 (- or * or •) 다계층 파싱 (1단계: -, 2단계: ▪, 3단계: ‣)
    text = text.replace(/(?:^[ \t]*[-*•][ \t]+.+?(?:\n[ \t]{2,}.+?)*(\n|$))+/gm, (match) => {
      const rawItems = match.trim().split(/\n(?=[ \t]*[-*•][ \t]+)/);
      const items = rawItems.map(item => {
        const indentSpaces = (item.match(/^[ \t]*/)[0] || '').replace(/\t/g, '    ').length;
        let level = 1;
        let dotSymbol = SVG_BULLETS.dash;
        if (indentSpaces >= 6) {
          level = 3;
          dotSymbol = SVG_BULLETS.arrow;
        } else if (indentSpaces >= 2) {
          level = 2;
          dotSymbol = SVG_BULLETS.square;
        } else {
          level = 1;
          dotSymbol = SVG_BULLETS.dash;
        }

        const cleaned = item.replace(/^[ \t]*[-*•][ \t]+/, '').replace(/\n[ \t]{2,}/g, '<br>');
        // 불릿 항목 내부에서만 parseInline을 호출하여 항목 간 서식 누수를 원천 차단!
        const parsedItemText = this.parseInline(cleaned.trim());
        return `<div class="md-bullet-item bullet-level-${level}"><span class="md-sub-bullet-dot">${dotSymbol}&#8203;</span><div class="md-bullet-content md-sub-bullet-text">${parsedItemText}</div></div>`;
      }).join('');
      const groupHtml = `<div class="md-bullet-group">${items}</div>\n`;
      return saveBlock ? saveBlock(groupHtml) : groupHtml;
    });

    return text;
  },

  // [핵심 3.4] AI 불완전/비표준 JSON 자동 치유 파서 (후행 쉼표, 주석, % 기호, 닫는 백틱 누락 복구)
  repairAndParseJson(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return null;
    let clean = jsonStr.trim();

    // 1. 표준 JSON 파싱 1차 시도
    try {
      return JSON.parse(clean);
    } catch (e) {}

    // 2. 비표준 JSON 자동 치료 시도
    try {
      // JS/C 스타일 주석(// 및 /* */) 제거
      clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
      clean = clean.replace(/(^|[^:])\/\/[^\n]*/g, '$1');

      // 값 뒤의 % 기호 제거 (예: 80% -> 80)
      clean = clean.replace(/:\s*(\d+)\s*%/g, ': $1');
      clean = clean.replace(/:\s*"(\d+)%"/g, ': $1');

      // 작은따옴표를 큰따옴표로 변환
      clean = clean.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

      // 따옴표 없는 한글/영문 키에 큰따옴표 부여
      clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_\uAC00-\uD7A3]+)\s*:/g, '$1"$2":');

      // 앞자리 0(Leading Zero: 예: 07, 04, 08, 00) 정수를 올바른 10진수 정수로 변환 (JSON.parse 문법 오류 완벽 방지)
      clean = clean.replace(/:\s*0+([0-9]+)\b/g, (match, digits) => ': ' + parseInt(digits, 10));

      // 후행 쉼표(Trailing commas) 제거
      clean = clean.replace(/,\s*([}\]])/g, '$1');

      // 가장 바깥쪽 { } 구간만 슬라이스 (외부 텍스트 섞임 방지)
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
        clean = clean.replace(/,\s*([}\]])/g, '$1');
      }

      return JSON.parse(clean);
    } catch (e2) {}

    // 3. 최후의 수단: Key-Value 정규식 복원
    try {
      const result = {};
      const kvRegex = /["']?([^"':\r\n{}]+?)["']?\s*:\s*(?:["']([^"'\r\n]*)["']|(-?\d+(?:\.\d+)?%?)|([^\r\n,}]+))/g;
      let m;
      while ((m = kvRegex.exec(jsonStr)) !== null) {
        const k = m[1].trim();
        if (!k || k.startsWith('//') || k.startsWith('#')) continue;
        let v = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
        if (v !== undefined) {
          v = String(v).trim();
          if (v.endsWith('%')) v = v.slice(0, -1).trim();
          if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
          result[k] = v;
        }
      }
      if (Object.keys(result).length > 0) return result;
    } catch (e3) {}

    return null;
  },

  // [핵심 3.5] 심리학 보고서 JSON 게이지바 시각화 렌더러 (빅파이브 투톤 대칭 바 & 10% 농도 실린더)
  renderJsonGauge(data) {
    if (!data || typeof data !== 'object') return '';

    const keys = Object.keys(data);
    const isDisc = keys.some(k => 
      k.includes('주도') || k.includes('사교') || k.includes('안정') || k.includes('신중') ||
      /^[DISC][\s:：()_]/i.test(k) || k.includes('DISC')
    ) || (keys.some(k => k === 'D' || k === 'D형') && keys.some(k => k === 'I' || k === 'I형'));

    const isBigFive = keys.some(k => k.includes('개방성') || k.includes('외향성') || k.includes('우호성') || k.includes('성실성') || k.includes('신경증'));
    const isCognitive = keys.some(k => k.includes('기능') || k.includes('주기능') || k.includes('부기능') || k.includes('3차기능') || k.includes('열등기능') || /^(Ti|Te|Fi|Fe|Ni|Ne|Si|Se)\b/i.test(k));
    const isEnneagram = keys.some(k => k.includes('자기보존') || k.includes('일대일') || k.includes('사회적') || k.includes('에니어그램') || k.includes('본능') || k.includes('개혁가') || k.includes('탐구자') || k.includes('날개'));
    const isMcClelland = keys.some(k => k.includes('성취') || k.includes('권력') || k.includes('친교'));

    const isMbtiAxis = !isDisc && !isBigFive && !isCognitive && !isEnneagram && !isMcClelland && (
      keys.some(k => 
        k.includes('에너지') || k.includes('정보') || k.includes('생활') || k.includes('정서') ||
        (k.includes('판단') && !k.includes('기능')) ||
        k.includes('외향') || k.includes('내향') || k.includes('직관') || k.includes('감각') ||
        k.includes('사고') || k.includes('감정') || k.includes('인식') ||
        /^(E\/I|N\/S|T\/F|J\/P|A\/T)\b/i.test(k)
      )
    );

    // 1. DISC 4대 행동 양식 전용 단극 게이지 렌더러
    if (isDisc) {
      const DISC_LABELS = {
        'D': '주도형 (Dominance)',
        'I': '사교형 (Influence)',
        'S': '안정형 (Steadiness)',
        'C': '신중형 (Conscientiousness)'
      };

      const typeLabel = data['도출유형'];
      let rowsHtml = '';
      keys.forEach(key => {
        if (key === '도출유형') return;
        const score = Math.min(100, Math.max(0, parseInt(data[key], 10) || 0));

        let displayName = key;
        const cleanKey = key.replace(/[:：\s].*$/, '').trim().toUpperCase();
        if (DISC_LABELS[cleanKey]) {
          displayName = DISC_LABELS[cleanKey];
        }

        let barColor = '#747B61';
        if (score > 80) barColor = '#4B533C';
        else if (score > 60) barColor = '#5D664D';
        else if (score > 40) barColor = '#747B61';
        else if (score > 20) barColor = '#959F89';
        else barColor = '#B2B9A8';

        rowsHtml += `
          <div class="unipolar-item-row">
            <div class="unipolar-meta-row">
              <span style="font-weight: 600; color: #1E293B;">${displayName}</span>
              <span style="font-weight: 700; color: #2A3022;">${score}%</span>
            </div>
            <div class="unipolar-track">
              <div class="unipolar-fill-bar" style="width: ${score}%; background: ${barColor};"></div>
            </div>
          </div>
        `;
      });

      return `
        <div class="report-card-container">
          <div class="report-card-header">
            <h4 class="report-card-title">DISC 4대 행동 양식${typeLabel ? ` (${typeLabel})` : ''}</h4>
            <p class="report-card-desc">사회적 가면 및 현실 처세 페르소나</p>
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    if (isMbtiAxis && !isBigFive) {
      const MBTI_AXIS_POLES = [
        { keyName: '에너지', axisTitle: '에너지 방향', left: '외부 확장·교류 (E)', right: '내면 충전·심화 (I)', leftCode: 'E', rightCode: 'I', leftDefault: '외향형 (E)', rightDefault: '내향형 (I)' },
        { keyName: '정보', axisTitle: '정보 수용', left: '직관 비약·통찰 (N)', right: '감각 경험·현실 (S)', leftCode: 'N', rightCode: 'S', leftDefault: '직관형 (N)', rightDefault: '감각형 (S)' },
        { keyName: '판단', axisTitle: '판단 근거', left: '정서 공감·관계 (F)', right: '원리 논리·체계 (T)', leftCode: 'F', rightCode: 'T', leftDefault: '감정형 (F)', rightDefault: '사고형 (T)' },
        { keyName: '생활', axisTitle: '생활 양식', left: '목표 통제·규율 (J)', right: '상황 적응·유연 (P)', leftCode: 'J', rightCode: 'P', leftDefault: '판단형 (J)', rightDefault: '인식형 (P)' },
        { keyName: '정서', axisTitle: '정서 반응', left: '정서 안정·확신 (A)', right: '위협 각성·민감 (T)', leftCode: 'A', rightCode: 'T', leftDefault: '자기확신형 (A)', rightDefault: '민감형 (T)' }
      ];

      // 단극 게이지 연동: 수치 범위별(10~20% 단위) 바 색상 함수
      const getPosBarColor = (score) => {
        if (score > 80) return '#4B533C';
        if (score > 60) return '#5D664D';
        if (score > 40) return '#747B61';
        if (score > 20) return '#959F89';
        return '#B2B9A8';
      };
      const getNegBarColor = (score) => {
        if (score > 80) return '#8C4E2D';
        if (score > 60) return '#A3603B';
        if (score > 40) return '#B97C58';
        if (score > 20) return '#CF9776';
        return '#E2B599';
      };

      let rowsHtml = '';
      keys.forEach(key => {
        if (key === '도출유형') return;

        let poleInfo = MBTI_AXIS_POLES.find(p => key.includes(p.keyName) || new RegExp(`\\b${p.leftCode}\\b`).test(key) || new RegExp(`\\b${p.rightCode}\\b`).test(key));
        if (!poleInfo) {
          poleInfo = { axisTitle: '성향 축', left: '좌측 성향', right: '우측 성향', leftCode: 'L', rightCode: 'R', leftDefault: '좌측 성향', rightDefault: '우측 성향' };
        }

        const valStr = String(data[key] || '').trim();
        const numMatch = valStr.match(/\d+/);
        let scorePct = numMatch ? Math.min(100, Math.max(0, parseInt(numMatch[0], 10))) : 50;

        let rawSub = '';
        if (key.includes(':')) {
          rawSub = key.split(':')[1].trim();
        } else if (key.includes('：')) {
          rawSub = key.split('：')[1].trim();
        }

        let isRight = false;
        if (rawSub === poleInfo.rightCode || poleInfo.right.includes(rawSub) || /내향|감각|사고|인식|민감/.test(rawSub)) {
          isRight = true;
        } else if (rawSub === poleInfo.leftCode || poleInfo.left.includes(rawSub) || /외향|직관|감정|판단|확신|안정/.test(rawSub)) {
          isRight = false;
        } else {
          const combinedText = `${key} ${valStr}`;
          if (new RegExp(`\\b${poleInfo.rightCode}\\b`).test(combinedText) || combinedText.includes('내향') || combinedText.includes('감각') || combinedText.includes('사고') || combinedText.includes('인식') || combinedText.includes('민감')) {
            isRight = true;
          } else if (new RegExp(`\\b${poleInfo.leftCode}\\b`).test(combinedText) || combinedText.includes('외향') || combinedText.includes('직관') || combinedText.includes('감정') || combinedText.includes('판단') || combinedText.includes('확신') || combinedText.includes('안정')) {
            isRight = false;
          } else {
            isRight = scorePct >= 50;
          }
        }

        const barWidth = (scorePct / 100) * 50;
        let barHtml = '';

        let traitName = '';
        if (rawSub === poleInfo.leftCode) {
          traitName = poleInfo.leftDefault;
        } else if (rawSub === poleInfo.rightCode) {
          traitName = poleInfo.rightDefault;
        } else if (rawSub) {
          traitName = rawSub;
        } else {
          traitName = isRight ? poleInfo.rightDefault : poleInfo.leftDefault;
        }

        let leftColHtml = '';
        let rightColHtml = '';
        const domScore = scorePct;
        const subScore = 100 - domScore;

        if (isRight) {
          const barColor = getPosBarColor(domScore);
          leftColHtml = `<span class="bipolar-pole-label muted">${poleInfo.left} ${subScore}%</span>`;
          rightColHtml = `<span class="bipolar-pole-label right-aligned"><span>${traitName}</span><span class="bipolar-badge">${domScore}%</span></span>`;
          barHtml = `<div class="bipolar-bar-pos" style="width: ${barWidth}%; background: ${barColor};"></div>`;
        } else {
          const barColor = getNegBarColor(domScore);
          leftColHtml = `<span class="bipolar-pole-label left-aligned"><span class="bipolar-badge">${domScore}%</span><span>${traitName}</span></span>`;
          rightColHtml = `<span class="bipolar-pole-label muted">${poleInfo.right} ${subScore}%</span>`;
          barHtml = `<div class="bipolar-bar-neg" style="width: ${barWidth}%; background: ${barColor};"></div>`;
        }

        rowsHtml += `
          <div class="bipolar-item-row" style="margin-bottom: 16px;">
            <div class="bipolar-meta-row" style="display: grid; grid-template-columns: 1fr auto 1fr; width: 100%; align-items: center; margin-bottom: 6px;">
              <div style="text-align: left;">${leftColHtml}</div>
              <div style="text-align: center; font-weight: 700; color: #2A3022; font-size: 0.85rem; letter-spacing: -0.2px; padding: 0 8px;">${poleInfo.axisTitle}</div>
              <div style="text-align: right;">${rightColHtml}</div>
            </div>
            <div class="bipolar-track">
              <div class="bipolar-center-pin-subtle"></div>
              ${barHtml}
            </div>
          </div>
        `;
      });

      let rawTypeLabel = data['도출유형'] || data['도출 유형'] || data['유형'] || data['mbti'] || data['MBTI'] || data['MBTI유형'] || data['mbti유형'] || '';
      let cleanTypeLabel = String(rawTypeLabel).trim();
      while (cleanTypeLabel.startsWith('(') && cleanTypeLabel.endsWith(')')) {
        cleanTypeLabel = cleanTypeLabel.slice(1, -1).trim();
      }

      return `
        <div class="report-card-container">
          <div class="report-card-header">
            <h4 class="report-card-title">MBTI 5대 성향 축 선호 지표</h4>
            ${cleanTypeLabel ? `<div class="report-card-type-label">${cleanTypeLabel}</div>` : ''}
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    if (isBigFive) {
      const BIG_FIVE_POLES = {
        '개방성': { left: '보수·현실안주', right: '창의·호기심' },
        '외향성': { left: '내향 충전', right: '외부 자극' },
        '우호성': { left: '비판·경쟁', right: '신뢰·배려' },
        '성실성': { left: '유연·즉흥', right: '규율·철저' },
        '신경증': { left: '정서적 안정', right: '위협 민감' }
      };

      const getPosBarColor = (score) => {
        if (score > 80) return '#4B533C';
        if (score > 60) return '#5D664D';
        if (score > 40) return '#747B61';
        if (score > 20) return '#959F89';
        return '#B2B9A8';
      };
      const getNegBarColor = (score) => {
        if (score > 80) return '#8C4E2D';
        if (score > 60) return '#A3603B';
        if (score > 40) return '#B97C58';
        if (score > 20) return '#CF9776';
        return '#E2B599';
      };

      let rowsHtml = '';
      keys.forEach(key => {
        const pole = BIG_FIVE_POLES[key] || { left: '낮음', right: '높음' };
        const rawScore = parseInt(data[key], 10) || 50;

        let barHtml = '';
        let leftColHtml = '';
        let rightColHtml = '';

        if (rawScore > 50) {
          const score = Math.min(100, rawScore);
          const subScore = 100 - score;
          const barWidth = (score / 100) * 50;
          const barColor = getPosBarColor(score);
          leftColHtml = `<span class="bipolar-pole-label muted">${pole.left} ${subScore}%</span>`;
          rightColHtml = `<span class="bipolar-pole-label right-aligned"><span>${pole.right}</span><span class="bipolar-badge">${score}%</span></span>`;
          barHtml = `<div class="bipolar-bar-pos" style="width: ${barWidth}%; background: ${barColor};"></div>`;
        } else if (rawScore < 50) {
          const score = Math.min(100, 100 - rawScore);
          const subScore = 100 - score;
          const barWidth = (score / 100) * 50;
          const barColor = getNegBarColor(score);
          leftColHtml = `<span class="bipolar-pole-label left-aligned"><span class="bipolar-badge">${score}%</span><span>${pole.left}</span></span>`;
          rightColHtml = `<span class="bipolar-pole-label muted">${pole.right} ${subScore}%</span>`;
          barHtml = `<div class="bipolar-bar-neg" style="width: ${barWidth}%; background: ${barColor};"></div>`;
        } else {
          leftColHtml = `<span class="bipolar-pole-label muted">${pole.left} 50%</span>`;
          rightColHtml = `<span class="bipolar-pole-label muted">${pole.right} 50%</span>`;
          barHtml = ``;
        }

        rowsHtml += `
          <div class="bipolar-item-row" style="margin-bottom: 16px;">
            <div class="bipolar-meta-row" style="display: grid; grid-template-columns: 1fr auto 1fr; width: 100%; align-items: center; margin-bottom: 6px;">
              <div style="text-align: left;">${leftColHtml}</div>
              <div style="text-align: center; font-weight: 700; color: #2A3022; font-size: 0.85rem; letter-spacing: -0.2px; padding: 0 8px;">${key}</div>
              <div style="text-align: right;">${rightColHtml}</div>
            </div>
            <div class="bipolar-track">
              <div class="bipolar-center-pin-subtle"></div>
              ${barHtml}
            </div>
          </div>
        `;
      });

      return `
        <div class="report-card-container">
          <div class="report-card-header">
            <h4 class="report-card-title">Big Five 5대 요인 분석</h4>
            <p class="report-card-desc">기저 기질의 스펙트럼 밸런스</p>
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    // Full Enneagram check (9개 유형 또는 3대 에너지 센터 포함 시 입체 리포트 카드로 직접 렌더링)
    const isEnneagramFull = keys.some(k => k.startsWith('1번') || k.includes('개혁가') || k.includes('완벽주의자') || k.includes('장본능') || k.includes('머리사고') || k.includes('가슴감정'));
    if (isEnneagramFull && typeof window !== 'undefined' && typeof window.generateFullEnneagramReportHtml === 'function') {
      return window.generateFullEnneagramReportHtml(data);
    }

    // Unipolar gauges (융 인지기능, 에니어그램 본능, DISC, 맥클리랜드)
    let title = '심리 지표 활성도';
    let desc = '에너지 비중 및 기능별 활성도';
    const typeLabel = data['도출유형'];

    if (keys.some(k => k.includes('기능:'))) {
      title = `융의 인지 기능 위계${typeLabel ? ` (${typeLabel})` : ''}`;
      desc = '두뇌 정보 처리 알고리즘별 활성도';
    } else if (keys.some(k => k === '자기보존' || k === '일대일' || k === '사회적')) {
      title = `에니어그램 본능 삼원소${typeLabel ? ` (${typeLabel})` : ''}`;
      desc = '본능적 에너지 집중 비중';
    } else if (isDisc || keys.some(k => k.includes('주도') || k.includes('사교') || k.includes('안정') || k.includes('신중'))) {
      title = `DISC 4대 행동 양식${typeLabel ? ` (${typeLabel})` : ''}`;
      desc = '사회적 가면 및 현실 처세 페르소나';
    } else if (keys.some(k => k === '성취욕구' || k === '권력욕구' || k === '친교욕구')) {
      title = '맥클리랜드 3대 동기 엔진';
      desc = '행동을 점화하는 핵심 추진 동기';
    }

    const get10PercentGaugeColor = (score) => {
      const val = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
      if (val >= 90) return '#34402F';
      if (val >= 80) return '#404E3A';
      if (val >= 70) return '#4D5D46';
      if (val >= 60) return '#5A6C53';
      if (val >= 50) return '#687B60';
      if (val >= 40) return '#778A6E';
      if (val >= 30) return '#889B7F';
      if (val >= 20) return '#99AC91';
      if (val >= 10) return '#ABC0A4';
      return '#C0D0BA';
    };

    let rowsHtml = '';
    keys.forEach(key => {
      if (key === '도출유형') return;
      const score = Math.min(100, Math.max(0, parseInt(data[key], 10) || 0));
      const barColor = get10PercentGaugeColor(score);

      rowsHtml += `
        <div class="unipolar-item-row">
          <div class="unipolar-meta-row">
            <span>${key}</span>
            <span style="font-weight: 700; color: #2A3022;">${score}%</span>
          </div>
          <div class="unipolar-track">
            <div class="unipolar-fill-bar" style="width: ${score}%; background: ${barColor};"></div>
          </div>
        </div>
      `;
    });

    return `
      <div class="report-card-container">
        <div class="report-card-header">
          <h4 class="report-card-title">${title}</h4>
          <p class="report-card-desc">${desc}</p>
        </div>
        ${rowsHtml}
      </div>
    `;
  },

  // [핵심 4] 마크다운 본체 파서 (HTML 블록 보호 기법 적용: SVG 및 컴포넌트 마크다운 오염 100% 방지)
  parse(text, isReport = false) {
    if (!text) return '';

    const htmlBlocks = [];
    const saveBlock = (html) => {
      const placeholder = `\n\n<!--HTMLBLOCKPLACEHOLDER${htmlBlocks.length}-->\n\n`;
      htmlBlocks.push(html);
      return placeholder;
    };

    // 1. CRLF 개행 표준화
    let processed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1.5. JSON 게이지 블록 변환 (오직 보고서 화면에서만 게이지바로 변환하여 원본 보존, 일반 대화는 코드블록)
    if (isReport) {
      // (A) 백틱으로 감싸진 ```json ... ``` 및 ```JSON ... ``` 블록 처리
      processed = processed.replace(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/g, (match, rawCode) => {
        const trimmedCode = rawCode.trim();

        // 닫는 백틱(```) 누락으로 여러 개의 { ... } 객체나 마크다운 헤더가 한 덩어리로 뭉친 경우
        if (trimmedCode.includes('```json') || trimmedCode.includes('```JSON') || (trimmedCode.includes('###') && trimmedCode.includes('{'))) {
          // 내부의 개별 { ... } JSON 블록들을 찾아서 각각 게이지 카드로 변환
          return rawCode.replace(/\{[\s\S]*?\}/g, (subJsonStr) => {
            const subData = this.repairAndParseJson(subJsonStr);
            if (subData) {
              const subRendered = this.renderJsonGauge(subData);
              if (subRendered) return saveBlock(subRendered);
            }
            return subJsonStr;
          });
        }

        const data = this.repairAndParseJson(trimmedCode);
        if (data) {
          const rendered = this.renderJsonGauge(data);
          if (rendered) return saveBlock(rendered);
        }
        return saveBlock(this.renderCodeBlock(trimmedCode, 'JSON'));
      });

      // (B) 닫는 백틱(```)이 아예 누락된 채 마크다운 본문에 그대로 노출된 { ... } JSON 객체 자동 감지 및 변환
      processed = processed.replace(/(?:^|\n)\s*(\{[\s\r\n]*"(?:도출유형|개방성|외향성|주기능|1번|장본능|주도형|성취욕구|에너지)[^}]*?\})\s*(?=\n|$)/g, (match, nakedJson) => {
        const data = this.repairAndParseJson(nakedJson);
        if (data) {
          const rendered = this.renderJsonGauge(data);
          if (rendered) return '\n\n' + saveBlock(rendered) + '\n\n';
        }
        return match;
      });
    } else {
      processed = processed.replace(/```json\s*([\s\S]*?)\s*```/gi, (match, jsonStr) => {
        return saveBlock(this.renderCodeBlock(jsonStr.trim(), 'JSON'));
      });
    }

    // 1.6. 일반 마크다운 코드 블록 (```lang ... ```) 변환 및 안전 보호
    processed = processed.replace(/```([a-zA-Z0-9_\-#+]*)\s*([\s\S]*?)\s*```/g, (match, lang, code) => {
      return saveBlock(this.renderCodeBlock(code, lang || 'CODE'));
    });

    // 2. 마크다운 테이블 변환 (isReport 모드만 게이지 표 지원) 및 안전 보호
    processed = processed.replace(/(?:^[ \t]*\|?[^\n]+\|[^\n]*(?:\n|$)){2,}/gm, (tableMarkdown) => {
      return saveBlock(this.parseMarkdownTable(tableMarkdown, isReport));
    });

    // 3. 7단계 마크다운 헤더 변환 (긴 기호부터 순차 치환 & saveBlock 격리 & 인라인 서식 적용)
    processed = processed.replace(/^[ \t]*#######[ \t]+(.*$)/gim, (_, text) => saveBlock(`<div class="md-h7">${this.parseInline(text)}</div>`));
    processed = processed.replace(/^[ \t]*######[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h6>${this.parseInline(text)}</h6>`));
    processed = processed.replace(/^[ \t]*#####[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h5>${this.parseInline(text)}</h5>`));
    processed = processed.replace(/^[ \t]*####[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h4>${this.parseInline(text)}</h4>`));
    processed = processed.replace(/^[ \t]*###[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h3>${this.parseInline(text)}</h3>`));
    processed = processed.replace(/^[ \t]*##[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h2>${this.parseInline(text)}</h2>`));
    processed = processed.replace(/^[ \t]*#[ \t]+(.*$)/gim, (_, text) => saveBlock(`<h1>${this.parseInline(text)}</h1>`));

    // 4. 인용구 (> 문장) - 엔터로 떨어진 복수 줄 볼드(**줄1\n줄2**)도 온전히 지원 (Lazy continuation 포함)
    processed = processed.replace(/(?:^[ \t]*>[ \t]?.*(?:\n(?![ \t]*(?:[#\-*]|\d+\.|---|```|<))[^\n]+)*(\n|$))+/gm, (block) => {
      const rawLines = block.trim().split('\n');
      const innerLines = rawLines.map(l => l.replace(/^[ \t]*>[ \t]?/, ''));
      const blockText = innerLines.join('\n');
      const listProcessed = this.parseLists(blockText);
      const inlineFormatted = this.parseInline(listProcessed);
      const formatted = inlineFormatted.split('\n')
        .filter(l => l.trim().length > 0)
        .reduce((acc, curr) => {
          if (!acc) return curr;
          if (acc.endsWith('</div>') || curr.startsWith('<div')) return acc + curr;
          return acc + '<br>' + curr;
        }, '');
      return saveBlock(`<blockquote>${formatted}</blockquote>\n`);
    });

    // 5. 구분선
    processed = processed.replace(/^[ \t]*---[ \t]*$/gim, () => saveBlock('<hr>'));

    // 6. 목록(List) 변환 (항목별 격리 인라인 파싱 수행 및 saveBlock으로 안전 보호)
    processed = this.parseLists(processed, saveBlock);

    // 7. 단락(<p>) 및 자연스러운 여백 처리 (과도한 <br> 누적 방지)
    const blocks = processed.split(/\n{2,}/);
    processed = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // 이미 블록 레벨 태그나 주석 보호 블록인 경우 p 태그로 감싸지 않음
      if (/^<(h[1-6]|div class="md-h7"|div class="md-bullet|div class="md-num|table|div|ul|ol|blockquote|hr|!--)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${this.parseInline(trimmed).replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('');

    // 9. 보호된 HTML 블록 전량 원본 복원
    htmlBlocks.forEach((html, idx) => {
      processed = processed.split(`<!--HTMLBLOCKPLACEHOLDER${idx}-->`).join(html);
    });

    return processed;
  },

  // 코드 블록 렌더러 (타입 B: 세이지 & 오트밀, 기울임 ZERO, 순수 복사 아이콘)
  renderCodeBlock(code, lang = 'CODE') {
    const safeCode = this.escapeHtml((code || '').trim());
    const displayLang = (lang || 'CODE').toUpperCase();
    return `
      <div class="md-code-block">
        <div class="md-code-header">
          <span class="md-code-lang">${displayLang}</span>
          <button type="button" class="md-code-copy-btn" title="코드 복사" onclick="MarkdownParser.copyCodeBlock(this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
        <pre class="md-code-body"><code>${safeCode}</code></pre>
      </div>
    `;
  },

  // 코드 블록 클립보드 복사 핸들러
  copyCodeBlock(btn) {
    const codeBlock = btn.closest('.md-code-block');
    if (!codeBlock) return;
    const codeEl = codeBlock.querySelector('.md-code-body code');
    if (!codeEl) return;
    const text = codeEl.textContent || '';
    copyToClipboard(text).then(success => {
      if (success) {
        const originalSvg = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5D664D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
        showToast('코드가 클립보드에 복사되었습니다.');
        setTimeout(() => {
          btn.innerHTML = originalSvg;
        }, 1800);
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  // 인라인 마크다운 (볼드체, 인라인 코드, 밑줄) 전용 파서
  parseInline(str) {
    if (!str) return '';
    let s = str.includes('<') ? str : this.escapeHtml(str);
    // 테이블 및 본문 내 안전한 개행(<br>, <br/>) 복원
    s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    // 1. 만세력 첨부 칩
    s = s.replace(/\[([^\]\n]+?의\s*만세력)\]/g, (match, name) => {
      return `<span class="manse-chip-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg><span>${name}</span></span>`;
    });
    // 2. 인라인 코드 `...`
    s = s.replace(/`([^`\n]+?)`/g, '<span class="md-inline-code">$1</span>');
    // 3. 볼드 + 이탤릭 ***...***
    s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // 4. 볼드 **...** (엔터/줄바꿈 포함 복수 줄 매칭 허용)
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<span class="md-bold-highlight">$1</span>');
    s = s.replace(/__([\s\S]+?)__/g, '<span class="md-bold-highlight">$1</span>');
    // 5. 밑줄 *...* 및 _..._
    s = s.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<span class="md-underline">$1</span>');
    s = s.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<span class="md-underline">$1</span>');
    // 6. 짝 안 맞는 잔여 별표 정리
    s = s.replace(/\*\*/g, '');
    return s;
  },

  // [핵심 5] 심리학 전용 대화형 선택지 & 도시에 파서 (체크박스, 순서 추적, 밑줄 입력창, 원클릭 전송)
  parseChoiceDossier(rawText, msgId, choiceState = null) {
    if (!rawText) return { hasChoices: false, html: '' };

    // 선택지 번호(1. or 1.:)와 직접 입력 또는 답변 보충 포함 여부 감지 (인용구 > 유무 무관, [ ] 체크박스 유무 무관)
    const hasNumbered = /(?:^|\n)\s*>?\s*(?:[-*•]\s*)?(?:\[\s*[xX_\- ]?\s*\]\s*)?1(?:\.|\:|\.\:|\))\s+.+/m.test(rawText);
    const hasDirect = /직접\s*입력/.test(rawText);
    const hasSupplement = /답변\s*보충/.test(rawText);

    if (!hasNumbered && !hasDirect && !hasSupplement) {
      return { hasChoices: false, html: '' };
    }

    const lines = rawText.split('\n');
    const preambleLines = [];
    const choiceLines = [];
    let isChoiceSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!isChoiceSection && (
        trimmed.startsWith('>') ||
        /^(?:\[상황\s*질의\]|💡\s*\[|\[질문\])/.test(trimmed) ||
        /^\s*(?:[-*•]\s*)?(?:\[\s*[xX_\- ]?\s*\]\s*)?1(?:\.|\:|\.\:|\))\s+/.test(trimmed)
      )) {
        isChoiceSection = true;
      }

      if (isChoiceSection) {
        choiceLines.push(line);
      } else {
        preambleLines.push(line);
      }
    }

    if (choiceLines.length === 0) {
      return { hasChoices: false, html: '' };
    }

    const preambleText = preambleLines.join('\n').trim();
    const preambleHtml = preambleText ? this.parse(preambleText) : '';

    let scenarioTitle = '';
    const choices = [];
    let directChoice = null;
    let supplementObj = null;

    choiceLines.forEach(rawLine => {
      // 1. 인용구 '>' 기호 제거
      let clean = rawLine.replace(/^\s*>\s?/, '').trim();
      if (!clean) return;

      // 2. 불릿 기호 제거 (- or * or •)
      clean = clean.replace(/^[-*•]\s+/, '').trim();

      // 3. 마크다운 체크박스 마커 ([ ] or [x] or ( )) 제거
      clean = clean.replace(/^\[\s*[xX_\- ]?\s*\]\s*/, '').replace(/^\(\s*[xX_\- ]?\s*\)\s*/, '').trim();

      // 상황 질의 타이틀 감지
      if (/^(?:💡\s*)?\[(?:상황\s*질의|질문|상황)\]/i.test(clean) || (choices.length === 0 && !directChoice && !/^\d+(?:\.|\:|\.\:|\))/.test(clean) && !clean.includes('답변 보충') && !clean.includes('직접 입력'))) {
        clean = clean.replace(/\[\s*선택\s*안내\s*\]/gi, '').trim();
        scenarioTitle = clean;
        return;
      }

      // 6. 직접 입력 감지 (e.g. "[ ] 6. ⟦직접 입력⟧", "6.: ⟦직접 입력⟧", "⟦직접 입력⟧", "[직접 입력]" 등 모든 변형 안전 지원)
      if (/직접\s*입력/i.test(clean)) {
        const phMatch = clean.match(/\(([^)]+)\)/);
        let ph = phMatch ? phMatch[1].trim() : '보기에 없는 내 생각이나 상황을 적어주세요';
        directChoice = {
          id: 6,
          placeholder: ph
        };
        return;
      }

      // 답변 보충 감지 (e.g. "⟦답변 보충⟧", "[답변 보충]", "답변 보충" 등 모든 변형 안전 지원)
      if (/답변\s*보충/i.test(clean)) {
        const phMatch = clean.match(/\(([^)]+)\)/);
        let ph = phMatch ? phMatch[1].trim() : '답변 일부 발췌, 재조립, 기타 메모를 자유롭게 입력';
        supplementObj = {
          placeholder: ph
        };
        return;
      }

      // 번호 매겨진 선택지 (1~5번) - "1.: ", "1. ", "1: ", "1) " 등 완벽 포용
      const numMatch = clean.match(/^(\d+)(?:\.|\:|\.\:|\))\s*(.+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        let text = numMatch[2].trim();
        // 앞부분에 남아있는 콜론이나 점 제거 (e.g. "1.: 최우선" -> text가 ": 최우선"으로 잡히는 오염 방지)
        text = text.replace(/^[:.]\s*/, '').trim();

        choices.push({
          id: num,
          label: `${num}. ${text}`,
          text: `${num}번 선택: ${text}`
        });
      }
    });

    if (choices.length === 0 && !directChoice) {
      return { hasChoices: false, html: '' };
    }

    // [선택 안내] 삭제 및 요청 문구로 깔끔하게 교체
    if (!scenarioTitle || scenarioTitle.includes('선택 안내') || scenarioTitle === '💡') {
      scenarioTitle = '아래 보기 중 가장 가까운 마음 속 생각이나 반응을 골라주세요! (다중 선택 가능)';
    } else if (!scenarioTitle.includes('다중 선택 가능')) {
      scenarioTitle = scenarioTitle.replace(/골라주세요!?/, '골라주세요! (다중 선택 가능)');
    }

    if (!directChoice) {
      directChoice = { id: 6, placeholder: '보기에 없는 내 생각이나 상황을 적어주세요' };
    }

    if (!supplementObj) {
      supplementObj = { placeholder: '답변 일부 발췌, 재조립, 기타 메모를 자유롭게 입력' };
    }

    const selList = (choiceState && Array.isArray(choiceState.orderedSelections)) ? choiceState.orderedSelections : [];
    const isSubmitted = Boolean(choiceState && choiceState.submitted);

    let choicesHtml = '';
    choices.forEach(ch => {
      const selIdx = selList.findIndex(item => item.id === ch.id);
      const isChecked = selIdx !== -1;
      const badgeText = isChecked ? `${selIdx + 1}번째 선택` : '';
      const badgeClass = isChecked ? 'order-badge-placeholder order-badge-clean' : 'order-badge-placeholder';

      choicesHtml += `
        <div class="choice-item-row" data-choice-id="${ch.id}" data-choice-text="${this.escapeHtml(ch.text)}">
          <input type="checkbox" class="choice-chk" id="chk-${msgId}-${ch.id}" ${isChecked ? 'checked' : ''}>
          <span class="choice-label-text">${this.parseInline(ch.label)} <span class="${badgeClass}" id="badge-${msgId}-${ch.id}">${badgeText}</span></span>
        </div>
      `;
    });

    // 6. 직접 입력 (일반 굵기 400 + 단일 밑줄)
    const directIdx = selList.findIndex(item => item.id === 6 || item.isDirect);
    const isDirectChecked = directIdx !== -1;
    const directBadgeText = isDirectChecked ? `${directIdx + 1}번째 선택` : '';
    const directBadgeClass = isDirectChecked ? 'order-badge-placeholder order-badge-clean' : 'order-badge-placeholder';
    const directVal = (choiceState && typeof choiceState.directValue === 'string') ? choiceState.directValue : '';

    choicesHtml += `
      <div class="choice-item-row choice-row-direct" data-choice-id="6">
        <input type="checkbox" class="choice-chk" id="chk-${msgId}-6" ${isDirectChecked ? 'checked' : ''}>
        <div style="flex: 1;">
          <span class="choice-label-text">6. 직접 입력 <span class="${directBadgeClass}" id="badge-${msgId}-6">${directBadgeText}</span></span>
          <div style="margin-top: 4px;">
            <textarea id="field-${msgId}-direct" class="single-underline-field field-direct" rows="1" placeholder="${this.escapeHtml(directChoice.placeholder)}">${this.escapeHtml(directVal)}</textarea>
          </div>
        </div>
      </div>
    `;

    // 답변 보충 (단일 밑줄)
    const suppVal = (choiceState && typeof choiceState.supplementValue === 'string') ? choiceState.supplementValue : '';
    const supplementHtml = `
      <div class="supplement-divider-box">
        <div class="supplement-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <span>답변 보충</span>
        </div>
        <textarea id="field-${msgId}-supplement" class="single-underline-field field-supplement" rows="1" placeholder="${this.escapeHtml(supplementObj.placeholder)}">${this.escapeHtml(suppVal)}</textarea>
      </div>
    `;

    // 선택 완료 버튼 (컴팩트 & 완벽 중앙 정렬, 제출 완료 상태 영구 보존)
    const submitBtnHtml = `
      <div class="confirm-action-row">
        <button type="button" class="btn-submit-choice-compact" id="btn-submit-${msgId}" ${isSubmitted ? 'disabled style="opacity: 0.6;"' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide ${isSubmitted ? 'lucide-check' : 'lucide-check-check'}"><path d="M20 6 9 17l-5-5"/>${isSubmitted ? '' : '<path d="m22 10-7.5 7.5L13 16"/>'}</svg>
          <span>${isSubmitted ? '선택 반영됨' : '선택 완료!'}</span>
        </button>
      </div>
    `;

    const html = `
      ${preambleHtml ? `<div class="ai-dialogue-body">${preambleHtml}</div>` : ''}
      <div class="integrated-quote-section" data-msg-id="${msgId}">
        <div class="quote-scenario-title">${this.parseInline(scenarioTitle)}</div>
        <div class="choices-list-container">
          ${choicesHtml}
        </div>
        ${supplementHtml}
        ${submitBtnHtml}
      </div>
    `;

    return { hasChoices: true, html };
  },

  // [신규] 심리학 첫 진입 시 전용 온보딩 선택 카드 (톤 2줄 옵션 + 닉네임 밑줄 + 첫 이야기 밑줄 + 선택완료)
  renderPsychologyOnboarding(msgId, choiceState = null) {
    const isSubmitted = Boolean(choiceState && choiceState.submitted);
    const savedTone = (choiceState && typeof choiceState.tone === 'string') ? choiceState.tone : '';
    const isBanmal = savedTone.includes('반말');
    const isJondaet = savedTone.includes('존댓말');
    const nickVal = (choiceState && typeof choiceState.nickname === 'string') ? choiceState.nickname : '';
    const storyVal = (choiceState && typeof choiceState.story === 'string') ? choiceState.story : '';

    return `
      <div class="ai-dialogue-body">
        본격적으로 이야기를 시작하기 전에, 가장 편안한 대화 환경부터 맞춰볼게요!
      </div>
      <div class="integrated-quote-section onboarding-quote-section" data-msg-id="${msgId}">
        <!-- 1번 질문: 체크박스 없이, 아래에 2줄 옵션 체크박스 -->
        <div class="onboarding-question-block">
          <div class="onboarding-q-title">1. 어떤 대화 톤이 편하신가요?</div>
          <div class="onboarding-tone-options">
            <label class="choice-item-row onboarding-tone-row">
              <input type="radio" name="tone-${msgId}" class="choice-chk" value="친구처럼 거침없이 반말로 티키타카 하기" ${isBanmal ? 'checked' : ''}>
              <span class="choice-label-text">친구처럼 거침없이 반말로 티키타카 하기</span>
            </label>
            <label class="choice-item-row onboarding-tone-row">
              <input type="radio" name="tone-${msgId}" class="choice-chk" value="적당히 위트 있고 편안한 존댓말 쓰기" ${isJondaet ? 'checked' : ''}>
              <span class="choice-label-text">적당히 위트 있고 편안한 존댓말 쓰기</span>
            </label>
          </div>
        </div>

        <!-- 2번 질문: 체크박스 없이, 아래에 밑줄 입력창 -->
        <div class="onboarding-question-block" style="margin-top: 14px;">
          <div class="onboarding-q-title">2. 대화하는 동안 제가 어떤 호칭(닉네임)으로 불러드리면 좋을까요?</div>
          <div style="margin-top: 6px;">
            <textarea id="onboarding-nickname-${msgId}" class="single-underline-field" rows="1" placeholder="불러드릴 호칭(닉네임)">${this.escapeHtml(nickVal)}</textarea>
          </div>
        </div>

        <!-- 3번 질문: 체크박스 없이, 아래에 밑줄 입력창 -->
        <div class="onboarding-question-block" style="margin-top: 14px;">
          <div class="onboarding-q-title">3. 지금 머릿속에 가장 먼저 떠오르는 이야기 하나만 편하게 꺼내주세요!</div>
          <div style="margin-top: 6px;">
            <textarea id="onboarding-story-${msgId}" class="single-underline-field" rows="1" placeholder="재밌게 본 영화/유튜브, 직장/친구 일화, 취미, 고민 등">${this.escapeHtml(storyVal)}</textarea>
          </div>
        </div>

        <!-- 컴팩트 선택 완료 버튼 (직접 입력칸 및 답변 보충칸 완전 배제) -->
        <div class="confirm-action-row" style="margin-top: 16px;">
          <button type="button" class="btn-submit-choice-compact" id="btn-submit-onboarding-${msgId}" ${isSubmitted ? 'disabled style="opacity: 0.6;"' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide ${isSubmitted ? 'lucide-check' : 'lucide-check-check'}"><path d="M20 6 9 17l-5-5"/>${isSubmitted ? '' : '<path d="m22 10-7.5 7.5L13 16"/>'}</svg>
            <span>${isSubmitted ? '선택 반영됨' : '선택 완료!'}</span>
          </button>
        </div>
      </div>
    `;
  },

  bindOnboardingEvents(containerEl, msgId, choiceState = null) {
    const quoteSection = containerEl.querySelector(`.onboarding-quote-section[data-msg-id="${msgId}"]`);
    if (!quoteSection) return;

    const nicknameField = quoteSection.querySelector(`#onboarding-nickname-${msgId}`);
    const storyField = quoteSection.querySelector(`#onboarding-story-${msgId}`);
    const submitBtn = quoteSection.querySelector(`#btn-submit-onboarding-${msgId}`);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const ensureCaretVisible = (textarea) => {
      // 안드로이드 및 PC에서는 화면이 들썩거리지 않도록 인위적인 스크롤 완전 건너뜀
      if (!isIOS || !window.visualViewport) return;
      requestAnimationFrame(() => {
        const activeChatScroll = textarea.closest('.chat-messages-container');
        if (!activeChatScroll) return;
        // iOS QuickType 자동완성 / 툴바 높이(약 45~60px)까지 완벽 여유 공간 확보 (85px)
        const viewportBottom = window.visualViewport.height - 85;
        const rect = textarea.getBoundingClientRect();
        if (rect.bottom > viewportBottom) {
          activeChatScroll.scrollTop += (rect.bottom - viewportBottom);
        }
      });
    };

    const handleAutoResize = (textarea) => {
      textarea.style.height = 'auto';
      const lines = Math.max(1, Math.round(textarea.scrollHeight / 28));
      textarea.style.height = `${lines * 28}px`;
      ensureCaretVisible(textarea);
    };

    if (nicknameField) {
      handleAutoResize(nicknameField);
      setTimeout(() => handleAutoResize(nicknameField), 10);
      nicknameField.addEventListener('input', () => handleAutoResize(nicknameField));
    }
    if (storyField) {
      handleAutoResize(storyField);
      setTimeout(() => handleAutoResize(storyField), 10);
      storyField.addEventListener('input', () => handleAutoResize(storyField));
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const checkedTone = quoteSection.querySelector(`input[name="tone-${msgId}"]:checked`);
        if (!checkedTone) {
          alert('1번 질문에서 원하시는 대화 톤을 선택해주세요!');
          return;
        }
        const toneVal = checkedTone.value;
        const nickVal = nicknameField ? nicknameField.value.trim() : '';
        const storyVal = storyField ? storyField.value.trim() : '';

        if (!storyVal) {
          alert('3번 질문에 머릿속에 떠오르는 이야기 하나만 편하게 적어주세요!');
          if (storyField) storyField.focus();
          return;
        }

        const lines = [
          `1. 대화 톤: ${toneVal}`,
          `2. 호칭(닉네임): ${nickVal || '편한 호칭으로 불러주세요'}`,
          `3. 첫 번째 이야기: ${storyVal}`
        ];

        // 이 카드 이후의 모든 후속 대화(DOM + DB + 히스토리) 정리
        const msgRow = containerEl.closest('.chat-message-row');
        if (msgRow) {
          let nextRow = msgRow.nextElementSibling;
          while (nextRow) {
            const toRemove = nextRow;
            nextRow = nextRow.nextElementSibling;
            const nId = toRemove.querySelector('.chat-bubble')?.dataset?.msgId;
            if (nId) {
              await DB.delete('chat_messages', nId);
              ChatManager.activeHistory = ChatManager.activeHistory.filter(h => h.id !== nId);
            }
            toRemove.remove();
          }
        }

        const targetIdx = ChatManager.activeHistory.findIndex(h => h.id === msgId);
        if (targetIdx !== -1) {
          const removedHistory = ChatManager.activeHistory.splice(targetIdx + 1);
          for (const rh of removedHistory) {
            if (rh.id) await DB.delete('chat_messages', rh.id);
          }
        }

        const stateToSave = {
          tone: toneVal,
          nickname: nickVal,
          story: storyVal,
          submitted: true
        };

        try {
          const msgObj = await DB.get('chat_messages', msgId);
          if (msgObj) {
            msgObj.choiceState = stateToSave;
            await DB.set('chat_messages', msgObj);
          }
        } catch (e) {
          console.warn('DB onboarding choiceState 저장 실패:', e);
        }

        // [핵심] 사용자 말풍선 없이 즉시 AI에게 페이로드 전송
        ChatManager.sendChoicePayload('psychology', lines.join('\n'), msgId, stateToSave);

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check preview-icon"><path d="M20 6 9 17l-5-5"/></svg>선택 반영됨</span>`;
      });
    }
  },

  bindChoiceEvents(containerEl, msgId, choiceState = null) {
    const quoteSection = containerEl.querySelector(`.integrated-quote-section[data-msg-id="${msgId}"]`);
    if (!quoteSection) return;

    let orderedSelections = (choiceState && Array.isArray(choiceState.orderedSelections))
      ? JSON.parse(JSON.stringify(choiceState.orderedSelections))
      : [];

    const updateBadges = () => {
      quoteSection.querySelectorAll('.order-badge-placeholder').forEach(el => {
        el.textContent = '';
        el.className = 'order-badge-placeholder';
      });

      orderedSelections.forEach((item, idx) => {
        const badgeEl = quoteSection.querySelector(`#badge-${msgId}-${item.id}`);
        if (badgeEl) {
          badgeEl.textContent = `${idx + 1}번째 선택`;
          badgeEl.className = 'order-badge-placeholder order-badge-clean';
        }
      });
    };

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const ensureCaretVisible = (textarea) => {
      // 안드로이드 및 PC에서는 화면이 들썩거리지 않도록 인위적인 스크롤 완전 건너뜀
      if (!isIOS || !window.visualViewport) return;
      requestAnimationFrame(() => {
        const activeChatScroll = textarea.closest('.chat-messages-container');
        if (!activeChatScroll) return;
        // iOS QuickType 자동완성 / 툴바 높이(약 45~60px)까지 완벽 여유 공간 확보 (85px)
        const viewportBottom = window.visualViewport.height - 85;
        const rect = textarea.getBoundingClientRect();
        if (rect.bottom > viewportBottom) {
          activeChatScroll.scrollTop += (rect.bottom - viewportBottom);
        }
      });
    };

    const handleAutoResize = (textarea) => {
      textarea.style.height = 'auto';
      const lines = Math.max(1, Math.round(textarea.scrollHeight / 28));
      textarea.style.height = `${lines * 28}px`;
      ensureCaretVisible(textarea);
    };

    // 일반 선택지 클릭 핸들러
    quoteSection.querySelectorAll('.choice-item-row:not(.choice-row-direct)').forEach(row => {
      row.addEventListener('click', (e) => {
        const choiceId = parseInt(row.dataset.choiceId, 10);
        const choiceText = row.dataset.choiceText;
        const chk = row.querySelector('.choice-chk');

        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }

        if (chk.checked) {
          if (!orderedSelections.some(item => item.id === choiceId)) {
            orderedSelections.push({ id: choiceId, text: choiceText });
          }
        } else {
          const idx = orderedSelections.findIndex(item => item.id === choiceId);
          if (idx !== -1) orderedSelections.splice(idx, 1);
        }

        updateBadges();
      });
    });

    // 6번 직접 입력 핸들러
    const directRow = quoteSection.querySelector('.choice-row-direct');
    const directChk = quoteSection.querySelector(`#chk-${msgId}-6`);
    const directField = quoteSection.querySelector(`#field-${msgId}-direct`);

    if (directField) {
      handleAutoResize(directField);
      setTimeout(() => handleAutoResize(directField), 10);
    }

    if (directRow && directChk && directField) {
      directRow.addEventListener('click', (e) => {
        if (e.target === directField) {
          if (!directChk.checked) {
            directChk.checked = true;
            if (!orderedSelections.some(item => item.id === 6)) {
              orderedSelections.push({ id: 6, isDirect: true });
            }
            updateBadges();
          }
          return;
        }

        if (e.target !== directChk) {
          directChk.checked = !directChk.checked;
        }

        if (directChk.checked) {
          if (!orderedSelections.some(item => item.id === 6)) {
            orderedSelections.push({ id: 6, isDirect: true });
          }
          directField.focus();
        } else {
          const idx = orderedSelections.findIndex(item => item.id === 6);
          if (idx !== -1) orderedSelections.splice(idx, 1);
        }

        updateBadges();
      });

      directField.addEventListener('input', () => {
        handleAutoResize(directField);
        if (directField.value.trim().length > 0 && !directChk.checked) {
          directChk.checked = true;
          if (!orderedSelections.some(item => item.id === 6)) {
            orderedSelections.push({ id: 6, isDirect: true });
          }
          updateBadges();
        }
      });
    }

    // 답변 보충 자동 늘어남
    const suppField = quoteSection.querySelector(`#field-${msgId}-supplement`);
    if (suppField) {
      handleAutoResize(suppField);
      setTimeout(() => handleAutoResize(suppField), 10);
      suppField.addEventListener('input', () => handleAutoResize(suppField));
    }

    // 선택 완료 전송
    const submitBtn = quoteSection.querySelector(`#btn-submit-${msgId}`);
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const lines = [];

        orderedSelections.forEach(item => {
          if (item.isDirect) {
            const val = directField ? directField.value.trim() : '';
            lines.push(val ? `6번 선택: 직접 입력 ${val}` : `6번 선택: 직접 입력`);
          } else {
            lines.push(item.text);
          }
        });

        const suppVal = suppField ? suppField.value.trim() : '';
        if (suppVal) {
          lines.push(`답변 보충\n${suppVal}`);
        }

        if (lines.length === 0) {
          alert('선택지를 최소 1개 이상 선택하거나 텍스트를 입력해주세요!');
          return;
        }

        // 이 카드 이후의 모든 후속 대화(DOM + DB + 히스토리) 정리
        const msgRow = containerEl.closest('.chat-message-row');
        if (msgRow) {
          let nextRow = msgRow.nextElementSibling;
          while (nextRow) {
            const toRemove = nextRow;
            nextRow = nextRow.nextElementSibling;
            const nId = toRemove.querySelector('.chat-bubble')?.dataset?.msgId;
            if (nId) {
              await DB.delete('chat_messages', nId);
              ChatManager.activeHistory = ChatManager.activeHistory.filter(h => h.id !== nId);
            }
            toRemove.remove();
          }
        }

        const targetIdx = ChatManager.activeHistory.findIndex(h => h.id === msgId);
        if (targetIdx !== -1) {
          const removedHistory = ChatManager.activeHistory.splice(targetIdx + 1);
          for (const rh of removedHistory) {
            if (rh.id) await DB.delete('chat_messages', rh.id);
          }
        }

        const stateToSave = {
          orderedSelections: JSON.parse(JSON.stringify(orderedSelections)),
          directValue: directField ? directField.value.trim() : '',
          supplementValue: suppField ? suppField.value.trim() : '',
          submitted: true
        };

        try {
          const msgObj = await DB.get('chat_messages', msgId);
          if (msgObj) {
            msgObj.choiceState = stateToSave;
            await DB.set('chat_messages', msgObj);
          }
        } catch (e) {
          console.warn('DB choiceState 저장 실패:', e);
        }

        const payloadText = lines.join('\n');
        // [핵심] 사용자 말풍선 없이 즉시 AI에게 페이로드 전송
        ChatManager.sendChoicePayload('psychology', payloadText, msgId, stateToSave);

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check preview-icon"><path d="M20 6 9 17l-5-5"/></svg>선택 반영됨</span>`;
      });
    }
  }
};

// 9-B. Firebase Vertex AI (AI Logic) & App Check 연동 엔진 (VertexManager)

if (typeof window !== 'undefined') {
  (window as any).MarkdownParser = MarkdownParser;
}

export { MarkdownParser };
