require("./config/env");
const express = require("express");
const cors = require("cors");

const app = express();
const proctorsRouter = require("./routes/proctors");
const authRouter = require("./routes/auth");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const authRateLimitStore = new Map();

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;
const AUTH_RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000;

function normalizeRateLimitEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function pruneExpiredAuthRateLimitEntries(now = Date.now()) {
  for (const [key, entry] of authRateLimitStore.entries()) {
    if (!entry || now > entry.resetAt) {
      authRateLimitStore.delete(key);
    }
  }
}

function getClientIdentifier(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function authRateLimiter(req, res, next) {
  const email = req.path === "/login" ? normalizeRateLimitEmail(req.body?.email) : "";
  const key = [req.path, email || "no-email", getClientIdentifier(req)].join(":");
  const now = Date.now();

  pruneExpiredAuthRateLimitEntries(now);

  const existingEntry = authRateLimitStore.get(key);

  if (!existingEntry || now > existingEntry.resetAt) {
    authRateLimitStore.set(key, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (existingEntry.count >= AUTH_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((existingEntry.resetAt - now) / 1000);
    res.set("Retry-After", String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  existingEntry.count += 1;
  authRateLimitStore.set(key, existingEntry);
  return next();
}

function clearAuthRateLimit(req) {
  const email = req.path === "/login" ? normalizeRateLimitEmail(req.body?.email) : "";
  const key = [req.path, email || "no-email", getClientIdentifier(req)].join(":");
  authRateLimitStore.delete(key);
}

// Only requests coming from a page loaded at CLIENT_ORIGIN(the frontend)
// are allowed to read the response in the browser.
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use((req, res, next) => {
  req.clearAuthRateLimit = () => clearAuthRateLimit(req);
  next();
});

const authRateLimitCleanupTimer = setInterval(() => {
  pruneExpiredAuthRateLimitEntries();
}, AUTH_RATE_LIMIT_CLEANUP_INTERVAL_MS);

authRateLimitCleanupTimer.unref();

// The paths

app.use("/proctors", proctorsRouter);
app.use("/auth", authRateLimiter, authRouter);

const PORT = process.env.PORT;
const HOST = process.env.HOST;
app.listen(PORT, () => {
  console.log(`Backend running on ${HOST}:${PORT}`);
});
