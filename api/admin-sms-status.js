const { requireAdmin } = require("./_lib/auth");
const { requireMethod, sendJson } = require("./_lib/http");
const { getSolapiStatus } = require("./_lib/notifications");
const { getConsultationManager } = require("./_lib/storage");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;

  if (!await requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    sendJson(res, 200, {
      ok: true,
      sms: getSolapiStatus(),
      manager: await getConsultationManager()
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
