const axios = require("axios");

const BASE_URL = "https://finnhub.io/api/v1/calendar/economic";

/**
 * Fetches today's medium/high-impact economic calendar events.
 * Requires FINNHUB_API_KEY. Falls back gracefully if the endpoint
 * is not available on the current plan.
 */
async function getEconomicCalendar() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FINNHUB_API_KEY missing" };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(BASE_URL, {
      params: { from: today, to: today, token: apiKey },
      timeout: 10000
    });

    const events = (data.economicCalendar || [])
      .filter((e) => e.impact === "high" || e.impact === "medium")
      .slice(0, 5)
      .map((e) => ({
        event: e.event,
        country: e.country,
        time: e.time,
        impact: e.impact
      }));

    return { ok: true, events };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error || err.message };
  }
}

module.exports = { getEconomicCalendar };
