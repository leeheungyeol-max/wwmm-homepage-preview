const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getStudioCards, updateStudioCards } = require("./_lib/storage");

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanImage(value) {
  const image = String(value || "").trim();
  if (!image || image.startsWith("assets/images/")) return image;
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(image) || image.length > 2_500_000) {
    throw new Error("Invalid or oversized studio image");
  }
  return image;
}

function normalizeCard(card, index) {
  return {
    id: clean(card.id, 100) || `studio_${Date.now()}_${index}`,
    name: clean(card.name, 120),
    phone: clean(card.phone, 40),
    address: clean(card.address, 200),
    image: cleanImage(card.image)
  };
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "PUT", "POST"])) return;
  try {
    if (req.method === "GET") {
      const storedCards = await getStudioCards();
      sendJson(res, 200, { ok: true, cards: storedCards || [], configured: storedCards !== null });
      return;
    }
    if (!requireAdmin(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }
    const payload = await readJson(req);
    const cards = Array.isArray(payload.cards) ? payload.cards.slice(0, 100).map(normalizeCard) : [];
    if (cards.some((card) => !card.name || !card.address || !card.image)) {
      sendJson(res, 422, { ok: false, error: "Studio name, address, and image are required" });
      return;
    }
    sendJson(res, 200, { ok: true, cards: await updateStudioCards(cards) });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
