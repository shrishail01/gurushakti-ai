/**
 * PPT download helper for the "PPT Presentation" tool.
 *
 * Gemini streams slide content as markdown like:
 *   ## Slide 1: Photosynthesis
 *   - Science · Class 7
 *   - A one-line subtitle
 *   ## Slide 2: What is photosynthesis?
 *   - ...
 *   <!-- IMG: photosynthesis diagram plant leaves -->
 *
 * This module parses that structure and rebuilds it as a real PowerPoint
 * (.pptx) file using pptxgenjs (browser build), then triggers a download.
 * Slides that carry an image marker get a REAL, relevant photo or
 * educational illustration (fetched from Wikimedia Commons and embedded as
 * base64 inside the file — no URLs, works offline) laid out beside the text,
 * with a small attribution line on the slide and full source details in the
 * slide notes. The generated file opens in Microsoft PowerPoint / LibreOffice
 * / Google Slides.
 */

import type PptxGenJS from "pptxgenjs";
import { searchWikimediaImage, downloadImage, type WikimediaImage } from "./pptImages";

type Slide = PptxGenJS.Slide;

export interface PptSlide {
  title: string;
  bullets: string[];
  /** First slide rendered with the larger title treatment. */
  isTitle: boolean;
  /** Optional real-image search query (from the invisible `<!-- IMG: -->` marker). */
  imageQuery?: string;
  imageUrl?: string;
}

interface SlideWithImage extends PptSlide {
  image: WikimediaImage | null;
}

const SLIDE_RE = /^##\s+slide\s*(\d+)\s*[:：]\s*(.*)$/i;
const HEADING_RE = /^##\s+(.*)$/;
const BULLET_RE = /^[-*•]\s+(.*)$/;
const IMG_RE = /<!--\s*IMG:([\s\S]*?)-->/i;

/** Parse generated markdown into slides. Falls back gracefully when the
 *  model does not follow the exact "## Slide N:" format. */
export function parsePptSlides(markdown: string): PptSlide[] {
  const slides: PptSlide[] = [];
  let current: PptSlide | null = null;
  let sawSlideMarker = false;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const slideMatch = line.match(SLIDE_RE);
    if (slideMatch) {
      sawSlideMarker = true;
      const title = slideMatch[2]?.trim() || `Slide ${slideMatch[1]}`;
      current = { title, bullets: [], isTitle: false };
      slides.push(current);
      continue;
    }

    const imgMatch = line.match(IMG_RE);
    if (imgMatch && current) {
      const q = imgMatch[1].replace(/\s+/g, " ").trim();
      if (q) current.imageQuery = q;
      continue;
    }

    const markdownImgMatch = line.match(/!\[.*?\]\((.*?)\)/);
    if (markdownImgMatch && markdownImgMatch[1] && current) {
      current.imageUrl = markdownImgMatch[1].trim();
      continue;
    }

    if (!current) {
      // No slide marker yet — treat "## Heading" blocks as slides too.
      const heading = line.match(HEADING_RE);
      if (heading && heading[1]?.trim()) {
        current = { title: heading[1].trim(), bullets: [], isTitle: false };
        slides.push(current);
      }
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet && bullet[1]?.trim()) {
      current.bullets.push(bullet[1].trim());
    }
  }

  if (slides.length === 0) {
    // Last resort: one slide with the raw text lines.
    const bullets = markdown
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"))
      .slice(0, 12);
    slides.push({ title: "Presentation", bullets, isTitle: false });
  }

  return slides
    .map((s, i) => ({ ...s, isTitle: i === 0 && sawSlideMarker }))
    .filter((s) => s.title || s.bullets.length > 0);
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "presentation";
}

/* ------------------------------------------------------------------ */
/* Image query fallback (when Gemini omitted a marker on one slide)    */
/* ------------------------------------------------------------------ */

/** Resolve the real images to embed, only for slides with explicit markers. */
async function resolveSlideImages(
  slides: PptSlide[],
): Promise<SlideWithImage[]> {
  const usedUrls = new Set<string>();

  const images = await Promise.all(
    slides.map(async (slide) => {
      // Priority 1: backend-resolved Wikimedia URL already in the content
      if (slide.imageUrl) {
        const dataUrl = await downloadImage(slide.imageUrl);
        if (dataUrl) {
          return {
            dataUrl,
            artist: "Wikimedia Commons",
            license: "Creative Commons / Public Domain",
            licenseUrl: "",
            pageUrl: slide.imageUrl,
            description: slide.title,
          };
        }
      }
      // Priority 2: explicit <!-- IMG: --> query marker from Gemini
      const query = (slide.imageQuery ?? "").trim();
      if (query) {
        return searchWikimediaImage(query, usedUrls);
      }
      // No explicit marker → text-only slide
      return null;
    }),
  );

  return slides.map((slide, i) => ({ ...slide, image: images[i] }));
}

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

const TEAL = "0F766E";
const TEAL_DARK = "0D9488";
const EMERALD = "059669";
const INK = "1F2937";
const MUTED = "6B7280";
const CREAM = "FDF6EC";
const WHITE = "FFFFFF";

const SHADOW = {
  type: "outer" as const,
  color: "000000",
  opacity: 0.22,
  blur: 9,
  offset: 4,
  angle: 45,
};

/** Build the .pptx in the browser and trigger a download. Returns the
 *  number of real images embedded (0 when none were found). */
