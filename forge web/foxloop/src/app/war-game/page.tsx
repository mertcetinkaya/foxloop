import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WW1 – Passchendaele",
};

export default function WarGamePage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#1e1e1e]">
      <iframe
        src="https://war-game.foxloop.ai/"
        className="h-full w-full border-0"
        allowFullScreen
        title="WW1 – Passchendaele"
      />
    </main>
  );
}
