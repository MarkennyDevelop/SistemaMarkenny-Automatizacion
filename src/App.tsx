import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard";
import { InventarioPage } from "@/features/inventario";
import { PlantaKanbanPage } from "@/features/planta-kanban";
import {
  ClientesPage,
  CotizadorPage,
  NuevaOrdenTrabajoPage,
  OrdenesTrabajoPage,
} from "@/features/ventas";
import { NotFoundPage } from "./app/NotFoundPage";

export function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="planta" element={<PlantaKanbanPage />} />

          <Route path="ventas">
            <Route index element={<Navigate to="ordenes" replace />} />
            <Route path="ordenes" element={<OrdenesTrabajoPage />} />
            <Route path="nueva-orden" element={<NuevaOrdenTrabajoPage />} />
            <Route path="cotizador" element={<CotizadorPage />} />
            <Route path="clientes" element={<ClientesPage />} />
          </Route>

          <Route path="inventario" element={<InventarioPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
