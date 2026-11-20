import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme}
      position="top-right"
      closeButton
      // Sin `richColors` (verde/ámbar/azul): los avisos usan la paleta de la
      // marca. Éxito en negro/blanco, error con acento rojo.
      toastOptions={{
        classNames: {
          toast: "font-sans border-border bg-card text-foreground",
          success: "[&_[data-icon]]:text-foreground",
          error: "border-primary/40 [&_[data-icon]]:text-primary",
          warning: "[&_[data-icon]]:text-primary",
          info: "[&_[data-icon]]:text-foreground",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={180}>
            {children}
            <ThemedToaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
