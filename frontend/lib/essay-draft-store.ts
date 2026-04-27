export type StoredEssayImage = {
  id: string
  name: string
  type: string
  lastModified: number
  blob: Blob
}

type EssayImageDraftRecord = {
  storageKey: string
  images: StoredEssayImage[]
  updatedAt: number
}

const DB_NAME = "when_nawa_essay_generator"
const DB_VERSION = 1
const STORE_NAME = "image_drafts"
const GENERIC_STORAGE_KEY = "essay-generator-images-v1"

function isIndexedDbAvailable() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "storageKey" })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function getRecord(storageKey: string): Promise<EssayImageDraftRecord | null> {
  const db = await openDatabase()
  if (!db) return null

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(storageKey)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as EssayImageDraftRecord | undefined) ?? null)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function putRecord(record: EssayImageDraftRecord): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(record)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function deleteRecord(storageKey: string): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(storageKey)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function normalizeStorageKeys(userId: string | null) {
  const trimmedUserId = userId?.trim() || ""
  const keys = new Set<string>([GENERIC_STORAGE_KEY])
  if (trimmedUserId) {
    keys.add(`${GENERIC_STORAGE_KEY}:${trimmedUserId}`)
  }
  return Array.from(keys)
}

export async function saveEssayImageDraft(
  userId: string | null,
  images: StoredEssayImage[],
): Promise<void> {
  if (!isIndexedDbAvailable()) return

  const record: EssayImageDraftRecord = {
    storageKey: GENERIC_STORAGE_KEY,
    images,
    updatedAt: Date.now(),
  }

  for (const storageKey of normalizeStorageKeys(userId)) {
    await putRecord({ ...record, storageKey })
  }
}

export async function loadEssayImageDraft(userId: string | null): Promise<StoredEssayImage[]> {
  if (!isIndexedDbAvailable()) return []

  const keys = normalizeStorageKeys(userId)
  for (const storageKey of keys) {
    const record = await getRecord(storageKey)
    if (record?.images?.length) {
      return record.images
    }
  }
  return []
}

export function clearEssayImageDraftKey(userId: string | null): string[] {
  return normalizeStorageKeys(userId)
}

export async function clearEssayImageDraft(userId: string | null): Promise<void> {
  if (!isIndexedDbAvailable()) return

  for (const storageKey of normalizeStorageKeys(userId)) {
    await deleteRecord(storageKey)
  }
}
