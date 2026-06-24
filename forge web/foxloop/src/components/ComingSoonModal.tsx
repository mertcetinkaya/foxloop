"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-[#1a1a1f] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
            <span className="text-2xl">🔥</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Coming soon</h3>
          <p className="mt-2 text-sm text-muted">
            Forge is almost ready for download. We&apos;re putting the finishing
            touches on — stay tuned!
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
