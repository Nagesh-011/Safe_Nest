type QueueAction = {
  id: string;
  type: string;
  payload: any;
  ts: number;
};

const QUEUE_KEY = 'safenest_sync_queue';
const CACHE_KEY_PREFIX = 'safenest_cache_';

const readJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

/**
 * Persistent offline queue and simple cache.
 * Use enqueue() for writes when offline, then processQueue() once online.
 */
class OfflineStore {
  enqueue(action: Omit<QueueAction, 'id' | 'ts'> & { id?: string }): QueueAction {
    const item: QueueAction = {
      id: action.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: action.type,
      payload: action.payload,
      ts: Date.now(),
    };
    const queue = readJSON<QueueAction[]>(QUEUE_KEY, []);
    queue.push(item);
    writeJSON(QUEUE_KEY, queue);
    return item;
  }

  getQueue(): QueueAction[] {
    return readJSON<QueueAction[]>(QUEUE_KEY, []);
  }

  clearQueue(): void {
    writeJSON(QUEUE_KEY, []);
  }

  removeById(id: string): void {
    const queue = this.getQueue().filter(q => q.id !== id);
    writeJSON(QUEUE_KEY, queue);
  }

  /**
   * Process queued actions with a provided handler.
   * Stops on first error to avoid dropping actions.
   */
  async processQueue(handler: (action: QueueAction) => Promise<void>): Promise<{ processed: number; remaining: number }> {
    const queue = this.getQueue();
    let processed = 0;
    for (const item of queue) {
      try {
        await handler(item);
        this.removeById(item.id);
        processed += 1;
      } catch (e) {
        // Stop to avoid infinite loop on persistent failures; caller can retry later
        break;
      }
    }
    const remaining = this.getQueue().length;
    return { processed, remaining };
  }

  /** Simple cache helpers for domain data */
  setCache<T>(name: string, value: T) { writeJSON(CACHE_KEY_PREFIX + name, value); }
  getCache<T>(name: string, fallback: T): T { return readJSON<T>(CACHE_KEY_PREFIX + name, fallback); }
}

export const offlineStore = new OfflineStore();
export type { QueueAction };
