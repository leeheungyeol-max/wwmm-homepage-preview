const { createAdminToken, verifyPassword } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const payload = await readJson(req);

    if (!verifyPassword(payload.password)) {
      sendJson(res, 401, { ok: false, error: "Invalid password" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      token: createAdminToken()
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
