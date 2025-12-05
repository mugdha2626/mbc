import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Smart back navigation that handles cases where the app was opened
 * from an external link (e.g., Farcaster cast) with no history.
 *
 * If there's history, it goes back. Otherwise, it navigates to the fallback route.
 */
export function navigateBack(
  router: AppRouterInstance,
  fallbackRoute: string = "/"
) {
  // Check if we have meaningful history to go back to
  // history.length includes the current page, so > 2 means there's at least one page before
  if (typeof window !== "undefined" && window.history.length > 2) {
    router.back();
  } else {
    // No history (opened from external link) - go to fallback
    router.push(fallbackRoute);
  }
}

/**
 * Check if the app was likely opened from an external source
 * (no meaningful navigation history)
 */
export function isExternalEntry(): boolean {
  if (typeof window === "undefined") return false;
  return window.history.length <= 2;
}
