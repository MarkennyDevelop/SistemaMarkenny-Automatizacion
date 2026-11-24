// Recorrido completo de la API, reutilizable con cualquier persistencia.
// Cada respuesta ya la valida el servidor contra el contrato; aquí se
// comprueban las reglas de negocio y de permisos de punta a punta.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { COOKIE_SESION } from '@markenny/contrato';
import { construirApp } from '../../src/app.js';
import { crearRelojFijo, hasherRapido } from '../helpers.js';

/** Cliente de prueba que conserva la cookie de sesión, como un navegador. */
function navegador(app) {
  let cookie = null;
  const pedir = async (method, url, payload) => {
    const r = await app.inject({ method, url: `/api/v1${url}`, payload, headers: cookie ? { cookie } : {} });
    const set = r.cookies.find((c) => c.name === COOKIE_SESION);
    if (set) cookie = set.value ? `${COOKIE_SESION}=${set.value}` : null;
    return { estado: r.statusCode, cuerpo: r.body ? r.json() : null, cookies: r.cookies };
  };
  return {
    get: (url) => pedir('GET', url),
    post: (url, body) => pedir('POST', url, body),
    patch: (url, body) => pedir('PATCH', url, body),
    async entrar(email, password) {
      const r = await pedir('POST', '/auth/login', { email, password });
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      return r.cuerpo;
    },
  };
}

const PASSWORD_ADMIN = 'Markenny2026';

/**
 * @param {string} nombre
 * @param {() => Promise<{ overrides: object, config?: object, preparar?: () => Promise<void>, cerrar?: () => Promise<void> }>} entorno
 */
