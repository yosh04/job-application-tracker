# Tareas del proyecto — JobTrack (del prototipo a producción)

Hoja de ruta para llevar este prototipo a una aplicación en producción.
Estado actual: prototipo local (React + Vite + Tailwind, estado en memoria con `useState` + seed, sin backend, sin persistencia; al recargar se pierden los cambios).

## Fase 0 — Base lista (prototipo actual)

- [x] Gestión de búsquedas (crear, renombrar, eliminar: `createSearch` / `updateSearch` / `deleteSearch`)
- [x] Gestión de postulaciones (crear, editar, duplicar, mover, eliminar: `saveApplication` / `duplicateApp` / `moveApp` / `deleteApp`)
- [x] Estados de seguimiento: 9 estados exactos definidos en `STATUSES` (`src/types.ts`)
  - [x] Guardado, Aplicado, Sin respuesta, Revisión, Entrevista, Oferta, Contratado, Rechazado, Retirado
- [x] Fecha límite opcional por postulación (`Application.deadline?: string`)
- [x] Puntos de interés y notas personales por postulación
- [x] CV asociado simulado (solo metadata `{name, size, updatedAt}`, sin archivo real; con `TODO` de Storage)
- [x] Evidencia en imágenes como data-URL, máx. 4 por postulación (`MAX_EVIDENCE_IMAGES`; sin declarar en roadmap previo)
- [x] Login de prototipo simulado (cualquier email con `@` ingresa, sin persistencia de sesión)
- [x] Búsqueda parcial: filtro local dentro de cada búsqueda + Enter en el header abre el primer match (sin lista de múltiples resultados)

## Fase 1 — Autenticación con Supabase

- [ ] Instalar `@supabase/supabase-js`
- [ ] Activar `src/lib/supabaseClient.ts` (hoy exporta `null`) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Reemplazar login simulado por `supabase.auth.signInWithPassword`
- [ ] Agregar registro, recuperación de contraseña y cierre de sesión real
- [ ] Mantener sesión persistente y exponer `user` en `App.tsx` (hoy `useState<string | null>`)
- [ ] Proteger vistas: si no hay `user`, mostrar solo login/overview limitado
- [ ] Definir variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env` local (fuera de git)

## Fase 2 — Persistencia en base de datos

- [ ] Diseñar schema en Postgres (Supabase): `searches`, `applications` (FK a `searches` con cascade + `check` de estado), `interest_points` (FK a `applications`)
- [ ] Definir políticas RLS por `user_id` / propietario en las tres tablas
- [ ] Reemplazar `useState` + seed por consultas a Supabase (lectura/escritura por usuario)
- [ ] Reemplazar `uid()` (`Math.random`) por `uuid` generado en base de datos
- [ ] Migrar datos semilla con fechas ISO (`todayISO()` / `YYYY-MM-DD`) y validar estados y fechas

## Fase 3 — Almacenamiento de CV

- [ ] Crear bucket privado en Supabase Storage segmentado por `user_id`
- [ ] Validar en cliente PDF/DOCX de máx. 5 MB + reforzar con policy en el bucket
- [ ] Reemplazar carga simulada por subida real y guardar la URL en `Application.cv`
- [ ] Permitir previsualizar, descargar y eliminar el CV por postulación
- [ ] Migrar imágenes de evidencia de data-URL a Storage (hoy `images: string[]` con `TODO` en `src/types.ts` y `App.tsx`)

## Fase 4 — Filtros y búsqueda

### 4a — Búsqueda global real

- [ ] Reemplazar "Enter abre el primer match" por lista de múltiples resultados
- [ ] Buscar en empresa, puesto, ubicación y notas
- [ ] Hacer funcional el atajo `⌘K` / `Ctrl+K` para abrir la búsqueda

### 4b — Filtros combinados y ordenamiento

- [ ] Filtros combinados por estado + búsqueda, aplicables cross-search (todas las búsquedas)
- [ ] Ordenamiento por `appliedAt` asc/desc
- [ ] Ordenamiento por `deadline` asc/desc (respetando que es opcional)

## Fase 5 — Fechas y recordatorios

- [x] Resaltado de fecha límite vencida o próxima en `ApplicationView` (parcial: existe en detalle, falta en resto)
- [ ] Agregar badge de vencimiento en dashboard y overview
- [ ] Crear vista agenda ordenada por `deadline` (próximos vencimientos)
- [ ] Recordatorios por correo vía Edge Function + cron (decisión de alcance: definir frecuencia y plantilla antes de implementar)

## Fase 6 — Despliegue

- [ ] Renombrar `package.json` (`react-vite-tailwind` es genérico; usar `jobtrack` o similar)
- [ ] Revisar `vite-plugin-singlefile` activo: evaluar si se mantiene en producción (bundle único vs. caché/CDN)
- [ ] Configurar variables de entorno en el hosting (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Desplegar frontend (Vercel, Netlify o similar)
- [ ] Verificar autenticación, RLS y Storage en producción con usuario real

## Fase 7 — Pulido

- [ ] Corregir bug de notas sin resync (edición de notas no se refleja hasta recargar/renavegar)
- [ ] Agregar validaciones: URL de oferta, formato de fechas, tipo/tamaño de CV
- [ ] Hacer el Dropdown accesible por teclado + focus-trap en modales
- [ ] Agregar acciones (ver/editar/mover/eliminar) a las cards en mobile
- [ ] Agregar `vitest` + tests de flujos: crear, duplicar, mover y eliminar postulaciones; filtros
- [ ] Auditoría responsive y de contraste
- [ ] Limpieza de código prototipo (`TODO(supabase)`, seed, `uid()`) y documentación final

## Deuda detectada en revisión

- Sin persistencia: todo vive en `useState` + seed y los IDs usan `Math.random`, por lo que hay colisiones posibles y pérdida de datos al recargar.
- Sin validaciones ni tests: URLs, fechas y archivos se aceptan sin control; no hay suite de pruebas.
- Accesibilidad y mobile parciales: Dropdown sin teclado y cards sin acciones en pantallas chicas.
