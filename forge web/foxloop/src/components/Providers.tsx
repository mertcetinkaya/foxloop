"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { AnalyticsPageTracker } from "@/components/AnalyticsPageTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <AnalyticsPageTracker />
      </Suspense>
      {children}
    </AuthProvider>
  );
}
