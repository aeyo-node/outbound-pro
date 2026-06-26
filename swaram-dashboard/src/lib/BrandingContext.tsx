"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export const BRAND_PALETTES = [
  { id: "gold",    label: "Gold",    accent: "#FFD166", accentRgb: "255,209,102" },
  { id: "blue",    label: "Blue",    accent: "#3B82F6", accentRgb: "59,130,246"  },
  { id: "emerald", label: "Emerald", accent: "#10B981", accentRgb: "16,185,129"  },
  { id: "violet",  label: "Violet",  accent: "#8B5CF6", accentRgb: "139,92,246"  },
  { id: "rose",    label: "Rose",    accent: "#F43F5E", accentRgb: "244,63,94"   },
  { id: "orange",  label: "Orange",  accent: "#F97316", accentRgb: "249,115,22"  },
  { id: "cyan",    label: "Cyan",    accent: "#06B6D4", accentRgb: "6,182,212"   },
  { id: "slate",   label: "Slate",   accent: "#94A3B8", accentRgb: "148,163,184" },
];

export interface BrandConfig {
  brandName: string;
  logoUrl: string;   // base64 data URL or empty string
  paletteId: string;
}

const DEFAULT_CONFIG: BrandConfig = {
  brandName: "Swaram",
  logoUrl: "",
  paletteId: "gold",
};

interface BrandingContextType {
  brand: BrandConfig;
  palette: typeof BRAND_PALETTES[0];
  updateBrand: (patch: Partial<BrandConfig>) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  brand: DEFAULT_CONFIG,
  palette: BRAND_PALETTES[0],
  updateBrand: () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_CONFIG);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("swaram_brand");
      if (saved) {
        const parsed = JSON.parse(saved) as BrandConfig;
        setBrand({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {}
  }, []);

  // Apply CSS vars whenever palette changes
  useEffect(() => {
    const p = BRAND_PALETTES.find(p => p.id === brand.paletteId) || BRAND_PALETTES[0];
    document.documentElement.style.setProperty("--accent", p.accent);
    document.documentElement.style.setProperty("--accent-rgb", p.accentRgb);
  }, [brand.paletteId]);

  const updateBrand = useCallback((patch: Partial<BrandConfig>) => {
    setBrand(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("swaram_brand", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const palette = BRAND_PALETTES.find(p => p.id === brand.paletteId) || BRAND_PALETTES[0];

  return (
    <BrandingContext.Provider value={{ brand, palette, updateBrand }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
