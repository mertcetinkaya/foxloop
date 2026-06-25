"use client";

import { useRef, useState } from "react";
import { ArrowUp, Plus, ChevronDown, X } from "lucide-react";

interface PromptAreaProps {
  onSend: (prompt: string, referenceImage: File) => void;
}

export function PromptArea({ onSend }: PromptAreaProps) {
  const [prompt, setPrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = prompt.trim().length > 0 && referenceFile !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = () => {
    if (!canSend || !referenceFile) return;
    onSend(prompt.trim(), referenceFile);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSend && referenceFile) {
      e.preventDefault();
      onSend(prompt.trim(), referenceFile);
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

        {referencePreview && (
          <div className="mt-2 flex items-center gap-3">
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img
                src={referencePreview}
                alt="Reference preview"
                className="h-16 w-24 object-cover"
              />
            </div>
            <div className="flex-1 text-xs text-muted">
              <p className="text-white/80">Reference image (cover art)</p>
              <p className="mt-0.5">Your game scene will match this look</p>
            </div>
            <button
              type="button"
              onClick={clearReference}
              className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Remove reference image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white/5 hover:text-white ${
                referenceFile
                  ? "border-orange-500/50 text-orange-400"
                  : "border-border text-muted"
              }`}
              aria-label="Add reference image"
            >
              <Plus className="h-4 w-4" />
            </button>
            {!referenceFile && (
              <span className="text-xs text-muted">Add a reference image (required)</span>
            )}
          </div>

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
