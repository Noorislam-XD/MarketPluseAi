/**
 * Formats aggregated data + AI summary into a Telegram MarkdownV2-safe message.
 */
function formatPulseMessage({ date, crypto, stocks, movers, forex, commodities, news, fearGreed, aiSummary }) {
  const lines = [];

  lines.push(`*📊 MarketPulseAI — ${escape(date)}*`);
  lines.push("");

  // AI summary block
  if (aiSummary?.ok) {
    lines.push(`_${escape(aiSummary.summary)}_`);
    lines.push("");
  }

  // Crypto section
  lines.push("*🪙 Crypto*");
  if (crypto?.ok) {
    if (crypto.btc) lines.push(`BTC: $${fmt(crypto.btc.price)} (${pct(crypto.btc.change24h)})`);
    if (crypto.eth) lines.push(`ETH: $${fmt(crypto.eth.price)} (${pct(crypto.eth.change24h)})`);
    if (crypto.topGainers?.length) {
      lines.push(
        `Top gainers: ${crypto.topGainers.map((c) => `${c.symbol} ${pct(c.change24h)}`).join(", ")}`
      );
    }
    if (crypto.topLosers?.length) {
      lines.push(
        `Top losers: ${crypto.topLosers.map((c) => `${c.symbol} ${pct(c.change24h)}`).join(", ")}`
      );
    }
  } else {
    lines.push(escape(`unavailable (${crypto?.error || "unknown error"})`));
  }
  lines.push("");

  // Fear & Greed
  lines.push("*😨 Fear & Greed (Crypto)*");
  if (fearGreed?.ok) {
    lines.push(`${fearGreed.value}/100 — ${escape(fearGreed.label)}`);
  } else {
    lines.push(escape(`unavailable (${fearGreed?.error || "unknown error"})`));
  }
  lines.push("");

  // Stocks section
  lines.push("*📈 Stocks (Indices)*");
  if (stocks?.ok) {
    stocks.indices.forEach((i) => {
      lines.push(`${escape(i.symbol)}: $${fmt(i.price)} (${pct(i.changePct)})`);
    });
  } else {
    lines.push(escape(`unavailable (${stocks?.error || "unknown error"})`));
  }
  lines.push("");

  // Forex section
  lines.push("*💱 Forex*");
  if (forex?.ok) {
    forex.pairs.forEach((p) => {
      lines.push(`${escape(p.label)}: ${p.rate ? fmt(p.rate) : "N/A"}`);
    });
  } else {
    lines.push(escape(`unavailable (${forex?.error || "unknown error"})`));
  }
  lines.push("");

  // Commodities section
  lines.push("*🛢️ Commodities*");
  if (commodities?.ok) {
    commodities.commodities.forEach((c) => {
      lines.push(`${escape(c.label)}: ${c.value ? fmt(c.value) : "N/A"} ${escape(c.unit)}`);
    });
  } else {
    lines.push(escape(`unavailable (${commodities?.error || "unknown error"})`));
  }
  lines.push("");

  // Movers section
  lines.push("*🔥 Market Movers*");
  if (movers?.ok) {
    if (movers.topGainers?.length) {
      lines.push(
        `Gainers: ${movers.topGainers.map((s) => `${s.ticker} ${escape(s.changePct)}`).join(", ")}`
      );
    }
    if (movers.topLosers?.length) {
      lines.push(
        `Losers: ${movers.topLosers.map((s) => `${s.ticker} ${escape(s.changePct)}`).join(", ")}`
      );
    }
  } else {
    lines.push(escape(`unavailable (${movers?.error || "unknown error"})`));
  }
  lines.push("");

  // News section
  lines.push("*📰 Headlines*");
  if (news?.ok && news.headlines.length) {
    news.headlines.forEach((h) => {
      lines.push(`• [${escape(h.title)}](${h.url})`);
    });
  } else {
    lines.push(escape(`unavailable (${news?.error || "unknown error"})`));
  }

  return lines.join("\n");
}

function fmt(num) {
  if (num === undefined || num === null || isNaN(num)) return "N/A";
  return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(num) {
  if (num === undefined || num === null || isNaN(num)) return "N/A";
  const n = Number(num);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// Escapes Telegram MarkdownV2 reserved characters, but we're using legacy
// Markdown (parse_mode: "Markdown") in bot.js to keep this simple, so we
// only need to escape underscores/asterisks/brackets that aren't intentional.
function escape(str = "") {
  return String(str).replace(/([_*`\[\]])/g, "\\$1");
}

module.exports = { formatPulseMessage };
