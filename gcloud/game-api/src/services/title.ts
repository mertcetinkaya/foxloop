const GENERIC_TITLE = /^(title|untitled|new game|game|forge lite game)$/i;

export function cleanDisplayTitle(raw: string): string {
  let t = raw
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^["'`]|["'`]$/g, "")
    .trim();

  t = t.split(/\s*[—–]\s+/)[0]?.trim() ?? t;
  if (t.includes(" - ")) t = t.split(" - ")[0]?.trim() ?? t;
  if (t.includes(":")) t = t.split(":")[0]?.trim() ?? t;

  t = t.replace(/^(a|an|the)\s+/i, "").trim();

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 4) {
    t = words.slice(0, 4).join(" ");
  } else {
    t = words.join(" ");
  }

  if (t.length > 36) t = t.slice(0, 36).trim();

  if (t) {
    t = t
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return t || "Forge Lite Game";
}

export function isGenericTitle(title: string): boolean {
  return GENERIC_TITLE.test(title.trim());
}

export function extractTitleFromPlan(
  plan: string,
  userPrompt: string,
  fallback: string
): string {
  const section = plan.match(/^##\s*Title\s*\n+([^\n#]+)/im);
  if (section?.[1]?.trim() && !isGenericTitle(section[1].trim())) {
    return cleanDisplayTitle(section[1]);
  }

  const titleLine = plan.match(/^Title:\s*(.+)$/im);
  if (titleLine?.[1]?.trim() && !isGenericTitle(titleLine[1].trim())) {
    return cleanDisplayTitle(titleLine[1]);
  }

  const h1 = plan.match(/^#\s*(.+)$/m);
  if (h1?.[1]?.trim() && !isGenericTitle(h1[1].trim())) {
    return cleanDisplayTitle(h1[1]);
  }

  if (userPrompt.trim()) {
    return cleanDisplayTitle(userPrompt);
  }

  return cleanDisplayTitle(fallback);
}

export function resolveGameTitle(game: {
  title?: string;
  gamePlan?: string;
  userPrompt?: string;
  slug: string;
}): string {
  if (game.title?.trim() && !isGenericTitle(game.title.trim())) {
    return cleanDisplayTitle(game.title);
  }
  if (game.gamePlan) {
    return extractTitleFromPlan(
      game.gamePlan,
      game.userPrompt ?? "",
      titleFromSlug(game.slug)
    );
  }
  if (game.userPrompt?.trim()) {
    return cleanDisplayTitle(game.userPrompt);
  }
  return cleanDisplayTitle(titleFromSlug(game.slug));
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
