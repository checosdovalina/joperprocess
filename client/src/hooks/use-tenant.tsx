import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface TenantConfig {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  timezone: string | null;
  locale: string | null;
  empresaId?: string | null;
  empresaName?: string | null;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  isLoading: boolean;
  error: Error | null;
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "210 100% 50%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTenantColors(tenant: TenantConfig) {
  const root = document.documentElement;
  
  if (tenant.primaryColor) {
    const primaryHSL = hexToHSL(tenant.primaryColor);
    root.style.setProperty("--primary", primaryHSL);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
  }
  
  if (tenant.secondaryColor) {
    const secondaryHSL = hexToHSL(tenant.secondaryColor);
    root.style.setProperty("--accent", secondaryHSL);
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(() => {
    // Restore from localStorage on mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTenantId');
    }
    return null;
  });

  const { data: tenant, isLoading, error } = useQuery<TenantConfig | null>({
    queryKey: ["/api/tenant-config"],
    queryFn: async () => {
      // Forward the dev-only ?tenant= override so the main-domain (no tenant)
      // experience can be simulated locally. In production the subdomain is
      // resolved server-side from the hostname.
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get("tenant");
      const url = tenantParam
        ? `/api/tenant-config?tenant=${encodeURIComponent(tenantParam)}`
        : "/api/tenant-config";
      const selectedId = typeof window !== "undefined" ? localStorage.getItem("selectedTenantId") : null;
      const tenantHeaders: Record<string, string> = {};
      if (selectedId) tenantHeaders["X-Selected-Tenant-Id"] = selectedId;
      const res = await fetch(url, { credentials: "include", headers: tenantHeaders });
      if (res.status === 404) {
        // No tenant context = main marketing domain
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to load tenant config");
      }
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Persist selectedTenantId to localStorage
  useEffect(() => {
    if (selectedTenantId) {
      localStorage.setItem('selectedTenantId', selectedTenantId);
    } else {
      localStorage.removeItem('selectedTenantId');
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (tenant) {
      applyTenantColors(tenant);
      
      if (tenant.name) {
        document.title = `${tenant.name} - Nexxo`;
      }
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ 
      tenant: tenant ?? null, 
      isLoading, 
      error: error as Error | null,
      selectedTenantId,
      setSelectedTenantId
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
