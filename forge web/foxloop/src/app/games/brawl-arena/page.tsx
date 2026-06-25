import { BrawlArenaGame } from "@/components/games/BrawlArenaGame";

export const metadata = {
  title: "Brawl Arena — foxloop",
  description: "Side-view arcade brawler. Punch, kick, and win 2 rounds!",
};

export default function BrawlArenaPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <BrawlArenaGame />
    </div>
  );
}
