const { readJson, requireMethod, sendJson } = require("./_lib/http");

const ACCESS_TTL_MS = 12 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const payload = await readJson(req);
    const configuredPassword = process.env.STAGING_PASSWORD;

    if (!configuredPassword) {
      sendJson(res, 500, {
        ok: false,
        error: "Staging password is not configured."
      });
      return;
    }

    if (payload.password !== configuredPassword) {
      sendJson(res, 401, {
        ok: false,
        error: "Invalid staging password."
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      expiresAt: Date.now() + ACCESS_TTL_MS
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
