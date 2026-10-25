/**
 * ABOUT ME - IndexedDB Core Database Manager
 * Name: AboutMeDB
 * Version: 2
 */

interface StoreConfig {
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: Array<{ name: string; keyPath: string }>;
}

const DB_CONFIG: { name: string; version: number; stores: Record<string, StoreConfig> } = {
  name: 'AboutMeDB',
  version: 2,
  stores: {
    prompts: { keyPath: 'id' },
    settings: { keyPath: 'id' },
    saju_profiles: { keyPath: 'id', autoIncrement: true },
    chat_sessions: { keyPath: 'id' },
    chat_messages: { keyPath: 'id', indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] },
    custom_prompts: { keyPath: 'id', autoIncrement: true }
  }
};

let dbInstance: IDBDatabase | null = null;

export const DB = {
  async init(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
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
      request.onsuccess = (event: any) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };
      request.onerror = (event: any) => {
        console.error('[IndexedDB] DB 초기화 실패:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  async get<T = any>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async set<T = any>(storeName: string, value: T): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(req.result as any);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll<T = any>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName: string, key: IDBValidKey): Promise<boolean> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex<T = any>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
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
