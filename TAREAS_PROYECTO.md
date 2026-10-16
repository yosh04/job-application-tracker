# Tareas del proyecto — JobTrack (del prototipo a producción)

Hoja de ruta general para llevar este prototipo a una aplicación en producción.
Estado actual: prototipo local (React + Vite + Tailwind, estado en memoria, sin backend).

## Fase 0 — Base lista (prototipo actual)

- [x] Gestión de búsquedas (crear, renombrar, eliminar)
- [x] Gestión de postulaciones (crear, editar, duplicar, mover, eliminar)
- [x] Estados de seguimiento (incluye "Sin respuesta" y "Contratado")
- [x] Fecha límite opcional por postulación
- [x] Puntos de interés, notas personales y CV asociado (simulado)
- [x] Login de prototipo (sin backend)

## Fase 1 — Autenticación con Supabase

- [ ] Crear proyecto en Supabase y configurar claves (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Instalar `@supabase/supabase-js` y activar `src/lib/supabaseClient.ts`
- [ ] Reemplazar login simulado por `supabase.auth.signInWithPassword`
- [ ] Agregar registro, recuperación de contraseña y cierre de sesión real
- [ ] Proteger rutas y asociar datos al usuario autenticado

## Fase 2 — Persistencia en base de datos

- [ ] Diseñar tablas en Postgres (Supabase): búsquedas, postulaciones, puntos de interés
- [ ] Reemplazar `useState` local por consultas a Supabase
- [ ] Definir políticas de seguridad (RLS) por usuario
- [ ] Migrar datos semilla y validar estados y fechas

## Fase 3 — Almacenamiento de CV

- [ ] Crear bucket en Supabase Storage para archivos CV
- [ ] Reemplazar carga simulada por subida real (PDF/DOCX, máx. 5 MB)
- [ ] Permitir ver, descargar y eliminar el CV por postulación

## Fase 4 — Filtros y búsqueda

- [ ] Búsqueda global de postulaciones (empresa, puesto, ubicación)
- [ ] Filtros combinados por estado y búsqueda
- [ ] Ordenamiento por fecha de aplicación y fecha límite

## Fase 5 — Fechas y recordatorios

- [ ] Resaltar postulaciones con fecha límite vencida o próxima
- [ ] Recordatorios por correo de seguimientos pendientes
- [ ] Vista de calendario o agenda de próximos vencimientos

## Fase 6 — Despliegue

- [ ] Configurar variables de entorno en el hosting
- [ ] Desplegar frontend (Vercel, Netlify o similar)
- [ ] Verificar autenticación y base de datos en producción

## Fase 7 — Pulido

- [ ] Pruebas básicas de flujos principales
- [ ] Revisión de accesibilidad y diseño responsive
- [ ] Limpieza de código prototipo y documentación final
