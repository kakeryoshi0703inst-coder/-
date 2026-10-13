/**
 * Personal Last-Done Tracker (Ver.4 Ultimate)
 * 「最後にいつやったか」特化型ライフログ Database Layer
 */

const DB_NAME = 'WhenDidILastDB_v4';
const DB_VERSION = 1;

// カテゴリ定義
const DEFAULT_CATEGORIES = [
  { id: 'cat_clean', name: '掃除', icon: '🧹', color: '#689676', softColor: '#ECF4EE' },
  { id: 'cat_shopping', name: '買い物', icon: '🛒', color: '#D48C5B', softColor: '#FCEFE8' },
  { id: 'cat_housework', name: '家事', icon: '🧺', color: '#5B8EA6', softColor: '#EAF2F6' },
  { id: 'cat_maintenance', name: 'メンテ', icon: '🔧', color: '#8B7CA8', softColor: '#F2EFF7' },
  { id: 'cat_health', name: '美容・健康', icon: '💅', color: '#C77560', softColor: '#FAECE8' },
  { id: 'cat_other', name: 'その他', icon: '📝', color: '#998B7C', softColor: '#F5F2ED' }
];

class WhenDidILastDB {
  constructor() {
    this.db = null;
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    this.storageKeyItems = 'wdil_items_v4';
    this.storageKeyHistories = 'wdil_histories_v4';
    this.storageKeyCategories = 'wdil_categories_v4';
  }

