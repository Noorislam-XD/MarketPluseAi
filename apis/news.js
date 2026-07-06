const axios = require("axios");

const BASE_URL = "https://newsapi.org/v2/top-headlines";

/**
 * Fetches top business/finance headlines.
 * Requires NEWS_API_KEY (free tier: https://newsapi.org/register)
 */
async function getTopNews() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "NEWS_API_KEY missing" };
  }

  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        category: "business",
        language: "en",
        pageSize: 5,
        apiKey
      },
      timeout: 10000
    });

    const headlines = (data.articles || []).map((a) => ({
      title: a.title,
      source: a.source?.name,
      url: a.url
    }));

    return { ok: true, headlines };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getTopNews };
