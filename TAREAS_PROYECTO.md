# Tareas del proyecto — JobTrack (del prototipo a producción)

Hoja de ruta para llevar este prototipo a una aplicación en producción.
Estado actual: rama `develop` con auth real, persistencia en Supabase y Storage privado (Fases 1–3 en código; pendientes verificaciones físicas: provider Google, mimes de imágenes y smoke tests).

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

- [x] Instalar `@supabase/supabase-js`
- [x] Activar `src/lib/supabaseClient.ts` (hoy exporta `null`) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [x] Reemplazar login simulado por `supabase.auth.signInWithPassword`
- [x] Agregar registro, recuperación de contraseña y cierre de sesión real
- [x] Mantener sesión persistente y exponer `user` en `App.tsx` (hoy `useState<string | null>`)
- [x] Proteger vistas: si no hay `user`, mostrar solo login/overview limitado
- [x] Definir variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env` local (fuera de git)
- [x] Extra: login con Google OAuth 2.0 (`signInWithOAuth`; pendiente activar provider en Dashboard)

## Fase 2 — Persistencia en base de datos

- [x] Diseñar schema en Postgres (Supabase): `searches`, `applications` (FK a `searches` con cascade + `check` de estado), `interest_points` (FK a `applications`)
- [x] Definir políticas RLS por `user_id` / propietario en las tres tablas
- [x] Reemplazar `useState` + seed por consultas a Supabase (lectura/escritura por usuario)
- [x] Reemplazar `uid()` (`Math.random`) por `uuid` generado en base de datos
- [x] Migrar datos semilla con fechas ISO (`todayISO()` / `YYYY-MM-DD`) y validar estados y fechas (import explícito con botón, nunca automático)

## Fase 3 — Almacenamiento de CV

- [x] Crear bucket privado en Supabase Storage segmentado por `user_id` (vía UI: el SQL Editor no puede escribir `storage.buckets`, error 42501)
- [x] Validar en cliente PDF/DOCX de máx. 5 MB + reforzar con policy en el bucket
- [x] Reemplazar carga simulada por subida real y guardar la URL en `Application.cv`
- [x] Permitir previsualizar, descargar y eliminar el CV por postulación
- [x] Migrar imágenes de evidencia de data-URL a Storage (hoy `images: string[]` con `TODO` en `src/types.ts` y `App.tsx`; pendiente agregar mimes de imagen al bucket por UI)

## Fase 4 — Filtros y búsqueda

### 4a — Búsqueda global real

- [x] Reemplazar "Enter abre el primer match" por lista de múltiples resultados
- [x] Buscar en empresa, puesto, ubicación y notas
- [x] Hacer funcional el atajo `⌘K` / `Ctrl+K` para abrir la búsqueda

### 4b — Filtros combinados y ordenamiento

- [x] Filtros combinados por estado + búsqueda, aplicables cross-search (todas las búsquedas)
- [x] Ordenamiento por `appliedAt` asc/desc
- [x] Ordenamiento por `deadline` asc/desc (respetando que es opcional)

## Fase 5 — Fechas y recordatorios

- [x] Resaltado de fecha límite vencida o próxima en detalle, dashboard y overview
- [x] Agregar badge de vencimiento en dashboard y overview
- [x] Crear vista agenda ordenada por `deadline` (vencidas y próximos vencimientos)
- [ ] Recordatorios por correo vía Edge Function + cron (decisión de alcance: definir frecuencia y plantilla antes de implementar) NO IMPLEMENTAR. 

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
