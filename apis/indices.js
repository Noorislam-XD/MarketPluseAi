const axios = require("axios");

// No API key required — uses Yahoo Finance's public quote endpoint.
// Finnhub's free tier does not reliably cover Indian indices (NIFTY/BANKNIFTY/Sensex),
// so we use one consistent source for both US and Indian indices.
const INDICES = [
  { symbol: "^GSPC", label: "S&P 500", group: "us" },
  { symbol: "^IXIC", label: "Nasdaq", group: "us" },
  { symbol: "^DJI", label: "Dow", group: "us" },
  { symbol: "^NSEI", label: "NIFTY", group: "in" },
  { symbol: "^NSEBANK", label: "BANKNIFTY", group: "in" },
  { symbol: "^BSESN", label: "Sensex", group: "in" }
];

async function getIndexPulse() {
  const results = await Promise.all(
    INDICES.map(async (idx) => {
      try {
        const { data } = await axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}`,
          { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } }
        );

        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice === undefined) {
          throw new Error("no data");
        }

        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose;
        const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

        return { ...idx, ok: true, price, changePct };
      } catch (err) {
        return { ...idx, ok: false, error: err.message };
      }
    })
  );

  const us = results.filter((r) => r.group === "us");
  const india = results.filter((r) => r.group === "in");
  const anyOk = results.some((r) => r.ok);

  return { ok: anyOk, us, india };
}

module.exports = { getIndexPulse };
