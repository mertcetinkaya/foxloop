import { CityRaceGame } from "@/components/games/CityRaceGame";

export const metadata = {
  title: "City Race — foxloop",
  description:
    "Nitro through a colorful city highway. Steer, boost, and dodge traffic!",
};

export default function CityRacePage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <CityRaceGame />
    </div>
  );
}
