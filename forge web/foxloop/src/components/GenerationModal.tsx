"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, Send, Sparkles } from "lucide-react";
import {
  createGame,
  deleteGame,
  draftCoverUrl,
  editGame,
  fetchChat,
  isGamePlayable,
  isGamePublishable,
  previewTitleFromPrompt,
  previewUrl,
  publishGame,
  waitForGamePreview,
  waitForGameReady,
  type ApiGame,
  type ChatMessage,
} from "@/lib/game-api";

interface GenerationModalProps {
  isOpen: boolean;
  initialPrompt: string;
  onClose: () => void;
  onPublished?: (game: ApiGame) => void;
}

export function GenerationModal({
  isOpen,
  initialPrompt,
  onClose,
  onPublished,
}: GenerationModalProps) {
  const chatRoleLabel = (msg: ChatMessage) => {
    if (msg.role === "user") return "You";
    if (msg.type === "error") return "Error";
    return "Forge Lite";
  };
  const [game, setGame] = useState<ApiGame | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [editPrompt, setEditPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingKind, setLoadingKind] = useState<"generate" | "edit" | "publish" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const startedRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);
  const publishPollRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshChat = useCallback(async (gameId: string) => {
    const chat = await fetchChat(gameId);
    setMessages(chat);
  }, []);

  const appendUserMessage = useCallback((text: string, type: ChatMessage["type"] = "prompt") => {
    const entry: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      type,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, entry]);
  }, []);

  const startPublishPoll = useCallback((gameId: string) => {
    publishPollRef.current?.abort();
    const pubAbort = new AbortController();
    publishPollRef.current = pubAbort;

    void waitForGameReady(gameId, {
      signal: pubAbort.signal,
      onUpdate: async (updated) => {
        setGame(updated);
        await refreshChat(updated.id);
      },
    }).then((finished) => {
      if (!pubAbort.signal.aborted) {
        setGame(finished);
      }
    });
  }, [refreshChat]);

  const runGenerate = useCallback(
    async (prompt: string) => {
      appendUserMessage(prompt);
      setLoading(true);
      setLoadingKind("generate");
      setError(null);

      pollAbortRef.current?.abort();
      publishPollRef.current?.abort();
      const pollAbort = new AbortController();
      pollAbortRef.current = pollAbort;

      try {
        const created = await createGame(prompt);
        setGame(created);
        await refreshChat(created.id);

        const previewReady = await waitForGamePreview(created.id, {
          signal: pollAbort.signal,
          onUpdate: async (updated) => {
            setGame(updated);
            await refreshChat(updated.id);
          },
        });

        setGame(previewReady);
        if (previewReady.status === "failed") {
          setError(previewReady.errorMessage ?? "Generation failed");
        } else {
          setPreviewKey((k) => k + 1);
          if (!isGamePublishable(previewReady)) {
            startPublishPoll(created.id);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setLoading(false);
        setLoadingKind(null);
      }
    },
    [appendUserMessage, refreshChat, startPublishPoll]
  );

  useEffect(() => {
    if (!isOpen) {
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      publishPollRef.current?.abort();
      publishPollRef.current = null;
      startedRef.current = false;
      setGame(null);
      setMessages([]);
      setEditPrompt("");
      setError(null);
      setLoadingKind(null);
      return;
    }
    if (startedRef.current || !initialPrompt.trim()) return;
    startedRef.current = true;
    void runGenerate(initialPrompt.trim());
  }, [isOpen, initialPrompt, runGenerate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleEdit = async () => {
    if (!game || !editPrompt.trim() || loading) return;
    const text = editPrompt.trim();
    setEditPrompt("");
    appendUserMessage(text, "edit");
    setLoading(true);
    setLoadingKind("edit");
    setError(null);

    pollAbortRef.current?.abort();
    publishPollRef.current?.abort();
    const pollAbort = new AbortController();
    pollAbortRef.current = pollAbort;

    try {
      const queued = await editGame(game.id, text);
      setGame(queued);
      await refreshChat(queued.id);

      const previewReady = await waitForGamePreview(queued.id, {
        signal: pollAbort.signal,
        onUpdate: async (updated) => {
          setGame(updated);
          await refreshChat(updated.id);
        },
      });

      setGame(previewReady);
      if (previewReady.status === "failed") {
        setError(previewReady.errorMessage ?? "Edit failed");
      } else {
        setPreviewKey((k) => k + 1);
        if (!isGamePublishable(previewReady)) {
          startPublishPoll(queued.id);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };

  const handlePublish = async () => {
    if (!game || loading) return;
    setLoading(true);
    setLoadingKind("publish");
    setError(null);
    try {
      const published = await publishGame(game.id);
      setGame(published);
      onPublished?.(published);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  };

  const handleCancel = async () => {
    if (game && game.status !== "published") {
      try {
        await deleteGame(game.id);
      } catch {
        // ignore cleanup errors
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const displayTitle =
    game?.title ?? (initialPrompt.trim() ? previewTitleFromPrompt(initialPrompt) : "Building your game");

  const canEdit = Boolean(game && isGamePlayable(game) && game.status !== "failed");
  const canPublish = Boolean(game && isGamePublishable(game));
  const showPreview = Boolean(game && isGamePlayable(game) && game.status !== "failed");
  const showBuildingPreview =
    Boolean(game) && !showPreview && game?.status !== "failed";
  const publishableSoon = Boolean(game && isGamePlayable(game) && !canPublish);

  const loadingMessage =
    loadingKind === "edit"
      ? "Applying your edit…"
      : loadingKind === "publish"
        ? "Saving to Forge Lite…"
        : "Building your game…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-[#0f1219] shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {displayTitle}
              </h2>
              <p className="text-xs text-muted">
                {loading && loadingKind === "generate"
                  ? "Building your game…"
                  : loading
                    ? loadingKind === "publish"
                      ? "Saving to Forge Lite…"
                      : "Applying your edit…"
                    : game && isGamePlayable(game) && !isGamePublishable(game)
                      ? "Play in the preview — publish unlocks shortly"
                      : game?.status === "ready"
                        ? "Preview, refine with prompts, then publish"
                        : "Forge Lite studio"}
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleCancel()}
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[280px] border-b border-border bg-[#1a1035] lg:border-b-0 lg:border-r">
            {showPreview && game ? (
              <>
                <iframe
                  key={previewKey}
                  title="Game preview"
                  src={previewUrl(game.id)}
                  className="h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
                {game.coverStatus === "ready" && (
                  <div className="pointer-events-none absolute bottom-3 left-3 overflow-hidden rounded-lg border border-white/10 shadow-lg">
                    <img
                      src={draftCoverUrl(game.id)}
                      alt={`${displayTitle} cover`}
                      className="h-14 w-[5.5rem] object-cover"
                    />
                  </div>
                )}
              </>
            ) : showBuildingPreview ? (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="flex flex-col items-center gap-3 text-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                  <p>{loadingMessage}</p>
                  {(loadingKind === "generate" || loadingKind === "edit") && (
                    <p className="mt-2 max-w-sm text-sm font-medium text-amber-300/95">
                      {loadingKind === "edit"
                        ? "Please keep this page open while your edit is being applied."
                        : "Please keep this page open while your game is being built."}
                    </p>
                  )}
                  {game?.title && (
                    <p className="text-xs text-white/50">{game.title}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <p className="text-muted">{error ?? "Waiting to start…"}</p>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "ml-8 bg-white/10 text-white"
                        : "mr-4 bg-[#141820] text-muted"
                    }`}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-orange-400/80">
                      {chatRoleLabel(msg)}
                    </p>
                    <p className="whitespace-pre-wrap font-sans text-inherit">
                      {msg.text}
                    </p>
                  </div>
                ))}
                {loading && (
                  <div className="mr-4 flex items-center gap-2 rounded-xl bg-[#141820] px-3 py-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
                    {loadingMessage}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {error && (
              <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder={
                    canEdit
                      ? "Refine your game before publish…"
                      : "Waiting for the first build…"
                  }
                  disabled={!canEdit || loading}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-border bg-[#141820] px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-orange-500/50 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && canEdit) {
                      e.preventDefault();
                      void handleEdit();
                    }
                  }}
                />
                <button
                  onClick={() => void handleEdit()}
                  disabled={!canEdit || loading || !editPrompt.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send edit"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => void handlePublish()}
                  disabled={!canPublish || loading}
                  className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canPublish
                    ? "Save to Forge Lite"
                    : publishableSoon
                      ? "It will be publishable shortly"
                      : "Save to Forge Lite"}
                </button>
                <button
                  onClick={() => void handleCancel()}
                  disabled={loading}
                  className="rounded-full border border-border px-5 py-3 text-sm text-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
