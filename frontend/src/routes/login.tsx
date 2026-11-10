import * as React from "react";
import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Warehouse,
  Package,
  Truck,
  ScanBarcode,
  ChartNoAxesColumnIncreasing,
  Layers,
  LockKeyhole,
  UserRound,
  LogIn,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  getDefaultRouteForUser,
  getSafeRedirectPath,
  getUserInfo,
  isAuthenticated,
} from "@/lib/auth-utils";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    // Skip server-side redirects for localStorage-based auth
    if (typeof window === "undefined") return;

    if (isAuthenticated()) {
      const user = getUserInfo();
      throw redirect({ to: getDefaultRouteForUser(user) as any });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const redirectPath = getSafeRedirectPath(search.redirect || search.next);
  const magicToken = search.token;

  const [employeeId, setEmployeeId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [verifyingMagicLink, setVerifyingMagicLink] = React.useState(false);

  // Handle auto-login via magic token with 24h expiration check
  React.useEffect(() => {
    if (magicToken && !isLoading && !verifyingMagicLink) {
      const performAutoLogin = async () => {
        setIsLoading(true);
        setVerifyingMagicLink(true);
        setLinkError(null);
        try {
          let data: any;
          // If token has '.' or is not base64 "u:p", call magicLogin
          if (magicToken.includes(".") || !magicToken.includes(":")) {
            data = await api.magicLogin(magicToken);
          } else {
            try {
              const decoded = atob(magicToken);
              const [u, p] = decoded.split(":");
              data = await api.login(u, p);
            } catch {
              data = await api.magicLogin(magicToken);
            }
          }
          toast.success("Access link verified! Opening quotation portal...");
          const target = data?.rfq_id
            ? `/submit-quotation?rfqId=${data.rfq_id}`
            : redirectPath || "/supplier-dashboard";

          setTimeout(() => {
            navigate({ to: target as any });
          }, 300);
        } catch (error: any) {
          console.error("Auto-login failed:", error);
          const rawMsg = error?.message || error?.detail || "";
          const isExpired = rawMsg.toLowerCase().includes("expired") || error?.status === 410;
          const userMsg = isExpired
            ? "This quotation invitation link has expired after 24 hours. For security, please contact procurement for a new access link."
            : rawMsg ||
              "This quotation access link is invalid or expired. Please contact procurement.";
          setLinkError(userMsg);
          toast.error(userMsg);
        } finally {
          setIsLoading(false);
          setVerifyingMagicLink(false);
        }
      };
      void performAutoLogin();
    }
  }, [magicToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      toast.error("Please enter both Employee ID and password");
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.login(employeeId, password, rememberMe);
      completeAuthentication(data);
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const completeAuthentication = (data: any) => {
    toast.success(`Welcome back, ${data.username}!`);
    const targetPath = redirectPath || getDefaultRouteForUser(data);

    setTimeout(() => {
      // Keep route transitions internal. `redirectPath` has already rejected external URLs.
      const target = new URL(targetPath, window.location.origin);
      navigate({
        to: target.pathname as any,
        search: Object.fromEntries(target.searchParams) as any,
        hash: target.hash,
      });
    }, 500);
  };

  const handleForgotPassword = () => {
    toast.info("Please contact your IT administrator to reset your password.");
  };

  return (
    <div className="staff-login flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left side - Illustration/Branding */}
      <div className="login-brand hidden lg:flex lg:w-1/2 flex-col bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/kaizenx-cube.png" alt="KaizenX Logo" className="h-9 w-9 object-contain" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Kaizen<span className="text-sky-400">X</span>
            </span>
            <span className="h-6 w-px bg-white/40 mx-2" />
            <span className="text-[11px] font-normal text-white/90 leading-tight">
              Warehouse<br />Management System
            </span>
          </div>
          <div className="mt-8">
            <div className="mb-3 h-1 w-12 rounded-full bg-cyan-400" />
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight text-white">
              Warehouse Management <br /> <span className="text-cyan-400">Simplified.</span>
            </h1>
            <p className="mt-4 text-base lg:text-lg text-white/85 max-w-lg leading-relaxed font-normal">
              Optimize inventory, inbound, outbound and dock operations with real-time visibility
              and control.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3 max-w-md">
            {[
              { icon: Package, line1: "Inventory", line2: "Control" },
              { icon: Truck, line1: "Inbound &", line2: "Outbound" },
              { icon: ScanBarcode, line1: "Dock", line2: "Management" },
              { icon: ChartNoAxesColumnIncreasing, line1: "Real-time", line2: "Tracking" },
            ].map(({ icon: Icon, line1, line2 }) => (
              <div
                key={line1}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs transition hover:bg-white/15 text-center"
              >
                <div className="h-8 w-8 rounded-lg bg-sky-500/25 flex items-center justify-center mb-1.5 text-sky-300">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold leading-tight text-white/95">
                  {line1}<br />{line2}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 max-w-md">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Enterprise Security</p>
              <p className="text-xs text-primary-foreground/60">
                End-to-end encryption and multi-factor authentication for all warehouse operations.
              </p>
            </div>
          </div>
        </div>

        {/* Mesh Background Pattern */}
        <div className="hidden">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="mesh-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="white" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="40" fill="url(#mesh-gradient)" />
            <circle cx="80" cy="50" r="30" fill="url(#mesh-gradient)" />
            <circle cx="40" cy="80" r="45" fill="url(#mesh-gradient)" />
          </svg>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="login-panel flex flex-1 items-center justify-center bg-background p-6 lg:p-10">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="lg:hidden flex items-center gap-2 mb-3">
                <img src="/kaizenx-cube.png" alt="KaizenX Logo" className="h-7 w-7" />
                <span className="text-xl font-bold text-slate-900">
                  Kaizen<span className="text-blue-600">X</span>
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Staff Login</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter your credentials to access the Warehouse Management System
              </p>
            </div>
            <img
              src="/login-boxes.png"
              alt="Warehouse Storage"
              className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 object-contain rounded-full shadow-xs"
            />
          </div>

          {verifyingMagicLink && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <div>
                <p className="font-semibold text-xs">Verifying secure quotation link...</p>
                <p className="text-[11px] text-muted-foreground">
                  Authenticating and opening supplier workspace.
                </p>
              </div>
            </div>
          )}

          {linkError && (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <Clock className="size-3.5 shrink-0" /> Quotation Link Expired or Invalid
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">{linkError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                <UserRound className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Employee ID / Username</span>
              </Label>
              <Input
                id="employeeId"
                autoComplete="username"
                placeholder="Enter your employee ID or username"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <LockKeyhole className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Password</span>
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="login-remember">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-xs font-normal text-slate-600 leading-none cursor-pointer select-none"
              >
                Remember me on this device
              </label>
            </div>
            <Button type="submit" className="w-full font-bold h-11 rounded-xl" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-transparent px-3 text-[11px] font-semibold text-slate-700 tracking-wide whitespace-nowrap">
                Secure &amp; Compliant
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-200 pt-1">
              {[
                { icon: ShieldCheck, label: "Enterprise Security" },
                { icon: Layers, label: "Role-based Access" },
                { icon: LockKeyhole, label: "Data Protection" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center justify-center text-center px-1">
                  <Icon className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-[10px] font-medium text-slate-600 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
              <br />
              &copy; 2026 KaizenX Industrial Systems. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
