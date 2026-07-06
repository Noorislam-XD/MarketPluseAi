const axios = require("axios");

const BASE_URL = "https://www.alphavantage.co/query";

// Major forex pairs to track
const FOREX_PAIRS = [
  { from: "EUR", to: "USD", label: "EUR/USD" },
  { from: "GBP", to: "USD", label: "GBP/USD" },
  { from: "USD", to: "JPY", label: "USD/JPY" },
  { from: "USD", to: "INR", label: "USD/INR" }
];

// Commodities Alpha Vantage exposes as dedicated endpoints
const COMMODITIES = [
  { fn: "WTI", label: "Crude Oil (WTI)", unit: "$/barrel" },
  { fn: "BRENT", label: "Crude Oil (Brent)", unit: "$/barrel" },
  { fn: "NATURAL_GAS", label: "Natural Gas", unit: "$/MMBtu" },
  { fn: "COPPER", label: "Copper", unit: "$/lb" },
  { fn: "ALUMINUM", label: "Aluminum", unit: "$/ton" },
  { fn: "WHEAT", label: "Wheat", unit: "$/bushel" },
  { fn: "CORN", label: "Corn", unit: "$/bushel" }
];

/**
 * Fetches top US stock market gainers/losers/most-active.
 * Requires ALPHAVANTAGE_API_KEY (free tier: https://www.alphavantage.co/support/#api-key)
 * Note: free tier is limited to 25 requests/day.
 */
async function getMarketMovers() {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ALPHAVANTAGE_API_KEY missing" };
  }

  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        function: "TOP_GAINERS_LOSERS",
        apikey: apiKey
      },
      timeout: 10000
    });

    if (data.Note || data.Information) {
      // Rate limit / bad key message from Alpha Vantage
      return { ok: false, error: data.Note || data.Information };
    }

    const simplify = (arr = []) =>
      arr.slice(0, 3).map((s) => ({
        ticker: s.ticker,
        price: s.price,
        changePct: s.change_percentage
      }));

    return {
      ok: true,
      topGainers: simplify(data.top_gainers),
      topLosers: simplify(data.top_losers),
      mostActive: simplify(data.most_actively_traded)
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetches a handful of major forex pairs using CURRENCY_EXCHANGE_RATE.
 * Requires ALPHAVANTAGE_API_KEY.
 */
async function getForexPulse() {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ALPHAVANTAGE_API_KEY missing" };
  }

  try {
    const results = [];
    for (const pair of FOREX_PAIRS) {
      const { data } = await axios.get(BASE_URL, {
        params: {
          function: "CURRENCY_EXCHANGE_RATE",
          from_currency: pair.from,
          to_currency: pair.to,
          apikey: apiKey
        },
        timeout: 10000
      });

      if (data.Note || data.Information) {
        return { ok: false, error: data.Note || data.Information };
      }

      const rate = data["Realtime Currency Exchange Rate"];
      if (!rate) {
        results.push({ label: pair.label, rate: null, error: "no data" });
        continue;
      }

      results.push({
        label: pair.label,
        rate: rate["5. Exchange Rate"],
        lastRefreshed: rate["6. Last Refreshed"]
      });
    }

    return { ok: true, pairs: results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetches key commodity prices (oil, gas, metals, agriculture) using
 * Alpha Vantage's dedicated commodities endpoints.
 * Requires ALPHAVANTAGE_API_KEY.
 */
async function getCommoditiesPulse() {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ALPHAVANTAGE_API_KEY missing" };
  }

  try {
    const results = [];
    for (const commodity of COMMODITIES) {
      const { data } = await axios.get(BASE_URL, {
        params: {
          function: commodity.fn,
          interval: "monthly",
          apikey: apiKey
        },
        timeout: 10000
      });

      if (data.Note || data.Information) {
        return { ok: false, error: data.Note || data.Information };
      }

      const latest = Array.isArray(data.data) ? data.data[0] : null;
      results.push({
        label: commodity.label,
        unit: commodity.unit,
        value: latest?.value ?? null,
        date: latest?.date ?? null
      });
    }

    return { ok: true, commodities: results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getMarketMovers, getForexPulse, getCommoditiesPulse };
