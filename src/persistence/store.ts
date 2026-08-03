import { migrateSave, type SaveData } from './types.js';

const DB_NAME = 'project-noclip';
const STORE_NAME = 'journey';
const SAVE_KEY = 'local-character';
const FALLBACK_KEY = 'project-noclip-save-v2';

export class IndexedDbSaveStore {
  private memory?: SaveData;
  private writeChain: Promise<void> = Promise.resolve();

  async load(): Promise<SaveData | undefined> {
    try {
      const db = await this.open();
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SAVE_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const migrated = migrateSave(value);
      if (migrated) return structuredClone(migrated);
    } catch {
      // Restricted origins and privacy modes may block IndexedDB.
    }
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      if (raw) {
        const migrated = migrateSave(JSON.parse(raw));
        if (migrated) return structuredClone(migrated);
      }
    } catch {
      // Storage may also be denied. Memory fallback keeps the session playable.
    }
    return this.memory ? structuredClone(this.memory) : undefined;
  }

  save(save: SaveData): Promise<void> {
    const snapshot = structuredClone(save);
    this.writeChain = this.writeChain.then(async () => {
      this.memory = snapshot;
      try {
        const db = await this.open();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          transaction.objectStore(STORE_NAME).put(snapshot, SAVE_KEY);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        return;
      } catch {
        try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot)); } catch { /* memory fallback already set */ }
      }
    });
    return this.writeChain;
  }

  async clear(): Promise<void> {
    await this.writeChain;
    this.memory = undefined;
    try {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(SAVE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch { /* ignore */ }
    try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
  }

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
