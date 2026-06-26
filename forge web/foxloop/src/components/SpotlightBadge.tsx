export function SpotlightBadge() {
  return (
    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-pink-500/90 px-2.5 py-1 text-xs font-medium text-white">
      <span>★</span> Spotlight
    </div>
  );
}

export function playCountLabel(playCount?: string): string {
  return !playCount || playCount === "0" ? "0 plays" : `${playCount} plays`;
}
