const axios = require("axios");

const BASE_URL = "https://finnhub.io/api/v1";
const TICKERS = ["SPY", "QQQ", "DIA", "^VIX"]; // S&P500, Nasdaq100, Dow, VIX proxy via ETFs

/**
 * Fetches quote data for major US index ETFs.
 * Requires FINNHUB_API_KEY (free tier: https://finnhub.io/register)
 */
async function getStockPulse() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FINNHUB_API_KEY missing" };
  }

  try {
    const results = await Promise.all(
      TICKERS.map(async (symbol) => {
        const { data } = await axios.get(`${BASE_URL}/quote`, {
          params: { symbol, token: apiKey },
          timeout: 10000
        });
        return {
          symbol,
          price: data.c,
          changePct: data.dp,
          high: data.h,
          low: data.l
        };
      })
    );

    return { ok: true, indices: results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getStockPulse };
