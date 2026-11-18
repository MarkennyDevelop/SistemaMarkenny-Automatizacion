import { useMemo, useState } from "react";
import {
  HardHat,
  KeyRound,
  Lock,
  Power,
  Search,
  ShoppingBag,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate, initials } from "@/lib/utils";
import { ROL_LABEL, type Rol } from "@/shared/domain";
import { useAuth } from "../context";
import { useCambiarEstadoUsuario, useEmpleados } from "../hooks/useEmpleados";
import type { UsuarioPublico } from "../lib/authStore";
import { NuevoEmpleadoDialog } from "./NuevoEmpleadoDialog";
import { RestablecerPasswordDialog } from "./RestablecerPasswordDialog";

type FiltroRol = Rol | "TODOS";

const ROL_ICON: Record<Rol, typeof Users> = {
  ADMIN: ShieldCheck,
  VENDEDOR: ShoppingBag,
  PRODUCCION: HardHat,
};

export function EmpleadosPage() {
  const { usuario: actual } = useAuth();
  const { data: usuarios = [], isLoading, isError, refetch } = useEmpleados();
  const cambiarEstado = useCambiarEstadoUsuario();

  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<FiltroRol>("TODOS");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [resetUsuario, setResetUsuario] = useState<UsuarioPublico | null>(null);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const coincideRol = rol === "TODOS" || usuario.rol === rol;
      const coincideBusqueda =
        !termino ||
        usuario.nombre.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino);
      return coincideRol && coincideBusqueda;
    });
  }, [usuarios, busqueda, rol]);

  const contarRol = (valor: Rol) =>
    usuarios.filter((usuario) => usuario.rol === valor).length;
  const activos = usuarios.filter((usuario) => usuario.activo).length;

  const alternarEstado = async (usuario: UsuarioPublico) => {
    try {
      await cambiarEstado.mutateAsync({
        id: usuario.id,
        activo: !usuario.activo,
      });
      toast.success(
        usuario.activo ? "Cuenta desactivada" : "Cuenta reactivada",
        { description: usuario.nombre },
      );
    } catch (error) {
      toast.error("No se pudo actualizar la cuenta", {
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración · Equipo"
        title="Gestión de empleados"
        description="Cuentas únicas por persona y rol. Solo el administrador crea, desactiva o restablece credenciales."
        actions={
          <Button onClick={() => setNuevoAbierto(true)}>
            <UserPlus className="h-4 w-4" />
            Nuevo empleado
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Usuarios", valor: usuarios.length, icon: Users, hint: "cuentas registradas" },
          { label: "Activos", valor: activos, icon: Power, hint: "pueden iniciar sesión" },
          { label: "Vendedores", valor: contarRol("VENDEDOR"), icon: ShoppingBag, hint: "fuerza de ventas" },
          { label: "Producción", valor: contarRol("PRODUCCION"), icon: HardHat, hint: "taller y almacén" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="section-label">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {String(item.valor).padStart(2, "0")}
              </p>
              <p className="text-[9px] text-muted-foreground">{item.hint}</p>
            </div>
            <item.icon className="h-5 w-5 text-muted-foreground" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="pl-9"
            aria-label="Buscar empleado"
          />
        </div>
        <Select value={rol} onValueChange={(valor) => setRol(valor as FiltroRol)}>
          <SelectTrigger className="w-full sm:w-[210px]" aria-label="Filtrar por rol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los roles</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="VENDEDOR">Vendedor</SelectItem>
            <SelectItem value="PRODUCCION">Producción</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground sm:ml-auto">
          El correo es el identificador de acceso y no se puede repetir.
        </p>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Lock className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudo cargar el equipo</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-5">Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="w-[140px] pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-5" colSpan={7}>
                        <div className="h-3 w-full max-w-sm animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                : filtrados.map((usuario) => {
                    const Icono = ROL_ICON[usuario.rol];
                    const esActual = usuario.id === actual?.id;
                    return (
                      <TableRow key={usuario.id} className="group">
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "grid h-9 w-9 shrink-0 place-items-center rounded-full border font-display text-[11px] font-semibold",
                                usuario.activo
                                  ? "border-border bg-muted/60"
                                  : "border-border bg-muted/30 text-muted-foreground",
                              )}
                            >
                              {initials(usuario.nombre)}
                            </div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-[12px] font-medium">
                                {usuario.nombre}
                                {esActual && (
                                  <Badge variant="outline" className="scale-90">
                                    Tú
                                  </Badge>
                                )}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {usuario.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={usuario.rol === "ADMIN" ? "solid" : "outline"}
                            className="gap-1"
                          >
                            <Icono className="h-3 w-3" />
                            {ROL_LABEL[usuario.rol]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {usuario.cargo ?? "—"}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {usuario.telefono ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.activo ? "default" : "muted"}>
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10.5px] text-muted-foreground">
                          {usuario.ultimoAcceso
                            ? formatDate(usuario.ultimoAcceso, {
                                day: "2-digit",
                                month: "short",
                              })
                            : "Sin ingreso"}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setResetUsuario(usuario)}
                              aria-label={`Restablecer contraseña de ${usuario.nombre}`}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7",
                                usuario.activo
                                  ? "text-muted-foreground hover:text-primary"
                                  : "text-primary hover:text-primary",
                              )}
                              onClick={() => void alternarEstado(usuario)}
                              disabled={esActual || cambiarEstado.isPending}
                              aria-label={
                                usuario.activo
                                  ? `Desactivar a ${usuario.nombre}`
                                  : `Reactivar a ${usuario.nombre}`
                              }
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>

          {!isLoading && filtrados.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Users className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-xs text-muted-foreground">
                Ajusta la búsqueda o registra un empleado nuevo.
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground">
          Política de acceso
        </span>{" "}
        · El administrador no puede desactivar su propia cuenta y el sistema exige al
        menos un administrador activo. El registro público está deshabilitado: toda
        cuenta nace desde este módulo.
      </div>

      <NuevoEmpleadoDialog open={nuevoAbierto} onOpenChange={setNuevoAbierto} />
      <RestablecerPasswordDialog
        usuario={resetUsuario}
        onOpenChange={(abierto) => !abierto && setResetUsuario(null)}
      />
    </div>
  );
}
