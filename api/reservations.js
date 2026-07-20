const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { createReservation, uploadReservationFiles } = require("./_lib/storage");
const { notifyReservation } = require("./_lib/notifications");

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function validate(payload) {
  const errors = {};

  if (!cleanText(payload.name, 80)) {
    errors.name = "Name is required";
  }

  if (!cleanText(payload.phone, 40)) {
    errors.phone = "Phone is required";
  }

  const email = cleanText(payload.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email is invalid";
  }

  if (!payload.privacyAccepted) {
    errors.privacyAccepted = "Privacy consent is required";
  }

  return errors;
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) {
    return;
  }

  try {
    const payload = await readJson(req);
    const errors = validate(payload);

    if (Object.keys(errors).length) {
      sendJson(res, 422, { ok: false, errors });
      return;
    }

    const reservationId = `wwmm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const requestedUploads = Array.isArray(payload.uploads) ? payload.uploads : [];
    let uploads = [];
    let uploadWarning = "";

    try {
      uploads = await uploadReservationFiles(reservationId, requestedUploads);
    } catch (error) {
      uploadWarning = error.message;
      uploads = requestedUploads.slice(0, 4).map((file) => ({
        name: cleanText(file.name, 160) || "photo",
        size: Number(file.size) || 0,
        type: cleanText(file.type, 80),
        stored: false
      }));
    }

    const reservation = await createReservation({
      id: reservationId,
      locale: cleanText(payload.locale, 8) || "ko",
      studioId: cleanText(payload.studioId, 80),
      studioName: cleanText(payload.studioName, 120),
      name: cleanText(payload.name, 80),
      phone: cleanText(payload.phone, 40),
      email: cleanText(payload.email, 120),
      preferredDate: cleanText(payload.preferredDate, 40),
      message: cleanText(payload.message, 1000),
      findLine: Boolean(payload.findLine),
      privacyAccepted: Boolean(payload.privacyAccepted),
      uploads,
      notifications: {}
    });

    const notifications = await notifyReservation(reservation);

    sendJson(res, 201, {
      ok: true,
      reservation: {
        id: reservation.id,
        createdAt: reservation.createdAt,
        status: reservation.status
      },
      notifications,
      warnings: uploadWarning ? { uploads: uploadWarning } : {}
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
