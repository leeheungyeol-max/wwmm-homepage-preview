const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const LOCAL_ANALYTICS_PATH = path.join(os.tmpdir(), "wwmm-analytics-events.json");
const ANALYTICS_TABLE = process.env.SUPABASE_ANALYTICS_TABLE || "analytics_events";
const CORE_PAGES = ["home", "atelier", "gallery", "studio", "concierge"];
const RANGE_CONFIG = {
  day: { stepMs: 60 * 60 * 1000, label: "HH" },
  week: { points: 7, stepMs: 24 * 60 * 60 * 1000, label: "DAY" },
  month: { points: 30, stepMs: 24 * 60 * 60 * 1000, label: "MD" },
  quarter: { points: 13, stepMs: 7 * 24 * 60 * 60 * 1000, label: "MD" }
};

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readLocalEvents() {
  try {
    return JSON.parse(await fs.readFile(LOCAL_ANALYTICS_PATH, "utf8"));
  } catch (error) {
    return [];
  }
}

async function writeLocalEvents(events) {
  await fs.writeFile(LOCAL_ANALYTICS_PATH, JSON.stringify(events.slice(-5000), null, 2));
}

function normalizeEvent(row) {
  return {
    id: row.id,
    createdAt: row.created_at || row.createdAt,
    page: row.page || "home",
    path: row.path || "/",
    region: row.region || "Unknown",
    city: row.city || "",
    country: row.country || "",
    userKey: row.user_key || row.userKey || ""
  };
}

function bucketLabel(date, mode) {
  if (mode === "HH") {
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }

  if (mode === "DAY") {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function normalizeRange(range) {
  return RANGE_CONFIG[range] ? range : "week";
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfHour(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
}

function getRangeWindow(range, now = new Date()) {
  const safeRange = normalizeRange(range);
  const config = RANGE_CONFIG[safeRange];
  const today = startOfDay(now);

  if (safeRange === "day") {
    const start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const end = new Date(startOfHour(now).getTime() + config.stepMs);
    const points = Math.ceil((end.getTime() - start.getTime()) / config.stepMs);
    return { start, end, points };
  }

  const start = new Date(today.getTime() - (config.points - 1) * config.stepMs);
  const end = new Date(start.getTime() + config.points * config.stepMs);
  return { start, end, points: config.points };
}

function makeVisitorSeries(events, range) {
  const safeRange = normalizeRange(range);
  const config = RANGE_CONFIG[safeRange];
  const { start, points } = getRangeWindow(safeRange);

  return Array.from({ length: points }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * config.stepMs);
    const bucketEnd = new Date(bucketStart.getTime() + config.stepMs);
    const bucketEvents = events.filter((event) => {
      const created = new Date(event.createdAt);
      return created >= bucketStart && created < bucketEnd;
    });
    const visitors = new Set(bucketEvents.map((event) => event.userKey).filter(Boolean));

    return {
      label: bucketLabel(bucketStart, config.label),
      visitors: visitors.size || bucketEvents.length,
      hits: bucketEvents.length
    };
  });
}

function summarize(events, range = "week") {
  const safeRange = normalizeRange(range);
  const { start: rangeStart, end: rangeEnd } = getRangeWindow(safeRange);
  const scopedEvents = events.filter((event) => {
    const created = new Date(event.createdAt);
    return created >= rangeStart && created < rangeEnd;
  });
  const uniqueVisitors = new Set(scopedEvents.map((event) => event.userKey).filter(Boolean));
  const pageHits = {};
  const regions = {};
  const recent = scopedEvents.slice(-8).reverse();

  CORE_PAGES.forEach((page) => {
    pageHits[page] = 0;
  });

  scopedEvents.forEach((event) => {
    pageHits[event.page] = (pageHits[event.page] || 0) + 1;
    regions[event.region || "Unknown"] = (regions[event.region || "Unknown"] || 0) + 1;
  });

  return {
    range: safeRange,
    totalVisitors: uniqueVisitors.size || scopedEvents.length,
    totalHits: scopedEvents.length,
    visitorSeries: makeVisitorSeries(scopedEvents, safeRange),
    pageHits: Object.entries(pageHits)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const left = CORE_PAGES.includes(a.label) ? CORE_PAGES.indexOf(a.label) : CORE_PAGES.length;
        const right = CORE_PAGES.includes(b.label) ? CORE_PAGES.indexOf(b.label) : CORE_PAGES.length;
        return left - right || b.value - a.value;
      }),
    regions: Object.entries(regions)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    recent
  };
}

async function createAnalyticsEvent(input) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    page: String(input.page || "home").slice(0, 80),
    path: String(input.path || "/").slice(0, 240),
    region: String(input.region || "Unknown").slice(0, 120),
    city: String(input.city || "").slice(0, 120),
    country: String(input.country || "").slice(0, 80),
    userKey: String(input.userKey || "").slice(0, 120)
  };

  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${ANALYTICS_TABLE}`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: event.id,
        created_at: event.createdAt,
        page: event.page,
        path: event.path,
        region: event.region,
        city: event.city,
        country: event.country,
        user_key: event.userKey
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase analytics insert failed: ${await response.text()}`);
    }
  } else {
    const events = await readLocalEvents();
    events.push(event);
    await writeLocalEvents(events);
  }

  return event;
}

async function listAnalyticsEvents() {
  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${ANALYTICS_TABLE}?select=*&order=created_at.asc&limit=5000`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase analytics select failed: ${await response.text()}`);
    }

    return (await response.json()).map(normalizeEvent);
  }

  return readLocalEvents();
}

module.exports = {
  createAnalyticsEvent,
  listAnalyticsEvents,
  summarize
};
