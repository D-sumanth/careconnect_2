const crypto = require("crypto");

const COOKIE_NAME = "careconnect_session";
const SESSION_DAYS = 7;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
}

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    staffId: user.staff_id,
    department: user.department,
    iat: now,
    exp: now + SESSION_DAYS * 24 * 60 * 60,
  };
  const body = base64UrlEncode(payload);
  return `${body}.${sign(body)}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;

  const [body, signature] = token.split(".");
  const expectedSignature = sign(body);
  if (signature.length !== expectedSignature.length) return null;
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) return null;

  const payload = base64UrlDecode(body);
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [name, ...parts] = cookie.trim().split("=");
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(parts.join("="));
    return cookies;
  }, {});
}

function getCookieOptions(req) {
  const isHttps =
    req.secure || req.headers["x-forwarded-proto"] === "https";

  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    isHttps ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function attachUser(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    req.user = verifyToken(cookies[COOKIE_NAME]);
  } catch (error) {
    req.user = null;
  }

  next();
}

function setSessionCookie(req, res, user) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(createToken(user))}; ${getCookieOptions(
      req
    )}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function requireAuth(req, res, next) {
  if (req.user) {
    next();
    return;
  }

  if ((req.originalUrl || req.path).startsWith("/api/")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  res.redirect("/login.html");
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      requireAuth(req, res, next);
      return;
    }

    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    if ((req.originalUrl || req.path).startsWith("/api/")) {
      res.status(403).json({ error: "You do not have permission" });
      return;
    }

    res.redirect(req.user.role === "employee" ? "/staff-dashboard.html" : "/");
  };
}

module.exports = {
  attachUser,
  clearSessionCookie,
  requireAuth,
  requireRole,
  setSessionCookie,
};
