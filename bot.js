require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { getCryptoPulse } = require("./apis/coingecko");
const { getStockPulse } = require("./apis/finnhub");
const { getMarketMovers } = require("./apis/alphavantage");
const { getTopNews } = require("./apis/news");
const { getFearGreedIndex } = require("./apis/feargreed");
const { generateMarketAnalysis } = require("./ai");
const { formatPulseMessage } = require("./formatter");

const HISTORY_PATH = path.join(__dirname, "history.json");

async function run() {
  console.log("MarketPulseAI: fetching data...");

  const [crypto, stocks, movers, news, fearGreed] = await Promise.all([
    getCryptoPulse(),
    getStockPulse(),
    getMarketMovers(),
    getTopNews(),
    getFearGreedIndex()
  ]);

  logStatus("CoinGecko", crypto);
  logStatus("Finnhub", stocks);
  logStatus("AlphaVantage", movers);
  logStatus("NewsAPI", news);
  logStatus("Fear&Greed", fearGreed);

  console.log("MarketPulseAI: running AI analysis...");
  const aiSummary = await generateMarketAnalysis({ crypto, stocks, movers, news, fearGreed });
  logStatus("AI (OpenRouter)", aiSummary);

  const date = new Date().toISOString().slice(0, 10);
  const message = formatPulseMessage({ date, crypto, stocks, movers, news, fearGreed, aiSummary });

  await sendToTelegram(message);
  appendHistory({ date, aiSummary: aiSummary.ok ? aiSummary.summary : null });

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
      parse_mode: "Markdown",
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
