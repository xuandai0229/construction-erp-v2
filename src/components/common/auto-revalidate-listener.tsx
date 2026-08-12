"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REVALIDATE_THROTTLE_MS = 8000; // 8 seconds minimum between auto-refreshes

export function AutoRevalidateListener() {
  const router = useRouter();
  const lastRefreshTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const triggerRefresh = (reason: string) => {
      const now = Date.now();
      if (now - lastRefreshTimeRef.current > REVALIDATE_THROTTLE_MS) {
        lastRefreshTimeRef.current = now;
        try {
          router.refresh();
        } catch {
          // Ignore background refresh errors
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh("visibilitychange");
      }
    };

    const handleFocus = () => {
      triggerRefresh("focus");
    };

    const handleOnline = () => {
      triggerRefresh("online");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  return null;
}
