const axios = require("axios");

const BASE_URL = "https://www.alphavantage.co/query";

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

module.exports = { getMarketMovers };
