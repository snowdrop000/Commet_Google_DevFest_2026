export const dayJst = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
