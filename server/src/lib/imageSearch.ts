import dotenv from "dotenv";

dotenv.config();

interface ImageSearchResult {
  url: string;
  title: string;
  license: string;
  artist: string;
}

const cache = new Map<string, string | null>();

/**
  * Checks if the image title or metadata is relevant to the search query keywords.
  */
function isImageRelevant(query: string, title: string): boolean {
  // Extract core keywords (words > 2 chars, excluding search helper terms)
  const queryWords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^(for|class|grade|simple|labeled|labelled|diagram|illustration|photo|drawing|figure|chart|map|timeline)$/i.test(w));
  
  if (queryWords.length === 0) return true; // Fallback if no specific keywords

  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  
  // Verify that at least one of the main query keywords is present in the image title
  return queryWords.some(word => cleanTitle.includes(word));
}

/**
  * Download image bytes from the given URL and return them as a base64 data URL.
  */
export async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GuruShaktiAI/1.0 (contact@copy.com; educational platform)"
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error(`[Image Search] Download error for ${url}:`, err);
    return null;
  }
}

async function executeSearch(query: string): Promise<ImageSearchResult | null> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `filetype:bitmap|drawing ${query}`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "8"); // inspect up to 8 candidates for relevance
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime|extmetadata");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "GuruShaktiAI/1.0 (contact@copy.com; educational platform)"
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`[Image Search] Wikimedia returned status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as any;
    const pages = data.query?.pages;
    if (!pages) {
      return null;
    }

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const info = page.imageinfo?.[0];
      
      if (info && info.url && info.mime?.startsWith("image/")) {
        const title = page.title || "Image";
        
        // Validate relevance of the visual before accepting it
        if (isImageRelevant(query, title)) {
          return {
            url: info.url,
            title,
            license: info.extmetadata?.LicenseShortName?.value || "Public Domain/CC",
            artist: info.extmetadata?.Artist?.value || "Unknown",
          };
        } else {
          console.log(`[Image Search] Image rejected due to relevance validation: "${title}" for query "${query}"`);
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`[Image Search] Error searching Wikimedia for "${query}":`, error);
    return null;
  }
}

export async function searchImage(query: string): Promise<ImageSearchResult | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  // 1. Try original query
  let result = await executeSearch(cleanQuery);

  // 2. If no results, try relaxed query
  if (!result) {
    const relaxed = cleanQuery
      .replace(/for\s+(class|grade)\s+\d+/gi, "")
      .replace(/(class|grade)\s+\d+/gi, "")
      .replace(/for\s+(kids|children|students|teachers)/gi, "")
      .replace(/\b(simple|basic|labelled|labeled|educational|classroom|vector)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (relaxed && relaxed.toLowerCase() !== cleanQuery.toLowerCase()) {
      console.log(`[Image Search] Retrying relaxed query: "${relaxed}"`);
      result = await executeSearch(relaxed);
    }
  }

  // 3. Fallback to core terms if still no results
  if (!result) {
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      const visualType = words.find(w => 
        /^(diagram|map|chart|graph|timeline|illustration|drawing|figure)$/i.test(w)
      ) || "";
      const fallbackQuery = `${words.slice(0, 2).join(" ")} ${visualType}`.trim();
      if (fallbackQuery.toLowerCase() !== cleanQuery.toLowerCase()) {
        console.log(`[Image Search] Retrying fallback query: "${fallbackQuery}"`);
        result = await executeSearch(fallbackQuery);
      }
    }
  }

  return result;
}

export async function resolveImagePlaceholders(content: string): Promise<string> {
  const regex = /!\[IMAGE_SEARCH:\s*(.*?)\]\((.*?)\)/gi;
  const placeholders: { raw: string; query: string }[] = [];
  let match;

  const parseRegex = new RegExp(regex);
  while ((match = parseRegex.exec(content)) !== null) {
    if (match[1]) {
      placeholders.push({ raw: match[0], query: match[1].trim() });
    }
  }

  if (placeholders.length === 0) return content;

  let resolved = content;

  // Resolve all images concurrently
  const searchPromises = placeholders.map(async (p) => {
    // Check cache first to avoid duplicate requests
    if (cache.has(p.query)) {
      const cachedDataUrl = cache.get(p.query);
      return { raw: p.raw, replacement: cachedDataUrl ? `![${p.query}](${cachedDataUrl})` : "" };
    }

    const image = await searchImage(p.query);
    if (image) {
      const dataUrl = await downloadImageAsBase64(image.url);
      if (dataUrl) {
        cache.set(p.query, dataUrl);
        const cleanTitle = image.title
          .replace(/^File:/, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]/g, " ")
          .trim();
        const attribution = `![${cleanTitle} (${image.license})](${dataUrl})`;
        return { raw: p.raw, replacement: attribution };
      }
    }
    // If search or download failed, remove placeholder to avoid broken image markup
    cache.set(p.query, null);
    return { raw: p.raw, replacement: "" };
  });

  const replacements = await Promise.all(searchPromises);
  for (const r of replacements) {
    resolved = resolved.replace(r.raw, r.replacement);
  }

  return resolved;
}
