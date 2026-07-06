const axios = require("axios");

const NEWSAPI_URL = "https://newsapi.org/v2/top-headlines";

// Keyless RSS/Atom feeds tried in order when NEWS_API_KEY is absent or the primary call fails.
const RSS_FEEDS = [
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    source: "MarketWatch"
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
    source: "CNBC"
  },
  {
    url: "https://finance.yahoo.com/news/rssindex",
    source: "Yahoo Finance"
  }
];

/** Decode common XML/HTML entities so titles render cleanly in Telegram. */
function decodeEntities(str) {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gi, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * Extracts text from a tag that may be plain text or CDATA-wrapped.
 * Returns the decoded string, or null if no match.
 */
function extractText(block, tag) {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
    "i"
  );
  const m = re.exec(block);
  if (!m) return null;
  return decodeEntities((m[1] ?? m[2] ?? "").trim());
}

/**
 * Extracts a URL from either an RSS <link> text node or an Atom <link href="..."> element.
 */
function extractLink(block) {
  // Atom: <link ... href="..." /> or <link href='...' ...>
  const attrMatch = /<link[^>]+href=["']([^"']+)["']/i.exec(block);
  if (attrMatch) return decodeEntities(attrMatch[1].trim());

  // RSS 2.0: <link>https://...</link>  (may be CDATA but rarely is)
  const textMatch = /<link>([\s\S]*?)<\/link>/i.exec(block);
  if (textMatch) return decodeEntities(textMatch[1].trim());

  return null;
}

/**
 * Parses up to `limit` headlines from an RSS 2.0 or Atom feed XML string.
 * Supports both <item> (RSS) and <entry> (Atom) container elements.
 */
function parseRss(xml, defaultSource, limit = 5) {
  const headlines = [];

  // Match both RSS <item> and Atom <entry> blocks
  const blockRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m;
  while ((m = blockRe.exec(xml)) !== null && headlines.length < limit) {
    const block = m[1];
    const title = extractText(block, "title");
    const url = extractLink(block);
    if (title && url) {
      headlines.push({ title, url, source: defaultSource });
    }
  }
  return headlines;
}

/** Try each RSS/Atom feed in order; return the first that yields headlines. */
async function fetchRssFallback() {
  const errors = [];
  for (const feed of RSS_FEEDS) {
    try {
      const { data } = await axios.get(feed.url, {
        timeout: 10000,
        headers: { "User-Agent": "MarketPulseAI/2.0 RSS reader" }
      });
      const headlines = parseRss(data, feed.source);
      if (headlines.length > 0) {
        return { ok: true, headlines, via: "rss" };
      }
      errors.push(`${feed.source}: 0 items parsed`);
    } catch (err) {
      errors.push(`${feed.source}: ${err.message}`);
    }
  }
  return { ok: false, error: `all RSS feeds failed — ${errors.join("; ")}` };
}

/**
 * Fetches top business/finance headlines.
 *
 * Primary:  NewsAPI  (requires NEWS_API_KEY — free tier: https://newsapi.org/register)
 * Fallback: keyless RSS/Atom from MarketWatch → CNBC → Yahoo Finance
 */
async function getTopNews() {
  const apiKey = process.env.NEWS_API_KEY;

  if (apiKey) {
    try {
      const { data } = await axios.get(NEWSAPI_URL, {
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

      if (headlines.length > 0) {
        return { ok: true, headlines };
      }
      // Key present but returned nothing — fall through to RSS
    } catch (_) {
      // API error — fall through to RSS
    }
  }

  return fetchRssFallback();
}

module.exports = { getTopNews };
