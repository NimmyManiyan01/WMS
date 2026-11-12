import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  ListOrdered,
  Warehouse,
  PackageCheck,
  FileCheck2,
  Boxes,
  BarChart3,
  Database,
  Settings,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  Building2,
  FileText,
  ClipboardList,
  FileQuestion,
  FileBadge,
  Loader2,
  ShieldCheck,
  Sliders,
  PanelLeftClose,
  Menu,
  AlertTriangle,
  QrCode,
  PlusCircle,
  Store,
  ShieldAlert,
  DoorOpen,
  Factory,
  Users,
  Inbox,
  GitFork,
  Navigation,
  MapPin,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import logoUrl from "@/assets/Logo.png";
import { getUserInfo, type UserInfo } from "@/lib/auth-utils";
import { SecureAssistant } from "@/components/wms/secure-assistant";

function getUserDisplayName(user: UserInfo | null): string {
  if (!user) return "User";
  if (user.full_name?.trim()) return user.full_name.trim();
  if (user.username?.trim()) return user.username.trim();
  if (user.employee_id?.trim()) return user.employee_id.trim();
  return "User";
}

function getUserInitials(user: UserInfo | null): string {
  const name = getUserDisplayName(user);
  if (!name || name === "User") return "U";
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getUserRoleLabel(user: UserInfo | null): string {
  if (!user?.roles || user.roles.length === 0) return "User";
  const roles = user.roles;
  if (roles.includes("ADMIN") || roles.includes("SUPERUSER") || roles.includes("SUPER_ADMIN")) {
    return "Administrator";
  }
  if (
    roles.includes("PROCUREMENT") ||
    roles.includes("PROCUREMENT_MANAGER") ||
    roles.includes("PROCUREMENT_OFFICER")
  ) {
    return "Procurement Manager";
  }
  if (roles.includes("FINANCE") || roles.includes("FINANCE_MANAGER")) {
    return "Finance Manager";
  }
  if (roles.includes("GATE_SECURITY") || roles.includes("GATE_OPERATOR")) {
    return "Security Officer";
  }
  if (
    roles.includes("GRN") ||
    roles.includes("GRN_MANAGER") ||
    roles.includes("OPERATIONS_MANAGER") ||
    roles.includes("OPERATIONS") ||
    roles.includes("RECEIVING") ||
    user?.username?.toLowerCase() === "grn" ||
    user?.username?.toLowerCase()?.includes("grn")
  ) {
    return "GRN / Operations Manager";
  }
  if (roles.includes("STORE_MANAGER")) {
    return "Store Manager";
  }
  if (roles.includes("STORE_KEEPER") || roles.includes("STORE_OPERATOR")) {
    return "Store Keeper";
  }
  if (roles.includes("ASSEMBLY") || roles.includes("ASSEMBLY_MANAGER")) {
    return "Assembly Manager";
  }
  if (roles.includes("DISPATCH") || roles.includes("DISPATCH_MANAGER")) {
    return "Dispatch Manager";
  }
  if (roles.includes("SUPPLIER")) {
    return "Supplier";
  }
  if (roles.includes("WAREHOUSE") || roles.includes("WAREHOUSE_MANAGER")) {
    return "Warehouse Manager";
  }
  return roles[0].replace(/_/g, " ");
}

const grnNav = [
  { label: "Dashboard", to: "/grn?tab=dashboard", icon: LayoutDashboard },
  { label: "Create GRN", to: "/grn?tab=wizard", icon: PlusCircle },
  { label: "GRN History", to: "/grn?tab=records", icon: ClipboardList },
];

const dispatchNav = [
  { label: "Dashboard", to: "/dispatch", icon: LayoutDashboard },
  { label: "Dispatch Orders", to: "/dispatch-orders", icon: ClipboardList },
  { label: "Picking & Packing", to: "/dispatch-picking-packing", icon: PackageCheck },
  { label: "Transport Allocation", to: "/dispatch-transport-allocation", icon: Truck },
  { label: "Driver Master", to: "/dispatch-drivers", icon: Users },
  { label: "Vehicle Master", to: "/dispatch-vehicles", icon: Warehouse },
  { label: "Loading", to: "/dispatch-loading", icon: Navigation },
  { label: "Gate Out", to: "/dispatch-gate-out", icon: DoorOpen },
  { label: "In Transit", to: "/dispatch-transit", icon: MapPin },
  { label: "Exceptions", to: "/dispatch-exceptions", icon: AlertTriangle },
  { label: "Reports", to: "/dispatch-reports", icon: BarChart3 },
];

const storeManagerNav = [
  { label: "My Store", to: "/my-store", icon: Store },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Putaway Tasks", to: "/putaway-tasks", icon: PackageCheck },
  { label: "Assembly Requisitions", to: "/warehouse/assembly-requisitions", icon: ClipboardList },
];

const assemblyNav = [
  { label: "Dashboard", to: "/assembly-dashboard", icon: LayoutDashboard },
  { label: "Finished Goods Requests", to: "/assembly/finished-goods-requests", icon: PackageCheck },
  { label: "Material Requests", to: "/assembly/requests", icon: ClipboardList },
  { label: "Material/Pickup Status", to: "/assembly-material-issues", icon: PackageCheck },
  { label: "Assembly Orders", to: "/assembly-orders", icon: Factory },
  { label: "Production", to: "/assembly-progress", icon: ListOrdered },
  { label: "Finished Goods", to: "/assembly-finished-goods", icon: Boxes },
  { label: "Genealogy", to: "/assembly-genealogy", icon: GitFork },
];

const warehouseNav = [
  { label: "Dashboard", to: "/warehouse-dashboard", icon: LayoutDashboard },
  { label: "Store Master", to: "/warehouse/stores", icon: Building2 },
  { label: "Material Master", to: "/warehouse/materials", icon: Database },
  { label: "Finished Goods Store", to: "/warehouse/finished-goods-store", icon: PackageCheck },
  { label: "Finished Goods Requests", to: "/warehouse/finished-goods-requests", icon: Boxes },
  { label: "Material Requests", to: "/warehouse/material-requests", icon: ClipboardList },
  { label: "Dock Management", to: "/dock-management", icon: Warehouse },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Putaway Tasks", to: "/putaway-tasks", icon: PackageCheck },
  { label: "Assembly Requisitions", to: "/warehouse/assembly-requisitions", icon: ClipboardList },
  { label: "Damage & Quarantine", to: "/warehouse/quarantine", icon: ShieldAlert },
  { label: "Finished Goods Dispatch", to: "/warehouse/dispatch-tracking", icon: Truck },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

const procurementNav = [
  { label: "Dashboard", to: "/procurement-dashboard", icon: LayoutDashboard },
  { label: "Finished Goods Requests", to: "/procurement/finished-goods", icon: Boxes },
  { label: "Material Requests", to: "/procurement/material-requests", icon: ClipboardList },
  { label: "Suppliers", to: "/master-data", icon: Building2 },
  { label: "RFQs", to: "/procurement/rfqs", icon: FileQuestion },
  { label: "Quotations", to: "/procurement/quotations", icon: FileBadge },
  { label: "Purchase Orders", to: "/procurement/purchase-orders", icon: FileText, hasSubmenu: true },
  { label: "ASNs", to: "/procurement/asns", icon: Truck },
  { label: "Damage Claims", to: "/damage-claims", icon: ShieldAlert },
  { label: "Procurement Reports", to: "/procurement/reports", icon: BarChart3 },


];

const supplierNav = [
  { label: "Dashboard", to: "/supplier-dashboard", icon: LayoutDashboard },
  { label: "Quotation Portal", to: "/submit-quotation", icon: FileBadge },
  { label: "ASNs", to: "/supplier/asns/new", icon: Truck },
];

const financeNav = [
  { label: "Dashboard", to: "/finance-dashboard", icon: LayoutDashboard },
  { label: "Pending Approvals", to: "/finance/approvals", icon: FileCheck2 },
  { label: "Finance Reports", to: "/procurement/reports", icon: BarChart3 },
];

const managerNav = [
  { label: "Dashboard", to: "/manager-dashboard", icon: LayoutDashboard },
  {
    label: "Suppliers",
    to: "/master-data?module=manager&status=pending-approval",
    icon: Building2,
  },
  {
    label: "Material Requests",
    to: "/procurement/material-requests?module=manager&status=manager-approval",
    icon: ClipboardList,
  },
];

const gateSecurityNav = [
  { label: "Dashboard", to: "/gate-dashboard", icon: LayoutDashboard },
  { label: "Gate Entry", to: "/gate-entry", icon: ShieldCheck },
  { label: "Inbound Arrivals", to: "/vehicle-queue", icon: Truck },
  { label: "Outbound Arrivals", to: "/vehicle-exit", icon: Truck },
  { label: "Gate Exit", to: "/dispatch-gate-exit", icon: LogOut },
];

const adminNav = [
  { label: "User Management", to: "/admin/users", icon: Users },
  { label: "Warehouse", to: "/warehouse-dashboard", icon: Warehouse },
  { label: "Procurement", to: "/procurement-dashboard", icon: ClipboardList },
  { label: "Finance", to: "/finance-dashboard", icon: FileCheck2 },
  { label: "Finance Reports", to: "/procurement/reports", icon: BarChart3 },
];

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Building2,
  ClipboardList,
  FileQuestion,
  FileBadge,
  FileText,
  Truck,
  AlertTriangle,
  FileCheck2,
  DoorOpen,
  LogOut,
  ListOrdered,
  Boxes,
  Factory,
  Users,
  BarChart3,
  Settings,
  Warehouse,
  Database,
  PackageCheck,
  ShieldCheck,
  QrCode,
  Bell,
  Inbox,
  Store,
  ShieldAlert,
  PlusCircle,
};

function getIconComponent(iconName: any) {
  if (typeof iconName !== "string") return iconName || LayoutDashboard;
  return ICON_MAP[iconName] || LayoutDashboard;
}

function hasUserRole(user: { roles?: string[] } | null, role: string): boolean {
  return Boolean(user?.roles?.includes(role));
}

function isGrnSession(user: { username?: string; roles?: string[] } | null): boolean {
  const username = user?.username?.toLowerCase() ?? "";
  return Boolean(
    user?.roles?.some((role) =>
      ["GRN", "GRN_MANAGER", "OPERATIONS_MANAGER", "OPERATIONS", "RECEIVING"].includes(role),
    ) ||
    username === "grn" ||
    username.includes("grn"),
  );
}

function isDispatchSession(user: { username?: string; roles?: string[] } | null): boolean {
  const username = user?.username?.toLowerCase() ?? "";
  return Boolean(
    user?.roles?.some((role) =>
      ["DISPATCH", "DISPATCH_MANAGER", "DISPATCH_OFFICER", "DISPATCH_OPERATOR"].includes(role),
    ) ||
    username === "dispatch" ||
    username.includes("dispatch"),
  );
}

function getNotificationRole(user: { username?: string; roles?: string[] } | null): string {
  if (hasUserRole(user, "SUPPLIER")) return "SUPPLIER";
  if (hasUserRole(user, "FINANCE")) return "FINANCE";
  if (hasUserRole(user, "PROCUREMENT")) return "PROCUREMENT";
  if (hasUserRole(user, "MANAGER")) return "MANAGER";
  if (hasUserRole(user, "GATE_SECURITY")) return "GATE_SECURITY";
  if (hasUserRole(user, "ASSEMBLY") || hasUserRole(user, "ASSEMBLY_MANAGER"))
    return "ASSEMBLY_MANAGER";
  if (isDispatchSession(user)) return "DISPATCH";
  if (isGrnSession(user)) return "GRN";
  return "WAREHOUSE";
}

function getStrictRoleNav(user: { username?: string; roles?: string[] } | null): NavItem[] {
  if (!user) return [];
  if (hasUserRole(user, "ADMIN") || hasUserRole(user, "SUPERUSER")) return adminNav;
  if (hasUserRole(user, "PROCUREMENT")) return procurementNav;
  if (hasUserRole(user, "MANAGER")) return managerNav;
  if (hasUserRole(user, "SUPPLIER")) return supplierNav;
  if (hasUserRole(user, "FINANCE")) return financeNav;
  if (hasUserRole(user, "GATE_SECURITY") || hasUserRole(user, "GATE_OPERATOR"))
    return gateSecurityNav;
  if (hasUserRole(user, "ASSEMBLY") || hasUserRole(user, "ASSEMBLY_MANAGER")) return assemblyNav;
  if (hasUserRole(user, "STORE_MANAGER") || hasUserRole(user, "STORE_KEEPER"))
    return storeManagerNav;
  if (isDispatchSession(user)) return dispatchNav;
  if (isGrnSession(user)) return grnNav;
  return warehouseNav;
}

function getRoleLabel(user: { username?: string; roles?: string[] } | null): string {
  if (hasUserRole(user, "ADMIN") || hasUserRole(user, "SUPERUSER")) return "Administrator";
  if (hasUserRole(user, "PROCUREMENT")) return "Procurement Manager";
  if (hasUserRole(user, "MANAGER")) return "Manager";
  if (hasUserRole(user, "FINANCE")) return "Finance Manager";
  if (hasUserRole(user, "GATE_SECURITY")) return "Security Officer";
  if (hasUserRole(user, "ASSEMBLY") || hasUserRole(user, "ASSEMBLY_MANAGER"))
    return "Assembly Manager";
  if (hasUserRole(user, "STORE_MANAGER")) return "Store Manager";
  if (hasUserRole(user, "STORE_KEEPER")) return "Store Keeper";
  if (isDispatchSession(user)) return "Dispatch Manager";
  if (isGrnSession(user)) return "GRN / Operations Manager";
  return "Operations Manager";
}

function getModuleBreadcrumb(pathname: string): string {
  if (pathname.startsWith("/procurement") || pathname === "/master-data" || pathname === "/new-supplier") return "Procurement";
  if (pathname.startsWith("/gate") || pathname.startsWith("/vehicle")) return "Gate Security";
  if (pathname.startsWith("/dock")) return "Dock Management";
  if (pathname.startsWith("/grn") || pathname.startsWith("/receiving")) return "Receiving & GRN";
  if (pathname.startsWith("/warehouse") || pathname === "/inventory" || pathname === "/my-store" || pathname === "/putaway-tasks") return "Warehouse";
  if (pathname.startsWith("/assembly")) return "Assembly";
  if (pathname.startsWith("/dispatch")) return "Dispatch";
  if (pathname.startsWith("/finance")) return "Finance";
  if (pathname.startsWith("/supplier")) return "Supplier Portal";
  if (pathname.startsWith("/admin")) return "Administration";
  return "Overview";
}

function getEnterpriseSubtitle(pathname: string): string {
  if (pathname.startsWith("/procurement") || pathname === "/master-data" || pathname === "/new-supplier") return "Enterprise Procurement";
  if (pathname.startsWith("/warehouse") || pathname === "/inventory" || pathname === "/my-store" || pathname === "/putaway-tasks") return "Enterprise Warehouse";
  if (pathname.startsWith("/assembly")) return "Enterprise Assembly";
  if (pathname.startsWith("/dispatch")) return "Enterprise Dispatch";
  if (pathname.startsWith("/gate") || pathname.startsWith("/vehicle")) return "Enterprise Security";
  if (pathname.startsWith("/finance")) return "Enterprise Finance";
  if (pathname.startsWith("/supplier")) return "Enterprise Supplier";
  if (pathname.startsWith("/admin")) return "Enterprise Administration";
  return "Enterprise Platform";
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  mainClassName,
}: {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  mainClassName?: string;
}) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarFocused, setSidebarFocused] = useState(false);
  const sidebarCollapsed = !sidebarHovered && !sidebarFocused;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setUser(getUserInfo());
  }, []);
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const isFinishedGoodsPage = path === "/procurement/finished-goods";
  const searchStr = location.searchStr || "";
  const fullHref = path + searchStr;
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const query = searchTerm.trim();
    let cancelled = false;
    setSearchResults([]);
    setSearchError("");
    setIsSearching(query.length >= 2);
    if (query.length < 2) {
      setShowSearch(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.globalSearch(query);
        if (!cancelled) setSearchResults(data.results ?? []);
      } catch {
        if (!cancelled) setSearchError("Record search is unavailable. Check that the backend service is running and try again.");
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const isGrnUser =
    mounted &&
    (user?.roles?.includes("GRN") ||
      user?.roles?.includes("GRN_MANAGER") ||
      user?.roles?.includes("OPERATIONS_MANAGER") ||
      user?.roles?.includes("OPERATIONS") ||
      user?.roles?.includes("RECEIVING") ||
      user?.username?.toLowerCase() === "grn" ||
      user?.username?.toLowerCase()?.includes("grn"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    let cleanup: (() => void) | undefined;
    try {
      const u = getUserInfo();
      setUser(u);
      if (u) {
        const notifRole = getNotificationRole(u);
        const fetchNotifications = async () => {
          try {
            if (notifRole === "WAREHOUSE" || notifRole === "GRN" || isGrnUser) {
              const [arrivals, general] = await Promise.all([
                api.getArrivalNotifications().catch(() => []),
                api.getNotifications("GRN").catch(() => []),
              ]);
              const unreadArrivals = Array.isArray(arrivals)
                ? arrivals.filter((n) => String(n?.status || "").toUpperCase() !== "ACKNOWLEDGED")
                    .length
                : 0;
              const unreadGeneral = Array.isArray(general)
                ? general.filter((n) => !(n?.is_read ?? n?.isRead)).length
                : 0;
              setUnreadNotifications(unreadArrivals + unreadGeneral);
            } else {
              const data = await api.getNotifications(notifRole);
              setUnreadNotifications(
                Array.isArray(data) ? data.filter((n) => !(n?.is_read ?? n?.isRead)).length : 0,
              );
            }
          } catch {
            // Silently ignore during background polling
          }
        };
        void fetchNotifications();
        const interval = window.setInterval(fetchNotifications, 2000);
        window.addEventListener("notifications:refresh", fetchNotifications);
        window.addEventListener("focus", fetchNotifications);
        cleanup = () => {
          window.clearInterval(interval);
          window.removeEventListener("notifications:refresh", fetchNotifications);
          window.removeEventListener("focus", fetchNotifications);
        };
      }
    } catch (e) {
      console.error("Failed to parse user info", e);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [dark, isGrnUser]);
  const isAssemblyUser =
    mounted &&
    (user?.roles?.includes("ASSEMBLY") ||
      user?.roles?.includes("ASSEMBLY_MANAGER") ||
      user?.roles?.includes("ASSEMBLY_OPERATOR"));
  const isAssemblyRoute =
    path === "/assembly-dashboard" ||
    path === "/assembly-orders" ||
    path.startsWith("/assembly/") ||
    path === "/assembly-material-issues" ||
    path === "/assembly-progress" ||
    path === "/assembly-finished-goods" ||
    path === "/assembly-genealogy" ||
    path === "/assembly-reports";
  const isStoreUser =
    mounted && (user?.roles?.includes("STORE_MANAGER") || user?.roles?.includes("STORE_KEEPER"));
  const isStoreRoute = path === "/my-store" || path.startsWith("/my-store");
  const isGrnRoute = path === "/grn" || path.startsWith("/grn");
  const isProcurementRoute =
    path === "/procurement-dashboard" ||
    path.startsWith("/procurement/") ||
    path === "/master-data" ||
    path === "/new-supplier" ||
    (path.startsWith("/supplier/") && !path.startsWith("/supplier/asns/"));
  const isSupplierRoute = path === "/supplier-dashboard" || path === "/submit-quotation";
  const isFinanceUser = mounted && user?.roles?.includes("FINANCE");
  const isSharedFinanceRoute = path === "/procurement/reports";
  const isFinanceRoute =
    path === "/finance-dashboard" ||
    path.startsWith("/finance/") ||
    (isFinanceUser && isSharedFinanceRoute);
  const isGateSecurityUser =
    mounted && (user?.roles?.includes("GATE_SECURITY") || user?.roles?.includes("GATE_OPERATOR"));
  const isDispatchUser =
    mounted &&
    (user?.roles?.includes("DISPATCH") ||
      user?.roles?.includes("DISPATCH_MANAGER") ||
      user?.username?.toLowerCase() === "dispatch");
  const isDispatchRoute =
    path === "/dispatch" || path.startsWith("/dispatch-") || path.startsWith("/dispatch/");
  const isAdminUser =
    mounted && (user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPERUSER"));
  const isNotificationsRoute = path.startsWith("/notifications");
  const isAdminRoute = path.startsWith("/admin/");
  const isSharedOperationsRoute = ["/warehouse-dashboard", "/vehicle-exit"].some((route) =>
    path.startsWith(route),
  );
  const isWarehouseRoute =
    isSharedOperationsRoute ||
    path.startsWith("/warehouse") ||
    ["/inventory", "/dock-management", "/receiving", "/putaway-tasks", "/reports"].some((p) =>
      path.startsWith(p),
    );
  const isGateSecurityRoute =
    [
      "/gate-entry",
      "/vehicle-queue",
      "/vehicle-exit",
      "/gate-dashboard",
      "/accept-arrival",
      "/driver-verification",
      "/vehicle-verification",
      "/dock-assignment",
      "/arrival-success",
    ].some((route) => path.startsWith(route)) ||
    (isGateSecurityUser && (isSharedOperationsRoute || isNotificationsRoute));
  const resolvedNav =
    isAdminRoute || isAdminUser
      ? adminNav
      : isDispatchUser || isDispatchRoute
        ? dispatchNav
        : isAssemblyUser || isAssemblyRoute
          ? assemblyNav
          : isStoreUser || isStoreRoute
            ? storeManagerNav
            : isGrnUser || isGrnRoute
              ? grnNav
              : isSupplierRoute
                ? supplierNav
                : isFinanceRoute
                  ? financeNav
                  : isProcurementRoute
                    ? procurementNav
                    : isGateSecurityRoute
                      ? gateSecurityNav
                      : isWarehouseRoute
                        ? warehouseNav
                        : mounted && user?.roles?.includes("DISPATCH")
                          ? dispatchNav
                          : mounted && user?.roles?.includes("ASSEMBLY")
                            ? assemblyNav
                            : mounted && user?.roles?.includes("SUPPLIER")
                              ? supplierNav
                              : mounted && user?.roles?.includes("FINANCE")
                                ? financeNav
                                : mounted && user?.roles?.includes("PROCUREMENT")
                                  ? procurementNav
                                  : isGateSecurityUser
                                    ? gateSecurityNav
                                    : warehouseNav;
  const navigationPending = !mounted && (isSharedOperationsRoute || isSharedFinanceRoute);
  const nav = navigationPending ? [] : resolvedNav;
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [fullHref]);
  const isActiveNavItem = (to: string) => {
    if (to.includes("?")) {
      const [targetPath, targetQuery] = to.split("?");
      const targetParams = new URLSearchParams(targetQuery);
      const targetTab = targetParams.get("tab");
      const targetPage = targetParams.get("page");
      const targetModule = targetParams.get("module");
      const currentParams = new URLSearchParams(searchStr);
      const currentTab = currentParams.get("tab") || (path === "/grn" ? "dashboard" : "");
      const currentPage = currentParams.get("page") || "";
      const currentModule = currentParams.get("module") || "";
      if (targetPage && targetTab) {
        return path === targetPath && targetTab === currentTab && targetPage === currentPage;
      }
      if (targetTab) {
        return (
          path === targetPath &&
          targetTab === currentTab &&
          (!targetPage || !currentPage || targetTab !== "wizard")
        );
      }
      if (targetModule) {
        return (
          path === targetPath &&
          (targetModule === currentModule || (!currentModule && targetModule === "warehouse"))
        );
      }
      return fullHref === to || (searchStr ? fullHref.startsWith(to) : to === "/grn?tab=dashboard");
    }
    return (
      path === to ||
      (to !== "/dashboard" &&
        to !== "/dispatch" &&
        to !== "/gate" &&
        (path.startsWith(to + "/") || path.startsWith(to + "?")))
    );
  };
  const query = searchTerm.trim().toLowerCase();
  const matchingPages = query.length >= 2 ? nav
    .filter((item) => `${item.label} ${item.to}`.toLowerCase().includes(query))
    .slice(0, 6)
    .map((item) => ({ id: item.to, type: "PAGE", title: item.label, subtitle: "Open page", link: item.to })) : [];
  const visibleSearchResults = [...matchingPages, ...searchResults];
  const desktopSidebarCollapsed = sidebarCollapsed;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-[min(84vw,280px)] flex-col border-r border-[#102D57] bg-[#071D3B] text-slate-200 shadow-2xl">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-[#102D57] px-4">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/kaizenx-cube.png"
                  alt="KaizenX Logo"
                  className="size-8 object-contain shrink-0 drop-shadow"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold tracking-tight text-white leading-tight">KaizenX</p>
                  <p className="truncate text-[10px] font-medium text-[#8FA3BF]">Pune DC · Plant 1200</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                className="grid size-9 place-items-center rounded-xl text-[#8FA3BF] transition-colors hover:bg-[#102D57] hover:text-white"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <PanelLeftClose className="size-[18px]" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {navigationPending &&
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-xl bg-white/5" />
                ))}
              {nav.map((item) => {
                const active = isActiveNavItem(item.to);
                return (
                  <Link
                    key={`${item.label}-${item.to}`}
                    to={item.to as any}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileSidebarOpen(false);
                      void navigate({ to: item.to as any });
                    }}
                    title={item.label}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-[#0866FF] text-white shadow-xs font-semibold"
                        : "text-[#8FA3BF] hover:bg-[#102D57] hover:text-white",
                    )}
                  >
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-[#8FA3BF] group-hover:text-white")} />
                    <span className="truncate">{item.label}</span>
                    {(item as any).badge && (
                      <span className="ml-auto grid size-5 place-items-center rounded-full bg-[#E5484D] text-[10px] font-semibold text-white">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

          </aside>
        </div>
      )}

      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        onFocusCapture={() => setSidebarFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setSidebarFocused(false);
          }
        }}
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#102D57] bg-[#071D3B] text-slate-300 transition-[width] duration-200 md:flex z-30",
          desktopSidebarCollapsed ? "w-[72px]" : isFinishedGoodsPage ? "w-[288px]" : "w-[268px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-[#102D57] transition-all",
            desktopSidebarCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
          )}
        >
          {!desktopSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/kaizenx-cube.png"
                alt="KaizenX Logo"
                className="size-8 object-contain shrink-0 drop-shadow"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-tight text-white leading-tight">
                  KaizenX
                </p>
                <p className="truncate text-[11px] font-medium text-[#8FA3BF]">
                  {getEnterpriseSubtitle(path)}
                </p>
              </div>
            </div>
          ) : (
            <img
              src="/kaizenx-cube.png"
              alt="KaizenX Logo"
              className="size-8 object-contain shrink-0 drop-shadow"
            />
          )}
        </div>

        <TooltipProvider delayDuration={100}>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {navigationPending &&
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-xl bg-white/5" />
              ))}
            {nav.map((item: any) => {
              const active = isActiveNavItem(item.to);
              const sectionHeader = item.section && !desktopSidebarCollapsed ? (
                <div key={`section-${item.section}`} className="pt-4 pb-1.5 px-3.5 text-[11px] font-bold tracking-wider text-[#6B82A6] uppercase">
                  {item.section}
                </div>
              ) : null;
              const navLink = (
                <Link
                  key={`${item.label}-${item.to}`}
                  to={item.to as any}
                  onClick={(e) => {
                    e.preventDefault();
                    void navigate({ to: item.to as any });
                  }}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all",
                    desktopSidebarCollapsed ? "justify-center px-0 size-11 mx-auto" : "px-3.5",
                    active
                      ? "bg-[#0866FF] text-white shadow-xs font-semibold"
                      : "text-[#8FA3BF] hover:bg-[#102D57] hover:text-white",
                  )}
                >
                  <item.icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-[#8FA3BF] group-hover:text-white")} />
                  {!desktopSidebarCollapsed && <span className={isFinishedGoodsPage ? "leading-5" : "truncate"}>{item.label}</span>}
                  {!desktopSidebarCollapsed && item.hasSubmenu && (
                    <ChevronRight className="ml-auto size-3.5 text-[#526580] group-hover:text-white transition-colors" />
                  )}
                  {!desktopSidebarCollapsed && item.badge && (
                    <span className="ml-auto grid size-5 place-items-center rounded-full bg-[#E5484D] text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              return (
                <Fragment key={`${item.label}-${item.to}`}>
                  {sectionHeader}
                  {desktopSidebarCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-semibold text-xs border-[#102D57] bg-[#071D3B] text-white shadow-lg">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  )}
                </Fragment>
              );
            })}
          </nav>

        </TooltipProvider>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#DCE6F3] bg-white shadow-xs">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-7">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileSidebarOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#DCE6F3] bg-white text-[#526580] hover:bg-slate-50 hover:text-[#101D3A] md:hidden shadow-2xs"
            >
              <Menu className="size-5" />
            </button>

            <div className="relative flex min-w-0 max-w-md flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 z-[51] size-4 text-[#526580]" />
              <input
                ref={searchInputRef}
                aria-label="Global search"
                suppressHydrationWarning
                placeholder="Search truck no, PO, vendor, gate entry…"
                className="relative z-50 h-10 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-9 pr-14 text-sm text-[#101D3A] outline-none transition-all placeholder:text-[#8FA3BF] focus:bg-white focus:border-[#0866FF] focus:ring-2 focus:ring-[#0866FF]/20"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(e.target.value.trim().length >= 2);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && visibleSearchResults.length > 0) {
                    e.preventDefault();
                    void navigate({ to: visibleSearchResults[0].link as any });
                    setShowSearch(false);
                    setSearchTerm("");
                  }
                }}
                onFocus={() => searchTerm.trim().length >= 2 && setShowSearch(true)}
              />
              <kbd className="pointer-events-none absolute right-3 z-[51] hidden rounded-md border border-[#DCE6F3] bg-white px-1.5 py-0.5 text-[10px] text-[#526580] lg:block">
                {isSearching ? <Loader2 className="size-3 animate-spin" /> : "Ctrl + K"}
              </kbd>

              {showSearch && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] max-h-[480px] overflow-y-auto z-50 rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                      {isSearching && <p role="status" className="px-4 py-3 text-sm text-muted-foreground">Searching records...</p>}
                      {searchError && <p role="alert" className="px-4 py-3 text-sm text-red-600">{searchError}</p>}
                      {visibleSearchResults.length > 0 ? (
                        <div className="space-y-1">
                          {visibleSearchResults.map((result) => (
                            <Link
                              key={`${result.type}-${result.id}`}
                              to={result.link}
                              onClick={() => {
                                setShowSearch(false);
                                setSearchTerm("");
                              }}
                              className="flex flex-col gap-0.5 rounded-xl px-4 py-2.5 transition-colors hover:bg-accent"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold tracking-tight">
                                  {result.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-black uppercase py-0 leading-tight border-primary/20 text-primary bg-primary-soft/30"
                                >
                                  {result.type.replace("_", " ")}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {result.subtitle}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : !isSearching && !searchError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                          <Search className="mb-2 size-8 opacity-20" />
                          <p className="text-sm font-medium">No results found for "{searchTerm}"</p>
                          <p className="text-xs">Try a page name, truck number, PO, ASN, vendor or gate entry</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/notifications"
                aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : "Notifications"}
                className="relative grid size-10 place-items-center rounded-xl text-[#526580] transition-colors hover:bg-[#EBF3FF] hover:text-[#0866FF] focus:bg-transparent focus-visible:outline-none"
              >
                <Bell className="size-5" aria-hidden="true" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white pointer-events-none">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#DCE6F3] bg-white px-2.5 py-1.5 shadow-xs">
                <span
                  suppressHydrationWarning
                  className="grid size-8 place-items-center rounded-full bg-[#0866FF] text-xs font-bold text-white shadow-xs"
                >
                  {getUserInitials(user)}
                </span>
                <div className="hidden leading-tight lg:block text-left">
                  <p suppressHydrationWarning className="text-xs font-bold text-[#101D3A]">
                    {getUserDisplayName(user)}
                  </p>
                  <p suppressHydrationWarning className="text-[10px] font-medium text-[#526580]">
                    {getUserRoleLabel(user)}
                  </p>
                </div>
                <button
                  type="button"
                  className="ml-1 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  onClick={() => {
                    api.logout();
                    setUser(null);
                    void navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={`page-enter flex-1 px-4 py-6 lg:px-8 ${mainClassName || ""}`}>
          <div className="wms-page-content mx-auto w-full max-w-[1536px]">
            {(title || subtitle || actions || breadcrumbs) && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
                <div className="min-w-0">
                  {breadcrumbs ? (
                    <div className="mb-2">{breadcrumbs}</div>
                  ) : title ? (
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-100/75">
                      <span>{getModuleBreadcrumb(path)}</span>
                      <ChevronRight className="size-3 text-blue-200/70" />
                      <span className="font-bold text-white">
                        {typeof title === "string" ? title : "Current View"}
                      </span>
                    </div>
                  ) : null}
                  {title && (
                    <h1 className="text-2xl font-extrabold tracking-tight text-white lg:text-[30px]">
                      {title}
                    </h1>
                  )}
                  {subtitle && <p className="mt-1 text-sm font-medium text-blue-100/85">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-3 [&_button]:shrink-0">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      <SecureAssistant procurementFinishedGoods={isFinishedGoodsPage} />
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Waiting: "bg-warning-soft text-warning-foreground border-warning/30",
    Active: "bg-success-soft text-success border-success/30",
    Blocked: "bg-danger-soft text-destructive border-destructive/25",
    Approved: "bg-success-soft text-success border-success/30",
    APPROVED: "bg-success-soft text-success border-success/30",
    Draft: "bg-muted text-muted-foreground border-border",
    Submitted: "bg-primary-soft text-primary border-primary/25",
    "Pending Approval": "bg-warning-soft text-warning-foreground border-warning/30",
    "Pending Procurement": "bg-warning-soft text-warning-foreground border-warning/30",
    "Converted to RFQ": "bg-teal-soft text-teal border-teal/30",
    "RFQ Created": "bg-teal-soft text-teal border-teal/30",
    "PO Created": "bg-primary-soft text-primary border-primary/25",
    Fulfilled: "bg-success-soft text-success border-success/30",
    Closed: "bg-muted text-muted-foreground border-border",
    "Dock Assigned": "bg-teal-soft text-teal border-teal/30",
    Receiving: "bg-primary-soft text-primary border-primary/25",
    Completed: "bg-success-soft text-success border-success/30",
    Rejected: "bg-danger-soft text-destructive border-destructive/25",
    REJECTED: "bg-danger-soft text-destructive border-destructive/25",
    FINANCE_REJECTED: "bg-danger-soft text-destructive border-destructive/25",
    PO_VERIFIED: "bg-success-soft text-success border-success/30",
    UNSCHEDULED_ARRIVAL: "bg-warning-soft text-warning-foreground border-warning/30",
    AWAITING_DOCK: "bg-warning-soft text-warning-foreground border-warning/30",
    DOCK_ASSIGNED: "bg-teal-soft text-teal border-teal/30",
    MOVING_TO_DOCK: "bg-primary-soft text-primary border-primary/25",
    AT_DOCK: "bg-success-soft text-success border-success/30",
    UNLOADING_IN_PROGRESS: "bg-primary-soft text-primary border-primary/25",
    QUALITY_INSPECTION_REQUIRED: "bg-warning-soft text-warning border-warning/25",
    QUALITY_PASSED: "bg-success-soft text-success border-success/25",
    QUALITY_FAILED: "bg-destructive/10 text-destructive border-destructive/25",
    RECEIVING_COMPLETED: "bg-success-soft text-success border-success/25",
    GRN_DRAFT: "bg-warning-soft text-warning border-warning/25",
    GRN_POSTED: "bg-success-soft text-success border-success/25",
    PUTAWAY_PENDING: "bg-warning-soft text-warning border-warning/25",
    PUTAWAY_IN_PROGRESS: "bg-info-soft text-info border-info/25",
    PUTAWAY_COMPLETED: "bg-success-soft text-success border-success/25",
    EXIT_APPROVED: "bg-success-soft text-success border-success/25",
    GATE_EXIT_COMPLETED: "bg-success-soft text-success border-success/25",
    GATE_ENTRY_APPROVED: "bg-success-soft text-success border-success/30",
    FIELD_MISMATCH_DETECTED: "bg-danger-soft text-destructive border-destructive/25",
    Hold: "bg-muted text-muted-foreground border-border",
    Available: "bg-success-soft text-success border-success/30",
    Occupied: "bg-danger-soft text-destructive border-destructive/25",
    AVAILABLE: "bg-success-soft text-success border-success/30",
    OCCUPIED: "bg-danger-soft text-destructive border-destructive/25",
    RESERVED: "bg-warning-soft text-warning-foreground border-warning/30",
    Reserved: "bg-warning-soft text-warning-foreground border-warning/30",
    MAINTENANCE: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
    "Under Maintenance": "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
    UNDER_MAINTENANCE: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
    Cleaning: "bg-muted text-muted-foreground border-border",
    SUBMITTED: "bg-primary-soft text-primary border-primary/25",
    DRAFT: "bg-muted text-muted-foreground border-border",
    ASN_SUBMITTED: "bg-primary-soft text-primary border-primary/25",
    IN_TRANSIT: "bg-teal-soft text-teal border-teal/30",
    PLACED: "bg-teal-soft text-teal border-teal/30",
    PENDING_FINANCE: "bg-warning-soft text-warning-foreground border-warning/30",
    SENT: "bg-primary-soft text-primary border-primary/25",
    SHIPPED: "bg-teal-soft text-teal border-teal/30",
    DISPATCHED: "bg-teal-soft text-teal border-teal/30",
    STOCK_RESERVED: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    PICKING_IN_PROGRESS: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    PICKED: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    PACKING_IN_PROGRESS:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    PACKED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    DRIVER_ALLOCATED: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    VEHICLE_ALLOCATED: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    ROUTE_ASSIGNED: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    LOADING_STARTED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    LOADING_VERIFIED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    READY_FOR_GATE_EXIT:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    GATE_OUT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    DELIVERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    CLOSED: "bg-muted text-muted-foreground border-border",
    CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
    SENT_TO_ASSEMBLY:
      "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold",
    "SENT TO ASSEMBLY":
      "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold",
    IN_PROGRESS: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
    "IN PROGRESS":
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
    ASSEMBLY_IN_PROGRESS:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
    "ASSEMBLY IN PROGRESS":
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
    SHORTAGE_DETECTED:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold",
    READY:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold",
    PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
    RETURNED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    DELAYED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  };
  const isLive = [
    "PO_VERIFIED",
    "APPROVED",
    "Receiving",
    "Active",
    "SENT_TO_ASSEMBLY",
    "IN_PROGRESS",
    "ASSEMBLY_IN_PROGRESS",
  ].includes(status);
  let displayLabel = status.replace(/_/g, " ");
  if (displayLabel.toUpperCase() === "OCCUPIED") {
    displayLabel = "AT DOCK";
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "relative rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        map[status] ?? map[displayLabel] ?? map["Hold"],
        isLive && "pl-5",
      )}
    >
      {isLive && (
        <span className="absolute left-2 top-1/2 flex size-1.5 -translate-y-1/2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex size-1.5 rounded-full bg-current"></span>
        </span>
      )}
      {displayLabel}
    </Badge>
  );
}

function parseDockAllocationDetails(n: any) {
  const msg = n?.message || "";

  const gatePass =
    n?.gate_pass_number ||
    n?.gatePassNumber ||
    msg.match(/Gate Pass:\s*([^\n]+)/i)?.[1]?.trim() ||
    "N/A";
  const vehicle =
    n?.vehicle_number ||
    n?.vehicleNumber ||
    msg.match(/Vehicle:\s*([^\n]+)/i)?.[1]?.trim() ||
    "N/A";
  const driverName =
    n?.driver_name || n?.driverName || msg.match(/Driver:\s*([^\n]+)/i)?.[1]?.trim();
  const driverPhone =
    n?.driver_phone ||
    n?.driverPhone ||
    msg.match(/Driver Phone:\s*([^\n]+)/i)?.[1]?.trim() ||
    msg.match(/Phone:\s*([^\n]+)/i)?.[1]?.trim();
  const asnNumber = n?.asn_number || n?.asnNumber || msg.match(/ASN:\s*([^\n]+)/i)?.[1]?.trim();
  const poNumber = n?.po_number || n?.poNumber || msg.match(/PO:\s*([^\n]+)/i)?.[1]?.trim();

  const dockCode =
    n?.dock_code ||
    n?.dockCode ||
    msg.match(/Dock Code:\s*([^\n]+)/i)?.[1]?.trim() ||
    msg.match(/Proceed (?:directly )?to Dock\s*([^\n.]+)/i)?.[1]?.trim() ||
    "D-01";
  const dockName =
    n?.dock_name ||
    n?.dockName ||
    msg.match(/Dock Name:\s*([^\n]+)/i)?.[1]?.trim() ||
    `Inbound Dock ${dockCode}`;
  const dockLocation =
    n?.dock_location ||
    n?.dockLocation ||
    msg.match(/Location:\s*([^\n]+)/i)?.[1]?.trim() ||
    "Receiving Bay - A";
  const dockType =
    n?.dock_type || n?.dockType || msg.match(/Dock Type:\s*([^\n]+)/i)?.[1]?.trim() || "Inbound";
  const warehouseName =
    n?.warehouse_name ||
    n?.warehouseName ||
    msg.match(/Warehouse:\s*([^\n]+)/i)?.[1]?.trim() ||
    "Main Warehouse";

  const rawTime =
    n?.allocation_time ||
    n?.allocationTime ||
    msg.match(/Allocated At:\s*([^\n]+)/i)?.[1]?.trim() ||
    n?.created_at ||
    n?.createdAt;
  let allocatedAt = "N/A";
  if (rawTime) {
    const d = new Date(rawTime);
    if (!isNaN(d.getTime())) {
      // Keep SSR and browser output identical; locale/time-zone formatting
      // otherwise causes hydration mismatches (for example AM vs U).
      allocatedAt = d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
    } else {
      allocatedAt = String(rawTime);
    }
  }

  return {
    gatePass,
    vehicle,
    driverName: driverName && driverName !== "N/A" ? driverName : null,
    driverPhone: driverPhone && driverPhone !== "N/A" ? driverPhone : null,
    asnNumber: asnNumber && asnNumber !== "N/A" ? asnNumber : null,
    poNumber: poNumber && poNumber !== "N/A" ? poNumber : null,
    dockCode,
    dockName,
    dockLocation,
    dockType,
    warehouseName,
    allocatedAt,
  };
}

export function DockAllocationNotificationCard({ notification }: { notification: any }) {
  const details = parseDockAllocationDetails(notification);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 shadow-sm space-y-4 font-sans text-foreground">
      <div className="absolute left-0 top-0 h-full w-1 bg-teal-600 dark:bg-teal-400" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-teal-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Warehouse className="size-5" />
          </div>
          <div>
            <h3 className="font-black text-base tracking-tight text-foreground uppercase">
              DOCK ALLOCATION CONFIRMED
            </h3>
            <p className="text-xs text-muted-foreground">Vehicle assigned & dock allocated</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full"
        >
          Dock Allocated
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Vehicle Details */}
        <div className="space-y-2 rounded-xl bg-card/80 p-3.5 border border-border/50 text-xs shadow-2xs">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block border-b border-border/40 pb-1">
            Vehicle Details
          </span>
          <div className="space-y-1.5 pt-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gate Pass:</span>
              <span className="font-mono font-bold text-foreground">{details.gatePass}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="font-mono font-bold text-primary">{details.vehicle}</span>
            </div>
            {details.driverName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Driver:</span>
                <span className="font-semibold text-foreground">{details.driverName}</span>
              </div>
            )}
            {details.driverPhone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Driver Phone:</span>
                <span className="font-mono text-foreground">{details.driverPhone}</span>
              </div>
            )}
            {details.asnNumber && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ASN:</span>
                <span className="font-mono font-semibold text-foreground">{details.asnNumber}</span>
              </div>
            )}
            {details.poNumber && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PO:</span>
                <span className="font-mono font-semibold text-foreground">{details.poNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Allocated Dock Details */}
        <div className="space-y-2 rounded-xl bg-card/80 p-3.5 border border-border/50 text-xs shadow-2xs">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block border-b border-border/40 pb-1">
            Allocated Dock Details
          </span>
          <div className="space-y-1.5 pt-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dock Code:</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {details.dockCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dock Name:</span>
              <span className="font-semibold text-foreground">{details.dockName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="text-foreground">{details.dockLocation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dock Type:</span>
              <span className="text-foreground">{details.dockType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Warehouse:</span>
              <span className="text-foreground">{details.warehouseName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Allocated At:</span>
              <span className="text-foreground">{details.allocatedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instruction Banner */}
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 text-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider block text-teal-700 dark:text-teal-300">
            Instruction
          </span>
          <p className="font-extrabold text-teal-900 dark:text-teal-100 mt-0.5">
            Proceed directly to Dock {details.dockCode}.
          </p>
        </div>
      </div>
    </div>
  );
}
