import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FORGE_GAMES, FORGE_LITE_GAMES } from "@/data/games";
import { GameCard } from "./GameCard";

export function DiscoverGames() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
            Game Jam
          </p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Forge{" "}
            <span className="gradient-text-orange">Games</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Explore titles crafted on the Forge platform. Play them, find
            inspiration, and build something of your own.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FORGE_GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">
            Forge Lite{" "}
            <span className="gradient-text-orange">Games</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FORGE_LITE_GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/all-games"
            className="group relative flex items-center gap-3 rounded-full border border-border bg-card px-8 py-4 text-base font-medium text-white transition-all hover:border-orange-500/50 hover:bg-white/5"
          >
            Explore All Games
            <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-btn">
              <ArrowRight className="h-4 w-4 text-white" />
            </span>
            <span className="absolute -right-1 -top-2 rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">
              4+
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
