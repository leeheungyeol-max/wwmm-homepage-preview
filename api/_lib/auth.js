const crypto = require("crypto");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "wwmm-local-admin-secret";
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function verifyPassword(password) {
  const configured = process.env.ADMIN_PASSWORD || "wwmm-admin";
  return timingSafeEqual(password || "", configured);
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");

  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function createAdminToken() {
  return sign({
    role: "admin",
    exp: Date.now() + TOKEN_TTL_MS
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireAdmin(req) {
  const payload = verifyToken(getBearerToken(req));
  return payload && payload.role === "admin";
}

module.exports = {
  createAdminToken,
  requireAdmin,
  verifyPassword
};
