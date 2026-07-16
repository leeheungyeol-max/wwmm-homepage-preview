const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getConsultationManager, updateConsultationManager } = require("./_lib/storage");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "PATCH", "POST"])) {
    return;
  }

  if (!requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, manager: await getConsultationManager() });
      return;
    }

    const payload = await readJson(req);
    const manager = await updateConsultationManager({
      name: String(payload.name || "").trim(),
      phone: String(payload.phone || "").trim(),
      active: payload.active !== false
    });

    sendJson(res, 200, { ok: true, manager });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
