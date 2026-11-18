/**
 * Lightweight in-memory rate limiter middleware factory.
 * Supports fixed-window tracking, Retry-After headers, and skipSuccessfulRequests.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function formatWaitTime(seconds) {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins === 1 ? '' : 's'}`;
}

function createRateLimiter({
  windowMs = 5 * 60 * 1000,
  max = 5,
  message = 'Too many requests. Please try again later.',
  skipSuccessfulRequests = false,
  keyGenerator = (req) => getClientIp(req),
} = {}) {
  const store = new Map();

  // Periodically prune expired entries to prevent unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, Math.min(windowMs, 60 * 1000));
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: `${message} Please try again in ${formatWaitTime(retryAfterSeconds)}.`,
        retryAfterSeconds,
      });
    }

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && entry.count > 0) {
          entry.count -= 1;
        }
      });
    }

    next();
  };
}

const loginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many failed login attempts.',
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  skipSuccessfulRequests: false,
  message: 'Too many password reset email requests.',
});

module.exports = {
  createRateLimiter,
  loginLimiter,
  forgotPasswordLimiter,
};

