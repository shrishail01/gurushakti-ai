import { cn } from "@/lib/utils";

/**
 * The original GuruShakti AI logo (icon + wordmark), loaded from local copies
 * in public/assets/ (downloaded from the original Fillout-hosted assets).
 */

interface GuruShaktiLogoProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  iconSize?: number;
  /** Hide the wordmark (for the narrow sidebar). */
  wordmarkOnly?: boolean;
  iconOnly?: boolean;
}

export function GuruShaktiLogo({
  className,
  iconClassName,
  wordmarkClassName,
  iconSize = 36,
  iconOnly = false,
}: GuruShaktiLogoProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      aria-label="GuruShakti AI"
    >
      <img
        src="/assets/gurushakti-icon.png"
        alt="GuruShakti AI"
        width={iconSize}
        height={iconSize}
        className={cn(
          "shrink-0 rounded-md object-contain",
          iconClassName,
        )}
      />
      {!iconOnly && (
        <img
          src="/assets/gurushakti-wordmark.png"
          alt="GuruShakti AI"
          className={cn(
            "h-6 w-auto shrink-0 object-contain sm:h-7",
            wordmarkClassName,
          )}
          draggable={false}
        />
      )}
    </div>
  );
}
