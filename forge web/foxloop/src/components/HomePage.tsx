"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromptArea } from "@/components/PromptArea";
import { DiscoverGames } from "@/components/DiscoverGames";
import { GenerationModal } from "@/components/GenerationModal";
import { ComingSoonModal } from "@/components/ComingSoonModal";
import { ForgeDownloadSection } from "@/components/ForgeDownloadSection";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/components/AuthProvider";

export function HomePage() {
  const { user } = useAuth();
  const [generationPrompt, setGenerationPrompt] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const openGeneration = (prompt: string) => {
    if (!user) {
      setPendingPrompt(prompt);
      setIsLoginOpen(true);
      return;
    }
    setGenerationPrompt(prompt);
  };

  const closeGeneration = () => setGenerationPrompt(null);
  const openComingSoon = () => setIsComingSoonOpen(true);
  const closeComingSoon = () => setIsComingSoonOpen(false);

  const handleLoginSuccess = () => {
    if (pendingPrompt) {
      setGenerationPrompt(pendingPrompt);
      setPendingPrompt(null);
    }
  };

  return (
    <>
      <Header onLogin={() => setIsLoginOpen(true)} />

      <main className="flex-1">
        <ForgeDownloadSection onDownload={openComingSoon} />

        <section
          id="build-prompt"
          className="flex flex-col items-center px-4 pb-16 pt-12 text-center sm:px-6"
        >
          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Bring your{" "}
            <span className="gradient-text">game</span> concepts to life
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Go from idea to playable game in minutes with Forge Lite — zero
            coding needed.
          </p>

          <div className="mt-10 w-full flex justify-center">
            <PromptArea onSend={openGeneration} />
          </div>
        </section>

        <DiscoverGames catalogVersion={catalogVersion} />
      </main>

      <Footer />
      <GenerationModal
        isOpen={generationPrompt !== null}
        initialPrompt={generationPrompt ?? ""}
        onClose={closeGeneration}
        onPublished={() => setCatalogVersion((v) => v + 1)}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setPendingPrompt(null);
        }}
        onSuccess={handleLoginSuccess}
      />
      <ComingSoonModal isOpen={isComingSoonOpen} onClose={closeComingSoon} />
    </>
  );
}
