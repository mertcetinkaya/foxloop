"use client";

import Link from "next/link";
import { Logo } from "./Logo";

interface HeaderProps {
  onGetStarted?: () => void;
}

export function Header({ onGetStarted }: HeaderProps) {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <button className="text-sm text-muted transition-colors hover:text-white">
            Capabilities
          </button>
          <button className="text-sm text-muted transition-colors hover:text-white">
            Getting Started
          </button>
          <button className="text-sm text-muted transition-colors hover:text-white">
            Learn
          </button>
          <button className="text-sm text-muted transition-colors hover:text-white">
            Plans
          </button>
        </nav>

        <button
          onClick={onGetStarted}
          className="gradient-btn rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
        >
          Start building
        </button>
      </div>
    </header>
  );
}
