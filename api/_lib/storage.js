const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const LOCAL_DB_PATH = path.join(os.tmpdir(), "wwmm-reservations.json");
const LOCAL_SETTINGS_PATH = path.join(os.tmpdir(), "wwmm-admin-settings.json");
const SUPABASE_TABLE = process.env.SUPABASE_RESERVATIONS_TABLE || "reservations";
const SUPABASE_SETTINGS_TABLE = process.env.SUPABASE_SETTINGS_TABLE || "admin_settings";
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "reservation-photos";
const CONSULTATION_MANAGER_KEY = "consultation_manager";
const ATELIER_CARDS_KEY = "atelier_cards";

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function hasSupabaseStorage() {
  return hasSupabase() && Boolean(SUPABASE_BUCKET);
}

function normalizeReservation(row) {
  return {
    id: row.id,
    createdAt: row.created_at || row.createdAt,
    status: row.status || "new",
    locale: row.locale || "ko",
    studioId: row.studio_id || row.studioId || "",
    studioName: row.studio_name || row.studioName || "",
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    preferredDate: row.preferred_date || row.preferredDate || "",
    message: row.message || "",
    findLine: Boolean(row.find_line ?? row.findLine),
    uploads: row.uploads || [],
    notifications: row.notifications || {},
    adminReply: row.admin_reply || row.adminReply || "",
    adminMemo: row.admin_memo || row.adminMemo || "",
    replyHistory: row.reply_history || row.replyHistory || []
  };
}

async function readLocalRows() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_DB_PATH, "utf8"));
  } catch (error) {
    return [];
  }
}

async function writeLocalRows(rows) {
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(rows, null, 2));
}


function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function fallbackConsultationManager() {
  return {
    name: process.env.NOTIFY_ADMIN_NAME || "상담관리 담당자",
    phone: normalizePhone(process.env.NOTIFY_ADMIN_PHONE),
    active: Boolean(process.env.NOTIFY_ADMIN_PHONE),
    source: process.env.NOTIFY_ADMIN_PHONE ? "env" : "unset",
    updatedAt: null
  };
}

function normalizeConsultationManager(value) {
  const fallback = fallbackConsultationManager();
  const source = value && typeof value === "object" ? value : {};
  const phone = normalizePhone(source.phone);

  return {
    name: String(source.name || fallback.name || "상담관리 담당자").trim().slice(0, 80),
    phone: phone || fallback.phone,
    active: source.active === undefined ? Boolean(phone || fallback.phone) : Boolean(source.active),
    source: source.source || (phone ? "admin" : fallback.source),
    updatedAt: source.updatedAt || null
  };
}

async function readLocalSettings() {
  try {
    const settings = JSON.parse(await fs.readFile(LOCAL_SETTINGS_PATH, "utf8"));
    return settings && typeof settings === "object" ? settings : {};
  } catch (error) {
    return {};
  }
}

async function writeLocalSettings(settings) {
  await fs.writeFile(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

async function getConsultationManager() {
  if (hasSupabase()) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_SETTINGS_TABLE}?key=eq.${encodeURIComponent(CONSULTATION_MANAGER_KEY)}&select=value&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      const manager = fallbackConsultationManager();
      manager.warning = `Supabase settings select failed: ${await response.text()}`;
      return manager;
    }

    const [row] = await response.json();
    return normalizeConsultationManager(row && row.value);
  }

  const settings = await readLocalSettings();
  return normalizeConsultationManager(settings[CONSULTATION_MANAGER_KEY]);
}

async function updateConsultationManager(input) {
  const name = String(input.name || "").trim().slice(0, 80);
  const phone = normalizePhone(input.phone);

  if (!name || !phone) {
    throw new Error("Consultation manager name and phone are required");
  }

  const manager = normalizeConsultationManager({
    name,
    phone,
    active: input.active,
    source: "admin",
    updatedAt: new Date().toISOString()
  });

  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_SETTINGS_TABLE}?on_conflict=key`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        key: CONSULTATION_MANAGER_KEY,
        value: manager,
        updated_at: manager.updatedAt
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase settings upsert failed: ${await response.text()}`);
    }

    const [row] = await response.json();
    return normalizeConsultationManager(row && row.value);
  }

  const settings = await readLocalSettings();
  settings[CONSULTATION_MANAGER_KEY] = manager;
  await writeLocalSettings(settings);
  return manager;
}

