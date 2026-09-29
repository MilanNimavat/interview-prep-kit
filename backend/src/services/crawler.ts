import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

export interface CrawledContent {
  companyUrl: string;
  pages_used: string[];
  homepageText: string;
  extraPagesText: string;
  combinedText: string;
  isAvailable: boolean;
  error: string | null;
}

const MAX_COMBINED_CHARS = 15000;
const HEURISTIC_KEYWORDS = [
  'career',
  'careers',
  'job',
  'jobs',
  'about',
  'handbook',
  'values',
  'culture',
  'team',
  'engineering',
  'tech',
];

/**
 * Validates URLs and guards against private IP access unless local URLs are explicitly allowed.
 */
export function validateUrl(urlStr: string, allowLocalOverride?: boolean): URL {
  const allowLocal =
    allowLocalOverride ??
    (process.env.ALLOW_LOCAL_URLS === 'true' ||
      process.env.NODE_ENV !== 'production');

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch (_e) {
    throw new Error(`Invalid URL format: ${urlStr}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local');

  const isPrivateIp =
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname);

  if ((isLocalHost || isPrivateIp) && !allowLocal) {
    throw new Error(`Access to private/local address ${hostname} is blocked in production.`);
  }

  return parsed;
}

/**
 * Strips script, style, header, nav, and SVG elements from HTML and extracts clean text.
 */
export function sanitizeHtml(html: string): string {
  const $ = cheerio.load(html);

  // Strip unneeded elements
  $('script, style, svg, noscript, iframe, header, footer, nav, style').remove();

  // Extract text content
  const rawText = $('body').text() || $.text();

  // Collapse whitespace
  return rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Ranks internal links discovered on homepage based on career/engineering keywords.
 */
function scoreLink(href: string, text: string): number {
  let score = 0;
  const lowerHref = href.toLowerCase();
  const lowerText = text.toLowerCase();

  for (const keyword of HEURISTIC_KEYWORDS) {
    if (lowerHref.includes(keyword)) score += 10;
    if (lowerText.includes(keyword)) score += 15;
  }

  return score;
}

/**
 * Crawls homepage and up to 2 discovered heuristic career/about/engineering pages.
 * Handles timeouts, 404s, and unreachable sites gracefully.
 */
export async function crawlCompanyWebsite(
  companyUrl: string,
  options?: { allowLocal?: boolean; timeoutMs?: number }
): Promise<CrawledContent> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const pages_used: string[] = [];

  try {
    const parsedUrl = validateUrl(companyUrl, options?.allowLocal);
    const targetUrl = parsedUrl.toString();

    const response = await axios.get(targetUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'ApexBot/1.0 (AI Interview Kit Generator)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    });

    pages_used.push(targetUrl);
    const homepageHtml = response.data;
    const homepageText = sanitizeHtml(homepageHtml);

    // Heuristic link discovery
    const $ = cheerio.load(homepageHtml);
    const candidateLinks: Array<{ url: string; score: number }> = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      if (!href) return;

      try {
        const resolved = new URL(href, targetUrl);
        // Only evaluate internal links (same hostname)
        if (resolved.hostname.toLowerCase() === parsedUrl.hostname.toLowerCase()) {
          const score = scoreLink(resolved.pathname, text);
          if (score > 0 && resolved.toString() !== targetUrl) {
            candidateLinks.push({ url: resolved.toString(), score });
          }
        }
      } catch (_e) {
        // Ignore invalid links
      }
    });

    // Deduplicate and rank links
    const uniqueRanked = Array.from(
      new Map(candidateLinks.map((item) => [item.url, item.score])).entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    const extraTexts: string[] = [];
    for (const [linkUrl] of uniqueRanked) {
      try {
        const subResponse = await axios.get(linkUrl, {
          timeout: 5000,
          headers: { 'User-Agent': 'ApexBot/1.0' },
        });
        pages_used.push(linkUrl);
        const subText = sanitizeHtml(subResponse.data);
        if (subText.length > 50) {
          extraTexts.push(subText);
        }
      } catch (_subErr) {
        // Ignore failure of individual sub-pages
      }
    }

    const extraPagesText = extraTexts.join('\n\n');
    let combinedText = `${homepageText}\n\n${extraPagesText}`.trim();

    if (combinedText.length > MAX_COMBINED_CHARS) {
      combinedText = combinedText.substring(0, MAX_COMBINED_CHARS) + '... [truncated]';
    }

    return {
      companyUrl: targetUrl,
      pages_used,
      homepageText,
      extraPagesText,
      combinedText,
      isAvailable: true,
      error: null,
    };
  } catch (err: any) {
    console.warn(`[Web Crawler] Unable to crawl ${companyUrl}: ${err.message}`);
    return {
      companyUrl,
      pages_used: [],
      homepageText: '',
      extraPagesText: '',
      combinedText: '',
      isAvailable: false,
      error: err.message || 'Website unreachable or returned an error',
    };
  }
}
