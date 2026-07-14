require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { getCryptoPulse } = require("./apis/coingecko");
const { getIndexPulse } = require("./apis/indices");
const { getMarketMovers, getForexPulse, getCommoditiesPulse } = require("./apis/alphavantage");
const { getTopNews } = require("./apis/news");
const { getEconomicCalendar } = require("./apis/calendar");
const { generateMarketAnalysis } = require("./ai");
const { formatPulseMessage } = require("./formatter");

const HISTORY_PATH = path.join(__dirname, "history.json");

async function run() {
  const briefType = process.env.BRIEF_TYPE || "🌍 Market Brief";
  console.log(`MarketPulseAI: fetching data for "${briefType}"...`);

  const [crypto, indices, movers, forex, commodities, news, calendar] = await Promise.all([
    getCryptoPulse(),
    getIndexPulse(),
    getMarketMovers(),
    getForexPulse(),
    getCommoditiesPulse(),
    getTopNews(),
    getEconomicCalendar()
  ]);

  logStatus("CoinGecko", crypto);
  logStatus("Indices (Yahoo)", indices);
  logStatus("AlphaVantage (Movers)", movers);
  logStatus("AlphaVantage (Forex)", forex);
  logStatus("AlphaVantage (Commodities)", commodities);
  logStatus("NewsAPI", news);
  logStatus("Finnhub (Calendar)", calendar);

  console.log("MarketPulseAI: running AI analysis...");
  const aiSummary = await generateMarketAnalysis({
    briefType,
    crypto,
    indices,
    movers,
    forex,
    commodities,
    news,
    calendar
  });
  logStatus("AI (OpenRouter)", aiSummary);

  const date = new Date().toISOString().slice(0, 10);
  const message = formatPulseMessage({
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
  });

  await sendToTelegram(message);
  appendHistory({ date, briefType, aiSummary: aiSummary.ok ? aiSummary.summary : null });

  console.log("MarketPulseAI: done.");
}

async function sendToTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — printing message instead:\n");
    console.log(message);
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
    console.log("Sent to Telegram.");
  } catch (err) {
    console.error("Telegram send failed:", err.response?.data || err.message);
  }
}

function appendHistory(entry) {
  let history = { posts: [] };
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
  } catch (_) {
    // file missing or malformed, start fresh
  }

  history.posts.push(entry);
  // keep last 90 days only
  history.posts = history.posts.slice(-90);

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function logStatus(name, result) {
  if (result?.ok) {
    console.log(`  ✓ ${name} OK`);
  } else {
    console.warn(`  ✗ ${name} failed: ${result?.error}`);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
