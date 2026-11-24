import { useSearchParams } from "react-router-dom";
import type { Cliente } from "@/shared/domain";

/**
 * Cliente que llega en `?cliente=<id>` desde Clientes → "Crear OT".
 * Solo se acepta si existe en la cartera: un id manipulado en la URL no
 * precarga nada. El formulario lo recibe como valor inicial y el vendedor
 * puede cambiarlo o quitarlo.
 */
export function useClientePreseleccionado(clientes: Cliente[]) {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("cliente") ?? "";
  return clientes.some((cliente) => cliente.id === id) ? id : "";
}
