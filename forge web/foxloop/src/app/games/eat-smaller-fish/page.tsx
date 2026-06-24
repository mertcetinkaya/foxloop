import { EatSmallerFishGame } from "@/components/games/EatSmallerFishGame";

export const metadata = {
  title: "Eat the Smaller Fish — foxloop",
  description: "Feed on smaller fish to grow bigger. Hit 1000 points to claim victory!",
};

export default function EatSmallerFishPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <EatSmallerFishGame />
    </div>
  );
}