export async function downloadPptxFromMarkdown(
  markdown: string,
  baseName: string,
): Promise<{ imageCount: number }> {
  const slides = await resolveSlideImages(parsePptSlides(markdown));
  const imageCount = slides.filter((s) => s.image !== null).length;

  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "GS_WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "GS_WIDE";
  pptx.author = "GuruShakti AI";
  pptx.title = baseName;

  slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    s.background = { color: WHITE };

    // Brand accent bar across the top.
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.16,
      fill: { color: TEAL },
      line: { color: TEAL },
    });

    if (slide.isTitle) {
      addTitleSlide(s, pptx, slide, baseName, index);
    } else {
      addContentSlide(s, pptx, slide, baseName, index);
    }
  });

  const result = await pptx.write({ outputType: "blob" });
  if (!(result instanceof Blob)) {
    throw new Error("Could not generate the PPT file.");
  }
  const url = URL.createObjectURL(result);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFileName(baseName)}.pptx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { imageCount };
}

/* ------------------------------------------------------------------ */
/* Slide builders                                                      */
/* ------------------------------------------------------------------ */

function addImageWithCaption(
  s: Slide,
  pptx: PptxGenJS,
  image: WikimediaImage,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  s.addImage({
    data: image.dataUrl,
    x,
    y,
    w,
    h,
    sizing: { type: "contain", w, h },
    rounding: true,
    shadow: SHADOW,
  });
  s.addText(
    `Image: ${image.artist} · ${image.license} · Wikimedia Commons`,
    {
      x,
      y: y + h + 0.06,
      w,
      h: 0.55,
      fontSize: 8,
      color: MUTED,
      fontFace: "Calibri",
      align: "left",
      valign: "top",
      breakLine: false,
    },
  );
  s.addNotes(
    `Image source\nDescription: ${image.description || "—"}\nArtist: ${image.artist}\nLicense: ${image.license} ${image.licenseUrl}\nFile page: ${image.pageUrl}\n`,
  );
}

function addFooter(s: Slide, baseName: string, index: number) {
  s.addText(
    [{ text: `GuruShakti AI   ·   ${baseName}`, options: { color: MUTED, fontSize: 9 } }],
    { x: 0.65, y: 7.05, w: 9, h: 0.3, fontFace: "Calibri", align: "left" },
  );
  s.addText(String(index + 1), {
    x: 12.3,
    y: 7.05,
    w: 0.6,
    h: 0.3,
    fontSize: 10,
    color: MUTED,
    fontFace: "Calibri",
    align: "right",
  });
}

function addTitleSlide(
  s: Slide,
  pptx: PptxGenJS,
  slide: SlideWithImage,
  baseName: string,
  index: number,
) {
  const image = slide.image;
  const textW = image ? 6.4 : 11.5;
  const textX = image ? 0.8 : 0.9;

  // Cream band + emerald accent line.
  s.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 1.6,
    w: 13.33,
    h: 3.2,
    fill: { color: CREAM },
    line: { color: CREAM },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 4.8,
    w: 13.33,
    h: 0.09,
    fill: { color: EMERALD },
    line: { color: EMERALD },
  });

  s.addText(slide.title, {
    x: textX,
    y: 2.0,
    w: textW,
    h: 1.2,
    fontSize: image ? 34 : 40,
    bold: true,
    color: TEAL_DARK,
    fontFace: "Calibri",
    align: "center",
    valign: "middle",
  });
  s.addText(
    "GuruShakti AI · Classroom Presentation",
    {
      x: textX,
      y: 3.3,
      w: textW,
      h: 0.45,
      fontSize: image ? 13 : 16,
      color: MUTED,
      fontFace: "Calibri",
      align: "center",
    },
  );
  // Subtitle bullets (subject / grade / one-liner).
  if (slide.bullets.length) {
    s.addText(
      slide.bullets.slice(0, 4).map((b) => ({ text: b })),
      {
        x: textX,
        y: 3.8,
        w: textW,
        h: 1.1,
        fontSize: image ? 12 : 14,
        color: INK,
        fontFace: "Calibri",
        align: "center",
        breakLine: false,
      },
    );
  }

  if (image) {
    addImageWithCaption(s, pptx, image, 7.6, 1.75, 5.0, 2.9);
  }

  addFooter(s, baseName, index);
}

function addContentSlide(
  s: Slide,
  pptx: PptxGenJS,
  slide: SlideWithImage,
  baseName: string,
  index: number,
) {
  const image = slide.image;

  s.addText(slide.title, {
    x: 0.65,
    y: 0.45,
    w: 12.0,
    h: 0.95,
    fontSize: 28,
    bold: true,
    color: TEAL_DARK,
    fontFace: "Calibri",
    valign: "middle",
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.7,
    y: 1.38,
    w: 2.1,
    h: 0.06,
    fill: { color: EMERALD },
    line: { color: EMERALD },
  });

  const bullets: { text: string }[] =
    slide.bullets.length > 0
      ? slide.bullets.map((b) => ({ text: b }))
      : [{ text: "(No bullet points on this slide — add your own notes.)" }];

  if (image) {
    // Two-column layout: text left, large photo right, attribution below.
    s.addText(bullets, {
      x: 0.7,
      y: 1.7,
      w: 6.3,
      h: 4.95,
      fontSize: 16,
      color: INK,
      fontFace: "Calibri",
      bullet: { code: "25AA", indent: 14 },
      lineSpacing: 26,
      paraSpaceAfter: 8,
      valign: "top",
    });
    addImageWithCaption(s, pptx, image, 7.4, 1.7, 5.25, 4.25);
  } else {
    s.addText(bullets, {
      x: 0.75,
      y: 1.75,
      w: 11.8,
      h: 4.9,
      fontSize: 17,
      color: INK,
      fontFace: "Calibri",
      bullet: { code: "25AA", indent: 14 },
      lineSpacing: 30,
      paraSpaceAfter: 10,
      valign: "top",
    });
  }

  addFooter(s, baseName, index);
}
