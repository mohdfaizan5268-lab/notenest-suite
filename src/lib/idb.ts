const DB = 'notenest-suite';
let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const d = r.result; ['accounts', 'data', 'blobs'].forEach(s => d.createObjectStore(s)); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode); const r = fn(t.objectStore(store));
    t.oncomplete = () => res((r ? (r as IDBRequest<T>).result : undefined) as T);
    t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
export const idbGet = <T,>(s: string, k: string) => tx<T | undefined>(s, 'readonly', st => st.get(k));
export const idbPut = (s: string, k: string, v: unknown) => tx(s, 'readwrite', st => { st.put(v, k); });
export const idbDel = (s: string, k: string) => tx(s, 'readwrite', st => { st.delete(k); });
export const idbKeys = (s: string) => tx<IDBValidKey[]>(s, 'readonly', st => st.getAllKeys());
export const idbClear = (s: string) => tx(s, 'readwrite', st => { st.clear(); });
