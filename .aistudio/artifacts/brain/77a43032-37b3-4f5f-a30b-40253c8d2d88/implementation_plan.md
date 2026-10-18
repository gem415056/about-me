# 첨부 이미지(만세력 및 사진) 세션 영구 유지 및 매 턴 페이로드 지속 전송 계획

사용자가 첨부한 만세력 명식 및 사진이 대화 전송 후에도 사라지지 않고, 사용자가 직접 `✕` 버튼으로 삭제하기 전까지 세션에 영구 보존되며 매 대화 턴마다 페이로드에 확실히 포함되도록 전면 개선합니다.

> [!IMPORTANT]
> **확정된 핵심 요구사항 (사용자 답변 100% 반영)**
> 1. **대화 후 태그 자동 초기화 제거**: 첫 질문 전송 시 `SajuManager.attachedProfiles`를 빈 배열로 강제 초기화하던 로직(`SajuManager.attachedProfiles = []`)을 전면 삭제합니다.
> 2. **세션 내 영구 지속 유지**: 사용자가 직접 칩 우측의 `✕` 버튼을 누르기 전까지 만세력 명식 칩과 사진 썸네일 칩이 입력창 상단에 계속 유지됩니다.
> 3. **세션 전환 및 복원 연동**: 대화 세션 전환(`loadSession`) 및 브라우저 새로고침 시에도 해당 세션에 첨부되어 있던 만세력 명식과 사진이 완벽히 복원됩니다.
> 4. **매 턴 페이로드 지속 포함**: 대화가 2턴, 3턴, n턴 이어지더라도 세션에 유지 중인 모든 첨부 이미지(만세력 이미지 및 직접 첨부 사진)를 매번 AI 호출 페이로드의 사용자 턴에 확실하게 결합하여 전달합니다.

---

### User Review & Critical Decisions

- **결정 1 (자동 초기화 로직 폐기)**:
  - 기존 `ChatManager.sendMessage` 4016라인의 `SajuManager.attachedProfiles = []`를 완전히 제거하여, 첫 번째 질문 전송 후에도 만세력 태그가 유지되도록 합니다.
- **결정 2 (세션 단위 첨부 데이터 완전 동기화)**:
  - `chat_sessions` 저장소에 `attachedProfiles` 및 `attachedPhotos`를 함께 영구 저장하고, `SessionManager.loadSession` 시 두 배열을 모두 복구하여 화면 칩(`renderAttachedTags`)에 즉시 표시합니다.
- **결정 3 (AIEngine.buildContents 페이로드 지속 주입)**:
  - 매 턴마다 현재 세션의 활성 첨부 이미지(만세력 프로필 이미지 + 직접 업로드 사진)를 최신 사용자 턴의 `parts`에 온전히 실어 보내어, AI가 몇 번째 질문이든 만세력/사진을 100% 직접 시각 참조할 수 있도록 합니다.

---

### 1. Technical Architecture & Data Strategy

#### 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 인터랙션 (서랍 / + 버튼)                │
│  - 명리학: 만세력 프로필 선택 칩 누적 첨부                       │
│  - 심리학/명리학: 사진 파일 첨부 칩 누적 첨부                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               세션 영구 보존소 (IndexedDB: chat_sessions)       │
│  - session.attachedProfiles (만세력 프로필 원본 데이터)          │
│  - session.attachedPhotos (직접 업로드 이미지 원본 데이터)        │
│  - 사용자가 '✕' 클릭 시에만 삭제 & 세션 동기화                    │
│  - 대화 전송 후에도 절대 자동 삭제되지 않음                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼ (매 대화 턴마다 100% 유지)
┌─────────────────────────────────────────────────────────────────┐
│                 AIEngine.buildContents (매 턴 페이로드)          │
│  - contents[last].parts = [                                     │
│      { inlineData: { mimeType, data } }, // 만세력/사진 이미지   │
│      { text: userText }                  // 사용자 질문         │
│    ]                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Implementation Steps

1. **`js/app.js` 대화 전송 시 태그 자동 삭제 제거**:
   - `ChatManager.sendMessage`:
     - `SajuManager.attachedProfiles = [];` 및 `renderAttachedTags()` 강제 호출 코드 완전 삭제.
     - 전송 후에도 칩이 화면과 메모리에 온전히 남아있도록 처리.
2. **`SajuManager` 세션 동기화 추가**:
   - `SajuManager.attachProfile` 및 `removeProfile` 호출 시 현재 활성 세션에 `attachedProfiles`를 동기화 저장(`syncToSession`).
   - `SessionManager.loadSession` 시 해당 세션의 `attachedProfiles`를 불러와 `SajuManager.attachedProfiles`에 할당하고 `renderAttachedTags()` 렌더링.
   - 새 세션 생성(`createNewSession`) 시에만 깨끗하게 초기화.
3. **`AIEngine.buildContents` 매 턴 이미지 결합 보장**:
   - 사용자가 질문을 보낼 때마다 현재 세션에 유지 중인 모든 첨부 이미지(만세력 및 사진)를 수집하여 현재 사용자 턴의 `parts`에 `inlineData`로 누락 없이 확실하게 주입.
4. **검증**:
   - 만세력 첨부 후 1번째 질문 전송 ➡️ 만세력 칩 유지 확인 & 페이로드에 이미지 포함 확인.
   - 2번째 질문 전송 ➡️ 만세력 칩 계속 유지 확인 & 2번째 질문 페이로드에도 만세력 이미지가 지속 포함되는지 확인.
   - `✕` 클릭 시 칩 제거 및 세션 DB 동기화 확인.
   - `compile_applet` 및 `lint_applet` 실행.
