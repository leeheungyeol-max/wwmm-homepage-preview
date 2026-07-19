const crypto = require("crypto");
const { createAdminToken, timingSafeEqual, verifyMasterCredentials } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getAdminAccounts } = require("./_lib/storage");

function verifyAccountPassword(password, account) {
  if (!account.passwordHash || !account.passwordSalt) return false;
  const hash = crypto.scryptSync(String(password || ""), account.passwordSalt, 64).toString("hex");
  return timingSafeEqual(hash, account.passwordHash);
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const payload = await readJson(req);

    const username = String(payload.username || "").trim();
    let account = null;
    const accounts = await getAdminAccounts();
    const storedAccount = accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (storedAccount) {
      account = storedAccount.active !== false && verifyAccountPassword(payload.password, storedAccount) ? storedAccount : null;
    } else if (verifyMasterCredentials(username, payload.password)) {
      account = { username, name: "Master Admin", role: "master", active: true };
    }

    if (!account) {
      sendJson(res, 401, { ok: false, error: "Invalid ID or password" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      token: createAdminToken(account),
      user: { username: account.username, name: account.name, role: account.role }
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
