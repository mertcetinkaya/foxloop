"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { playUrlBySlug } from "@/lib/game-api";

interface PublishedGamePlayerProps {
  slug: string;
}

export function PublishedGamePlayer({ slug }: PublishedGamePlayerProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1a1035]">
      <iframe
        title={`Play ${slug}`}
        src={playUrlBySlug(slug)}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="pointer-events-none absolute left-0 top-0 p-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
    </div>
  );
}
