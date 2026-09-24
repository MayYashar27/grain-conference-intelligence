/**
 * Clean Grain-inspired lockup for the app (mark + wordmark), drawn as inline SVG
 * so it stays crisp and has NO screenshot background. Designed for a dark/indigo
 * surface: a white rounded-square mark with the indigo "grain" kernel, plus the
 * lowercase "grain" wordmark in white. (Demo mark — not the pixel-perfect
 * official logo.)
 */
export function Logo({ height = 30 }: { height?: number }) {
  // Mark is slightly smaller than the row height; the wordmark is sized so its
  // lowercase x-height reads at about the same visual size as the mark.
  const mark = height * 0.82;
  return (
    <span className="inline-flex items-center" style={{ gap: height * 0.26 }}>
      <svg width={mark} height={mark} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#ffffff" />
        <rect x="11.5" y="8.5" width="9" height="15" rx="3" fill="#2b3674" transform="rotate(-20 16 16)" />
      </svg>
      <span
        className="font-bold lowercase leading-none tracking-tight text-white"
        style={{ fontSize: height * 0.92 }}
      >
        grain
      </span>
    </span>
  );
}
