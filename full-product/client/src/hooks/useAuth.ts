import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { PLATFORM_ADMIN_ROLES } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export type ImpersonationState = {
  active: boolean;
  realUser: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
} | null;

export function useAuth() {
  const { data: user, isLoading } = useQuery<
    (User & { impersonation?: ImpersonationState }) | null
  >({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<(User & { impersonation?: ImpersonationState }) | null>({
      on401: "returnNull",
    }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const impersonation: ImpersonationState = user?.impersonation || null;
  const isImpersonating = !!impersonation?.active;

  const isTeacher = user?.role === "teacher" || user?.role === "lmsAdmin";
  // While impersonating we use the EFFECTIVE user's flags so the UI matches
  // what the impersonated user would see. The "real" head-admin status is
  // tracked separately for showing the View-as switcher.
  const isHeadAdmin = user?.isHeadAdmin === true;
  const isRealHeadAdmin = isImpersonating ? true : isHeadAdmin;
  const isLmsAdmin = user?.role === "lmsAdmin" || isHeadAdmin;
  const isEventAdmin = user?.role === "eventAdmin" || isHeadAdmin;
  const isInnoLabsAdmin = user?.role === "innoLabsAdmin" || isHeadAdmin;
  const isPlatformAdmin = isHeadAdmin || (!!user?.role && (PLATFORM_ADMIN_ROLES as readonly string[]).includes(user.role));
  const isFrozen = user?.isFrozen === true;
  const canFreezeUsers = isEventAdmin || isHeadAdmin;
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTeacher,
    isHeadAdmin,
    isRealHeadAdmin,
    isImpersonating,
    impersonation,
    isLmsAdmin,
    isEventAdmin,
    isInnoLabsAdmin,
    isPlatformAdmin,
    isTeacherOrAdmin: isTeacher || isHeadAdmin,
    isFrozen,
    canFreezeUsers,
  };
}
