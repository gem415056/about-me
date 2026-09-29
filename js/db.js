/**
 * ABOUT ME - IndexedDB Core Database Manager
 * Name: AboutMeDB
 * Version: 1
 */

const DB_CONFIG = {
  name: 'AboutMeDB',
  version: 1,
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
    chat_messages: { keyPath: 'id', indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] }
  }
};

const DB = {
  dbInstance: null,

  // 데이터베이스 초기화 및 테이블 생성
  async init() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 테이블(Object Store) 생성
        Object.entries(DB_CONFIG.stores).forEach(([storeName, options]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: options.keyPath,
              autoIncrement: options.autoIncrement || false
            });

            // 인덱스 생성
            if (options.indexes) {
              options.indexes.forEach(idx => {
                store.createIndex(idx.name, idx.keyPath, { unique: false });
              });
            }
          }
        });
      };

      request.onsuccess = (event) => {
        this.dbInstance = event.target.result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] DB 초기화 실패:', event.target.error);
        reject(event.target.error);
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
