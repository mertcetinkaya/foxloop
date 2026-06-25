import { notFound } from "next/navigation";
import { EmbedGamePlayer } from "@/components/games/EmbedGamePlayer";
import { getEmbedGameBySlug } from "@/data/games";
import type { Game } from "@/data/games";

export const dynamic = "force-dynamic";

interface PlayPageProps {
  params: Promise<{ slug: string }>;
}

function embedGameFromSlug(slug: string): Game {
  const fromCatalog = getEmbedGameBySlug(slug);
  if (fromCatalog) return fromCatalog;
  return {
    id: slug,
    title: slug.replace(/-/g, " "),
    image: `/games/placeholders/01.jpg`,
    playCount: "0",
    playable: true,
    path: `/play/${slug}`,
    embedPath: `/embed/${slug}/index.html`,
  };
}

export async function generateMetadata({ params }: PlayPageProps) {
  const { slug } = await params;
  const game = embedGameFromSlug(slug);

  return {
    title: `${game.title} — foxloop`,
    description: `Play ${game.title} on foxloop.`,
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { slug } = await params;
  const game = embedGameFromSlug(slug);

  if (!game.embedPath && !getEmbedGameBySlug(slug)) {
    notFound();
  }

  return <EmbedGamePlayer game={game} />;
}
