import { BehaviorSubject } from 'rxjs';

interface CacheEntry<T> {
  readonly promise: Promise<T>;
  readonly expiresAt: number;
}

/** Shares in-flight work and caches successful responses, never failures. */
export class CachedValue<T> {
  private readonly entry: BehaviorSubject<CacheEntry<T> | null> =
    new BehaviorSubject<CacheEntry<T> | null>(null);

  public constructor(
    private readonly loader: () => Promise<T>,
    private readonly lifetime: (value: T) => number,
  ) {}

  public invalidate(): void {
    this.entry.next(null);
  }

  public load(): Promise<T> {
    const cached: CacheEntry<T> | null = this.entry.value;
    if (cached !== null && cached.expiresAt > Date.now()) {
      return cached.promise;
    }
    const promise: Promise<T> = Promise.resolve()
      .then(this.loader)
      .then(
        (value: T): T => {
          this.entry.next({
            promise,
            expiresAt: Date.now() + this.lifetime(value),
          });
          return value;
        },
        (error: unknown): never => {
          this.entry.next(null);
          throw error;
        },
      );
    this.entry.next({ promise, expiresAt: Infinity });
    return promise;
  }
}
