/**
 * Real-image support for the PPT Presentation tool.
 *
 * Images are sourced from Wikimedia Commons via its public API — a large,
 * free-to-reuse library of CC-licensed and public-domain photos and
 * educational illustrations. The API needs no key and serves proper CORS
 * headers from the browser (verified: `access-control-allow-origin: *` on
 * both api.php and the image host upload.wikimedia.org).
 *
 * The flow per slide: search Commons for the topic, pick the best
 * high-resolution candidate (skipping tiny / irrelevant / non-photo files),
 * download the actual image bytes, and return them as a data URL so the
 * image is embedded INSIDE the .pptx (works offline) rather than linked.
 */

export interface WikimediaImage {
  /** base64 data URL of the downloaded image bytes (embedded in the pptx). */
  dataUrl: string;
  /** Human-readable artist/author name. */
  artist: string;
  /** Short license name, e.g. "CC BY-SA 4.0". */
  license: string;
  /** License deed URL (attribution). */
  licenseUrl: string;
  /** Commons file page (source). */
  pageUrl: string;
  /** Short human description of the image. */
  description: string;
}

const API = "https://commons.wikimedia.org/w/api.php";
const THUMB_WIDTH = 1400; // high-res thumbnail — plenty for a 5" slide image
const MAX_BYTES = 10 * 1024 * 1024;

/** Only embed common photo/illustration formats (excludes djvu/pdf/tiff/svg). */
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Wikimedia requires a descriptive User-Agent. Browsers send their own (the
// header is silently ignored if set), while Node/undici defaults are blocked.
const UA_HEADERS = {
  "User-Agent": "GuruShaktiAI/1.0 (classroom presentation image lookup; https://gurushakti.ai)",
  "Accept": "application/json, image/*;q=0.9, */*;q=0.8",
};

function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

interface Candidate {
  title: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  artist: string;
  license: string;
  licenseUrl: string;
  pageUrl: string;
  description: string;
}

function toCandidate(
  title: string,
  info: {
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  },
): Candidate | null {
  if (!info.thumburl || !info.width) return null;
  const md = info.extmetadata ?? {};
  const artist = stripHtml(md.Artist?.value) || "Unknown";
  const license = stripHtml(md.LicenseShortName?.value) || "";
  const licenseUrl = stripHtml(md.LicenseUrl?.value) || "";
  const description =
    stripHtml(md.ImageDescription?.value) || stripHtml(md.ObjectName?.value) || "";
  return {
    title,
    thumbUrl: info.thumburl,
    width: info.width,
    height: info.height ?? 0,
    mime: info.mime ?? "",
    artist,
    license,
    licenseUrl,
    pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${title}`,
    description,
  };
}

function rank(c: Candidate): number {
  let score = 0;
  if (c.width >= 1000) score += 3;
  else if (c.width >= 800) score += 2;
  else if (c.width >= 600) score += 1;
  if (c.mime === "image/jpeg" || c.mime === "image/png") score += 2;
  if (c.mime === "image/gif") score -= 1;
  if (c.license) score += 1;
  return score;
}

/** Skip obvious non-content files (icons, flags, logos, coats of arms). */
const IRRELEVANT_TITLE = /(flag|coat of arms|logo|icon|seal of|map of .* locator)/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: UA_HEADERS, signal: AbortSignal.timeout(25_000) });
    } catch {
      return null;
    }
    // Wikimedia rate-limits bursts (429) — wait once and retry.
    if (res.status === 429 || res.status >= 500) {
      if (attempt === 0) {
        await sleep(1500);
        continue;
      }
      return null;
    }
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const blob = await res.blob();
    if (blob.size < 1024 || blob.size > MAX_BYTES) return null;
    return blobToDataUrl(blob);
  }
  return null;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

function sanitizeQuery(query: string): string {
  return query
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Search Wikimedia Commons for the best free-to-reuse image matching `query`
 * and download it. Returns null when nothing suitable is found.
 * `usedUrls` (shared across slides) prevents the same photo being reused
 * on several slides of one deck.
 */
export async function searchWikimediaImage(
  query: string,
  usedUrls: Set<string> = new Set(),
): Promise<WikimediaImage | null> {
  const q = sanitizeQuery(query);
  if (!q) return null;

  let candidates: Candidate[] = [];
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: "6",
      gsrlimit: "10",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
    });
    const res = await fetch(`${API}?${params.toString()}`, {
      headers: UA_HEADERS,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { title?: string; imageinfo?: { thumburl?: string; width?: number; height?: number; mime?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }
        >;
      };
    };
    const pages = data.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const cand = toCandidate(page.title ?? "", page.imageinfo?.[0] ?? {});
      if (cand) candidates.push(cand);
    }
  } catch {
    return null;
  }

  candidates = candidates
    .filter(
      (c) =>
        c.thumbUrl.length > 0 &&
        c.width >= 600 &&
        ACCEPTED_MIME.has(c.mime) &&
        !IRRELEVANT_TITLE.test(c.title) &&
        !usedUrls.has(c.thumbUrl),
    )
    .sort((a, b) => rank(b) - rank(a));

  const tries = Math.min(4, candidates.length);
  for (let i = 0; i < tries; i++) {
    // Small gap between downloads keeps us under Wikimedia's rate limits.
    if (i > 0) await sleep(600);
    try {
      const dataUrl = await downloadImage(candidates[i].thumbUrl);
      if (!dataUrl) continue;
      usedUrls.add(candidates[i].thumbUrl);
      return {
        dataUrl,
        artist: candidates[i].artist,
        license: candidates[i].license || "Free license",
        licenseUrl: candidates[i].licenseUrl,
        pageUrl: candidates[i].pageUrl,
        description: candidates[i].description.slice(0, 160),
      };
    } catch {
      // try the next candidate
    }
  }
  return null;
}
