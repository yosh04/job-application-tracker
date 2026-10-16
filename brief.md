Crea un prototipo .html de para esta idea. utiliza colores azules. y negros.
Sí. La idea se puede plantear como un **Job Application Tracker** centrado en dos niveles: **objetivos de búsqueda** → **postulaciones individuales**. El prototipo en HTML debe priorizar que se entienda rápidamente el flujo y la jerarquía, sin intentar implementar todavía backend, autenticación o persistencia.

# Brief técnico — App de seguimiento de búsqueda laboral

## 1. Concepto

Aplicación web minimalista para **organizar, administrar y dar seguimiento a búsquedas de empleo y sus respectivas postulaciones**.

La aplicación permite crear diferentes **objetivos de búsqueda laboral**, por ejemplo:

> `Programador Frontend`

Dentro de ese objetivo se agrupan las diferentes empresas y puestos a los que se ha aplicado:

> Microsoft — Frontend Developer
> Shopify — Angular Developer
> Empresa X — Full Stack Developer

Cada postulación funciona como una ficha independiente donde se almacena toda la información relevante del proceso, incluyendo un **CV personalizado para esa posición**.

---

# 2. Jerarquía principal

```text
APLICACIÓN
│
├── Objetivo: Programador Frontend
│   ├── Empresa A — Frontend Developer
│   ├── Empresa B — Angular Developer
│   └── Empresa C — Software Developer
│
├── Objetivo: Backend Developer
│   ├── Empresa D — Node.js Developer
│   └── Empresa E — Backend Engineer
│
└── Objetivo: Trabajo Remoto
    ├── Empresa F — Full Stack Developer
    └── Empresa G — Web Developer
```

### Objetivo / Carpeta

Representa una **búsqueda laboral específica**.

Ejemplos:

* `Programador Frontend`
* `Desarrollador Angular`
* `Backend Developer`
* `Trabajo remoto`
* `Puestos Junior`
* `Empresas de Costa Rica`

### Postulación

Representa una **aplicación individual a un puesto**.

Ejemplo:

```text
Empresa: Microsoft
Puesto: Frontend Developer
Ubicación: Remoto
Estado: Entrevista
```

---

# 3. Estructura visual

La interfaz debe utilizar una estructura tipo **dashboard**.

```text
┌─────────────────────────────────────────────────────────────┐
│                       TOP BAR                               │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │              MAIN CONTENT                   │
│               │                                             │
│ + Nueva       │                                             │
│   búsqueda    │                                             │
│               │                                             │
│ 📁 Frontend   │        Programador Frontend                 │
│    ├ Empresa A│        ─────────────────────                │
│    ├ Empresa B│                                             │
│    └ Empresa C│        [ Estadísticas ]                     │
│               │                                             │
│ 📁 Backend    │        [ Postulaciones ]                    │
│    ├ Empresa D│                                             │
│    └ Empresa E│                                             │
│               │                                             │
│ 📁 Remoto     │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

El **sidebar es el elemento principal de navegación**.

---

# 4. Sidebar

Debe mostrar los objetivos creados por el usuario.

### Elementos

```text
JobTrack

+ Nueva búsqueda

BÚSQUEDAS

▾ Programador Frontend
    ├─ Microsoft
    ├─ Shopify
    └─ Empresa XYZ

▾ Backend Developer
    ├─ Amazon
    └─ Startup ABC

▸ Trabajo remoto
```

Cada carpeta puede:

* Abrirse/cerrarse.
* Seleccionarse.
* Renombrarse.
* Eliminarse.
* Contener múltiples postulaciones.

### Acción principal

**+ Nueva búsqueda**

Abre un pequeño formulario:

```text
Nueva búsqueda

Nombre
[ Programador Frontend          ]

Descripción
[ Buscando posiciones frontend
  junior/remoto                 ]

             Cancelar   Crear
```

---

# 5. Dashboard del objetivo

Cuando se selecciona una carpeta:

```text
Programador Frontend
Buscando posiciones frontend y Angular.

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│     12     │ │      5     │ │      3     │ │      2     │
│ Aplicadas  │ │ Entrevista │ │ En proceso │ │ Ofertas    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Debajo:

```text
Postulaciones

[ + Nueva postulación ]

┌─────────────────────────────────────────────────────────────┐
│ Empresa       Puesto              Estado       Fecha        │
├─────────────────────────────────────────────────────────────┤
│ Microsoft     Frontend Developer  Entrevista   02 Oct      │
│ Shopify       Angular Developer   Aplicado     29 Sep      │
│ Empresa XYZ   Web Developer       Rechazado    25 Sep      │
└─────────────────────────────────────────────────────────────┘
```

---

# 6. Postulación individual

Esta es la parte más importante de la aplicación.

Al seleccionar una empresa se abre su ficha:

