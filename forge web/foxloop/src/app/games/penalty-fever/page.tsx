import { PenaltyFeverGame } from "@/components/games/PenaltyFeverGame";

export const metadata = {
  title: "Penalty Fever — foxloop",
  description:
    "Take on the penalty shootout cup. Strike, block, and climb your way to victory!",
};

export default function PenaltyFeverPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <PenaltyFeverGame />
    </div>
  );
}
