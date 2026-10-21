# 코드 블록 자동 줄바꿈 및 불렛 우측 패딩 정규화

코드 블록 내 긴 코드/텍스트가 가로로 무한히 늘어나지 않고 말풍선 너비에 맞춰 자연스럽게 다음 줄로 자동 줄바꿈되도록 개선하고, 불렛 목록의 들여쓰기와 고정 너비가 충돌하여 말풍선 우측 여백을 침범하던 레이아웃을 일반 본문 단락과 동일하게 정렬되도록 조정합니다.

## User Review & Critical Decisions

> [!IMPORTANT] 사용자가 선택한 UI 처리 방식을 기반으로 기존 마크다운 서식 및 계층 구조를 100% 보존하면서 스타일을 안전하게 개선합니다.

- **코드 블록 표시 방식**: 가로 스크롤 대신 말풍선 너비에 맞춰 자연스럽게 자동 줄바꿈(`white-space: pre-wrap`, `word-break: break-all`, `overflow-wrap: anywhere`) 적용
- **불렛 목록 우측 여백**: 불렛 컨테이너 및 텍스트 요소의 과도한 `width: 100%` 및 마진 누적을 해제하고, `box-sizing: border-box`와 유연 너비(`width: auto`)를 적용하여 일반 단락 본문과 완전히 동일한 말풍선 우측 패딩 확보

---

## 1. Overview & Core Concept

- **What It Does**:
  1. `.md-code-body` 및 내부 `code` 요소가 가로 스크롤바를 강제하지 않고 모바일/데스크톱 말풍선 가로 폭에 맞춰 읽기 쉽게 자동 래핑됩니다.
  2. `.md-bullet-group`, `.md-bullet-item`, `.md-numbered-group`, `.md-numbered-item`, `.md-sub-bullet` 등 모든 불렛 항목들이 들여쓰기(`margin-left`)를 유지하면서도 말풍선의 오른쪽 패딩 경계를 침범하지 않고 깔끔하게 우측 여백을 확보합니다.
- **Target Persona**: 모바일 및 좁은 화면에서 AI 분석 리포트 및 대화를 열람하는 사용자
- **Key Value**: 좌우 스크롤로 인한 시선 분산 방지 및 말풍선 내부 여백의 시각적 일체감 완성

---

## 2. User Experience & Visual Design

- **코드 블록 시각적 경험**:
  - 기존 세이지 & 오트밀 톤(`#EDEAE1`, `#E2DDD2`) 및 상단 언어 라벨, 복사 버튼은 원형 유지
  - 본문 텍스트가 컨테이너 우측 여백(14px) 안쪽에서 자연스럽게 줄바꿈되어 스크롤 없이 한눈에 파악 가능
- **불렛 목록 정렬 경험**:
  - 1단계(대시), 2단계(네모), 3단계(화살표) 불렛 기호와 6~14px 들여쓰기는 칼정렬 유지
  - 우측 끝부분 텍스트가 말풍선 테두리에 바짝 붙지 않고 일반 텍스트 문단처럼 안정적인 우측 여백(말풍선 내부 패딩)을 형성

---

## 3. Key Product Decisions & Trade-Offs

- **코드 블록 자동 줄바꿈 (pre-wrap vs pre)**:
  - *Chosen Approach*: `white-space: pre-wrap !important; word-break: break-all !important;`
  - *Why*: 모바일 메신저 UI에서는 긴 줄이 가로로 스크롤되는 것보다 말풍선 안에서 자연스럽게 읽히는 것이 가독성에 압도적으로 유리합니다. 공백과 줄바꿈(개행)은 그대로 보존되므로 인덴트 구조가 깨지지 않습니다.
- **불렛 너비 제약 해제 (width: 100% 제거 및 flex-basis 제어)**:
  - *Chosen Approach*: 불렛 항목의 `width: 100%`를 `width: auto !important; max-width: 100% !important; box-sizing: border-box !important;`로 변경하고, `margin-left`와 `gap` 계산 시 우측으로 삐져나가지 않도록 정규화
  - *Why*: CSS flex 레이아웃에서 `margin-left`가 부여된 자식에 `width: 100%`가 걸리면 부모 너비를 초과하여 우측 패딩을 덮어버리는 현상을 원천 방지합니다.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│ .chat-bubble (말풍선: padding: 12px 14px)              │
│                                                        │
│  일반 단락: <p>텍스트...</p> ───────── [우측 여백 14px] │
│                                                        │
│  불렛 항목: .md-bullet-item                            │
│  ├── .md-sub-bullet-dot (아이콘)                       │
│  └── .md-bullet-content ────────────── [우측 여백 14px] │
│      (width: auto, margin-left 안전 오프셋)            │
│                                                        │
│  코드 블록: .md-code-block                             │
│  └── pre.md-code-body (pre-wrap) ───── [내부 여백 14px] │
└────────────────────────────────────────────────────────┘
```

- **수정 대상 파일**:
  1. `style.css`: `.md-code-body`의 줄바꿈 속성 추가, `.md-bullet-item`, `.md-sub-bullet`, `.md-numbered-item`, `.md-bullet-content`, `.md-num-content`의 너비/여백 CSS 규칙 정비
  2. `index.html`: 스타일시트 및 스크립트 캐시 버스팅 버전 갱신 (`?v=20261021_v160_wrap_padding`)
- **검증 계획**:
  1. 긴 코드가 포함된 코드 블록에서 가로 스크롤 없이 말풍선 너비에 맞춰 줄바꿈되는지 확인
  2. 1~3단계 불렛 목록 텍스트의 우측 끝선이 일반 본문 문단 `<p>`의 우측 끝선과 정확히 일치하는지 확인
  3. `compile_applet` 빌드 및 콘솔 검증
