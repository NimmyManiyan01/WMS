import { redirect } from "@tanstack/react-router";

export interface UserInfo {
  token: string;
  username: string;
  roles: string[];
  supplierId?: string;
  store_id?: string;
  store_code?: string;
  storeId?: string;
  storeCode?: string;
  employee_id?: string;
  full_name?: string;
}

const AUTH_TOKEN_KEY = "auth_token";
const USER_INFO_KEY = "user_info";

function getActiveStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(AUTH_TOKEN_KEY)) return localStorage;
  if (sessionStorage.getItem(AUTH_TOKEN_KEY)) return sessionStorage;
  return null;
}

export function getAuthToken(): string | null {
  return getActiveStorage()?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function storeAuthSession(user: UserInfo, rememberMe: boolean): void {
  if (typeof window === "undefined") return;
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, user.token);
  storage.setItem(USER_INFO_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(USER_INFO_KEY);
  }
}

export function getUserInfo(): UserInfo | null {
  const info = getActiveStorage()?.getItem(USER_INFO_KEY);
  if (!info) return null;
  try {
    const user = JSON.parse(info) as Partial<UserInfo>;
    if (
      typeof user.token !== "string" ||
      typeof user.username !== "string" ||
      !Array.isArray(user.roles) ||
      !user.roles.every((role) => typeof role === "string")
    ) {
      return null;
    }

    return user as UserInfo;
  } catch {
    return null;
  }
}

export function hasRole(roles: string[] | string): boolean {
  const user = getUserInfo();
  if (!user) return false;
  if (user.roles.includes("ADMIN") || user.roles.includes("SUPERUSER")) return true;
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  return requiredRoles.some((role) => user.roles.includes(role));
}

export function getRequiredRolesForPath(pathname: string): string[] | null {
  if (pathname.startsWith("/admin")) return ["ADMIN", "SUPERUSER"];
  if (
    pathname.startsWith("/procurement") ||
    pathname === "/master-data" ||
    pathname === "/new-supplier"
  )
    return ["PROCUREMENT", "ADMIN", "SUPERUSER"];
  if (pathname.startsWith("/finance")) return ["FINANCE", "ADMIN", "SUPERUSER"];
  if (
    pathname.startsWith("/supplier") ||
    pathname === "/supplier-dashboard" ||
    pathname === "/submit-quotation"
  )
    return ["SUPPLIER", "ADMIN", "SUPERUSER"];
  if (pathname.startsWith("/assembly"))
    return ["ASSEMBLY", "ASSEMBLY_MANAGER", "ADMIN", "SUPERUSER"];
  if (
    pathname === "/gate-dashboard" ||
    pathname === "/gate-entry" ||
    pathname === "/vehicle-exit" ||
    pathname === "/unscheduled-arrivals"
  )
    return ["GATE_SECURITY", "GATE_OPERATOR", "WAREHOUSE", "WAREHOUSE_MANAGER", "ADMIN", "SUPERUSER"];
  if (pathname === "/grn" || pathname === "/receiving")
    return ["GRN", "GRN_MANAGER", "RECEIVING", "WAREHOUSE", "ADMIN", "SUPERUSER"];
  if (pathname === "/warehouse/stores")
    return ["WAREHOUSE", "WAREHOUSE_MANAGER", "ADMIN", "SUPERUSER"];
  if (
    pathname.startsWith("/warehouse") ||
    pathname === "/warehouse-dashboard" ||
    pathname === "/dock-management" ||
    pathname === "/dock-master" ||
    pathname === "/inventory" ||
    pathname === "/putaway-tasks" ||
    pathname === "/reports" ||
    pathname === "/damage-claims"
  )
    return [
      "WAREHOUSE",
      "WAREHOUSE_MANAGER",
      "STORE_MANAGER",
      "STORE_KEEPER",
      "ADMIN",
      "SUPERUSER",
    ];
  if (pathname === "/my-store")
    return ["STORE_MANAGER", "STORE_KEEPER", "ADMIN", "SUPERUSER"];
  return null;
}

export function requireRouteAccess(pathname: string): void {
  requireAuth();
  const requiredRoles = getRequiredRolesForPath(pathname);
  if (requiredRoles && !hasRole(requiredRoles)) {
    throw redirect({ to: getDefaultRouteForUser(getUserInfo()) as any });
  }
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  const user = getUserInfo();
  return Boolean(token?.trim() && user && user.token === token);
}

/**
 * Returns an in-app location only. This prevents a login URL such as
 * `/login?redirect=https://example.com` from sending users off-site.
 */
export function getSafeRedirectPath(redirectPath: unknown): string | null {
  if (
    typeof redirectPath !== "string" ||
    !redirectPath.startsWith("/") ||
    redirectPath.startsWith("//")
  ) {
    return null;
  }

  return redirectPath;
}

export function getDefaultRouteForUser(user = getUserInfo()): string {
  if (user?.roles.includes("ADMIN") || user?.roles.includes("SUPERUSER")) return "/admin/users";
  if (user?.roles.includes("FINANCE")) return "/finance-dashboard";
  if (user?.roles.includes("PROCUREMENT")) return "/procurement-dashboard";
  if (user?.roles.includes("GATE_SECURITY")) return "/gate-entry";
  if (user?.roles.includes("SUPPLIER")) return "/submit-quotation";
  if (user?.roles.includes("ASSEMBLY_MANAGER") || user?.roles.includes("ASSEMBLY") || user?.roles.includes("ASSEMBLY_OPERATOR")) return "/assembly-dashboard";
  if (user?.roles.includes("STORE_MANAGER") || user?.roles.includes("STORE_KEEPER"))
    return "/my-store";
  if (
    user?.roles.includes("GRN") ||
    user?.roles.includes("GRN_MANAGER") ||
    user?.roles.includes("OPERATIONS_MANAGER") ||
    user?.roles.includes("OPERATIONS") ||
    user?.roles.includes("RECEIVING") ||
    user?.username?.toLowerCase() === "grn" ||
    user?.username?.toLowerCase()?.includes("grn")
  ) {
    return "/grn";
  }
  return "/warehouse-dashboard";
}

export function requireAuth() {
  if (typeof window === "undefined") return;
  if (!isAuthenticated()) {
    throw redirect({
      to: "/login",
      search: {
        redirect: window.location.pathname,
      },
    });
  }
}

export function requireRole(roles: string[] | string) {
  if (typeof window === "undefined") return;
  requireAuth();
  if (!hasRole(roles)) {
    // If they are authenticated but don't have the role, send them to their primary dashboard
    const user = getUserInfo();
    const primaryRole = user?.roles[0];

    throw redirect({ to: getDefaultRouteForUser(user) as any });
  }
}
