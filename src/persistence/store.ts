import { migrateSave, type SaveData } from './types.js';

export interface SaveStore {
  load(): Promise<SaveData | undefined>;
  save(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'project-noclip';
const STORE_NAME = 'saves';
const SAVE_KEY = 'local-character';

export class IndexedDbSaveStore implements SaveStore {
  private database?: Promise<IDBDatabase>;
  private fallbackValue?: SaveData;

  private fallbackLoad(): SaveData | undefined {
    try {
      const raw = globalThis.localStorage?.getItem(SAVE_KEY);
      if (raw) return migrateSave(JSON.parse(raw));
    } catch { /* opaque or restricted origin */ }
    return this.fallbackValue ? structuredClone(this.fallbackValue) : undefined;
  }

  private fallbackSave(data: SaveData): void {
    this.fallbackValue = structuredClone(data);
    try { globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* memory fallback remains */ }
  }

  private fallbackClear(): void {
    this.fallbackValue = undefined;
    try { globalThis.localStorage?.removeItem(SAVE_KEY); } catch { /* restricted origin */ }
  }

  private open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open save database'));
    });
    return this.database;
  }

  async load(): Promise<SaveData | undefined> {
    let db: IDBDatabase;
    try { db = await this.open(); } catch { return this.fallbackLoad(); }
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not read save'));
    });
    return migrateSave(raw);
  }

  async save(data: SaveData): Promise<void> {
    let db: IDBDatabase;
    try { db = await this.open(); } catch { this.fallbackSave(data); return; }
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(structuredClone(data), SAVE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not write save'));
    });
  }

  async clear(): Promise<void> {
    let db: IDBDatabase;
    try { db = await this.open(); } catch { this.fallbackClear(); return; }
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(SAVE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear save'));
    });
  }
}

export class MemorySaveStore implements SaveStore {
  private value?: SaveData;
  async load(): Promise<SaveData | undefined> { return this.value ? structuredClone(this.value) : undefined; }
  async save(data: SaveData): Promise<void> { this.value = structuredClone(data); }
  async clear(): Promise<void> { this.value = undefined; }
}
