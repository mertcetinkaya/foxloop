import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";
import type { AuthProviderType } from "@/lib/auth-types";

export async function logPageView(pagePath: string): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** GA4 recommended login event — counts logins by method (google / invited). */
export async function logLogin(method: AuthProviderType): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, "login", { method });
}