async function getAtelierCards() {
  if (hasSupabase()) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_SETTINGS_TABLE}?key=eq.${encodeURIComponent(ATELIER_CARDS_KEY)}&select=value&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase atelier settings read failed: ${await response.text()}`);
    }

    const [row] = await response.json();
    return row && Array.isArray(row.value) ? row.value : null;
  }

  const settings = await readLocalSettings();
  return Array.isArray(settings[ATELIER_CARDS_KEY]) ? settings[ATELIER_CARDS_KEY] : null;
}

async function updateAtelierCards(cards) {
  const value = Array.isArray(cards) ? cards : [];
  const updatedAt = new Date().toISOString();

  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_SETTINGS_TABLE}?on_conflict=key`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({ key: ATELIER_CARDS_KEY, value, updated_at: updatedAt })
    });

    if (!response.ok) {
      throw new Error(`Supabase atelier settings upsert failed: ${await response.text()}`);
    }
  } else {
    const settings = await readLocalSettings();
    settings[ATELIER_CARDS_KEY] = value;
    await writeLocalSettings(settings);
  }

  return value;
}

async function createReservation(input) {
  const reservation = {
    id: `wwmm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "new",
    ...input
  };

  if (hasSupabase()) {
    const payload = {
      id: reservation.id,
      created_at: reservation.createdAt,
      status: reservation.status,
      locale: reservation.locale,
      studio_id: reservation.studioId,
      studio_name: reservation.studioName,
      name: reservation.name,
      phone: reservation.phone,
      email: reservation.email,
      preferred_date: reservation.preferredDate,
      message: reservation.message,
      find_line: reservation.findLine,
      uploads: reservation.uploads,
      notifications: reservation.notifications
    };

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Supabase insert failed: ${await response.text()}`);
    }

    const [row] = await response.json();
    return normalizeReservation(row);
  }

  const rows = await readLocalRows();
  rows.unshift(reservation);
  await writeLocalRows(rows);
  return reservation;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    type: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function safeFileName(name) {
  const ext = path.extname(String(name || "")).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const base = path.basename(String(name || "photo"), ext).replace(/[^a-z0-9_-]/gi, "-").slice(0, 60);
  return `${base || "photo"}${ext || ".jpg"}`;
}

async function uploadReservationFiles(reservationId, files) {
  const list = Array.isArray(files) ? files.slice(0, 4) : [];

  if (!list.length) {
    return [];
  }

  if (!hasSupabaseStorage()) {
    return list.map((file) => ({
      name: file.name || "photo",
      size: file.size || 0,
      type: file.type || "",
      dataUrl: file.dataUrl || "",
      stored: false
    }));
  }

  const uploads = [];

  for (const [index, file] of list.entries()) {
    const parsed = parseDataUrl(file.dataUrl);
    if (!parsed) {
      continue;
    }

    const objectPath = `${reservationId}/${Date.now()}-${index + 1}-${safeFileName(file.name)}`;
    const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type || parsed.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: parsed.buffer
    });

    if (!response.ok) {
      throw new Error(`Supabase storage upload failed: ${await response.text()}`);
    }

    uploads.push({
      name: file.name || safeFileName(file.name),
      size: file.size || parsed.buffer.length,
      type: file.type || parsed.type,
      bucket: SUPABASE_BUCKET,
      path: objectPath,
      stored: true
    });
  }

  return uploads;
}

async function createSignedPhotoUrl(objectPath) {
  if (!hasSupabaseStorage()) {
    throw new Error("Supabase Storage is not configured");
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      expiresIn: 60 * 10
    })
  });

  if (!response.ok) {
    throw new Error(`Supabase signed URL failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.signedURL && data.signedURL.startsWith("http")
    ? data.signedURL
    : `${process.env.SUPABASE_URL}/storage/v1${data.signedURL}`;
}

async function listReservations() {
  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=created_at.desc`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase select failed: ${await response.text()}`);
    }

    return (await response.json()).map(normalizeReservation);
  }

  return readLocalRows();
}

async function updateReservation(id, patch) {
  if (hasSupabase()) {
    const payload = {};
    if (patch.status) {
      payload.status = patch.status;
    }
    if (patch.adminMemo !== undefined) {
      payload.admin_memo = patch.adminMemo;
    }
    if (patch.adminReply !== undefined) {
      payload.admin_reply = patch.adminReply;
    }
    if (patch.replyHistory !== undefined) {
      payload.reply_history = patch.replyHistory;
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Supabase update failed: ${await response.text()}`);
    }

    const [row] = await response.json();
    return normalizeReservation(row);
  }

  const rows = await readLocalRows();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) {
    return null;
  }

  rows[index] = {
    ...rows[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await writeLocalRows(rows);
  return rows[index];
}

module.exports = {
  createReservation,
  createSignedPhotoUrl,
  getAtelierCards,
  getConsultationManager,
  listReservations,
  updateAtelierCards,
  updateReservation,
  updateConsultationManager,
  uploadReservationFiles
};
