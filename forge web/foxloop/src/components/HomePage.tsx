"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromptArea } from "@/components/PromptArea";
import { DiscoverGames } from "@/components/DiscoverGames";
import { SignupModal } from "@/components/SignupModal";
import { ComingSoonModal } from "@/components/ComingSoonModal";
import { ForgeDownloadSection } from "@/components/ForgeDownloadSection";

export function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const openComingSoon = () => setIsComingSoonOpen(true);
  const closeComingSoon = () => setIsComingSoonOpen(false);

  return (
    <>
      <Header onGetStarted={openModal} />

      <main className="flex-1">
        <ForgeDownloadSection onDownload={openComingSoon} />

        <section className="flex flex-col items-center px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Bring your{" "}
            <span className="gradient-text">game</span> concepts to life
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Go from idea to playable game in minutes with Forge Lite — zero
            coding needed.
          </p>

          <div className="mt-10 w-full flex justify-center">
            <PromptArea onSend={openModal} />
          </div>
        </section>

        <DiscoverGames />
      </main>

      <Footer />
      <SignupModal isOpen={isModalOpen} onClose={closeModal} />
      <ComingSoonModal isOpen={isComingSoonOpen} onClose={closeComingSoon} />
    </>
  );
}
