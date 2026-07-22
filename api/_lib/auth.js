const crypto = require("crypto");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 4;

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

function verifyMasterCredentials(username, password) {
  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  return timingSafeEqual(username || "", configuredUsername) && verifyPassword(password);
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

function createAdminToken(account = {}) {
  return sign({
    id: account.id || "environment-master",
    role: account.role || "master",
    username: account.username || process.env.ADMIN_USERNAME || "admin",
    name: account.name || "Master Admin",
    mustChangePassword: account.mustChangePassword === true,
    sessionVersion: Number.isInteger(account.sessionVersion) ? account.sessionVersion : 0,
    exp: Date.now() + TOKEN_TTL_MS
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function requireAdmin(req) {
  const payload = verifyToken(getBearerToken(req));
  if (!payload || payload.mustChangePassword === true || !["master", "admin", "consultation"].includes(payload.role)) return null;

  const { getAdminAccounts } = require("./storage");
  const accounts = await getAdminAccounts();
  const account = accounts.find((item) => String(item.username || "").toLowerCase() === String(payload.username || "").toLowerCase());
  if (account) {
    if (account.active === false || (Number(account.sessionVersion) || 0) !== (Number(payload.sessionVersion) || 0)) return null;
    return payload;
  }

  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  return payload.id === "environment-master" && timingSafeEqual(payload.username || "", configuredUsername) ? payload : null;
}

async function requireRole(req, roles) {
  const payload = await requireAdmin(req);
  return payload && roles.includes(payload.role) ? payload : null;
}

module.exports = {
  createAdminToken,
  getBearerToken,
  requireAdmin,
  requireRole,
  timingSafeEqual,
  verifyToken,
  verifyMasterCredentials,
  verifyPassword
};
