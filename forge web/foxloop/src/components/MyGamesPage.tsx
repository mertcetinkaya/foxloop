"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Play } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteGame,
  draftCoverUrl,
  fetchMyGames,
  previewUrl,
  publishedCoverUrl,
  type ApiGame,
} from "@/lib/game-api";
import { playCountLabel, SpotlightBadge } from "@/components/SpotlightBadge";

function statusLabel(status: ApiGame["status"]): string {
  switch (status) {
    case "published":
      return "Published";
    case "ready":
      return "Ready";
    case "generating":
    case "planning":
      return "Building";
    case "failed":
      return "Failed";
    default:
      return "Draft";
  }
}

export function MyGamesPage() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<ApiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMyGames();
      setGames(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setIsLoginOpen(true);
      return;
    }
    void loadGames();
  }, [user, authLoading, loadGames]);

  const handleDelete = async (game: ApiGame) => {
    const confirmed = window.confirm(
      `Delete "${game.title}"? This cannot be undone and removes it from everywhere.`
    );
    if (!confirmed) return;

    setDeletingId(game.id);
    setError(null);
    try {
      await deleteGame(game.id);
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const coverForGame = (game: ApiGame) => {
    if (game.status === "published") {
      return publishedCoverUrl(game.slug, game.coverUrl, undefined);
    }
    return draftCoverUrl(game.id);
  };

  const playHref = (game: ApiGame) => {
    if (game.status === "published") {
      return `/games/${game.slug}`;
    }
    return previewUrl(game.id);
  };

  const isExternalPlay = (game: ApiGame) => game.status !== "published";

  return (
    <>
      <Header onLogin={() => setIsLoginOpen(true)} />

      <main className="mx-auto max-w-7xl flex-1 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">My Games</h1>
          <p className="mt-2 text-muted">
            Games you created with Forge Lite
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading || authLoading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          </div>
        ) : !user ? (
          <p className="text-center text-muted">Sign in to see your games.</p>
        ) : games.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-lg text-white">No games yet</p>
            <p className="mt-2 text-muted">
              Head home and describe your first game idea.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              Build a game
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[16/10] bg-[#1a1035]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverForGame(game)}
                    alt={game.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                    {statusLabel(game.status)}
                  </span>
                  {game.featured && <SpotlightBadge />}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-white">{game.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {playCountLabel(game.playCount)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {isExternalPlay(game) ? (
                      <a
                        href={playHref(game)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-black"
                      >
                        <Play className="h-4 w-4" />
                        Preview
                      </a>
                    ) : (
                      <Link
                        href={playHref(game)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-black"
                      >
                        <Play className="h-4 w-4" />
                        Play
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(game)}
                      disabled={deletingId === game.id}
                      className="flex items-center justify-center rounded-full border border-border px-4 py-2.5 text-muted transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                      aria-label="Delete game"
                    >
                      {deletingId === game.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => void loadGames()}
      />
    </>
  );
}
