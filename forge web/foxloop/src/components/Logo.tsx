export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-7 w-7">
        <div className="absolute left-0 top-0 h-3 w-3 rounded-sm bg-orange-500" />
        <div className="absolute right-0 top-0 h-3 w-3 rounded-sm bg-pink-500" />
        <div className="absolute bottom-0 left-0 h-3 w-3 rounded-sm bg-purple-500" />
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-sm bg-orange-400" />
      </div>
      <span className="text-lg font-bold tracking-tight text-white">foxloop</span>
    </div>
  );
}
