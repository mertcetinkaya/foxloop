"use client";

import { useState } from "react";
import { ArrowUp, Plus, ChevronDown } from "lucide-react";

interface PromptAreaProps {
  onSend: (prompt: string) => void;
}

export function PromptArea({ onSend }: PromptAreaProps) {
  const [prompt, setPrompt] = useState("");
  const canSend = prompt.trim().length > 0;

  const handleSend = () => {
    if (canSend) onSend(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      onSend(prompt.trim());
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-2xl border border-border bg-card p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell us what kind of game you want to build..."
          rows={3}
          className="w-full resize-none bg-transparent text-base text-white placeholder:text-muted focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Add attachment"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              <span className="text-yellow-400">TS</span>
              TypeScript
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                canSend
                  ? "bg-white text-black hover:scale-105"
                  : "bg-white/20 text-white/40 cursor-not-allowed"
              }`}
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
