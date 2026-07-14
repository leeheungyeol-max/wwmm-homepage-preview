const { requireAdmin } = require("./_lib/auth");
const { requireMethod, sendJson } = require("./_lib/http");
const { getSolapiStatus } = require("./_lib/notifications");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;

  if (!requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  sendJson(res, 200, { ok: true, sms: getSolapiStatus() });
};
