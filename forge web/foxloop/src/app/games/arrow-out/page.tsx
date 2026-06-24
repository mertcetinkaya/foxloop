import { ArrowOutGame } from "@/components/games/ArrowOutGame";

export const metadata = {
  title: "Arrow Out — foxloop",
  description:
    "Remove tangled arrows from the grid. Only those with a clear escape route can leave!",
};

export default function ArrowOutPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ArrowOutGame />
    </div>
  );
}
