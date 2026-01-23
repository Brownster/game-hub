export function createInMemoryRedis() {
  const store = new Map();
  const expirations = new Map();
  const zsets = new Map();

  function isExpired(key) {
    const expiresAt = expirations.get(key);
    if (expiresAt && expiresAt <= Date.now()) {
      expirations.delete(key);
      store.delete(key);
      zsets.delete(key);
      return true;
    }
    return false;
  }

  function setExpiry(key, ttlSeconds) {
    if (typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds)) {
      expirations.set(key, Date.now() + ttlSeconds * 1000);
    }
  }

  return {
    async get(key) {
      if (isExpired(key)) return null;
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value, ...args) {
      store.set(key, String(value));
      if (args.length >= 2 && args[0] === "EX") {
        setExpiry(key, Number(args[1]));
      }
      return "OK";
    },
    async del(...keys) {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key) || zsets.delete(key) || expirations.delete(key)) {
          removed += 1;
        }
      }
      return removed;
    },
    async exists(key) {
      if (isExpired(key)) return 0;
      return store.has(key) || zsets.has(key) ? 1 : 0;
    },
    async zadd(key, score, member) {
      const numericScore = Number(score);
      if (!Number.isFinite(numericScore)) {
        throw new Error("zadd score must be a number");
      }
      let zset = zsets.get(key);
      if (!zset) {
        zset = new Map();
        zsets.set(key, zset);
      }
      zset.set(String(member), numericScore);
      return 1;
    },
    async zrange(key, start, stop) {
      const zset = zsets.get(key);
      if (!zset) return [];
      const members = [...zset.entries()]
        .sort((a, b) => {
          if (a[1] !== b[1]) return a[1] - b[1];
          return a[0].localeCompare(b[0]);
        })
        .map(([member]) => member);
      const lastIndex = members.length - 1;
      const normalizedStop = stop < 0 ? lastIndex : stop;
      return members.slice(start, normalizedStop + 1);
    },
    on() {},
    disconnect() {},
  };
}

export function installRedisMock() {
  const redis = createInMemoryRedis();
  const previous = globalThis.__TEST_REDIS__;
  globalThis.__TEST_REDIS__ = redis;
  return {
    redis,
    restore() {
      if (previous === undefined) {
        delete globalThis.__TEST_REDIS__;
      } else {
        globalThis.__TEST_REDIS__ = previous;
      }
    },
  };
}
