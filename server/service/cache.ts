export class RequestCache<T> {
  private readonly entries = new Map<string, { value: T; expires: number }>();
  private readonly pending = new Map<string, Promise<T>>();

  constructor(
    private readonly ttl: number | ((value: T) => number),
    private readonly limit: number,
  ) {}

  async load(key: string, fetchValue: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const running = this.pending.get(key);
    if (running) return running;
    const load = fetchValue().then((value) => {
      const ttl = typeof this.ttl === "function" ? this.ttl(value) : this.ttl;
      this.entries.delete(key);
      const entry = { value, expires: Date.now() + ttl };
      this.entries.set(key, entry);
      setTimeout(() => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
      }, ttl).unref();
      if (this.entries.size > this.limit) {
        const oldest = this.entries.keys().next().value;
        if (oldest !== undefined) this.entries.delete(oldest);
      }
      return value;
    });
    this.pending.set(key, load);
    try {
      return await load;
    } finally {
      this.pending.delete(key);
    }
  }
}
