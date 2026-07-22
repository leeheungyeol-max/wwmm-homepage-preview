const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { listReservations, updateReservation } = require("./_lib/storage");

function cleanText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) {
    return;
  }

  if (!await requireAdmin(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const payload = await readJson(req);
    const id = cleanText(payload.id, 120);
    const reply = cleanText(payload.reply, 1000);

    if (!id || !reply) {
      sendJson(res, 422, { ok: false, error: "Reservation id and reply are required" });
      return;
    }

    const reservation = (await listReservations()).find((item) => item.id === id);
    if (!reservation) {
      sendJson(res, 404, { ok: false, error: "Reservation not found" });
      return;
    }

    const history = Array.isArray(reservation.replyHistory) ? reservation.replyHistory : [];
    const entry = {
      id: `reply_${Date.now()}`,
      type: "note",
      text: reply,
      createdAt: new Date().toISOString()
    };

    const updated = await updateReservation(id, {
      adminReply: reply,
      replyHistory: [entry, ...history]
    });

    sendJson(res, 200, { ok: true, reservation: updated });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
