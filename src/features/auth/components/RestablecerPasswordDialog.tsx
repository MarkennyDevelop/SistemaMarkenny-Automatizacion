import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRestablecerPassword } from "../hooks/useEmpleados";
import type { UsuarioPublico } from "../lib/authStore";

interface RestablecerPasswordDialogProps {
  usuario: UsuarioPublico | null;
  onOpenChange: (open: boolean) => void;
}

export function RestablecerPasswordDialog({
  usuario,
  onOpenChange,
}: RestablecerPasswordDialogProps) {
  const restablecer = useRestablecerPassword();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPassword("");
    setConfirmar("");
    setError(null);
  }, [usuario]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usuario) return;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Mínimo 8 caracteres, con al menos una letra y un número.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    try {
      await restablecer.mutateAsync({ id: usuario.id, password });
      toast.success("Contraseña actualizada", {
        description: `${usuario.nombre} deberá usar la nueva clave en su próximo ingreso.`,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  };

  return (
    <Dialog open={Boolean(usuario)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Define una clave temporal para{" "}
            <span className="font-medium text-foreground">{usuario?.nombre}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">Nueva contraseña</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirmar">Confirmar contraseña</Label>
            <Input
              id="reset-confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(event) => setConfirmar(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-[11px] font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={restablecer.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={restablecer.isPending}>
              {restablecer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Actualizar clave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
