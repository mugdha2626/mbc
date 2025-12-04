"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { config } from "@/config";

export function WagmiProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create QueryClient inside the component to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
