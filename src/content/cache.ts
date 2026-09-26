import type { NormalizedContent } from "./types";

export interface CacheEntry {
  items: NormalizedContent[];
  cachedAt: string;
  expiresAt: string;
}

export interface ContentCache {
  get(key: string): CacheEntry | null;
  set(key: string, entry: CacheEntry): void;
  remove(key: string): void;
  clear(): void;
}

export function createCacheEntry(
  items: NormalizedContent[],
  ttlMs: number,
  now = Date.now(),
): CacheEntry {
  const cachedAt = new Date(now).toISOString();

  return {
    items,
    cachedAt,
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
}

/**
 * Browser cache adapter.
 * This is only a local acceleration layer; it is not the authoritative catalog.
 */
export function createBrowserContentCache(
  storage: Storage = window.localStorage,
): ContentCache {
  const prefix = "redesocial:content-cache:";

  return {
    get(key) {
      try {
        const raw = storage.getItem(prefix + key);
        if (!raw) return null;

        const entry = JSON.parse(raw) as CacheEntry;
        if (new Date(entry.expiresAt).getTime() <= Date.now()) {
          storage.removeItem(prefix + key);
          return null;
        }

        return entry;
      } catch {
        storage.removeItem(prefix + key);
        return null;
      }
    },

    set(key, entry) {
      storage.setItem(prefix + key, JSON.stringify(entry));
    },

    remove(key) {
      storage.removeItem(prefix + key);
    },

    clear() {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) storage.removeItem(key);
      }
    },
  };
}
