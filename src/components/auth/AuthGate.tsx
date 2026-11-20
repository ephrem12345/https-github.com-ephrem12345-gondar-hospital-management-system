"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services";
import { isPublicRoute, canAccessRoute } from "@/config/route-permissions";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Client-side authentication and role-based access guard.
 * Blocks unauthenticated users, enforces role isolation, and prevents
 * unauthorized department screens from flashing or rendering.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "authed">("checking");

  useEffect(() => {
    let isMounted = true;

    // 1. Genuinely public routes require no verification
    if (isPublicRoute(pathname)) {
      setStatus("authed");
      return;
    }

    async function verifyAuth() {
      // 2. Check local user state or re-validate with backend
      let user = authService.currentUser();
      if (!user) {
        user = await authService.checkSession();
      }

      if (!isMounted) return;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const normalizedRole = user.role?.toUpperCase().replace(/\s+/g, "_");

      // 3. Strict Patient Portal Isolation: Patients only access patient portal & profile
      if (normalizedRole === "PATIENT") {
        if (!pathname.startsWith("/patient-portal") && pathname !== "/profile") {
          router.replace("/patient-portal");
          return;
        }
      }

      // 4. Staff Isolation: Staff cannot access patient portal
      if (normalizedRole !== "PATIENT" && pathname.startsWith("/patient-portal")) {
        router.replace("/access-denied");
        return;
      }

      // 5. Department & Role RBAC check
      if (!canAccessRoute(pathname, user.role)) {
        router.replace("/access-denied");
        return;
      }

      // 6. Asynchronous session validity check against backend /auth/me
      void authService.checkSession().then((verifiedUser) => {
        if (!isMounted) return;
        if (!verifiedUser) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        } else if (!canAccessRoute(pathname, verifiedUser.role)) {
          router.replace("/access-denied");
        }
      });

      setStatus("authed");
    }

    void verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (status !== "authed") {
    return <LoadingState variant="page" />;
  }
  return <>{children}</>;
}