```text
← Programador Frontend

Microsoft
Frontend Developer

[ Aplicado ]        [ Editar ] [ ⋮ ]

────────────────────────────────────────────

INFORMACIÓN

Empresa
Microsoft

Puesto
Frontend Developer

Ubicación
Remoto

URL de la oferta
https://...

Fecha de aplicación
02/10/2026
```

---

# 7. Estado de la aplicación

Cada aplicación debe tener un estado fácilmente identificable.

Estados iniciales:

```text
Guardado
Aplicado
Revisión
Entrevista
Oferta
Rechazado
Retirado
```

Visualmente:

```text
● Aplicado
● Entrevista
● Oferta
● Rechazado
```

No es necesario complicar el sistema con un workflow rígido. El usuario simplemente puede cambiar el estado.

---

# 8. Puntos de interés

Cada postulación debe permitir almacenar información específica de **esa posición**.

La sección podría llamarse:

### Puntos de interés

```text
PUNTOS DE INTERÉS

Descripción del puesto
──────────────────────────────
Desarrollar interfaces utilizando
Angular y TypeScript.

Tecnologías
──────────────────────────────
Angular
TypeScript
RxJS
REST APIs

Requisitos importantes
──────────────────────────────
• 2+ años de experiencia
• Inglés B2
• Experiencia con Git

Notas personales
──────────────────────────────
Preparar ejemplos de proyectos
Angular para la entrevista.
```

La idea es que el usuario pueda consultar rápidamente:

**¿Qué pedían para este puesto y qué debo tener preparado?**

---

# 9. CV personalizado

Cada aplicación puede tener un CV asociado.

```text
CV PERSONALIZADO

┌─────────────────────────────────────────┐
│                                         │
│          📄 CV - Microsoft.pdf          │
│                                         │
│       Actualizado hace 2 días            │
│                                         │
│      [ Ver ]  [ Reemplazar ]             │
│                                         │
└─────────────────────────────────────────┘

[ + Cargar CV ]
```

Importante para el prototipo:

**No es necesario implementar realmente la subida de archivos.**

El HTML puede simular el componente de upload.

Por ejemplo:

```text
┌─────────────────────────────────────┐
│                                     │
│       Arrastra tu CV aquí           │
│              o                      │
│         [ Seleccionar archivo ]      │
│                                     │
│        PDF · DOCX · 5 MB             │
│                                     │
└─────────────────────────────────────┘
```

---

# 10. Exportar una postulación

Una característica diferenciadora es que una postulación pueda ser enviada a otra carpeta.

Por ejemplo:

```text
Programador Frontend
    └── Empresa X
```

puede convertirse en:

```text
Trabajo remoto
    └── Empresa X
```

Acción:

```text
⋮

Editar
Duplicar
Mover a...
────────────────
Eliminar
```

Al seleccionar **Mover a...**:

```text
Mover postulación

Empresa X

Destino

○ Programador Frontend
○ Backend Developer
● Trabajo remoto
○ Crear nueva búsqueda

              Cancelar    Mover
```

Esto permite que una misma oportunidad sea reorganizada según la estrategia del usuario.

---

# 11. Detalle importante: mover vs copiar

Para el primer prototipo recomiendo que sea **Mover**, no duplicar.

Conceptualmente:

```text
ANTES

Programador Frontend
└── Empresa X


DESPUÉS

Programador Frontend

Trabajo remoto
└── Empresa X
```

La aplicación sigue teniendo **una única postulación**, simplemente cambia de objetivo.

Posteriormente podría existir:

> `Duplicar postulación`

si realmente fuera necesario.

---

# 12. Nueva postulación

Formulario:

```text
Nueva postulación

Empresa
[ Microsoft                     ]

Puesto
[ Frontend Developer            ]

Ubicación
[ Remoto                        ]

URL de la oferta
[ https://...                   ]

Fecha de aplicación
[ 02/10/2026                   ]

Estado
[ Aplicado ▼                   ]

────────────────────────────────

Puntos de interés

[ + Agregar punto ]

────────────────────────────────

CV personalizado

[ Arrastrar CV aquí ]

────────────────────────────────

              Cancelar   Guardar
```

---

# 13. Modelo de datos conceptual

Aunque el prototipo sea solamente HTML, conviene diseñarlo pensando en una futura aplicación real.

### Search / Objetivo

```typescript
Search {
  id
  name
  description
  createdAt
}
```

### Application / Postulación

```typescript
Application {
  id
  searchId
  company
  position
  location
  url
  status
  appliedAt
  notes
  cv
  createdAt
  updatedAt
}
```

### Interest Point

```typescript
InterestPoint {
  id
  applicationId
  title
  content
}
```

Relación:

