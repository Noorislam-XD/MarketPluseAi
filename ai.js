const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Only OpenRouter models with the ":free" suffix are used — no paid/credit-
// consuming models are ever called. Listed in priority order; if one is
// rate-limited or unavailable, the next is tried automatically.
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

function isFreeModel(model) {
  return typeof model === "string" && model.trim().endsWith(":free");
}

/**
 * Builds the ordered list of free models to try: an explicit OPENROUTER_MODEL
 * env var is honored only if it's a free model, then the built-in free list
 * (deduped), so a bad/paid override never gets silently used.
 */
function getModelCandidates() {
  const envModel = process.env.OPENROUTER_MODEL;
  const candidates = [];

  if (envModel) {
    if (isFreeModel(envModel)) {
      candidates.push(envModel);
    } else {
      console.warn(
        `OPENROUTER_MODEL="${envModel}" is not a free-tier model (must end in ":free") — ignoring it.`
      );
    }
  }

  for (const m of FREE_MODELS) {
    if (!candidates.includes(m)) candidates.push(m);
  }

  return candidates;
}

/**
 * Sends aggregated market data to an OpenRouter free model and gets back
 * a short, punchy market pulse summary plus a short "risks today" note.
 * Tries each free model in order until one succeeds.
 */
async function generateMarketAnalysis(marketData) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENROUTER_API_KEY missing" };
  }

  const prompt = buildPrompt(marketData);
  const candidates = getModelCandidates();

  let lastError = null;

  for (const model of candidates) {
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
      return { ok: true, summary, risks, model };
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.message;
      console.warn(`  free model "${model}" failed: ${detail}`);
      lastError = detail;
    }
  }

  return { ok: false, error: `all free models failed — last error: ${lastError}` };
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
