const { requireRole } = require("./_lib/auth");
const { readJson, requireMethod, sendJson } = require("./_lib/http");
const { getAtelierCards, getStudioCards, updateAtelierCards, updateStudioCards } = require("./_lib/storage");

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

function cleanCoordinate(value, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
}

function normalizeCard(card, index) {
  return {
    id: clean(card.id, 100) || `artisan_${Date.now()}_${index}`,
    doctor: clean(card.doctor, 80),
    clinic: clean(card.clinic, 100),
    role: clean(card.role, 80),
    bio: clean(card.bio, 500),
    promise: clean(card.promise, 180),
    review: clean(card.review, 800),
    studioId: clean(card.studioId, 100),
    studio: clean(card.studio, 120),
    phone: clean(card.phone, 40),
    address: clean(card.address, 200),
    addressEn: clean(card.addressEn, 240),
    portrait: cleanImage(card.portrait),
    clinicImage: cleanImage(card.clinicImage),
    version: Math.max(0, Number.parseInt(card.version, 10) || 0),
    updatedAt: clean(card.updatedAt, 40)
  };
}

function hasInvalidCardIds(cards) {
  const seen = new Set();
  return cards.some((card) => {
    const id = clean(card?.id, 100);
    if (!id || seen.has(id)) return true;
    seen.add(id);
    return false;
  });
}

function normalizeAtelierCards(cards) {
  const seen = new Set();
  return cards.map((card, index) => {
    const normalized = normalizeCard(card, index);
    const baseId = normalized.id;
    let uniqueId = baseId;
    let suffix = 2;
    while (seen.has(uniqueId)) {
      uniqueId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    seen.add(uniqueId);
    return uniqueId === normalized.id ? normalized : { ...normalized, id: uniqueId };
  });
}

function normalizeStudioCard(card, index) {
  return {
    id: clean(card.id, 100) || `studio_${Date.now()}_${index}`,
    name: clean(card.name, 120),
    phone: clean(card.phone, 40),
    address: clean(card.address, 200),
    addressEn: clean(card.addressEn, 240),
    detailAddress: clean(card.detailAddress, 120),
    lat: cleanCoordinate(card.lat, -90, 90),
    lng: cleanCoordinate(card.lng, -180, 180),
    isActive: card.isActive !== false,
    image: cleanImage(card.image)
  };
}

module.exports = async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "PUT", "POST", "PATCH"])) return;

  try {
    const resource = req.query?.resource || new URL(req.url, "http://localhost").searchParams.get("resource");
    const isStudio = resource === "studio";
    if (req.method === "GET") {
      let storedCards = null;
      let storageWarning = "";
      try {
        storedCards = isStudio ? await getStudioCards() : await getAtelierCards();
        if (!isStudio && Array.isArray(storedCards) && hasInvalidCardIds(storedCards)) {
          storedCards = normalizeAtelierCards(storedCards);
          await updateAtelierCards(storedCards);
        }
      } catch (error) {
        storageWarning = error.message;
      }
      sendJson(res, 200, {
        ok: true,
        cards: storedCards || [],
        configured: storedCards !== null,
        ...(storageWarning ? { storageWarning } : {}),
        ...(isStudio ? { mapKey: process.env.KAKAO_MAP_JAVASCRIPT_KEY || "" } : {})
      });
      return;
    }

    if (!await requireRole(req, ["master", "admin"])) {
      sendJson(res, 403, { ok: false, error: "Content administrator access required" });
      return;
    }

    const payload = await readJson(req);
    if (!isStudio && req.method === "PATCH") {
      const storedCards = await getAtelierCards() || [];
      const currentCards = hasInvalidCardIds(storedCards)
        ? normalizeAtelierCards(storedCards)
        : storedCards;
      const incoming = normalizeCard(payload.card || {}, 0);
      const index = currentCards.findIndex((card) => card.id === incoming.id);
      const currentVersion = index >= 0 ? Math.max(0, Number.parseInt(currentCards[index].version, 10) || 0) : 0;
      const expectedVersion = Math.max(0, Number.parseInt(payload.expectedVersion, 10) || 0);

      if (!incoming.doctor || !incoming.clinic || !incoming.portrait || !incoming.clinicImage) {
        sendJson(res, 422, { ok: false, error: "Doctor, clinic, and both images are required" });
        return;
      }
      if (index >= 0 && currentVersion !== expectedVersion) {
        sendJson(res, 409, {
          ok: false,
          error: "This Atelier card was updated in another session. Your draft has been preserved.",
          currentCard: currentCards[index]
        });
        return;
      }

      const savedCard = {
        ...incoming,
        version: currentVersion + 1,
        updatedAt: new Date().toISOString()
      };
      const nextCards = index >= 0
        ? currentCards.map((card, cardIndex) => cardIndex === index ? savedCard : card)
        : [...currentCards, savedCard];
      await updateAtelierCards(nextCards);
      sendJson(res, 200, { ok: true, card: savedCard });
      return;
    }

    const rawCards = Array.isArray(payload.cards)
      ? payload.cards.slice(0, isStudio ? 100 : 30)
      : [];
    const cards = isStudio
      ? rawCards.map(normalizeStudioCard)
      : normalizeAtelierCards(rawCards);
    const invalid = isStudio
      ? cards.some((card) => !card.name || !card.address || !card.image)
      : cards.some((card) => !card.doctor || !card.clinic || !card.portrait || !card.clinicImage);
    if (invalid) {
      sendJson(res, 422, {
        ok: false,
        error: isStudio
          ? "Studio name, address, and image are required"
          : "Doctor, clinic, and both images are required"
      });
      return;
    }

    if (!isStudio && payload.baseVersions && typeof payload.baseVersions === "object") {
      const currentCards = await getAtelierCards() || [];
      const hasConflict = currentCards.some((card) => {
        if (!Object.prototype.hasOwnProperty.call(payload.baseVersions, card.id)) return false;
        const expected = Math.max(0, Number.parseInt(payload.baseVersions[card.id], 10) || 0);
        const current = Math.max(0, Number.parseInt(card.version, 10) || 0);
        return expected !== current;
      });
      if (hasConflict) {
        sendJson(res, 409, {
          ok: false,
          error: "Atelier data changed in another session. Refresh before changing the order or deleting a card."
        });
        return;
      }
    }

    sendJson(res, 200, {
      ok: true,
      cards: isStudio ? await updateStudioCards(cards) : await updateAtelierCards(cards)
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
