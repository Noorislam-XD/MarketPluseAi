const axios = require("axios");

const BASE_URL = "https://www.alphavantage.co/query";

// Forex pairs to track
const FOREX_PAIRS = [
  { from: "USD", to: "INR", label: "USD/INR" },
  { from: "EUR", to: "USD", label: "EUR/USD" }
];

// Metals priced via the currency-exchange trick (XAU/XAG are valid
// "from_currency" codes on Alpha Vantage, quoted as $ per troy ounce).
const METALS = [
  { from: "XAU", to: "USD", label: "Gold", unit: "$/oz" },
  { from: "XAG", to: "USD", label: "Silver", unit: "$/oz" }
];

async function fetchExchangeRate(apiKey, from, to) {
  const { data } = await axios.get(BASE_URL, {
    params: {
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: from,
      to_currency: to,
      apikey: apiKey
    },
    timeout: 10000
  });

  if (data.Note || data.Information) {
    throw new Error(data.Note || data.Information);
  }

  const rate = data["Realtime Currency Exchange Rate"];
  return rate ? Number(rate["5. Exchange Rate"]) : null;
}

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
 * Fetches USD/INR and EUR/USD using CURRENCY_EXCHANGE_RATE.
 * Requires ALPHAVANTAGE_API_KEY.
 */
async function getForexPulse() {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ALPHAVANTAGE_API_KEY missing" };
  }

  try {
    const pairs = [];
    for (const pair of FOREX_PAIRS) {
      const rate = await fetchExchangeRate(apiKey, pair.from, pair.to);
      pairs.push({ label: pair.label, rate });
    }
    return { ok: true, pairs };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetches Gold, Silver (via currency-exchange trick) and Crude Oil (WTI,
 * via Alpha Vantage's dedicated commodity endpoint).
 * Requires ALPHAVANTAGE_API_KEY.
 */
async function getCommoditiesPulse() {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ALPHAVANTAGE_API_KEY missing" };
  }

  try {
    const gold = await fetchExchangeRate(apiKey, METALS[0].from, METALS[0].to);
    const silver = await fetchExchangeRate(apiKey, METALS[1].from, METALS[1].to);

    const { data } = await axios.get(BASE_URL, {
      params: {
        function: "WTI",
        interval: "monthly",
        apikey: apiKey
      },
      timeout: 10000
    });

    if (data.Note || data.Information) {
      throw new Error(data.Note || data.Information);
    }

    const latest = Array.isArray(data.data) ? data.data[0] : null;

    return {
      ok: true,
      gold: { label: "Gold", unit: METALS[0].unit, value: gold },
      silver: { label: "Silver", unit: METALS[1].unit, value: silver },
      crudeOil: {
        label: "Crude Oil (WTI)",
        unit: "$/barrel",
        value: latest?.value ? Number(latest.value) : null
      }
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getMarketMovers, getForexPulse, getCommoditiesPulse };
