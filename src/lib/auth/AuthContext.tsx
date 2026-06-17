"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, AUTH_EXPIRED_EVENT } from "@/lib/apiFetch";
import * as authApi from "@/lib/auth/authApi";
import type { CreateTenantData, RegisterData } from "@/lib/auth/authApi";
import { decodeJwt } from "@/lib/auth/jwt";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/storage";
import type {
  AuthSessionResponse,
  MemberRole,
  Tenant,
  TenantMembership,
  User,
  UserProfileResponse,
} from "@/types/auth";

/** Kết quả login: vào thẳng (1 tenant) hoặc cần chọn nhà hàng (đa-tenant). */
export type LoginResult =
  | { type: "success" }
  | { type: "selectTenant"; options: TenantMembership[] };

interface AuthContextValue {
  user: User | null;
  currentTenant: TenantMembership | null;
  tenants: TenantMembership[];
  role: MemberRole | null;
  /** True nếu vai trò được phép ghi (OWNER/ACCOUNTANT). VIEWER = chỉ xem. */
  canWrite: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => void;
  completeOAuthCode: (code: string) => Promise<LoginResult | { type: "noTenant" }>;
  selectTenant: (tenantId: number) => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  createTenant: (data: CreateTenantData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Key sessionStorage để hiện toast sau khi reload (vd sau khi chuyển nhà hàng). */
const FLASH_KEY = "vf_flash";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token tạm sau login đa-tenant / OAuth noTenant — dùng cho selectTenant / createTenant.
  const pendingTempToken = useRef<string | null>(null);

  const resetState = useCallback(() => {
    setUser(null);
    setTenants([]);
    setCurrentTenantId(null);
    pendingTempToken.current = null;
  }, []);

  /** Nạp lại profile (user + danh sách tenant) từ token hiện tại. */
  const hydrate = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      resetState();
      return;
    }
    const res = await apiFetch("/api/v1/users/me");
    if (!res.ok) throw new Error(`profile load failed (${res.status})`);
    const profile = (await res.json()) as UserProfileResponse;
    setUser(profile.user);
    setTenants(profile.tenants);
    setCurrentTenantId(decodeJwt(getAccessToken() ?? token)?.tid ?? null);
  }, [resetState]);

  /** Áp dụng một phiên đầy đủ (đã chọn tenant): lưu access token + nạp profile. */
  const applySession = useCallback(
    async (session: AuthSessionResponse) => {
      setAccessToken(session.tokens.accessToken);
      pendingTempToken.current = null;
      await hydrate();
    },
    [hydrate]
  );

  /** Áp dụng phiên TẠM (chưa chọn tenant — login đa-tenant / OAuth noTenant): lưu token tạm để gọi
   *  select-tenant / create-tenant, đồng thời nạp user (currentTenant vẫn null). */
  const applyTempSession = useCallback(
    async (tempToken: string | undefined) => {
      if (!tempToken) return;
      setAccessToken(tempToken);
      pendingTempToken.current = tempToken;
      await hydrate();
    },
    [hydrate]
  );

  // ── Bootstrap khi mount: có token → nạp profile (apiFetch tự refresh nếu hết hạn) ──
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (getAccessToken()) await hydrate();
      } catch {
        clearAccessToken();
        resetState();
      } finally {
        if (active) setIsLoading(false);
      }
      // Toast "flash" sau reload (chuyển nhà hàng…)
      const flash = typeof window !== "undefined" ? sessionStorage.getItem(FLASH_KEY) : null;
      if (flash) {
        sessionStorage.removeItem(FLASH_KEY);
        toast.success(flash);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrate, resetState]);

  // ── Lắng nghe sự kiện hết phiên từ apiFetch (refresh thất bại) ──
  useEffect(() => {
    const handler = () => {
      resetState();
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      // Lưu trang đang xem để quay lại sau khi đăng nhập.
      const path = window.location.pathname + window.location.search;
      const returnUrl =
        path && !path.startsWith("/auth") ? `?returnUrl=${encodeURIComponent(path)}` : "";
      router.replace(`/auth/login${returnUrl}`);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [resetState, router]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const res = await authApi.login(email, password);
      if (res.tenantSelectionRequired) {
        // Lưu token tạm + nạp profile (user + danh sách tenant) để isAuthenticated=true cho bước
        // chọn nhà hàng / onboarding; currentTenant vẫn null (token tạm chưa có tid).
        await applyTempSession(res.tempAccessToken);
        return { type: "selectTenant", options: res.tenantOptions ?? [] };
      }
      if (res.tokens) {
        setAccessToken(res.tokens.accessToken);
        await hydrate();
      }
      return { type: "success" };
    },
    [hydrate, applyTempSession]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const session = await authApi.register(data);
      await applySession(session);
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(() => {
    window.location.href = authApi.googleAuthorizeUrl();
  }, []);

  const completeOAuthCode = useCallback(
    async (code: string): Promise<LoginResult | { type: "noTenant" }> => {
      const res = await authApi.exchangeOAuth2Code(code);
      if (res.noTenant) {
        await applyTempSession(res.tempAccessToken);
        return { type: "noTenant" };
      }
      if (res.tenantSelectionRequired) {
        await applyTempSession(res.tempAccessToken);
        return { type: "selectTenant", options: res.tenantOptions ?? [] };
      }
      if (res.tokens) {
        setAccessToken(res.tokens.accessToken);
        await hydrate();
      }
      return { type: "success" };
    },
    [hydrate, applyTempSession]
  );

  const selectTenant = useCallback(
    async (tenantId: number) => {
      const token = pendingTempToken.current ?? getAccessToken();
      if (!token) throw new Error("Thiếu token để chọn nhà hàng.");
      const session = await authApi.selectTenant(tenantId, token);
      await applySession(session);
    },
    [applySession]
  );

  const switchTenant = useCallback(
    async (tenantId: number) => {
      const token = getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập.");
      const session = await authApi.selectTenant(tenantId, token);
      setAccessToken(session.tokens.accessToken);
      // Reload sạch để KHÔNG còn dữ liệu nhà hàng cũ (không có cache lib toàn cục để clear thủ công).
      sessionStorage.setItem(FLASH_KEY, `Đã chuyển sang ${session.tenant.name}`);
      window.location.href = "/";
    },
    []
  );

  const createTenant = useCallback(
    async (data: CreateTenantData) => {
      const token = pendingTempToken.current ?? getAccessToken();
      if (!token) throw new Error("Thiếu token để tạo nhà hàng.");
      const session = await authApi.createTenant(data, token);
      await applySession(session);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* dù lỗi vẫn clear local */
    }
    clearAccessToken();
    resetState();
    router.replace("/auth/login");
  }, [resetState, router]);

  const refreshProfile = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const currentTenant = useMemo(
    () => tenants.find((t) => t.tenantId === currentTenantId) ?? null,
    [tenants, currentTenantId]
  );

  const value: AuthContextValue = {
    user,
    currentTenant,
    tenants,
    role: currentTenant?.role ?? null,
    canWrite: currentTenant?.role === "OWNER" || currentTenant?.role === "ACCOUNTANT",
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    completeOAuthCode,
    selectTenant,
    switchTenant,
    createTenant,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** Re-export tiện dùng cho UI. */
export type { Tenant, TenantMembership };
