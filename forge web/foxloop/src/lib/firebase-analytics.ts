import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

export async function logPageView(pagePath: string): Promise<void> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}
