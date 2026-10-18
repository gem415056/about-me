# 텍스트 파일 기반 프롬프트 원문 실시간 전송 보장 계획

사용자가 `prompt_saju.txt` 및 `prompt_psychology.txt`에 작성한 원문 프롬프트가 임의의 하드코딩 대체재나 임시 필터링 없이, 파일 수정 사항을 즉시 반영하여 100% 원형 그대로 AI 페이로드에 전달되도록 근본 구조를 재설계합니다.

> [!IMPORTANT]
> **핵심 설계 원칙 (사용자 지침 엄수)**
> 1. **임시방편(돌려막기) 전면 배제**: `[REPORT_START] ... [REPORT_END]` 문자열을 억지로 숨기거나 후처리로 가리는 식의 우회 처리를 일체 적용하지 않습니다.
> 2. **하드코딩 폴백 전면 제거**: 로드 실패 시 코드 내부에 임의로 박아둔 가짜 프롬프트(`당신은 명리학... [REPORT_START]...`)로 대체하는 코드를 완전히 삭제합니다.
> 3. **txt 파일 원문 동적 전송 보장**: 사용자가 `prompt_saju.txt`나 `prompt_psychology.txt` 파일을 수정하면, 브라우저 캐시나 경로 오류 없이 파일의 최신 내용이 무조건 그대로 `systemInstruction` 페이로드로 전송됩니다.

---

### User Review & Critical Decisions

- **결정 1 (하드코딩 폴백 완전 삭제)**: 코드(js/app.js 3087~3093라인)에 남아있던 하드코딩된 가짜 명리학 프롬프트(내부에 `[REPORT_START]`가 포함되어 있어 원인이 되었던 부분)를 완전히 제거합니다. 로드 실패 시 엉뚱한 프롬프트로 대체되는 것을 방지하고 항상 실제 txt 파일을 참조합니다.
- **결정 2 (서버-클라이언트 이중 직결 로딩 체계)**: 브라우저 환경(iframe, 캐시, 상대경로 등)에 구애받지 않도록, 서버(`server.js`)에 디스크의 txt 파일을 실시간으로 읽는 엔드포인트(`GET /api/prompt/:category`)를 신설하고, 캐시 방지 헤더(`no-store, no-cache`) 및 타임스탬프 쿼리를 적용하여 파일 수정 즉시 0초 반영을 보장합니다.
- **결정 3 (서버 프록시 검증 파이프라인)**: `/api/gemini` 호출 시 카테고리(`saju` 또는 `psychology`)를 전달하여, 서버 측에서도 해당 텍스트 파일의 최신 내용을 디스크에서 직접 대조·보증하여 Gemini API로 전송하는 페이로드에 오직 사용자의 txt 원문만 실리도록 합니다.

---

### 1. Overview & Core Concept

- **목적**: 사용자가 `prompt_saju.txt` 및 `prompt_psychology.txt` 파일에 정의한 명리학과 심리학의 고유 프롬프트 원문이 누락·오염·왜곡 없이 정확히 모델에 주입되도록 보장합니다.
- **동작 방식**: 
  - 명리학 탭/세션 대화 시 ➡️ `prompt_saju.txt`의 원문 텍스트를 즉시 읽어 페이로드의 `systemInstruction`에 주입
  - 심리학 탭/세션 대화 시 ➡️ `prompt_psychology.txt`의 원문 텍스트를 즉시 읽어 페이로드의 `systemInstruction`에 주입
  - 사용자가 txt 파일의 프롬프트를 수정하면 새로고침이나 서버 재시작 없이 다음 전송부터 즉시 반영

---

### 2. Technical Architecture & Data Strategy

#### 데이터 및 프롬프트 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                 사용자가 직접 수정한 txt 파일                │
│       /prompt_saju.txt    /prompt_psychology.txt            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (fs.readFileSync - no-cache) ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js Server (server.js)                  │
│  ├─ GET /api/prompt/:category (디스크에서 실시간 파일 읽기)  │
│  └─ POST /api/gemini (category 기준 txt 원문 페이로드 보증) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (정확한 category 파라미터)    ▼
┌─────────────────────────────────────────────────────────────┐
│                   클라이언트 (js/app.js)                     │
│  ├─ ChatManager.sendMessage(category)                       │
│  │   └─ AIEngine.sendRequest({ category, ... })             │
│  │       └─ 프롬프트 로더: txt 원문 즉각 로드               │
│  │          (임의의 가짜 프롬프트/하드코딩 폴백 일체 없음)   │
│  └─ payload.systemInstruction = { text: txt원문 }           │
└─────────────────────────────────────────────────────────────┘
```

#### 세부 구현 항목

1. **`server.js` 고도화**:
   - `prompt_saju.txt` 및 `prompt_psychology.txt` 정적 서빙 시 `no-cache, no-store, must-revalidate` 헤더 강제.
   - 전용 API `GET /api/prompt/:category`: 디스크에서 파일(`fs.readFileSync`)을 직접 읽어 반환하는 고속 무캐시 API 제공.
   - `POST /api/gemini`: 클라이언트로부터 `category`를 전달받아, 디스크의 실제 txt 파일 내용과 결합하여 외부 Gemini API로 완벽하게 전송.

2. **`js/app.js` 정비**:
   - `AIEngine.sendRequest` 내의 잘못된 하드코딩 대체 로직(3087~3093라인) 영구 제거.
   - `fetchPrompt(category)` 헬퍼 함수 구축:
     - 1차: `/api/prompt/${category}?t=${Date.now()}` 호출 (서버 디스크 직결)
     - 2차: `/${txtFile}?t=${Date.now()}` 호출
     - 읽어온 텍스트가 정상적인 경우 그대로 `payload.systemInstruction`에 주입.
     - 실패 시 임의의 다른 텍스트로 속이지 않고 명확한 에러를 발생시켜 사용자가 파일 경로 및 권한 문제를 즉각 인지할 수 있도록 처리.
   - 명리학 대화방과 심리학 대화방의 `category` 파라미터 전달 정밀 점검 (`saju` vs `psychology`).

---

### 3. Verification Plan

1. **정적 파일 및 API 무캐시 응답 검증**:
   - `curl -i http://localhost:3000/api/prompt/saju` 및 `curl -i http://localhost:3000/api/prompt/psychology` 호출하여 디스크의 실제 파일 원문이 정확히 반환되는지 확인.
   - `prompt_saju.txt`에 테스트 문구를 수정/저장했을 때 API 결과에 즉시 반영되는지 확인.
2. **명리학 대화방 페이로드 검증**:
   - 명리학 대화방에서 만세력 및 질문 전송 시 `prompt_saju.txt`의 원문이 `systemInstruction`으로 전송되는지 브라우저 콘솔/서버 프록시 로그로 확인.
   - 명리학 대화방 응답에 심리학 보고서 태그(`[REPORT_START]`)가 더 이상 유발되지 않는지 확인.
3. **심리학 대화방 페이로드 검증**:
   - 심리학 대화방에서 질문 전송 시 `prompt_psychology.txt`의 원문이 정확히 전송되는지 확인.
4. **전체 빌드 및 컴파일 확인**:
   - `compile_applet` 도구로 구문 오류 및 런타임 결함 여부 최종 검증.
