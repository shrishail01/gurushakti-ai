import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Safe Markdown renderer for AI output.
 *
 * react-markdown does not render raw HTML by default (it is escaped), so the
 * AI's Markdown — headings, lists, tables — renders styled while raw HTML is
 * inert. Styling lives in the `.md` class in index.css.
 *
 * Images returned by the backend (resolved Wikimedia Commons URLs) are
 * rendered with a styled figure+caption layout and an onError fallback that
 * hides broken images silently rather than showing broken-image icons.
 */

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="md-table-wrap">
              <table {...props} />
            </div>
          ),
          img: ({ src, alt }) => {
            if (!src) return null;
            return (
              <figure className="md-img-figure">
                <img
                  src={src}
                  alt={alt ?? ""}
                  className="md-img"
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget.parentElement;
                    if (el) el.style.display = "none";
                  }}
                />
                {alt && (
                  <figcaption className="md-img-caption">{alt}</figcaption>
                )}
              </figure>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
