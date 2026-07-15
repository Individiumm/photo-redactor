import { Pixels } from '../core/pixels'

const DB_NAME = 'photo-editor'
const STORE_NAME = 'session'
const SESSION_KEY = 'current'
const DB_VERSION = 1

interface StoredSession {
  originalData: Uint8ClampedArray
  originalWidth: number
  originalHeight: number
  currentData: Uint8ClampedArray
  currentWidth: number
  currentHeight: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSession(original: Pixels, current: Pixels): Promise<void> {
  const db = await openDb()
  const session: StoredSession = {
    originalData: original.data,
    originalWidth: original.width,
    originalHeight: original.height,
    currentData: current.data,
    currentWidth: current.width,
    currentHeight: current.height,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(session, SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadSession(): Promise<{ original: Pixels; current: Pixels } | null> {
  const db = await openDb()
  const session = await new Promise<StoredSession | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(SESSION_KEY)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  if (!session) return null
  return {
    original: { data: session.originalData, width: session.originalWidth, height: session.originalHeight },
    current: { data: session.currentData, width: session.currentWidth, height: session.currentHeight },
  }
}

export async function clearSession(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
