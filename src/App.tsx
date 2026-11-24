import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import {
  EmpleadosPage,
  homeForRol,
  LoginPage,
  PublicOnly,
  RequireAuth,
  RequireRole,
  SetupAdminPage,
  useAuth,
} from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { InventarioPage, ProductoTerminadoPage } from "@/features/inventario";
import { ProduccionDashboardPage } from "@/features/planta-kanban";
import {
  ClientesPage,
  CotizadorPage,
  NuevaOrdenGranFormatoPage,
  NuevaOrdenPapeleriaPage,
  NuevaOrdenTrabajoPage,
  OrdenesTrabajoPage,
  SeguimientoPage,
  VentasDashboardPage,
} from "@/features/ventas";
import { NotFoundPage } from "./app/NotFoundPage";

/** Aterrizaje por rol cuando se entra a la raíz del sistema. */
function RoleHome() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRol(usuario.rol)} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público: solo sin sesión activa */}
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/setup-admin"
          element={
            <PublicOnly>
              <SetupAdminPage />
            </PublicOnly>
          }
        />

        {/* Privado */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<RoleHome />} />

            {/* Administrador */}
            <Route
              path="admin"
              element={
                <RequireRole roles={["ADMIN"]}>
                  <DashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="admin/empleados"
              element={
                <RequireRole roles={["ADMIN"]}>
                  <EmpleadosPage />
                </RequireRole>
              }
            />

            {/* Ventas */}
            <Route
              path="ventas"
              element={
                <RequireRole roles={["ADMIN", "VENDEDOR"]}>
                  <Outlet />
                </RequireRole>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<VentasDashboardPage />} />
              <Route path="ordenes" element={<OrdenesTrabajoPage />} />
              <Route path="nueva-orden" element={<NuevaOrdenPapeleriaPage />} />
              <Route
                path="nueva-orden/pendones"
                element={<NuevaOrdenGranFormatoPage />}
              />
              <Route
                path="nueva-orden/otros"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <NuevaOrdenTrabajoPage />
                  </RequireRole>
                }
              />
              <Route path="seguimiento" element={<SeguimientoPage />} />
              <Route path="cotizador" element={<CotizadorPage />} />
              <Route path="clientes" element={<ClientesPage />} />
            </Route>

            {/* Producción */}
            <Route
              path="produccion"
              element={
                <RequireRole roles={["ADMIN", "PRODUCCION"]}>
                  <ProduccionDashboardPage />
                </RequireRole>
              }
            />
            <Route path="planta" element={<Navigate to="/produccion" replace />} />

            {/* Almacén */}
            <Route
              path="inventario"
              element={
                <RequireRole roles={["ADMIN", "PRODUCCION"]}>
                  <InventarioPage />
                </RequireRole>
              }
            />
            <Route
              path="inventario/producto-terminado"
              element={
                <RequireRole roles={["ADMIN", "PRODUCCION"]}>
                  <ProductoTerminadoPage />
                </RequireRole>
              }
            />
            {/* Enlaces guardados de la versión anterior ("Sellos y PT"). */}
            <Route path="inventario/sellos" element={<Navigate to="/inventario/producto-terminado" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