  async init() {
    if (!this.isIndexedDBAvailable) {
      this._initFallback();
      return;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 1. Items Store (管理項目: お風呂掃除、トイレットペーパー購入等)
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('categoryId', 'categoryId', { unique: false });
          itemStore.createIndex('lastDoneAt', 'lastDoneAt', { unique: false });
        }

        // 2. Histories Store (実施履歴)
        if (!db.objectStoreNames.contains('histories')) {
          const historyStore = db.createObjectStore('histories', { keyPath: 'id' });
          historyStore.createIndex('itemId', 'itemId', { unique: false });
          historyStore.createIndex('doneAt', 'doneAt', { unique: false });
        }

        // 3. Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        await this._ensureDefaultCategories();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB unavailable, falling back to LocalStorage', event);
        this.isIndexedDBAvailable = false;
        this._initFallback();
        resolve(null);
      };
    });
  }

  _initFallback() {
    if (!localStorage.getItem(this.storageKeyCategories)) {
      localStorage.setItem(this.storageKeyCategories, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(this.storageKeyItems)) {
      localStorage.setItem(this.storageKeyItems, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.storageKeyHistories)) {
      localStorage.setItem(this.storageKeyHistories, JSON.stringify([]));
    }
  }

  async _ensureDefaultCategories() {
    const cats = await this.getCategories();
    if (!cats || cats.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await this.saveCategory(cat);
      }
    }
  }

  // --- Category Methods ---
  async getCategories() {
    if (!this.isIndexedDBAvailable || !this.db) {
      const data = localStorage.getItem(this.storageKeyCategories);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result && req.result.length ? req.result : DEFAULT_CATEGORIES);
      req.onerror = () => resolve(DEFAULT_CATEGORIES);
    });
  }

  async saveCategory(cat) {
    if (!this.isIndexedDBAvailable || !this.db) {
      const cats = await this.getCategories();
      const idx = cats.findIndex(c => c.id === cat.id);
      if (idx >= 0) cats[idx] = cat; else cats.push(cat);
      localStorage.setItem(this.storageKeyCategories, JSON.stringify(cats));
      return cat;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.put(cat);
      req.onsuccess = () => resolve(cat);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Item CRUD Methods ---
  async getAllItems() {
    if (!this.isIndexedDBAvailable || !this.db) {
      const data = localStorage.getItem(this.storageKeyItems);
      return data ? JSON.parse(data) : [];
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getItemById(id) {
    if (!this.isIndexedDBAvailable || !this.db) {
      const items = await this.getAllItems();
      return items.find(i => i.id === id) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveItem(item) {
    const nowIso = new Date().toISOString();
    const entry = {
      id: item.id || 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: (item.title || '').trim(),
      categoryId: item.categoryId || 'cat_clean',
      intervalDays: typeof item.intervalDays === 'number' && item.intervalDays > 0 ? item.intervalDays : null,
      lastDoneAt: item.lastDoneAt || null,
      nextDueAt: item.nextDueAt || null,
      notes: (item.notes || '').trim(),
      location: (item.location || '').trim(),
      createdAt: item.createdAt || nowIso,
      updatedAt: nowIso
    };

    if (!this.isIndexedDBAvailable || !this.db) {
      const items = await this.getAllItems();
      const idx = items.findIndex(i => i.id === entry.id);
      if (idx >= 0) {
        items[idx] = entry;
      } else {
        items.unshift(entry);
      }
      localStorage.setItem(this.storageKeyItems, JSON.stringify(items));
      return entry;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const req = store.put(entry);
      req.onsuccess = () => resolve(entry);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteItem(id) {
    // Delete item and its history
    if (!this.isIndexedDBAvailable || !this.db) {
      let items = await this.getAllItems();
      items = items.filter(i => i.id !== id);
      localStorage.setItem(this.storageKeyItems, JSON.stringify(items));

      let histories = await this._getAllHistoriesRaw();
      histories = histories.filter(h => h.itemId !== id);
      localStorage.setItem(this.storageKeyHistories, JSON.stringify(histories));
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['items', 'histories'], 'readwrite');
      tx.objectStore('items').delete(id);

      const histStore = tx.objectStore('histories');
      const idx = histStore.index('itemId');
      const req = idx.openCursor(IDBKeyRange.only(id));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Record "Done" (今やった！を記録) ---
  async recordDone(itemId, doneAtIso = new Date().toISOString(), note = '', nextDueAt = undefined) {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('項目が見つかりません');

    // Create history entry
    const historyEntry = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      itemId,
      doneAt: doneAtIso,
      note: (note || '').trim(),
      createdAt: new Date().toISOString()
    };

    // Save history
    await this._saveHistory(historyEntry);

    // Update item's lastDoneAt if this doneAt is more recent than current
    if (!item.lastDoneAt || new Date(doneAtIso) >= new Date(item.lastDoneAt)) {
      item.lastDoneAt = doneAtIso;
    }

    // Update nextDueAt
    if (nextDueAt !== undefined) {
      item.nextDueAt = nextDueAt || null;
    } else if (item.intervalDays) {
      // Calculate next due date automatically: doneAt + intervalDays
      const doneD = new Date(doneAtIso);
      const nextD = new Date(doneD.getFullYear(), doneD.getMonth(), doneD.getDate() + item.intervalDays);
      const y = nextD.getFullYear();
      const m = String(nextD.getMonth() + 1).padStart(2, '0');
      const d = String(nextD.getDate()).padStart(2, '0');
      item.nextDueAt = `${y}-${m}-${d}`;
    } else {
      item.nextDueAt = null;
    }

    item.updatedAt = new Date().toISOString();
    await this.saveItem(item);

    return { item, historyEntry };
  }

  async _saveHistory(historyEntry) {
    if (!this.isIndexedDBAvailable || !this.db) {
      const histories = await this._getAllHistoriesRaw();
      histories.unshift(historyEntry);
      localStorage.setItem(this.storageKeyHistories, JSON.stringify(histories));
      return historyEntry;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('histories', 'readwrite');
      const store = tx.objectStore('histories');
      const req = store.put(historyEntry);
      req.onsuccess = () => resolve(historyEntry);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllHistories() {
    return await this._getAllHistoriesRaw();
  }

  async _getAllHistoriesRaw() {
    if (!this.isIndexedDBAvailable || !this.db) {
      const data = localStorage.getItem(this.storageKeyHistories);
      return data ? JSON.parse(data) : [];
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction('histories', 'readonly');
      const store = tx.objectStore('histories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async getHistoriesByItemId(itemId) {
    const all = await this._getAllHistoriesRaw();
    return all
      .filter(h => h.itemId === itemId)
      .sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
  }

  async deleteHistory(historyId, itemId) {
    if (!this.isIndexedDBAvailable || !this.db) {
      let histories = await this._getAllHistoriesRaw();
      histories = histories.filter(h => h.id !== historyId);
      localStorage.setItem(this.storageKeyHistories, JSON.stringify(histories));
    } else {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('histories', 'readwrite');
        const store = tx.objectStore('histories');
        const req = store.delete(historyId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }

    // Recompute lastDoneAt for the item
    const remaining = await this.getHistoriesByItemId(itemId);
    const item = await this.getItemById(itemId);
    if (item) {
      item.lastDoneAt = remaining.length > 0 ? remaining[0].doneAt : null;
      await this.saveItem(item);
    }
    return true;
  }

  // --- Export & Import ---
  async exportAllData() {
    const items = await this.getAllItems();
    const histories = await this._getAllHistoriesRaw();
    const categories = await this.getCategories();
    const exportPayload = {
      version: 4,
      appName: 'WhenDidILast_PersonalLifeLog',
      exportedAt: new Date().toISOString(),
      counts: { items: items.length, histories: histories.length },
      categories,
      items,
      histories
    };
    return JSON.stringify(exportPayload, null, 2);
  }

  async importAllData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('不正なデータ形式です。items配列が見つかりません。');
      }

      for (const item of data.items) {
        await this.saveItem(item);
      }

      if (data.histories && Array.isArray(data.histories)) {
        for (const hist of data.histories) {
          await this._saveHistory(hist);
        }
      }

      return { success: true, count: data.items.length };
    } catch (e) {
      console.error('Import failed', e);
      return { success: false, error: e.message };
    }
  }

  async clearAllData() {
    if (!this.isIndexedDBAvailable || !this.db) {
      localStorage.removeItem(this.storageKeyItems);
      localStorage.removeItem(this.storageKeyHistories);
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['items', 'histories'], 'readwrite');
      tx.objectStore('items').clear();
      tx.objectStore('histories').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Global Singleton Instance
window.lifeLogDB = new WhenDidILastDB();
