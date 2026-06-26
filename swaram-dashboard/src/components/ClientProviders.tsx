"use client";

import { BrandingProvider } from "@/lib/BrandingContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <BrandingProvider>{children}</BrandingProvider>;
}
