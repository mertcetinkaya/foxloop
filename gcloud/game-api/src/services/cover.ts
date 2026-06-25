function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title: string, maxChars = 28): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function buildCoverSvg(title: string, slug: string): string {
  const displayTitle = title.trim() || "Forge Lite Game";
  const h = hashSlug(slug);
  const hue1 = h % 360;
  const hue2 = (hue1 + 48) % 360;
  const lines = wrapTitle(displayTitle);
  const lineEls = lines
    .map(
      (line, i) =>
        `<tspan x="600" dy="${i === 0 ? "0" : "1.15em"}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750" role="img">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 72%, 42%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 68%, 28%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#bg)"/>
  <rect width="1200" height="750" fill="url(#glow)"/>
  <circle cx="980" cy="120" r="180" fill="rgba(255,255,255,0.08)"/>
  <circle cx="180" cy="620" r="240" fill="rgba(0,0,0,0.12)"/>
  <text x="600" y="320" text-anchor="middle" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="64" font-weight="700">
    ${lineEls}
  </text>
  <text x="600" y="560" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="600" letter-spacing="0.2em">FORGE LITE</text>
</svg>`;
}
