const axios = require("axios");

const BASE_URL = "https://api.alternative.me/fng/";

/**
 * Fetches the crypto Fear & Greed Index (no API key required).
 */
async function getFearGreedIndex() {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: { limit: 1 },
      timeout: 10000
    });

    const entry = data?.data?.[0];
    if (!entry) throw new Error("No data returned");

    return {
      ok: true,
      value: Number(entry.value),
      label: entry.value_classification
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getFearGreedIndex };
