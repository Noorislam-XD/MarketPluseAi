const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Swap via OPENROUTER_MODEL env var if this free slug rotates/expires.
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/**
 * Sends aggregated market data to an OpenRouter free model and gets back
 * a short, punchy market pulse summary plus a short "risks today" note.
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
              "You are a sharp, concise financial market analyst writing a briefing for a Telegram channel " +
              `titled "${marketData.briefType || "Market Brief"}". Cover US markets, Indian markets, crypto, ` +
              "forex, and commodities data provided. Use plain language, no fluff, no financial advice disclaimers. " +
              "Respond in EXACTLY this format, with no extra headers or commentary:\n" +
              "SUMMARY: <a punchy paragraph under 120 words covering overall mood, US markets, Indian markets, crypto>\n" +
              "RISKS: <one or two sentences on the key risk(s) or thing(s) to watch today>"
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 450,
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

    const { summary, risks } = parseAnalysis(text);
    return { ok: true, summary, risks };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    return { ok: false, error: detail };
  }
}

function parseAnalysis(text) {
  const riskIdx = text.indexOf("RISKS:");
  if (riskIdx === -1) {
    return { summary: text.replace(/^SUMMARY:\s*/i, "").trim(), risks: null };
  }

  const summaryPart = text.slice(0, riskIdx).replace(/^SUMMARY:\s*/i, "").trim();
  const risksPart = text.slice(riskIdx + "RISKS:".length).trim();
  return { summary: summaryPart, risks: risksPart };
}

function buildPrompt(marketData) {
  return `Here is today's raw market data. Write the briefing from it.\n\n${JSON.stringify(
    marketData,
    null,
    2
  )}`;
}

module.exports = { generateMarketAnalysis };
