const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { updateReservation } = require("./_lib/storage");

const ALLOWED_STATUSES = new Set(["new", "contacted", "confirmed", "completed", "hold", "cancelled"]);

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["PATCH", "POST"])) {
    return;
  }

  if (!await requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const payload = await readJson(req);
    const id = String(payload.id || "").trim();
    const status = String(payload.status || "").trim();

    if (!id || !ALLOWED_STATUSES.has(status)) {
      sendJson(res, 422, { ok: false, error: "Invalid reservation id or status" });
      return;
    }

    const reservation = await updateReservation(id, {
      status,
      adminMemo: String(payload.adminMemo || "").trim().slice(0, 1000)
    });

    if (!reservation) {
      sendJson(res, 404, { ok: false, error: "Reservation not found" });
      return;
    }

    sendJson(res, 200, { ok: true, reservation });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
