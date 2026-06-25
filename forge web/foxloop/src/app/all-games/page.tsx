"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AllGamesGrid } from "@/components/AllGamesGrid";

export default function AllGamesPage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        <section className="px-4 pt-28 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/"
              className="mb-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to home
            </Link>

            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
                Game Jam
              </p>
              <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
                All Forge Lite{" "}
                <span className="gradient-text-orange">Games</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-muted">
                Every Lite title in the catalog — play, get inspired, and share
                your favorites.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AllGamesGrid />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
