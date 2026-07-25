const DB_NAME = 'scanmaster-entrega-certa';
const DB_VERSION = 1;
const STORE = 'workspace';
const ACTIVE_KEY = 'active';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

export const deliveryStorage = {
  save(workspace) { return transact('readwrite', store => store.put({ ...workspace, savedAt: Date.now() }, ACTIVE_KEY)); },
  load() { return transact('readonly', store => store.get(ACTIVE_KEY)); },
  clear() { return transact('readwrite', store => store.delete(ACTIVE_KEY)); }
};

export function debounce(fn, delay = 650) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  wrapped.flush = (...args) => {
    clearTimeout(timer);
    return fn(...args);
  };
  return wrapped;
}
