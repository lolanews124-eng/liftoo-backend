import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class OtpStoreService implements OnModuleDestroy {
  private readonly store = new Map<string, CacheEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  incr(key: string, ttlSeconds: number): number {
    const current = this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    this.set(key, String(count), ttlSeconds);
    return count;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}
