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
  const pathname = usePathname() ?? "";
  const [status, setStatus] = useState<"checking" | "authed" | "denied">("checking");

  useEffect(() => {
    let isMounted = true;

    // 1. Explicitly public routes require no backend verification
    if (isPublicRoute(pathname)) {
      setStatus("authed");
      return;
    }

    // Reset status to checking whenever navigating between protected routes
    setStatus("checking");

    async function verifyAuth() {
      try {
        // 2. Strict backend session verification: never trust localStorage alone.
        // Calls /auth/me with HTTP-only cookies; if 401, apiClient automatically attempts /auth/refresh
        const user = await authService.checkSession();

        if (!isMounted) return;

        if (!user) {
          setStatus("denied");
          const safeNext = encodeURIComponent(pathname);
          router.replace(`/login?next=${safeNext}`);
          return;
        }

        const normalizedRole = user.role?.toUpperCase().replace(/\s+/g, "_");

        // 3. Strict Patient Portal Isolation: Patients only access patient portal & profile
        if (normalizedRole === "PATIENT") {
          if (!pathname.startsWith("/patient-portal") && pathname !== "/profile") {
            setStatus("denied");
            router.replace("/patient-portal");
            return;
          }
        }

        // 4. Staff Isolation: Staff cannot access patient portal
        if (normalizedRole !== "PATIENT" && pathname.startsWith("/patient-portal")) {
          setStatus("denied");
          router.replace("/access-denied");
          return;
        }

        // 5. Department & Role RBAC check against the backend-verified user role
        if (!canAccessRoute(pathname, user.role)) {
          setStatus("denied");
          router.replace("/access-denied");
          return;
        }

        // 6. Verification and authorization succeed: render protected content
        setStatus("authed");
      } catch {
        if (!isMounted) return;
        setStatus("denied");
        router.replace("/login");
      }
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
