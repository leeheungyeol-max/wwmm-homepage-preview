const crypto = require("crypto");

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function environmentValue(name) {
  return String(process.env[name] || "").trim();
}

function getSolapiConfig() {
  const apiKey = environmentValue("SOLAPI_API_KEY");
  const apiSecret = environmentValue("SOLAPI_API_SECRET");
  const from =
    environmentValue("SOLAPI_FROM_NUMBER") ||
    environmentValue("SOLAPI_FROM") ||
    environmentValue("SOLAPI_SENDER");

  return {
    apiKey,
    apiSecret,
    from: normalizePhone(from),
    missing: [
      !apiKey ? "SOLAPI_API_KEY" : null,
      !apiSecret ? "SOLAPI_API_SECRET" : null,
      !from ? "SOLAPI_FROM_NUMBER" : null
    ].filter(Boolean)
  };
}

function hasSolapiSettings() {
  const config = getSolapiConfig();
  return Boolean(config.apiKey || config.apiSecret || config.from);
}

function getSolapiStatus() {
  const config = getSolapiConfig();
  return {
    provider: "solapi",
    configured: config.missing.length === 0,
    missing: config.missing,
    senderLastFour: config.from ? config.from.slice(-4) : null
  };
}

function createSolapiAuthorization(apiKey, apiSecret) {
  const date = new Date().toISOString();
  // Solapi requires a 32-byte random salt, serialized as hexadecimal.
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function readResponsePayload(response) {
  const body = await response.text();
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (_error) {
    return { raw: body };
  }
}

function getResponseError(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return payload.errorMessage || payload.message || payload.error || payload.raw || fallback;
}

async function sendSolapiMessage(to, text) {
  const config = getSolapiConfig();
  if (config.missing.length) {
    return {
      skipped: true,
      provider: "solapi",
      reason: "Missing SOLAPI settings: " + config.missing.join(", ")
    };
  }

  const recipient = normalizePhone(to);
  if (!recipient) {
    return { ok: false, provider: "solapi", error: "Recipient phone number is missing" };
  }

  try {
    const response = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: createSolapiAuthorization(config.apiKey, config.apiSecret),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          to: recipient,
          from: config.from,
          text: String(text || "").slice(0, 2000)
        }
      })
    });

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      return {
        ok: false,
        provider: "solapi",
        status: response.status,
        error: getResponseError(payload, "Solapi request failed")
      };
    }

    return {
      ok: true,
      provider: "solapi",
      status: response.status,
      messageId: payload.messageId || (payload.message && payload.message.messageId) || null,
      groupId: payload.groupId || (payload.message && payload.message.groupId) || null
    };
  } catch (error) {
    return {
      ok: false,
      provider: "solapi",
      error: "Solapi connection failed: " + error.message
    };
  }
}

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
  if (hasSolapiSettings()) {
    if (!process.env.NOTIFY_ADMIN_PHONE) {
      return { skipped: true, reason: "NOTIFY_ADMIN_PHONE is not configured" };
    }

    return sendSolapiMessage(
      process.env.NOTIFY_ADMIN_PHONE,
      `[ww'mm] 신규 상담: ${reservation.name} / ${reservation.phone}`
    );
  }

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
  if (hasSolapiSettings()) {
    return sendSolapiMessage(phone, text);
  }

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
  getSolapiStatus,
  notifyReservation
};