export function probarFlujoCompleto(nombre, entorno) {
  describe(`API de punta a punta (${nombre})`, () => {
    let app;
    let ctx;
    const reloj = crearRelojFijo();
    const admin = () => navegador(app);
    const estado = {};

    beforeAll(async () => {
      ctx = await entorno();
      await ctx.preparar?.();
      app = await construirApp({
        config: { LOG_LEVEL: 'silent', SESION_HORAS: 12, COOKIE_SEGURA: false, ...ctx.config },
        overrides: { reloj, hasher: hasherRapido, ...ctx.overrides },
      });
      estado.admin = admin();
    });
    afterAll(async () => {
      await app?.close();
      await ctx?.cerrar?.();
    });

    const esperarEventos = () => app.eventBus.esperarInactividad();

    it('instalación: el administrador se registra una sola vez', async () => {
      const anonimo = navegador(app);
      expect((await anonimo.get('/auth/estado')).cuerpo).toEqual({ hayAdministrador: false });
      expect((await anonimo.get('/auth/sesion')).estado).toBe(401);

      const r = await estado.admin.post('/auth/setup-admin', {
        nombre: 'Kenny Hernández', email: 'Admin@Markenny.com', telefono: '+58 424-651-2044', password: PASSWORD_ADMIN,
      });
      expect(r.estado).toBe(201);
      expect(r.cuerpo).toMatchObject({ rol: 'ADMIN', email: 'admin@markenny.com', cargo: 'Administrador general' });
      const cookie = r.cookies.find((c) => c.name === COOKIE_SESION);
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
      expect(r.cuerpo).not.toHaveProperty('passwordHash');

      const otro = await navegador(app).post('/auth/setup-admin', {
        nombre: 'Intruso', email: 'otro@markenny.com', telefono: '0000000000', password: 'Intruso2026',
      });
      expect(otro).toMatchObject({ estado: 409, cuerpo: { error: 'ADMIN_YA_REGISTRADO' } });
      expect((await anonimo.get('/auth/estado')).cuerpo).toEqual({ hayAdministrador: true });
      expect((await estado.admin.get('/auth/sesion')).cuerpo.nombre).toBe('Kenny Hernández');
    });

    it('login: mismo error para correo o contraseña incorrectos', async () => {
      const n = navegador(app);
      const a = await n.post('/auth/login', { email: 'nadie@markenny.com', password: 'x' });
      const b = await n.post('/auth/login', { email: 'admin@markenny.com', password: 'mala' });
      expect(a).toMatchObject({ estado: 401, cuerpo: { error: 'CREDENCIALES_INVALIDAS' } });
      expect(b.cuerpo).toEqual(a.cuerpo);
    });

    it('empleados: el admin crea Vendedor y Producción; nadie más puede', async () => {
      const crear = (datos) => estado.admin.post('/usuarios', { telefono: '', cargo: '', password: 'Clave2026', ...datos });
      const v = await crear({ nombre: 'Valeria Rondón', email: 'valeria@markenny.com', rol: 'VENDEDOR' });
      const v2 = await crear({ nombre: 'Pedro Ventas', email: 'pedro@markenny.com', rol: 'VENDEDOR' });
      const p = await crear({ nombre: 'Luis Pérez', email: 'luis@markenny.com', rol: 'PRODUCCION' });
      expect([v.estado, v2.estado, p.estado]).toEqual([201, 201, 201]);
      expect(v.cuerpo).toMatchObject({ rol: 'VENDEDOR', cargo: 'Ejecutivo de ventas', creadoPor: 'Kenny Hernández' });
      expect((await crear({ nombre: 'Otro Admin', email: 'a2@markenny.com', rol: 'ADMIN' })).estado).toBe(400);
      expect((await crear({ nombre: 'Duplicado', email: 'VALERIA@markenny.com', rol: 'VENDEDOR' })).cuerpo.error).toBe('EMAIL_DUPLICADO');

      estado.vendedor = navegador(app);
      estado.vendedorDatos = await estado.vendedor.entrar('valeria@markenny.com', 'Clave2026');
      estado.vendedor2 = navegador(app);
      await estado.vendedor2.entrar('pedro@markenny.com', 'Clave2026');
      estado.planta = navegador(app);
      await estado.planta.entrar('luis@markenny.com', 'Clave2026');

      expect((await estado.vendedor.get('/usuarios')).cuerpo.error).toBe('SIN_PERMISO');
      expect((await estado.admin.get('/usuarios')).cuerpo.map((u) => u.rol)).toEqual(['ADMIN', 'PRODUCCION', 'VENDEDOR', 'VENDEDOR']);
    });

    it('permisos por rol en el servidor', async () => {
      expect((await estado.planta.get('/clientes')).estado).toBe(403);
      expect((await estado.vendedor.get('/inventario/materiales')).estado).toBe(403);
      expect((await estado.vendedor.post('/inventario/materiales', {})).estado).toBe(403);
      expect((await navegador(app).get('/ordenes')).estado).toBe(401);
    });

    it('clientes y orden de trabajo', async () => {
      const c = await estado.vendedor.post('/clientes', {
        nombre: 'Inversiones Triple 3000, C.A.', rif: 'j-40512336-7', contacto: 'María Pérez', telefono: '0212-555-0000', email: 'COMPRAS@triple.com', ciudad: 'Caracas',
      });
      expect(c.estado).toBe(201);
      expect(c.cuerpo).toMatchObject({ rif: 'J-40512336-7', email: 'compras@triple.com', ordenesActivas: 0 });
      estado.clienteId = c.cuerpo.id;
      const dup = await estado.vendedor.post('/clientes', { ...c.cuerpo, id: undefined, ordenesActivas: undefined, saldoPendiente: undefined, creadoEn: undefined });
      expect(dup.cuerpo.error).toBe('CODIGO_DUPLICADO');

      const orden = {
        clienteId: estado.clienteId, producto: 'Facturas fiscales 2 partes', descripcion: 'Logo a 1 tinta', tecnologia: 'OFFSET',
        categoriaTrabajo: 'PAPELERIA', prioridad: 'ALTA', maquina: 'Heidelberg SM 52', cantidad: 1000, sustrato: 'Bond 75 g',
        tintas: ['Pantone 032 C'], acabados: ['Numerado', 'Engrapado'],
        especificaciones: {
          nombreDocumento: 'Factura', tipoDocumento: 'F', formato: 'TALONARIO', partes: 2, numeracionDesde: 1,
          numeracionHasta: 1000, numeroControlPrefijo: '00-', numeroControlDesde: 1, numeroControlHasta: 1000, perforacion: true, orientacion: 'HORIZONTAL',
          tipoPapel: 'QUIMICO', tamano: 'MEDIA_CARTA', coloresTinta: ['NEGRO'], observaciones: 'Prueba de color',
        },
        montoTotal: 120.5, fechaEntrega: '2026-11-27T16:00:00.000Z',
      };
      const r = await estado.vendedor.post('/ordenes', orden);
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
      expect(r.cuerpo).toMatchObject({
        codigo: 'OT-2026-0001', fase: 'EN_PROCESO', avance: 45, estadoEntrega: 'NO_APLICA', version: 1,
        vendedorId: estado.vendedorDatos.id, vendedor: 'Valeria Rondón', clienteNombre: 'Inversiones Triple 3000, C.A.',
        especificaciones: { observaciones: 'Prueba de color', partes: 2, tipoDocumento: 'F' },
        productoTerminado: 'TALONARIO', prioridad: 'ALTA', tecnologia: 'OFFSET', maquina: 'Heidelberg SM 52',
        clienteTelefono: '0212-555-0000', fechaFinalizado: null, notas: [],
      });
      estado.orden = r.cuerpo;

      const r2 = await estado.vendedor2.post('/ordenes', { ...orden, producto: 'Talonarios de Pedro' });
      expect(r2.cuerpo.codigo).toBe('OT-2026-0002');
      estado.ordenAjena = r2.cuerpo;

      expect((await estado.vendedor.post('/ordenes', { ...orden, vendedor: 'Otro' })).estado).toBe(400);
      expect((await estado.planta.post('/ordenes', orden)).estado).toBe(403);
      expect((await estado.vendedor.post('/ordenes', { ...orden, clienteId: '99999999-9999-4999-8999-999999999999' })).estado).toBe(404);
    });

    it('cada vendedor ve solo sus órdenes; admin y producción ven todas', async () => {
      const codigos = async (n) => (await n.get('/ordenes')).cuerpo.map((o) => o.codigo).sort();
      expect(await codigos(estado.vendedor)).toEqual(['OT-2026-0001']);
      expect(await codigos(estado.vendedor2)).toEqual(['OT-2026-0002']);
      expect(await codigos(estado.admin)).toEqual(['OT-2026-0001', 'OT-2026-0002']);
      expect(await codigos(estado.planta)).toEqual(['OT-2026-0001', 'OT-2026-0002']);
      expect((await estado.vendedor.get(`/ordenes/${estado.ordenAjena.id}`)).estado).toBe(404);
      expect((await estado.admin.get('/ordenes?q=pedro')).cuerpo).toHaveLength(1);
    });

    it('control de calidad: secuencial, retrabajo con motivo y versión', async () => {
      const id = estado.orden.id;
      const mover = (n, body) => {
        reloj.avanzar();
        return n.post(`/ordenes/${id}/transiciones`, body);
      };
      expect((await mover(estado.vendedor, { fase: 'EN_REVISION' })).estado).toBe(403);
      expect((await mover(estado.planta, { fase: 'FINALIZADO' })).cuerpo.error).toBe('TRANSICION_NO_PERMITIDA');
      expect((await mover(estado.planta, { fase: 'EMPACADO' })).estado).toBe(400);

      expect((await mover(estado.planta, { fase: 'EN_REVISION', versionEsperada: 1 })).cuerpo.version).toBe(2);
      expect((await mover(estado.planta, { fase: 'FINALIZADO', versionEsperada: 1 })).cuerpo.error).toBe('CONFLICTO_CONCURRENCIA');
      expect((await mover(estado.planta, { fase: 'EN_PROCESO' })).cuerpo.error).toBe('MOTIVO_REQUERIDO');
      expect((await mover(estado.planta, { fase: 'EN_PROCESO', nota: 'Registro desfasado' })).cuerpo.fase).toBe('EN_PROCESO');
      await mover(estado.planta, { fase: 'EN_REVISION' });
      const finalizada = await mover(estado.planta, { fase: 'FINALIZADO', nota: 'Color aprobado' });
      expect(finalizada.cuerpo.fechaFinalizado).not.toBeNull();

      // Defecto detectado después de finalizar: el vendedor no puede devolverla, solo pedirlo.
      expect((await mover(estado.vendedor, { fase: 'EN_PROCESO', nota: 'Manchas' })).cuerpo.error).toBe('SIN_PERMISO');
      const nota = await estado.vendedor.post(`/ordenes/${id}/notas`, { mensaje: 'El cliente vio manchas en la muestra', solicitaRetrabajo: true });
      expect(nota.estado).toBe(201);
      expect(nota.cuerpo).toMatchObject({ fase: 'FINALIZADO', notas: [expect.objectContaining({ rol: 'VENDEDOR', solicitaRetrabajo: true })] });
      expect((await estado.vendedor2.post(`/ordenes/${id}/notas`, { mensaje: 'No es mi orden' })).estado).toBe(404);
      expect((await mover(estado.planta, { fase: 'EN_PROCESO' })).cuerpo.error).toBe('MOTIVO_REQUERIDO');
      const devuelta = await mover(estado.planta, { fase: 'EN_PROCESO', nota: 'Manchas en 40 piezas: reimprimir' });
      expect(devuelta.cuerpo).toMatchObject({ fase: 'EN_PROCESO', fechaFinalizado: null });
      expect((await mover(estado.planta, { fase: 'FINALIZADO' })).cuerpo.error).toBe('TRANSICION_NO_PERMITIDA');
      await mover(estado.planta, { fase: 'EN_REVISION' });
      await mover(estado.planta, { fase: 'FINALIZADO', nota: 'Reimpresión aprobada' });
      const fin = await mover(estado.planta, { fase: 'EMPAQUETADO' });
      expect(fin.cuerpo).toMatchObject({ fase: 'EMPAQUETADO', avance: 100, estadoEntrega: 'PENDIENTE', version: 9 });
      expect(fin.cuerpo.historial.map((e) => `${e.anterior ?? '-'}>${e.fase}/${e.rol}`)).toEqual([
        '->EN_PROCESO/VENDEDOR',
        'EN_PROCESO>EN_REVISION/PRODUCCION',
        'EN_REVISION>EN_PROCESO/PRODUCCION',
        'EN_PROCESO>EN_REVISION/PRODUCCION',
        'EN_REVISION>FINALIZADO/PRODUCCION',
        'FINALIZADO>EN_PROCESO/PRODUCCION',
        'EN_PROCESO>EN_REVISION/PRODUCCION',
        'EN_REVISION>FINALIZADO/PRODUCCION',
        'FINALIZADO>EMPAQUETADO/PRODUCCION',
      ]);
      expect(fin.cuerpo.notas).toHaveLength(1);
      expect(fin.cuerpo.historial[2].nota).toBe('Registro desfasado');
      await esperarEventos();
    });

    it('notificaciones: el vendedor de la orden recibe los avisos; los demás vendedores no', async () => {
      const titulos = async (n) => (await n.get('/notificaciones')).cuerpo.map((x) => x.titulo);
      const deValeria = await titulos(estado.vendedor);
      expect(deValeria).toEqual(expect.arrayContaining([
        'Pedido empaquetado y listo para entrega',
        'Producción finalizada, lista para empaque',
        'Orden devuelta a producción por calidad',
      ]));
      const dePlanta = await titulos(estado.planta);
      expect(dePlanta).toContain(`Solicitud de revisión/retrabajo · ${estado.orden.codigo}`);
      expect(await titulos(estado.vendedor2)).toEqual([]);
      expect(dePlanta.filter((t) => t === 'Nueva orden recibida en taller')).toHaveLength(2);

      const lista = (await estado.vendedor.get('/notificaciones')).cuerpo;
      expect(lista.every((n) => n.leida === false)).toBe(true);
      expect((await estado.vendedor.post(`/notificaciones/${lista[0].id}/leida`)).cuerpo.leida).toBe(true);
      expect((await estado.vendedor2.post(`/notificaciones/${lista[0].id}/leida`)).estado).toBe(404);
      expect((await estado.vendedor.post('/notificaciones/leidas')).cuerpo.marcadas).toBe(lista.length - 1);
    });

    it('almacén: la orden empaquetada queda pendiente y se entrega por partes', async () => {
      const pendientes = (await estado.planta.get('/inventario/productos-terminados')).cuerpo;
      expect(pendientes).toEqual([
        expect.objectContaining({ ordenId: estado.orden.id, codigoOrden: 'OT-2026-0001', tipo: 'TALONARIO', cantidad: 1000, cantidadPendiente: 1000, estadoEntrega: 'PENDIENTE' }),
      ]);
      const id = pendientes[0].id;
      expect((await estado.vendedor.post(`/inventario/productos-terminados/${id}/entregas`, { cantidad: 1 })).estado).toBe(403);
      const parcial = await estado.planta.post(`/inventario/productos-terminados/${id}/entregas`, { cantidad: 400, recibidoPor: 'María Pérez' });
      expect(parcial.cuerpo).toMatchObject({ estadoEntrega: 'PARCIAL', cantidadPendiente: 600 });
      expect((await estado.planta.post(`/inventario/productos-terminados/${id}/entregas`, { cantidad: 601 })).cuerpo.error).toBe('ENTREGA_INVALIDA');
      await esperarEventos();
      expect((await estado.vendedor.get(`/ordenes/${estado.orden.id}`)).cuerpo.estadoEntrega).toBe('PARCIAL');

      const total = await estado.planta.post(`/inventario/productos-terminados/${id}/entregas`, { cantidad: 600 });
      expect(total.cuerpo).toMatchObject({ estadoEntrega: 'ENTREGADO', cantidadPendiente: 0 });
      expect(total.cuerpo.entregas.map((e) => [e.cantidad, e.usuario])).toEqual([[400, 'Luis Pérez'], [600, 'Luis Pérez']]);
      await esperarEventos();
      expect((await estado.vendedor.get(`/ordenes/${estado.orden.id}`)).cuerpo.estadoEntrega).toBe('ENTREGADO');
      expect((await estado.planta.get('/inventario/productos-terminados')).cuerpo).toEqual([]);
      expect((await estado.planta.get('/inventario/productos-terminados?soloPendientes=false')).cuerpo).toHaveLength(1);

      const [cliente] = (await estado.vendedor.get('/clientes')).cuerpo;
      expect(cliente).toMatchObject({ ordenesActivas: 1, saldoPendiente: 120.5 });
    });

    it('inventario: alta, entradas, salidas sin stock negativo y kardex', async () => {
      const m = await estado.admin.post('/inventario/materiales', {
        sku: 'sel-trodat-4912', nombre: 'Sello Trodat 4912', categoria: 'SELLO', unidad: 'unidad', stockMinimo: 5, costoUnitario: 8.5,
      });
      expect(m.estado).toBe(201);
      expect(m.cuerpo).toMatchObject({ sku: 'SEL-TRODAT-4912', stock: 0 });
      expect((await estado.planta.post('/inventario/materiales', { sku: 'X', nombre: 'X', categoria: 'PAPEL', subtipo: 'BOND', unidad: 'resma' })).estado).toBe(403);
      expect((await estado.admin.post('/inventario/materiales', { sku: 'SEL-TRODAT-4912', nombre: 'X', categoria: 'SELLO', unidad: 'unidad' })).cuerpo.error).toBe('CODIGO_DUPLICADO');
      expect((await estado.admin.post('/inventario/materiales', { sku: 'MAQ-1', nombre: 'Plotter Mimaki', categoria: 'MAQUINARIA', unidad: 'unidad' })).estado).toBe(400);

      const mov = (body) => estado.planta.post('/inventario/movimientos', { materialId: m.cuerpo.id, motivo: 'Prueba', ...body });
      expect((await mov({ tipo: 'ENTRADA', cantidad: 20, motivo: 'Compra proveedor' })).cuerpo).toMatchObject({ stockResultante: 20, usuario: 'Luis Pérez' });
      expect((await mov({ tipo: 'SALIDA', cantidad: 21 })).cuerpo.error).toBe('STOCK_INSUFICIENTE');
      expect((await mov({ tipo: 'SALIDA', cantidad: 3, usuario: 'Impostor' })).estado).toBe(400);
      expect((await mov({ tipo: 'SALIDA', cantidad: 3, motivo: 'Despacho a cliente' })).cuerpo.stockResultante).toBe(17);

      const [material] = (await estado.planta.get('/inventario/materiales?categoria=SELLO')).cuerpo;
      expect(material.stock).toBe(17);
      const kardex = (await estado.planta.get(`/inventario/movimientos?materialId=${m.cuerpo.id}`)).cuerpo;
      expect(kardex.map((x) => [x.tipo, x.cantidad, x.stockResultante])).toEqual([['SALIDA', 3, 17], ['ENTRADA', 20, 20]]);

      // El vendedor ve la disponibilidad para sus fichas, sin costos.
      const disp = (await estado.vendedor.get('/inventario/disponibilidad')).cuerpo;
      expect(disp).toEqual([expect.objectContaining({ nombre: 'Sello Trodat 4912', categoria: 'SELLO', stock: 17, disponible: true })]);
      expect(disp[0]).not.toHaveProperty('costoUnitario');
      expect((await estado.vendedor.get('/inventario/materiales')).estado).toBe(403);
    });

    it('empleados: desactivar cierra la sesión al instante; reglas del último admin', async () => {
      const yo = (await estado.admin.get('/auth/sesion')).cuerpo;
      expect((await estado.admin.patch(`/usuarios/${yo.id}/estado`, { activo: false })).cuerpo.mensaje).toMatch(/propia cuenta/);
      expect((await estado.vendedor2.get('/ordenes')).estado).toBe(200);
      const pedro = (await estado.admin.get('/usuarios')).cuerpo.find((u) => u.email === 'pedro@markenny.com');
      expect((await estado.admin.patch(`/usuarios/${pedro.id}/estado`, { activo: false })).cuerpo.activo).toBe(false);
      expect((await estado.vendedor2.get('/ordenes')).estado).toBe(401);
      expect((await navegador(app).post('/auth/login', { email: 'pedro@markenny.com', password: 'Clave2026' })).estado).toBe(401);

      expect((await estado.admin.post(`/usuarios/${estado.vendedorDatos.id}/password`, { password: 'Nueva2026x' })).estado).toBe(204);
      expect((await estado.vendedor.get('/ordenes')).estado).toBe(401);
      await estado.vendedor.entrar('valeria@markenny.com', 'Nueva2026x');
    });

    it('logout borra la cookie y la sesión', async () => {
      const r = await estado.vendedor.post('/auth/logout');
      expect(r.estado).toBe(204);
      expect((await estado.vendedor.get('/auth/sesion')).estado).toBe(401);
    });

    it('seguridad: cabeceras, CSRF por origen y 404 sin detalles', async () => {
      const r = await app.inject({ method: 'GET', url: '/api/v1/auth/estado' });
      expect(r.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'content-security-policy': expect.stringContaining("default-src 'none'"),
      });
      const desdeOtroSitio = await app.inject({
        method: 'POST', url: '/api/v1/auth/login', payload: { email: 'admin@markenny.com', password: PASSWORD_ADMIN },
        headers: { origin: 'https://sitio-malicioso.example', host: 'localhost:5173' },
      });
      expect(desdeOtroSitio.statusCode).toBe(403);
      expect(desdeOtroSitio.json().error).toBe('ORIGEN_NO_PERMITIDO');
      const mismoOrigen = await app.inject({
        method: 'POST', url: '/api/v1/auth/login', payload: { email: 'admin@markenny.com', password: PASSWORD_ADMIN },
        headers: { origin: 'http://localhost:5173', host: 'localhost:5173' },
      });
      expect(mismoOrigen.statusCode).toBe(200);
      const fetchCruzado = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { 'sec-fetch-site': 'cross-site' } });
      expect(fetchCruzado.statusCode).toBe(403);
      const noExiste = await app.inject({ method: 'GET', url: '/api/v1/../../etc/passwd' });
      expect(noExiste.statusCode).toBe(404);
      expect(noExiste.json()).toEqual({ error: 'NO_ENCONTRADO', mensaje: 'Recurso no encontrado' });
    });

    it('errores con el formato del contrato', async () => {
      const r = await estado.admin.post('/clientes', { nombre: 'X' });
      expect(r.estado).toBe(400);
      expect(r.cuerpo).toMatchObject({ error: 'CONTRATO_INVALIDO', mensaje: expect.any(String), detalles: expect.any(Array) });
      expect((await estado.admin.get('/ordenes/no-es-uuid')).estado).toBe(400);
    });
  });
}
