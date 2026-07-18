const { requireAdmin } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getAtelierCards, updateAtelierCards } = require("./_lib/storage");

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanImage(value) {
  const image = String(value || "").trim();
  if (!image || image.startsWith("assets/images/")) return image;
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(image) || image.length > 2_500_000) {
    throw new Error("Invalid or oversized atelier image");
  }
  return image;
}

function normalizeCard(card, index) {
  return {
    id: clean(card.id, 100) || `artisan_${Date.now()}_${index}`,
    doctor: clean(card.doctor, 80),
    clinic: clean(card.clinic, 100),
    role: clean(card.role, 80),
    bio: clean(card.bio, 500),
    promise: clean(card.promise, 180),
    studio: clean(card.studio, 120),
    phone: clean(card.phone, 40),
    address: clean(card.address, 200),
    portrait: cleanImage(card.portrait),
    clinicImage: cleanImage(card.clinicImage)
  };
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "PUT", "POST"])) return;

  try {
    if (req.method === "GET") {
      const storedCards = await getAtelierCards();
      sendJson(res, 200, {
        ok: true,
        cards: storedCards || [],
        configured: storedCards !== null
      });
      return;
    }

    if (!requireAdmin(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    const payload = await readJson(req);
    const cards = Array.isArray(payload.cards) ? payload.cards.slice(0, 30).map(normalizeCard) : [];
    if (cards.some((card) => !card.doctor || !card.clinic || !card.portrait || !card.clinicImage)) {
      sendJson(res, 422, { ok: false, error: "Doctor, clinic, and both images are required" });
      return;
    }

    sendJson(res, 200, { ok: true, cards: await updateAtelierCards(cards) });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
