const { createAnalyticsEvent, listAnalyticsEvents, summarize } = require("./_lib/analytics");
const { requireRole } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const payload = await readJson(req);
      const regionHeader = req.headers["x-vercel-ip-country-region"] || "";
      const cityHeader = req.headers["x-vercel-ip-city"] || "";
      const countryHeader = req.headers["x-vercel-ip-country"] || "";

      await createAnalyticsEvent({
        page: payload.page,
        path: payload.path,
        region: payload.region || regionHeader || "Local",
        city: payload.city || cityHeader,
        country: payload.country || countryHeader,
        userKey: payload.userKey
      });

      sendJson(res, 201, {
        ok: true,
        geo: {
          country: payload.country || countryHeader || "",
          region: payload.region || regionHeader || "",
          city: payload.city || cityHeader || ""
        }
      });
      return;
    }

    if (!requireMethod(req, res, ["GET"])) {
      return;
    }

    if (!requireRole(req, ["master", "admin"])) {
      sendJson(res, 403, { ok: false, error: "Analytics access denied" });
      return;
    }

    const url = new URL(req.url, "http://localhost");

    sendJson(res, 200, {
      ok: true,
      analytics: summarize(await listAnalyticsEvents(), url.searchParams.get("range"))
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
