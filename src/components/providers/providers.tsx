"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { AppToaster } from "@/components/providers/app-toaster";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx é resposta definitiva da API (validação, permissão, não encontrado).
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache(),
        mutationCache: new MutationCache(),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <AppToaster />
      <ServiceWorkerRegister />
    </QueryClientProvider>
  );
}
