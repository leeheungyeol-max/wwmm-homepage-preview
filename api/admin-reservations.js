const { requireAdmin } = require("./_lib/auth");
const { requireMethod, sendJson } = require("./_lib/http");
const { listReservations } = require("./_lib/storage");

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) {
    return;
  }

  if (!requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    sendJson(res, 200, {
      ok: true,
      reservations: await listReservations()
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
