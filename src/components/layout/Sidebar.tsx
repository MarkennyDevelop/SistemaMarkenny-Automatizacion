import {
  Activity,
  Boxes,
  Calculator,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  PackageCheck,
  Users,
  UsersRound,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { MarkennyLogo } from "@/components/brand/MarkennyLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth";
import { cn, initials } from "@/lib/utils";
import { SISTEMA } from "@/shared/catalogos";
import { ROL_LABEL, type Rol } from "@/shared/domain";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  hint?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const VENTAS_ITEMS: NavItem[] = [
  { to: "/ventas/ordenes", label: "Órdenes de trabajo", icon: ClipboardList },
  { to: "/ventas/nueva-orden", label: "Nueva orden", icon: FilePlus2, hint: "2 fichas" },
  { to: "/ventas/seguimiento", label: "Seguimiento", icon: Activity },
  { to: "/ventas/cotizador", label: "Cotizador", icon: Calculator },
  { to: "/ventas/clientes", label: "Clientes", icon: UsersRound },
];

const NAV_POR_ROL: Record<Rol, NavGroup[]> = {
  ADMIN: [
    {
      label: "Administración",
      items: [
        { to: "/admin", label: "Dashboard general", icon: LayoutDashboard, end: true },
        { to: "/admin/empleados", label: "Empleados y roles", icon: Users },
      ],
    },
    {
      label: "Ventas",
      items: VENTAS_ITEMS,
    },
    {
      label: "Taller y almacén",
      items: [
        { to: "/produccion", label: "Producción", icon: Waypoints, hint: "4 fases" },
        { to: "/inventario", label: "Inventario", icon: Boxes, end: true },
        { to: "/inventario/producto-terminado", label: "Producto Terminado", icon: PackageCheck },
      ],
    },
  ],
  VENDEDOR: [
    {
      label: "Mi operación",
      items: [
        { to: "/ventas/dashboard", label: "Mi dashboard", icon: LayoutDashboard },
        ...VENTAS_ITEMS,
      ],
    },
  ],
  PRODUCCION: [
    {
      label: "Taller",
      items: [
        { to: "/produccion", label: "Control de calidad", icon: Waypoints, hint: "4 fases" },
      ],
    },
    {
      label: "Almacén",
      items: [
        { to: "/inventario", label: "Inventario", icon: Boxes, end: true },
        { to: "/inventario/producto-terminado", label: "Producto Terminado", icon: PackageCheck },
      ],
    },
  ],
};

interface SidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? "ADMIN";
  const grupos = NAV_POR_ROL[rol];

  return (
    <aside className="flex h-full w-[264px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <MarkennyLogo variant="light" size="md" />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-muted hover:bg-white/5 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {grupos.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
            <p className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-sidebar-muted/70">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item, itemIndex) => (
                <li key={`${item.to}-${itemIndex}`}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-white/[0.07] text-white"
                          : "text-sidebar-muted hover:bg-white/[0.04] hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full transition-all",
                            isActive ? "bg-primary opacity-100" : "opacity-0",
                          )}
                        />
                        <item.icon
                          className={cn(
                            "h-[17px] w-[17px] shrink-0 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-sidebar-muted group-hover:text-white",
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.hint && (
                          <span className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-muted">
                            {item.hint}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <div className="relative overflow-hidden rounded-lg border border-sidebar-border bg-white/[0.03] p-3.5">
          <div className="rule-hatch absolute inset-y-0 left-0 w-[3px] opacity-80" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
              {rol === "PRODUCCION" ? "Taller en vivo" : "Planta en vivo"}
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-sidebar-muted">
            4 fases de control · sincronización cada 30 s
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] text-sidebar-muted">
            <span>Uptime</span>
            <span className="font-semibold text-white/80">99,2 %</span>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center gap-3 px-4 py-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-white">
          {usuario ? initials(usuario.nombre) : "MK"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-white">
            {usuario?.nombre ?? "Markenny"}
          </p>
          <p className="truncate text-[10px] text-sidebar-muted">
            {ROL_LABEL[rol]} · {SISTEMA.version}
          </p>
        </div>
      </div>
    </aside>
  );
}
