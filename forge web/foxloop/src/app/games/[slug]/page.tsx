import { PublishedGamePlayer } from "@/components/PublishedGamePlayer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")} — foxloop`,
    description: "Play on Foxloop Forge Lite.",
  };
}

export default async function PublishedGamePage({ params }: PageProps) {
  const { slug } = await params;
  return <PublishedGamePlayer slug={slug} />;
}
