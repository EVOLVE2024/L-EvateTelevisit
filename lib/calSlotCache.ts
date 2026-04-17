type Entry = {
  expiresAt: number;
  slotsByDate: Record<string, string[]>;
};

const SLOT_CACHE_TTL_MS = 15_000;
const cache = new Map<string, Entry>();

export function getCachedSlots(key: string): Entry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function setCachedSlots(key: string, slotsByDate: Record<string, string[]>) {
  cache.set(key, { expiresAt: Date.now() + SLOT_CACHE_TTL_MS, slotsByDate });
}

export function invalidateCalSlotCache() {
  cache.clear();
}
