const axios = require("axios");

const BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * Fetches top crypto market data (no API key required).
 * Returns BTC/ETH + top gainers/losers among top 50 coins by market cap.
 */
async function getCryptoPulse() {
  try {
    const { data } = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 50,
        page: 1,
        price_change_percentage: "24h"
      },
      timeout: 10000
    });

    const btc = data.find((c) => c.id === "bitcoin");
    const eth = data.find((c) => c.id === "ethereum");

    const sorted = [...data].sort(
      (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
    );

    const topGainers = sorted.slice(0, 3).map(simplify);
    const topLosers = sorted.slice(-3).reverse().map(simplify);

    return {
      ok: true,
      btc: btc ? simplify(btc) : null,
      eth: eth ? simplify(eth) : null,
      topGainers,
      topLosers
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
