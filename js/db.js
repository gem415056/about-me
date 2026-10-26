/**
 * ABOUT ME - IndexedDB Core Database Manager
 * Name: AboutMeDB
 * Version: 1
 */

const DB_CONFIG = {
  name: 'AboutMeDB',
  version: 3,
  stores: {
    // 1. 프롬프트 저장소 (key: 'psychology' | 'saju')
    prompts: { keyPath: 'id' },
    
    // 2. 전체 설정 저장소 (key: 'gemini_api_key' | 'vertex_config' | 'firestore_config' | 'general_settings')
    settings: { keyPath: 'id' },
    
    // 3. 만세력 명식 프로필 (key: id, fields: name, imageData, createdAt)
    saju_profiles: { keyPath: 'id', autoIncrement: true },
    
    // 4. 대화 세션 메타 (key: id, fields: category, title, createdAt, updatedAt)
    chat_sessions: { keyPath: 'id' },
    
    // 5. 대화 메시지 상세 (key: id, fields: sessionId, role, content, hasImages, timestamp)
    chat_messages: { keyPath: 'id', indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] },

    // 6. 커스텀 프롬프트 템플릿 저장소 (key: id, fields: title, content, createdAt, updatedAt)
    custom_prompts: { keyPath: 'id', autoIncrement: true }
  }
};

const DB = {
  dbInstance: null,

  // 데이터베이스 초기화 및 테이블 자동 마이그레이션 (버전 충돌 원천 차단)
  async init() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      const upgradeHandler = (db) => {
        Object.entries(DB_CONFIG.stores).forEach(([storeName, options]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: options.keyPath,
              autoIncrement: options.autoIncrement || false
            });
            if (options.indexes) {
              options.indexes.forEach(idx => {
                store.createIndex(idx.name, idx.keyPath, { unique: false });
              });
            }
          }
        });
      };

      // 1단계: 버전 지정 없이 open하여 브라우저의 현재 DB 버전 및 오브젝트 스토어 목록 안전 검사 (VersionError 원천 방지)
      const checkReq = indexedDB.open(DB_CONFIG.name);

      checkReq.onupgradeneeded = (event) => {
        upgradeHandler(event.target.result);
      };

      checkReq.onsuccess = (event) => {
        const db = event.target.result;
        const currentVersion = db.version || 1;

        // 필요한 모든 스토어가 이미 존재하는지 확인
        const missingStores = Object.keys(DB_CONFIG.stores).filter(s => !db.objectStoreNames.contains(s));

        if (missingStores.length === 0) {
          // 모든 스토어가 정상 존재함 -> 그대로 사용
          this.dbInstance = db;
          resolve(this.dbInstance);
          return;
        }

        // 누락된 스토어가 있을 경우에만 버전을 1 올려서 안전하게 업그레이드
        db.close();
        const nextVersion = Math.max(currentVersion + 1, DB_CONFIG.version);
        const upgradeReq = indexedDB.open(DB_CONFIG.name, nextVersion);

        upgradeReq.onupgradeneeded = (upEvent) => {
          upgradeHandler(upEvent.target.result);
        };

        upgradeReq.onsuccess = (upEvent) => {
          this.dbInstance = upEvent.target.result;
          resolve(this.dbInstance);
        };

        upgradeReq.onerror = (upEvent) => {
          console.error('[IndexedDB] DB 업그레이드 실패:', upEvent.target.error);
          reject(upEvent.target.error);
        };
      };

      checkReq.onerror = (event) => {
        console.warn('[IndexedDB] 버전 확인 중 오류 발생, 강제 업그레이드 모드로 전환:', event.target.error);
        const forceReq = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
        forceReq.onupgradeneeded = (e) => upgradeHandler(e.target.result);
        forceReq.onsuccess = (e) => {
          this.dbInstance = e.target.result;
          resolve(this.dbInstance);
        };
        forceReq.onerror = (e) => {
          console.error('[IndexedDB] DB 초기화 최종 실패:', e.target.error);
          reject(e.target.error);
        };
      };
    });
  },

  // 단일 데이터 조회 (Get)
  async get(storeName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  // 단일 데이터 저장/갱신 (Set / Put)
  async set(storeName, value) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // 모든 데이터 조회 (GetAll)
  async getAll(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // 데이터 삭제 (Delete)
  async delete(storeName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // 인덱스 기반 데이터 목록 조회 (예: 특정 세션의 메시지 전체 가져오기)
  async getByIndex(storeName, indexName, value) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
};

if (typeof window !== 'undefined') {
  window.DB = DB;
  window.DB_CONFIG = DB_CONFIG;
}
