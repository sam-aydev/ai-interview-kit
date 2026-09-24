import * as cheerio from "cheerio";
import dns from "dns/promises";
import robotsParser from "robots-parser";

export interface CrawlResult {
  pages_used: string[];
  scraped_text: string;
  errors: string[];
}

const CRAWL_DELAY_MS = 600;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;

// Helper: Polite sleep
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Security Layer (SSRF Protection)
async function isSafeUrl(
  targetUrl: string,
  env: "production" | "batch",
): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    // Allow local mock servers in Section 9 batch evaluation
    if (env === "batch") return true;

    const addresses = await dns.resolve(parsed.hostname);
    for (const ip of addresses) {
      if (
        /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip) ||
        ip === "::1"
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// robots.txt Compliance Layer
async function isAllowedByRobots(
  url: string,
  env: "production" | "batch",
): Promise<boolean> {
  if (env === "batch") return true;

  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "AI-Prep-Kit-Crawler/1.0" },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return true;

    const text = await res.text();
    const robots = (robotsParser as any)(robotsUrl, text);
    return robots.isAllowed(url, "AI-Prep-Kit-Crawler/1.0") ?? true;
  } catch {
    return true;
  }
}

// Resilient Network Layer with Exponential Backoff
async function fetchSafeWithBackoff(
  url: string,
  env: "production" | "batch",
): Promise<string | null> {
  if (!(await isSafeUrl(url, env))) {
    throw new Error(`URL failed security check (SSRF protection): ${url}`);
  }

  const allowed = await isAllowedByRobots(url, env);
  if (!allowed) {
    throw new Error(`Crawling disallowed by robots.txt: ${url}`);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
      });

      // Handle rate limits or temporary server errors with backoff
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw new Error(
          `HTTP ${response.status} (Rate limited / Server error)`,
        );
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("text/plain")
      ) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const html = await response.text();
      if (html.length > 3_000_000) throw new Error("Payload exceeds 3MB limit");

      return html;
    } catch (err: any) {
      if (attempt === MAX_RETRIES) throw err;
      await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

//  HTML Text Extraction
function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  $(
    "script, style, nav, footer, header, aside, svg, img, form, noscript, iframe",
  ).remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

// Heuristic Link Scoring (Accounts for Handbooks, Tech Blogs, & ATS)
function getTopCandidateLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const candidates = new Map<string, { url: string; score: number }>();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const linkText = $(el).text().toLowerCase().trim();
    if (!href) return;

    try {
      const resolvedUrl = new URL(href, baseUrl).href;

      // Exclude authentication, billing, and legal boilerplate
      if (
        resolvedUrl.match(
          /\/(login|signup|cart|legal|terms|privacy|cookie|auth|password|billing)/i,
        )
      ) {
        return;
      }

      let score = 0;

      // Primary targets: Careers, Hiring, Handbooks, Interview process
      if (
        resolvedUrl.match(
          /\/(careers|jobs|vacancies|hiring|how-we-hire|interview-process)/i,
        )
      )
        score += 60;
      if (resolvedUrl.match(/\/(handbook|culture|about|company|values|team)/i))
        score += 35;
      if (
        resolvedUrl.match(
          /\/blog\/.*(engineering|tech|interview|architecture)/i,
        )
      )
        score += 25;
      if (
        resolvedUrl.match(
          /(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com)/i,
        )
      )
        score += 70;

      // Anchor text cues
      if (
        linkText.match(
          /(how we hire|interview process|hiring process|our interview)/i,
        )
      )
        score += 60;
      if (
        linkText.match(
          /(join us|careers|open positions|view jobs|work with us)/i,
        )
      )
        score += 40;
      if (
        linkText.match(
          /(handbook|our values|culture|life at|engineering blog)/i,
        )
      )
        score += 25;

      if (score > 0) {
        const existing = candidates.get(resolvedUrl);
        if (!existing || existing.score < score) {
          candidates.set(resolvedUrl, { url: resolvedUrl, score });
        }
      }
    } catch {}
  });

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.url);
}

//  Public Discussion Search (DuckDuckGo -> Reddit)
async function searchPublicDiscussion(
  companyName: string,
  env: "production" | "batch",
): Promise<string> {
  if (env === "batch") return "";

  const query = `site:reddit.com "${companyName}" interview process`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchSafeWithBackoff(url, env);
    if (!response) return "No public discussion found.";

    const $ = cheerio.load(response);
    let discussions = "";

    $(".result__snippet").each((i, el) => {
      if (i < 3) discussions += `- ${$(el).text().trim()}\n`;
    });

    return discussions.length > 0
      ? discussions
      : "No relevant public interview discussions found.";
  } catch (err: any) {
    return `Public discussion search skipped: ${err.message}`;
  }
}

// Crawler Orchestrator
export async function crawlCompany(
  baseUrl: string,
  env: "production" | "batch" = "production",
): Promise<CrawlResult> {
  const result: CrawlResult = {
    pages_used: [],
    scraped_text: "",
    errors: [],
  };

  let companyName = "the company";
  try {
    const parsedUrl = new URL(baseUrl);
    companyName =
      parsedUrl.hostname.replace("www.", "").split(".")[0] || "the company";
  } catch {
    /* ignore fallback */
  }

  try {
    // Fetch base homepage
    const homeHtml = await fetchSafeWithBackoff(baseUrl, env);
    if (!homeHtml) throw new Error("Empty response from homepage");

    result.pages_used.push(baseUrl);
    result.scraped_text +=
      `\n--- SOURCE: ${baseUrl} ---\n` + extractCleanText(homeHtml);

    // Discover and fetch top candidate links
    const candidateLinks = getTopCandidateLinks(homeHtml, baseUrl);
    for (const link of candidateLinks) {
      if (result.pages_used.includes(link)) continue;

      // Respect rate limits with a small pause between secondary pages
      await sleep(CRAWL_DELAY_MS);

      try {
        const linkHtml = await fetchSafeWithBackoff(link, env);
        if (linkHtml) {
          result.pages_used.push(link);
          result.scraped_text +=
            `\n--- SOURCE: ${link} ---\n` + extractCleanText(linkHtml);
        }
      } catch (err: any) {
        result.errors.push(`Skipped link ${link}: ${err.message}`);
      }
    }

    // Search public discussion
    const discussions = await searchPublicDiscussion(companyName, env);
    result.scraped_text += `\n--- PUBLIC DISCUSSION (${companyName}) ---\n${discussions}`;
  } catch (err: any) {
    result.errors.push(`Base crawl skipped: ${err.message}`);
  }

  // Cap scraped context (~20k chars) to preserve LLM token limits
  result.scraped_text = result.scraped_text.slice(0, 20000);

  return result;
}