```text
Search
   │
   ├── Application
   │      ├── InterestPoint
   │      ├── InterestPoint
   │      └── CV
   │
   ├── Application
   │      ├── InterestPoint
   │      └── CV
   │
   └── Application
```

---

# 14. Navegación

La aplicación puede mantenerse extremadamente simple:

```text
                    JobTrack
                       │
        ┌──────────────┴──────────────┐
        │                             │
     Sidebar                       Content
        │                             │
   Objetivos                    Dashboard
        │                             │
        └───────────┬─────────────────┘
                    │
              Postulación
                    │
       ┌────────────┼─────────────┐
       │            │             │
   Información   Intereses       CV
```

No agregaría en esta primera versión:

* Calendario.
* Chat.
* Contactos.
* Automatizaciones.
* Estadísticas avanzadas.
* Scraping de ofertas.
* Integración con LinkedIn.
* IA.
* Notificaciones.
* Sistema de tareas complejo.

El concepto funciona mejor si permanece como **un centro de control de postulaciones**.

---

# 15. Dirección visual

## Estilo

**Minimalista + profesional + funcional.**

Referencia conceptual:

```text
Linear
Notion
Raycast
GitHub Projects
```

Pero con una interfaz más orientada a gestión personal.

### Paleta

Preferiblemente:

```text
Background       #F8F9FA
Sidebar          #FFFFFF
Cards            #FFFFFF
Borders          #E5E7EB
Primary text     #18181B
Secondary text   #71717A
Accent           #16A34A
```

El verde puede representar acciones positivas:

* Aplicado
* Entrevista
* Oferta
* Crear
* Guardar

No usar demasiados colores.

---

# 16. Tipografía y componentes

Interfaz basada en:

* Sans-serif moderna.
* Bordes sutiles.
* Border radius pequeño/medio.
* Iconos lineales.
* Mucho espacio negativo.
* Botones compactos.
* Tablas limpias.
* Cards únicamente cuando aporten estructura.

Evitar:

* Gradientes.
* Sombras fuertes.
* Ilustraciones decorativas.
* Animaciones innecesarias.
* Colores saturados.

---

# 17. Responsive

El prototipo debería contemplar:

### Desktop

```text
┌──────────────┬────────────────────────────┐
│   Sidebar    │       Application           │
│    260px     │                             │
│              │                             │
└──────────────┴────────────────────────────┘
```

### Mobile

El sidebar se convierte en un menú desplegable:

```text
┌─────────────────────────────┐
│ ☰  JobTrack          ⋮      │
├─────────────────────────────┤
│                             │
│ Programador Frontend        │
│                             │
│ ┌─────────────────────────┐ │
│ │ Microsoft               │ │
│ │ Frontend Developer      │ │
│ │                         │ │
│ │ ● Entrevista            │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

# 18. Alcance del prototipo `.html`

El objetivo del prototipo **no es que funcione realmente**, sino demostrar visualmente el producto.

Debe incluir como mínimo:

### Sidebar

* Logo/nombre.
* Nueva búsqueda.
* Lista de carpetas.
* Postulaciones dentro de carpetas.
* Carpeta seleccionada.

### Dashboard

* Nombre del objetivo.
* Estadísticas.
* Lista de postulaciones.
* Botón nueva postulación.

### Vista de postulación

* Empresa.
* Puesto.
* Estado.
* URL.
* Fecha.
* Puntos de interés.
* Notas.
* CV personalizado.
* Acciones.

### Menús

* Editar.
* Mover.
* Duplicar.
* Eliminar.

### Modales visuales

* Nueva búsqueda.
* Nueva postulación.
* Mover postulación.
* Cargar CV.

---

# 19. Flujo principal del usuario

El flujo que debería quedar evidente en el prototipo es:

```text
                    INICIO
                      │
                      ▼
             Crear búsqueda
                      │
                      ▼
             "Programador"
                      │
                      ▼
           Agregar postulación
                      │
                      ▼
             "Empresa A"
                      │
             ┌────────┴─────────┐
             ▼                  ▼
       Información         CV personalizado
             │                  │
             └────────┬─────────┘
                      ▼
                Seguimiento
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
       Aplicado   Entrevista    Rechazado
                      │
                      ▼
                Mover / editar
```

---

# 20. Nombre conceptual

Para el brief utilizaría provisionalmente:

# **JobTrack**

**Tagline:**

> **Organize your job search. Track every application.**

La idea central del producto queda resumida en:

> **Una carpeta representa una búsqueda laboral; una postulación representa una oportunidad concreta dentro de esa búsqueda.**

Y eso debería ser la regla principal del diseño. No convertiría la aplicación en un CRM laboral complejo: **el foco es buscar trabajo, guardar información relevante de cada puesto, asociar un CV personalizado y saber exactamente en qué estado está cada postulación.**