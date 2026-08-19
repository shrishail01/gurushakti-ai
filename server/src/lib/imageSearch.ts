import dotenv from "dotenv";

dotenv.config();

interface ImageSearchResult {
  url: string;
  title: string;
  license: string;
  artist: string;
}

const cache = new Map<string, ImageSearchResult | null>();

async function executeSearch(query: string): Promise<ImageSearchResult | null> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `filetype:bitmap|drawing ${query}`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "5");
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
      
      // Ensure it is a valid image type
      if (info && info.url && info.mime?.startsWith("image/")) {
        return {
          url: info.url,
          title: page.title || "Image",
          license: info.extmetadata?.LicenseShortName?.value || "Public Domain/CC",
          artist: info.extmetadata?.Artist?.value || "Unknown",
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`[Image Search] Error executing Wikimedia search for "${query}":`, error);
    return null;
  }
}

export async function searchImage(query: string): Promise<ImageSearchResult | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  if (cache.has(cleanQuery)) {
    return cache.get(cleanQuery) || null;
  }

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
      console.log(`[Image Search] No results for "${cleanQuery}". Retrying relaxed: "${relaxed}"`);
      result = await executeSearch(relaxed);
    }
  }

  // 3. Fallback to topic words + diagram/map if still no results
  if (!result) {
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    if (words.length > 2) {
      // Find visual type indicator (diagram, map, chart, graph, timeline)
      const visualType = words.find(w => 
        /^(diagram|map|chart|graph|timeline|illustration|drawing|figure)$/i.test(w)
      ) || "";
      // Combine first 2 words + visual type
      const fallbackQuery = `${words.slice(0, 2).join(" ")} ${visualType}`.trim();
      if (fallbackQuery.toLowerCase() !== cleanQuery.toLowerCase()) {
        console.log(`[Image Search] Retrying fallback: "${fallbackQuery}"`);
        result = await executeSearch(fallbackQuery);
      }
    }
  }

  cache.set(cleanQuery, result);
  return result;
}

export async function resolveImagePlaceholders(content: string): Promise<string> {
  const regex = /!\[IMAGE_SEARCH:\s*(.*?)\]\((.*?)\)/gi;
  const placeholders: { raw: string; query: string }[] = [];
  let match;

  // Clone regex to read cleanly
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
    const image = await searchImage(p.query);
    if (image) {
      // Clean up caption/attribution text for Markdown
      const cleanTitle = image.title
        .replace(/^File:/, "")
        .replace(/\.[^/.]+$/, "") // strip extension
        .replace(/[_-]/g, " ")     // replace underscores/dashes with spaces
        .trim();
      const attribution = `![${cleanTitle} (${image.license})](${image.url})`;
      return { raw: p.raw, replacement: attribution };
    }
    // Remove failed placeholder to avoid broken image markup
    return { raw: p.raw, replacement: "" };
  });

  const replacements = await Promise.all(searchPromises);
  for (const r of replacements) {
    resolved = resolved.replace(r.raw, r.replacement);
  }

  return resolved;
}
