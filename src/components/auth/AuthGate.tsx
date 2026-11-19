"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Client-side auth guard. Server/edge middleware blocks unauthenticated route
 * access; this prevents protected UI/data from rendering or flashing before a
 * verified session context is available in the browser.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "authed">("checking");

  useEffect(() => {
    if (pathname === "/login") {
      setStatus("authed");
      return;
    }

    const user = authService.currentUser();
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user.role?.toLowerCase() === "patient") {
      router.replace("/patient-portal");
      return;
    }

    setStatus("authed");
  }, [pathname, router]);

  if (status !== "authed") {
    return <LoadingState variant="page" />;
  }
  return <>{children}</>;
}
