interface GameCardSkeletonProps {
  size?: "default" | "large";
}

export function GameCardSkeleton({ size = "default" }: GameCardSkeletonProps) {
  const isLarge = size === "large";

  return (
    <div className="animate-pulse">
      <div
        className="aspect-[16/10] rounded-2xl border border-border bg-card"
      />
      <div className={`mt-3 space-y-2 ${isLarge ? "max-w-[70%]" : "max-w-[60%]"}`}>
        <div className={`rounded bg-white/10 ${isLarge ? "h-5" : "h-4"}`} />
        <div className={`rounded bg-white/5 ${isLarge ? "h-4 w-2/3" : "h-3 w-1/2"}`} />
      </div>
    </div>
  );
}
