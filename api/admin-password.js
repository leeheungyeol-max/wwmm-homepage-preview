const crypto = require("crypto");
const { createAdminToken, getBearerToken, timingSafeEqual, verifyToken } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getAdminAccounts, updateAdminAccounts } = require("./_lib/storage");

function passwordMatches(password, account) {
  if (!account.passwordHash || !account.passwordSalt) return false;
  const hash = crypto.scryptSync(String(password || ""), account.passwordSalt, 64).toString("hex");
  return timingSafeEqual(hash, account.passwordHash);
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;

  const actor = verifyToken(getBearerToken(req));
  if (!actor || !["master", "admin", "consultation"].includes(actor.role)) {
    sendJson(res, 401, { ok: false, error: "Administrator sign-in required" });
    return;
  }

  try {
    const payload = await readJson(req);
    const currentPassword = String(payload.currentPassword || "");
    const newPassword = String(payload.newPassword || "");
    if (newPassword.length < 8) {
      sendJson(res, 400, { ok: false, error: "New password must be at least 8 characters" });
      return;
    }
    if (currentPassword === newPassword) {
      sendJson(res, 400, { ok: false, error: "Choose a password different from the current password" });
      return;
    }

    const accounts = await getAdminAccounts();
    let account = accounts.find((item) => String(item.username).toLowerCase() === String(actor.username).toLowerCase());

    if (!account && actor.id === "environment-master") {
      const { verifyMasterCredentials } = require("./_lib/auth");
      if (!verifyMasterCredentials(actor.username, currentPassword)) {
        sendJson(res, 401, { ok: false, error: "Current password is incorrect" });
        return;
      }
      account = {
        id: `admin_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        username: actor.username,
        name: actor.name || "Master Admin",
        role: "master",
        active: true,
        keyMaster: true,
        createdAt: new Date().toISOString()
      };
      accounts.unshift(account);
    } else if (!account || account.active === false || !passwordMatches(currentPassword, account)) {
      sendJson(res, 401, { ok: false, error: "Current password is incorrect" });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    account.passwordSalt = salt;
    account.passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
    account.mustChangePassword = false;
    account.sessionVersion = (Number(account.sessionVersion) || 0) + 1;
    account.updatedAt = new Date().toISOString();
    await updateAdminAccounts(accounts);

    sendJson(res, 200, {
      ok: true,
      token: createAdminToken(account),
      user: {
        id: account.id,
        username: account.username,
        name: account.name,
        role: account.role,
        mustChangePassword: false
      }
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
