import {
  ChevronDown,
  LogOut,
  Menu,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth";
import { NotificacionesBell } from "@/features/notificaciones";
import { initials } from "@/lib/utils";
import { ROL_LABEL } from "@/shared/domain";

const SECTION_LABELS: { path: string; label: string }[] = [
  { path: "/ventas/nueva-orden/pendones", label: "Nueva orden · pendones, stickers y viniles" },
  { path: "/ventas/nueva-orden/otros", label: "Nueva orden · general" },
  { path: "/ventas/nueva-orden", label: "Nueva orden · papelería" },
  { path: "/ventas/ordenes", label: "Órdenes de trabajo" },
  { path: "/ventas/seguimiento", label: "Seguimiento de producción" },
  { path: "/ventas/cotizador", label: "Cotizador" },
  { path: "/ventas/clientes", label: "Clientes" },
  { path: "/ventas/dashboard", label: "Mi dashboard" },
  { path: "/admin/empleados", label: "Empleados y roles" },
  { path: "/admin", label: "Dashboard general" },
  { path: "/produccion", label: "Producción y calidad" },
  { path: "/inventario/producto-terminado", label: "Producto terminado" },
  { path: "/inventario", label: "Inventario" },
];

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const seccion =
    SECTION_LABELS.find(
      (item) =>
        item.path === location.pathname ||
        location.pathname.startsWith(`${item.path}/`),
    )?.label ?? (location.pathname === "/" ? "Inicio" : "Sistema");

  const fecha = new Intl.DateTimeFormat("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  const rol = usuario?.rol ?? "ADMIN";

  const salir = async () => {
    await logout();
    toast.success("Sesión cerrada", {
      description: "Vuelve a ingresar con tu cuenta corporativa.",
    });
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span className="hidden font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
          Markenny
        </span>
        <span className="hidden text-border sm:inline">/</span>
        <span className="truncate font-medium text-foreground">{seccion}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:inline-flex">
          <Radio className="h-3 w-3 text-primary" />
          Planta en vivo
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        </span>

        <span className="hidden px-1 text-[11px] text-muted-foreground lg:inline">
          {fecha}
        </span>

        <ThemeToggle />

        <NotificacionesBell />

        <div className="ml-1 border-l border-border pl-2 sm:pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Menú de la cuenta"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-markenny-ink text-[11px] font-bold text-white dark:bg-white dark:text-markenny-ink">
                  {usuario ? initials(usuario.nombre) : "MK"}
                </span>
                <span className="hidden leading-tight xl:block">
                  <span className="block max-w-[150px] truncate text-[11px] font-semibold">
                    {usuario?.nombre ?? "Markenny"}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">
                    {ROL_LABEL[rol]}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground xl:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="pb-1">
                <span className="block truncate text-[12px] font-semibold text-foreground">
                  {usuario?.nombre ?? "Usuario"}
                </span>
                <span className="block truncate text-[10px] font-normal text-muted-foreground">
                  {usuario?.email ?? "sin sesión"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="gap-2 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Rol: {ROL_LABEL[rol]}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-[12px] text-destructive focus:text-destructive"
                onSelect={() => void salir()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
