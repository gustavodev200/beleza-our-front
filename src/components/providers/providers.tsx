"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api";
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
      <Toaster
        position="bottom-center"
        offset={88}
        toastOptions={{
          classNames: {
            toast: "!rounded-xl !bg-ink !text-white !border-0 !shadow-[0_12px_32px_rgba(0,0,0,.2)] !font-medium",
            description: "!text-sidebar-fg",
          },
        }}
      />
      <ServiceWorkerRegister />
    </QueryClientProvider>
  );
}
