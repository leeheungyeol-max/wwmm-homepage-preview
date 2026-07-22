const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { createSignedPhotoUrl } = require("./_lib/storage");

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
    const objectPath = String(payload.path || "").trim();

    if (!objectPath || objectPath.includes("..")) {
      sendJson(res, 422, { ok: false, error: "Invalid photo path" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      url: await createSignedPhotoUrl(objectPath)
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
