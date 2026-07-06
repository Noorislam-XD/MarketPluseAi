const axios = require("axios");

const BASE_URL = "https://api.coingecko.com/api/v3";
const COIN_IDS = ["bitcoin", "ethereum", "solana", "ripple"];

/**
 * Fetches BTC, ETH, SOL, XRP market data (no API key required).
 */
async function getCryptoPulse() {
  try {
    const { data } = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        ids: COIN_IDS.join(","),
        order: "market_cap_desc",
        price_change_percentage: "24h"
      },
      timeout: 10000
    });

    const byId = Object.fromEntries(data.map((c) => [c.id, simplify(c)]));

    return {
      ok: true,
      btc: byId.bitcoin || null,
      eth: byId.ethereum || null,
      sol: byId.solana || null,
      xrp: byId.ripple || null
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function simplify(coin) {
  return {
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    price: coin.current_price,
    change24h: coin.price_change_percentage_24h
  };
}

module.exports = { getCryptoPulse };
