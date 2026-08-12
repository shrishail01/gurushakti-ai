/**
 * PPT download helper for the "PPT Presentation" tool.
 *
 * Gemini streams slide content as markdown like:
 *   ## Slide 1: Photosynthesis
 *   - Science · Class 7
 *   - A one-line subtitle
 *   ## Slide 2: What is photosynthesis?
 *   - ...
 *
 * This module parses that structure and rebuilds it as a real PowerPoint
 * (.pptx) file using pptxgenjs (browser build), then triggers a download.
 * The generated file opens in Microsoft PowerPoint / LibreOffice / Google
 * Slides and contains real slides, headings, bullets and clean formatting.
 */

export interface PptSlide {
  title: string;
  bullets: string[];
  /** First slide rendered with the larger title treatment. */
  isTitle: boolean;
}

const SLIDE_RE = /^##\s+slide\s*(\d+)\s*[:：]\s*(.*)$/i;
const HEADING_RE = /^##\s+(.*)$/;
const BULLET_RE = /^[-*•]\s+(.*)$/;

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

/** Build the .pptx in the browser and trigger a download. */
export async function downloadPptxFromMarkdown(
  markdown: string,
  baseName: string,
): Promise<void> {
  const slides = parsePptSlides(markdown);
  const { default: PptxGenJS } = await import("pptxgenjs");

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "GS_WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "GS_WIDE";
  pptx.author = "GuruShakti AI";
  pptx.title = baseName;

  const TEAL = "0F766E";
  const TEAL_DARK = "0D9488";
  const EMERALD = "059669";
  const INK = "1F2937";
  const MUTED = "6B7280";
  const CREAM = "FDF6EC";
  const WHITE = "FFFFFF";

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
      // Title slide: cream band + big teal gradient title.
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
        x: 0.9,
        y: 2.05,
        w: 11.5,
        h: 1.2,
        fontSize: 40,
        bold: true,
        color: TEAL_DARK,
        fontFace: "Calibri",
        align: "center",
        valign: "middle",
      });
      s.addText(
        "GuruShakti AI · Classroom Presentation",
        {
          x: 0.9,
          y: 3.4,
          w: 11.5,
          h: 0.5,
          fontSize: 16,
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
          x: 1.4,
          y: 4.25,
          w: 10.5,
          h: 1.1,
          fontSize: 14,
          color: INK,
          fontFace: "Calibri",
          align: "center",
          breakLine: false,
        });
      }
    } else {
      // Content slide: heading + bullets.
      s.addText(slide.title, {
        x: 0.65,
        y: 0.45,
        w: 12,
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

    // Footer with slide number.
    s.addText(
      [
        {
          text: `GuruShakti AI   ·   ${baseName}`,
          options: { color: MUTED, fontSize: 9 },
        },
      ],
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
}
