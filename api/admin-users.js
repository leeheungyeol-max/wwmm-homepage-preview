const crypto = require("crypto");
const { requireRole } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getAdminAccounts, updateAdminAccounts } = require("./_lib/storage");

function publicAccount(account, keyMasterUsername) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    active: account.active !== false,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt || null,
    mustChangePassword: account.mustChangePassword === true,
    isKeyMaster: account.username.toLowerCase() === String(keyMasterUsername || "").toLowerCase()
  };
}

function getKeyMasterUsername(accounts) {
  const keyMaster = accounts.find((account) => account.keyMaster === true && account.role === "master" && account.active !== false);
  return keyMaster ? keyMaster.username : process.env.ADMIN_USERNAME || "admin";
}

function publicAccounts(accounts) {
  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  const keyMasterUsername = getKeyMasterUsername(accounts);
  const users = accounts.map((account) => publicAccount(account, keyMasterUsername));
  if (!users.some((item) => item.username.toLowerCase() === configuredUsername.toLowerCase())) {
    users.unshift({
      id: "environment-master",
      username: configuredUsername,
      name: "Master Admin",
      role: "master",
      active: true,
      createdAt: null,
      updatedAt: null,
      isKeyMaster: configuredUsername.toLowerCase() === keyMasterUsername.toLowerCase()
    });
  }
  return users;
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "POST", "PATCH", "DELETE"])) return;
  const actor = await requireRole(req, ["master"]);
  if (!actor) {
    sendJson(res, 403, { ok: false, error: "Master administrator access required" });
    return;
  }

  try {
    const accounts = await getAdminAccounts();
    const keyMasterUsername = getKeyMasterUsername(accounts);
    const actorIsKeyMaster = String(actor.username || "").toLowerCase() === keyMasterUsername.toLowerCase();
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, users: publicAccounts(accounts), permissions: { isKeyMaster: actorIsKeyMaster } });
      return;
    }

    const payload = await readJson(req);
    if (req.method === "POST") {
      const username = String(payload.username || "").trim();
      const name = String(payload.name || "").trim();
      const password = String(payload.password || "");
      const role = ["master", "admin", "consultation"].includes(payload.role) ? payload.role : "";
      if (!username || !name || password.length < 8 || !role) {
        sendJson(res, 400, { ok: false, error: "ID, name, role, and a password of at least 8 characters are required" });
        return;
      }
      const configuredUsername = process.env.ADMIN_USERNAME || "admin";
      if (username.toLowerCase() === configuredUsername.toLowerCase() || accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
        sendJson(res, 409, { ok: false, error: "This administrator ID is already registered" });
        return;
      }
      const salt = crypto.randomBytes(16).toString("hex");
      accounts.push({
        id: `admin_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        username,
        name,
        role,
        active: true,
        passwordSalt: salt,
        passwordHash: crypto.scryptSync(password, salt, 64).toString("hex"),
        mustChangePassword: true,
        sessionVersion: 0,
        createdAt: new Date().toISOString()
      });
    } else {
      if (payload.action === "transferKeyMaster") {
        if (!actorIsKeyMaster) {
          sendJson(res, 403, { ok: false, error: "Only the current Key Master can transfer ownership" });
          return;
        }
        accounts.forEach((item) => { delete item.keyMaster; });
        if (payload.id !== "environment-master") {
          const target = accounts.find((item) => item.id === payload.id);
          if (!target || target.role !== "master" || target.active === false) {
            sendJson(res, 422, { ok: false, error: "Key Master can only be transferred to an active Master Admin" });
            return;
          }
          target.keyMaster = true;
          target.updatedAt = new Date().toISOString();
        }
        await updateAdminAccounts(accounts);
        sendJson(res, 200, { ok: true, users: publicAccounts(accounts), permissions: { isKeyMaster: false } });
        return;
      }
      let account = accounts.find((item) => item.id === payload.id);
      if (!account && payload.id === "environment-master" && req.method === "PATCH") {
        const configuredUsername = process.env.ADMIN_USERNAME || "admin";
        account = {
          id: `admin_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          username: configuredUsername,
          name: "Master Admin",
          role: "master",
          active: true,
          createdAt: new Date().toISOString()
        };
        accounts.unshift(account);
      }
      if (!account) {
        sendJson(res, 404, { ok: false, error: "Administrator not found" });
        return;
      }
      if (req.method === "DELETE") {
        if (payload.id === "environment-master") {
          sendJson(res, 409, { ok: false, error: "The primary master account cannot be removed" });
          return;
        }
        if (account.username.toLowerCase() === String(actor.username || "").toLowerCase()) {
          sendJson(res, 409, { ok: false, error: "You cannot remove your own administrator account" });
          return;
        }
        if (account.role === "master" && !actorIsKeyMaster) {
          sendJson(res, 403, { ok: false, error: "Only the Key Master can remove another Master Admin" });
          return;
        }
        if (account.username.toLowerCase() === keyMasterUsername.toLowerCase()) {
          sendJson(res, 409, { ok: false, error: "Transfer Key Master ownership before removing this account" });
          return;
        }
        accounts.splice(accounts.indexOf(account), 1);
      } else {
        if (payload.active === false && account.username.toLowerCase() === String(actor.username || "").toLowerCase()) {
          sendJson(res, 409, { ok: false, error: "You cannot revoke your own administrator account" });
          return;
        }
        if (payload.active !== undefined) account.active = Boolean(payload.active);
        if (["master", "admin", "consultation"].includes(payload.role)) account.role = payload.role;
        if (payload.action === "resetPassword") {
          if (account.username.toLowerCase() === String(actor.username || "").toLowerCase()) {
            sendJson(res, 409, { ok: false, error: "Use Change My Password for your own account" });
            return;
          }
          if (!payload.password || String(payload.password).length < 8) {
            sendJson(res, 400, { ok: false, error: "Temporary password must be at least 8 characters" });
            return;
          }
          account.passwordSalt = crypto.randomBytes(16).toString("hex");
          account.passwordHash = crypto.scryptSync(String(payload.password), account.passwordSalt, 64).toString("hex");
          account.mustChangePassword = true;
          account.sessionVersion = (Number(account.sessionVersion) || 0) + 1;
        } else if (payload.password) {
          if (String(payload.password).length < 8) throw new Error("Password must be at least 8 characters");
          sendJson(res, 400, { ok: false, error: "Use the password reset action for administrator accounts" });
          return;
        }
        account.updatedAt = new Date().toISOString();
      }
    }

    await updateAdminAccounts(accounts);
    sendJson(res, 200, { ok: true, users: publicAccounts(accounts), permissions: { isKeyMaster: String(actor.username || "").toLowerCase() === getKeyMasterUsername(accounts).toLowerCase() } });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
