"use client";

import Link from "next/link";
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

        <nav className="hidden items-center gap-8 md:flex">
          {user && (
            <Link
              href="/my-games"
              className="text-sm text-muted transition-colors hover:text-white"
            >
              My Games
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 rounded-full bg-white/5" />
          ) : user ? (
            <>
              <Link
                href="/my-games"
                className="hidden text-sm text-muted transition-colors hover:text-white sm:inline"
              >
                My Games
              </Link>
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full border border-border"
                />
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
