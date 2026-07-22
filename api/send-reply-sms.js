const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { sendClientSms } = require("./_lib/notifications");
const { listReservations, updateReservation } = require("./_lib/storage");

function cleanText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function summarizeSmsResult(sms) {
  return {
    provider: sms && sms.provider ? sms.provider : "unknown",
    accepted: Boolean(sms && sms.ok),
    skipped: Boolean(sms && sms.skipped),
    status: sms && sms.status ? sms.status : null,
    messageId: sms && sms.messageId ? sms.messageId : null,
    groupId: sms && sms.groupId ? sms.groupId : null,
    error: sms && sms.error ? sms.error : "",
    reason: sms && sms.reason ? sms.reason : ""
  };
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

    if (!reservation.phone) {
      sendJson(res, 422, { ok: false, error: "Client phone number is missing" });
      return;
    }

    const sms = summarizeSmsResult(await sendClientSms(reservation.phone, reply));
    const smsStatus = sms.accepted ? "accepted" : sms.skipped ? "skipped" : "failed";
    const smsIssue = sms.error || sms.reason;
    const history = Array.isArray(reservation.replyHistory) ? reservation.replyHistory : [];
    const entry = {
      id: `sms_${Date.now()}`,
      type: "sms",
      status: smsStatus,
      text: reply,
      result: sms,
      createdAt: new Date().toISOString()
    };
    if (smsIssue) {
      entry.error = smsIssue;
    }

    const updated = await updateReservation(id, {
      adminReply: reply,
      replyHistory: [entry, ...history]
    });

    sendJson(res, 200, { ok: true, reservation: updated, sms });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
