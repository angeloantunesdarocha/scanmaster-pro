const DB_NAME = 'scanmaster-pro';
const DB_VERSION = 1;
const STORE = 'workspaces';
const ACTIVE_KEY = 'active-workspace';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, operation) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const workspaceStorage = {
  async save(workspace) {
    const record = { ...workspace, savedAt: Date.now() };
    await transaction('readwrite', store => store.put(record, ACTIVE_KEY));
    return record;
  },
  async load() {
    return transaction('readonly', store => store.get(ACTIVE_KEY));
  },
  async clear() {
    return transaction('readwrite', store => store.delete(ACTIVE_KEY));
  }
};

export function debounceAsync(fn, wait = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => void fn(...args), wait);
  };
}

export async function fileToStoredBlob(file) {
  return { name: file.name, type: file.type, lastModified: file.lastModified, blob: file };
}

export function storedBlobToFile(item) {
  return new File([item.blob], item.name, { type: item.type, lastModified: item.lastModified });
}
