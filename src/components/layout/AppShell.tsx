import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-markenny-paper dark:bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-markenny-ink/70 backdrop-blur-[2px]"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          />
          <div className="relative h-full w-[264px] animate-in slide-in-from-left duration-200">
            <Sidebar
              onClose={() => setMenuAbierto(false)}
              onNavigate={() => setMenuAbierto(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:ml-[264px]">
        <Topbar onOpenMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px] animate-fade-in">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-border/70 px-6 py-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
            <span>Artes Gráficas Markenny C.A. · Print MIS</span>
            <span>Rojo · Negro · Blanco</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
