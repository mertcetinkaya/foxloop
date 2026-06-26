"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logPageView } from "@/lib/firebase-analytics";

/** Sends page_view to Firebase Analytics on each client route change. */
export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    void logPageView(path);
  }, [pathname, searchParams]);

  return null;
}
