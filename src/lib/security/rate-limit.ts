import "server-only";
import { Redis } from "@upstash/redis";

type Entry = { count: number; resetAt: number };
const local = new Map<string, Entry>();
const redis = process.env.REDIS_URL && process.env.REDIS_TOKEN ? Redis.fromEnv() : null;

export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (redis) {
    const bucket = Math.floor(Date.now() / windowMs);
    const redisKey = `rl:${key}:${bucket}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.pexpire(redisKey, windowMs);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  }
  const now = Date.now();
  const current = local.get(key);
  if (!current || current.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}
