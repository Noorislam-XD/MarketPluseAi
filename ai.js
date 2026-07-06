const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Swap via OPENROUTER_MODEL env var if this free slug rotates/expires.
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/**
 * Sends aggregated market data to an OpenRouter free model and gets back
 * a short, punchy market pulse summary.
 */
async function generateMarketAnalysis(marketData) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENROUTER_API_KEY missing" };
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const prompt = buildPrompt(marketData);

  try {
    const { data } = await axios.post(
      OPENROUTER_URL,
      {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a sharp, concise financial market analyst writing a daily briefing for a Telegram channel. " +
              "Use plain language, no fluff, no financial advice disclaimers. Keep it under 180 words. " +
              "Structure: 1) one-line overall mood, 2) crypto take, 3) stocks take, 4) one actionable/watchlist note."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/Noorislam-XD/MarketPulseAI",
          "X-Title": "MarketPulseAI"
        },
        timeout: 30000
      }
    );

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from model");

    return { ok: true, summary: text };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    return { ok: false, error: detail };
  }
}

function buildPrompt(marketData) {
  return `Here is today's raw market data. Write the briefing from it.\n\n${JSON.stringify(
    marketData,
    null,
    2
  )}`;
}

module.exports = { generateMarketAnalysis };
