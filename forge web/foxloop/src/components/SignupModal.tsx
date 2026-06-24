"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0.84-.27 2.75 1.026 3.66 0-.21.42-.804.42-1.61 0-1.17-.012-2.13-.012-2.42 0-.66.17-1.31.48-1.89C7.09 4.98 6.16 2.69 6.16 2.69c-.36-.92-.88-1.3-1.28-1.3-.26 0-.52.01-.78.04.52.34 1.48 1.16 1.48 3.4 0 .98-.35 1.75-.88 2.06-.32.24-.74.4-1.2.46.36.11.74.17 1.13.17.98 0 1.81-.35 2.27-.68.72-.52 1.08-1.19 1.27-1.74.09-.23.14-.48.14-.73 0-.18-.01-.35-.03-.51-.42.15-.8.44-1.08.82-.41.51-.64 1.13-.64 1.81 0 2.66 1.89 5.11 5.52 5.11 1.03 0 2-.35 2.76-.99.72-.63 1.16-1.55 1.16-2.65 0-.39-.03-.78-.08-1.15 2.72-.2 5.31-1.4 5.31-6.4 0-1.39-.49-2.52-1.3-3.4.13-.32.28-.81.28-1.62 0-.74-.07-1.33-.2-1.9C18.46 5.42 17.07 7 15.45 7c-.67 0-1.37.25-1.79.65-.53-.1-1.1-.15-1.65-.15-.55 0-1.12.05-1.65.15-.42-.4-1.12-.65-1.79-.65-1.62 0-3.01 1.58-3.55 3.74-.14.57-.2 1.24-.2 1.9 0 .81.15 1.3.28 1.62-.81.88-1.3 2.01-1.3 3.4 0 4.99 2.58 6.19 5.22 6.39-.05.45-.08.9-.08 1.41 0 1.07.01 1.93.01 2.2 0 .21-.15.45-.55.38A8.982 8.982 0 0 1 4 19.54c-.59 0-1.17-.03-1.74-.09C3.45 21.69 6.27 23 9.34 23c7.55 0 11.74-6.33 11.74-11.74 0-.19 0-.37-.01-.56.8-.58 1.49-1.3 2.07-2.14z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setShowWaitlist(false);
      setEmail("");
    }
  }, [isOpen]);

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

  const handleAuthAttempt = () => {
    setShowWaitlist(true);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthAttempt();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-[#1a1a1f] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Log in to get started</h2>
            <p className="mt-2 text-sm text-muted">
              Log in or sign up to begin creating games with foxloop
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {showWaitlist ? (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
              <span className="text-2xl">🎮</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Early access only</h3>
            <p className="mt-2 text-sm text-muted">
              foxloop is still in early access. You&apos;re on the waitlist —
              we&apos;ll reach out as soon as a spot opens up!
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
            >
              Understood
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAuthAttempt}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-transparent py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              <GoogleIcon />
              Sign in with Google
            </button>

            <button
              onClick={handleAuthAttempt}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-transparent py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              <GitHubIcon />
              Sign in with GitHub
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#1a1a1f] px-3 text-muted">
                  or use your email
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-full border border-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
              >
                Continue with email
              </button>
            </form>

            <button
              onClick={handleAuthAttempt}
              className="w-full rounded-full border border-border py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Register a new account
            </button>
          </div>
        )}

        {!showWaitlist && (
          <p className="mt-6 text-center text-xs text-muted">
            By continuing, you agree to our{" "}
            <button className="text-white underline">Terms of Service</button> and{" "}
            <button className="text-white underline">Privacy Policy</button>
          </p>
        )}
      </div>
    </div>
  );
}
