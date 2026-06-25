"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "./AuthProvider";

interface HeaderProps {
  onLogin?: () => void;
}

export function Header({ onLogin }: HeaderProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="fixed top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-28 rounded-full bg-white/5" />
          ) : user ? (
            <>
              <Link
                href="/my-games"
                className="group flex items-center gap-2 rounded-full border border-orange-500/35 bg-gradient-to-r from-orange-500/15 to-pink-500/10 px-4 py-2 text-sm font-semibold text-orange-100 shadow-sm shadow-orange-500/10 transition-all hover:border-orange-400/60 hover:from-orange-500/25 hover:to-pink-500/15 hover:text-white"
              >
                <Gamepad2
                  className="h-4 w-4 text-orange-400 transition-transform group-hover:scale-110"
                />
                My Games
              </Link>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full border border-border"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-xs font-semibold text-muted">
                  {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="gradient-btn rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
