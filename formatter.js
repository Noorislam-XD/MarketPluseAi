/**
 * Formats aggregated data + AI summary into a Telegram HTML message,
 * matching the fixed section order of the Market Brief template.
 */
function formatPulseMessage({
  briefType,
  date,
  indices,
  crypto,
  forex,
  commodities,
  movers,
  news,
  aiSummary,
  calendar
}) {
  const lines = [];

  lines.push(`<b>${escape(briefType || "🌍 Market Brief")} — ${escape(date)}</b>`);
  lines.push("");

  // US Markets
  lines.push("<b>🇺🇸 US Markets</b>");
  if (indices?.ok) {
    indices.us.forEach((i) => lines.push(indexLine(i)));
  } else {
    lines.push(escape(`unavailable (${indices?.error || "unknown error"})`));
  }
  lines.push("");

  // Indian Markets
  lines.push("<b>🇮🇳 Indian Markets</b>");
  if (indices?.ok) {
    indices.india.forEach((i) => lines.push(indexLine(i)));
  } else {
    lines.push(escape(`unavailable (${indices?.error || "unknown error"})`));
  }
  lines.push("");

  // Crypto
  lines.push("<b>₿ Crypto</b>");
  if (crypto?.ok) {
    [crypto.btc, crypto.eth, crypto.sol, crypto.xrp].filter(Boolean).forEach((c) => {
      lines.push(`${escape(c.symbol)}: $${fmt(c.price)} (${pct(c.change24h)})`);
    });
  } else {
    lines.push(escape(`unavailable (${crypto?.error || "unknown error"})`));
  }
  lines.push("");

  // Forex
  lines.push("<b>💵 Forex</b>");
  if (forex?.ok) {
    forex.pairs.forEach((p) => {
      lines.push(`${escape(p.label)}: ${p.rate ? fmt(p.rate) : "N/A"}`);
    });
  } else {
    lines.push(escape(`unavailable (${forex?.error || "unknown error"})`));
  }
  lines.push("");

  // Commodities
  lines.push("<b>🥇 Commodities</b>");
  if (commodities?.ok) {
    [commodities.gold, commodities.silver, commodities.crudeOil].filter(Boolean).forEach((c) => {
      lines.push(`${escape(c.label)}: ${c.value ? fmt(c.value) : "N/A"} ${escape(c.unit)}`);
    });
  } else {
    lines.push(escape(`unavailable (${commodities?.error || "unknown error"})`));
  }
  lines.push("");

  // Top Movers
  lines.push("<b>🔥 Top Movers</b>");
  if (movers?.ok) {
    if (movers.topGainers?.length) {
      lines.push(
        `Gainers: ${movers.topGainers.map((s) => `${escape(s.ticker)} ${escape(s.changePct)}`).join(", ")}`
      );
    }
    if (movers.topLosers?.length) {
      lines.push(
        `Losers: ${movers.topLosers.map((s) => `${escape(s.ticker)} ${escape(s.changePct)}`).join(", ")}`
      );
    }
  } else {
    lines.push(escape(`unavailable (${movers?.error || "unknown error"})`));
  }
  lines.push("");

  // Top News
  lines.push("<b>📰 Top News</b>");
  if (news?.ok && news.headlines.length) {
    news.headlines.forEach((h) => {
      lines.push(`• <a href="${escapeHTMLAttr(h.url)}">${escape(h.title)}</a>`);
    });
  } else {
    lines.push(escape(`unavailable (${news?.error || "unknown error"})`));
  }
  lines.push("");

  // AI Summary
  lines.push("<b>🤖 AI Summary</b>");
  if (aiSummary?.ok) {
    lines.push(escape(aiSummary.summary));
  } else {
    lines.push(escape(`unavailable (${aiSummary?.error || "unknown error"})`));
  }
  lines.push("");

  // Risks Today
  lines.push("<b>⚠️ Risks Today</b>");
  if (aiSummary?.ok && aiSummary.risks) {
    lines.push(escape(aiSummary.risks));
  } else {
    lines.push(escape("no notable risks flagged"));
  }
  lines.push("");

  // Economic Calendar
  lines.push("<b>📅 Economic Calendar</b>");
  if (calendar?.ok && calendar.events.length) {
    calendar.events.forEach((e) => {
      lines.push(
        `• ${escape(e.time || "")} ${escape(e.country || "")} — ${escape(e.event)} (${escape(e.impact)})`
      );
    });
  } else if (calendar?.ok) {
    lines.push(escape("no major events scheduled today"));
  } else {
    lines.push(escape(`unavailable (${calendar?.error || "unknown error"})`));
  }

  return lines.join("\n");
}

function indexLine(i) {
  if (!i.ok) return `📈 ${escape(i.label)}: unavailable`;
  return `📈 ${escape(i.label)}: ${fmt(i.price)} (${pct(i.changePct)})`;
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

// Escapes characters for Telegram HTML parse_mode
function escape(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHTMLAttr(str = "") {
  return String(str).replace(/"/g, "&quot;");
}

module.exports = { formatPulseMessage };
