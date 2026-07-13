async function sendEmail(reservation) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_ADMIN_EMAIL) {
    return { skipped: true, reason: "RESEND_API_KEY or NOTIFY_ADMIN_EMAIL is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM_EMAIL || "wwmm <onboarding@resend.dev>",
      to: [process.env.NOTIFY_ADMIN_EMAIL],
      subject: `[ww'mm] 신규 상담 예약 - ${reservation.name}`,
      text: [
        `Studio: ${reservation.studioName || reservation.studioId || "미선택"}`,
        `Name: ${reservation.name}`,
        `Phone: ${reservation.phone}`,
        `Email: ${reservation.email}`,
        `Preferred date: ${reservation.preferredDate || "-"}`,
        `Find line: ${reservation.findLine ? "yes" : "no"}`,
        `Message: ${reservation.message || "-"}`
      ].join("\n")
    })
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }

  return { ok: true };
}

async function sendSms(reservation) {
  if (!process.env.SMS_WEBHOOK_URL || !process.env.NOTIFY_ADMIN_PHONE) {
    return { skipped: true, reason: "SMS_WEBHOOK_URL or NOTIFY_ADMIN_PHONE is not configured" };
  }

  const response = await fetch(process.env.SMS_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.SMS_WEBHOOK_TOKEN ? `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` : ""
    },
    body: JSON.stringify({
      to: process.env.NOTIFY_ADMIN_PHONE,
      text: `[ww'mm] 신규 상담: ${reservation.name} / ${reservation.phone}`
    })
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }

  return { ok: true };
}

async function sendClientSms(phone, text) {
  if (!process.env.SMS_WEBHOOK_URL) {
    return { skipped: true, reason: "SMS_WEBHOOK_URL is not configured" };
  }

  const response = await fetch(process.env.SMS_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.SMS_WEBHOOK_TOKEN ? `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` : ""
    },
    body: JSON.stringify({
      to: phone,
      text
    })
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }

  return { ok: true };
}

async function notifyReservation(reservation) {
  const [email, sms] = await Promise.allSettled([
    sendEmail(reservation),
    sendSms(reservation)
  ]);

  return {
    email: email.status === "fulfilled" ? email.value : { ok: false, error: email.reason.message },
    sms: sms.status === "fulfilled" ? sms.value : { ok: false, error: sms.reason.message }
  };
}

module.exports = {
  sendClientSms,
  notifyReservation
};
