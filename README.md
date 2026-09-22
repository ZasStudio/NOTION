# NOTION — réplica de diseño y funciones

Réplica funcional de Notion hecha con **HTML, CSS y JavaScript sin dependencias
ni paso de compilación**. Incluye el editor de bloques, bases de datos con
varias vistas, galería de plantillas y el anuncio *“We've been cooking!”* con
los bloques HTML, Skills, MCP y Routines.

## Cómo ejecutarlo

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
npx http-server -p 8080 -c-1 .
# http://localhost:8080
```

No necesita instalación: todo el estado vive en `localStorage` del navegador.

> **Todo desbloqueado.** Las funciones que en Notion son de pago —IA, historial de
> versiones, comentarios, permisos, espacios de equipo privados, automatizaciones,
> gráficas, analíticas, auditoría y exportación completa— vienen activas. No hay
> planes, paywall ni pasarela de pago en ninguna parte.

## Apariencia

Dos pieles, conmutables en *Ajustes → Apariencia*:

- **Cristal líquido** (por defecto): superficies translúcidas con desenfoque y
  filo especular sobre una aurora de fondo, control segmentado para las vistas,
  listas agrupadas con separadores hairline, hojas con asa y tipografía del
  sistema. Respeta `prefers-reduced-motion` y cae a superficies sólidas donde no
  hay `backdrop-filter`.
- **Clásico**: la réplica fiel del diseño plano de Notion.

## El proyecto dentro de la réplica

El espacio de equipo **Proyecto** contiene la página «Réplica de Notion» con la
base de datos de funciones (por área, tabla y gráfica) y sus subpáginas:
Roadmap, Arquitectura, Decisiones técnicas y Cómo abrirlo. Está también en la
galería de plantillas.

## Qué replica

### Editor de bloques
- Tipos: texto, encabezados 1–3, viñetas, numeradas, tareas, desplegable,
  cita, destacado, divisor, código, imagen, marcador web, **bloque HTML**,
  base de datos y subpágina.
- **Columnas** de 2, 3 o 4, con divisores arrastrables y bloques movibles entre
  ellas; se apilan solas en móvil.
- **Tabla simple** (sin base de datos) con encabezado de fila y de columna.
- **Encabezados desplegables**: cualquier H1–H3 puede plegar su sección.
- **Menciones** con `@`: páginas, personas y fechas, con autocompletado.
- **Imágenes** con el selector completo de Notion: subir desde el equipo,
  arrastrar y soltar sobre la página, pegar con `⌘/Ctrl + V`, insertar por
  enlace o reutilizar una subida anterior. Se redimensionan arrastrando las
  asas laterales, se alinean y llevan pie de foto. La portada y el icono de
  página aceptan lo mismo.
- Menú `/` con búsqueda en vivo y navegación por teclado.
- Atajos de Markdown: `# `, `## `, `### `, `- `, `1. `, `[] `, `> `, `" `,
  ` ``` `, `--- `.
- Barra flotante de formato al seleccionar texto: negrita, cursiva, subrayado,
  tachado, código en línea, enlaces y los 10 colores de texto/fondo de Notion.
- Enter divide el bloque por el cursor, Backspace fusiona con el anterior,
  `Tab`/`Shift+Tab` sangra hasta 4 niveles, `↑`/`↓` saltan entre bloques.
- Menú por bloque (⋮⋮): eliminar, duplicar, convertir en, color, mover y
  copiar enlace. Arrastrar y soltar para reordenar.
- Portada con degradados o URL, icono emoji, ancho completo y texto pequeño.

### Bases de datos
- Vistas **tabla, tablero (kanban), galería, lista y calendario**, cada una
  con sus pestañas como en Notion.
- Propiedades: título, texto, número, selección, selección múltiple, fecha,
  persona, casilla y URL — con colores de etiqueta automáticos.
- Edición en línea, crear/renombrar/eliminar propiedades, ordenar, buscar,
  arrastrar tarjetas entre columnas del tablero, abrir una fila como página y
  exportar a CSV.

### Espacio de trabajo
- Barra lateral con favoritos, árbol de páginas anidadas (arrastrable),
  ancho ajustable y colapsable.
- Búsqueda global (`⌘/Ctrl + K`) por título y contenido, con recientes.
- Papelera con restaurar y eliminar definitivamente.
- Temas claro y oscuro con los tokens de color reales de Notion.
- Exportar página a Markdown y el espacio completo a JSON (e importarlo).

### Funciones avanzadas (todas activas)

**Notion AI** (`⌘J` o el botón *IA*)
- Resumir, extraer tareas, mejorar redacción, acortar, viñetas, cambiar de tono y
  esquema de página funcionan **sin red ni claves**, con un motor local
  determinista.
- Conectando tu propia clave de Anthropic en *Administración → Ajustes de Notion
  AI*, las mismas acciones —más continuar escribiendo, alargar, traducir y lluvia
  de ideas— pasan por Claude. La clave se guarda solo en tu navegador; en
  producción conviene llamar a la API desde un servidor.
- Bloque de IA regenerable dentro de la página y **autorrelleno de propiedades**
  en las bases de datos.

**Skills, MCP y agentes** (las tres funciones que anuncia el modal de novedades)
- **Skills**: instrucciones del equipo en formato `SKILL.md`, con versión que sube
  al guardar. Se aplican desde el panel de IA o desde una rutina, y viajan en el
  system prompt cuando hay clave conectada.
- **Conexiones MCP**: Slack, GitHub, Mixpanel, Miro, Box y Mercury, cada una con
  sus herramientas. Al conectarlas pueden traer contenido a una página nueva
  como base de datos. En esta demo los datos son de ejemplo, no hay llamadas
  reales a esos servicios.
- **Rutinas y agentes**: tablero de trabajo asignado a agentes (Claude, Cursor o
  el del espacio). Cada rutina ejecuta una acción de IA sobre una página, con una
  skill opcional, y escribe el resultado en ella. Pueden repetirse cada 5, 15 o
  60 minutos mientras la pestaña esté abierta.

**Colaboración**
- Comentarios por bloque con respuestas, resolución y panel lateral (`⌘⇧C`).
- Compartir con permisos por persona (acceso total, editar, comentar, ver),
  invitados, publicación en la web y bloqueo de página.
- Personas del espacio con roles y facepile en la barra superior.

**Historial y control**
- Historial de versiones ilimitado con vista previa y restauración.
- Analíticas de página: vistas por día y por persona, con tabla equivalente.
- Registro de auditoría de todo lo que ocurre, exportable a CSV.
- Búsqueda de contenido para administradores, incluida la papelera.
- Exportación del espacio completo a Markdown, JSON o PDF.

**Espacios de equipo**
- Espacios abiertos o privados, con sus miembros, además del área privada.

**Bases de datos avanzadas**
- Propiedades de **fórmula** (`{Mensual} * 36`), **relación** entre bases y
  **rollup** (conteo, suma, media, mínimo, máximo), más fecha de creación y de
  última edición.
- Filtros y ordenaciones por vista, búsqueda, plantillas de fila y vista de
  **gráfica**.
- **Ventana lateral** (*side peek*) al abrir una fila, con su **panel de
  propiedades** editable, igual que en Notion; desde ahí se edita el contenido
  de la página y se sincroniza el título con la celda.
- **Vistas enlazadas**: mostrar la base de datos de otra página, cada una con su
  propia vista activa.
- **Cálculos por columna** en el pie de la tabla: contar, con valor, vacíos,
  únicos, porcentaje, suma, media, mínimo, máximo y rango.
- **Automatizaciones**: al crear una fila o cuando una propiedad toma un valor,
  se asignan propiedades o se deja un comentario.

**Bloques adicionales**
- Tabla de contenidos, ruta de navegación, botón configurable, archivo adjunto
  sin límite de tamaño, contenido insertado (YouTube, Vimeo, Figma), bloque
  sincronizado y bloque de IA.

### Plantillas (14)
ROI Notes, Notas de reunión, Roadmap de proyectos, Lista de tareas, Wiki de la
empresa, Agenda semanal, CRM simple, Calendario de contenido, Seguimiento de
hábitos, Lista de lectura, Especificación de producto, Diario, OKRs
trimestrales y Seguimiento de bugs.

## Atajos

| Atajo | Acción |
| --- | --- |
| `⌘/Ctrl + K` | Buscar |
| `⌘/Ctrl + \` | Mostrar u ocultar la barra lateral |
| `⌘/Ctrl + Shift + L` | Cambiar tema |
| `⌘/Ctrl + Shift + N` | Nueva página |
| `⌘/Ctrl + J` | Notion AI |
| `⌘/Ctrl + Shift + C` | Panel de comentarios |
| `⌘/Ctrl + D` | Duplicar bloque |
| `Esc` | Seleccionar el bloque (luego `Supr`, `⌘D` o `⌘C` como Markdown) |
| `⌘/Ctrl + Z` / `⌘/Ctrl + Shift + Z` | Deshacer / rehacer |
| `/` | Menú de bloques |

## Estructura

```
index.html
css/  tokens.css  base.css  layout.css  editor.css  database.css
      overlays.css  pro.css  glass.css
js/   utils.js  icons.js  templates.js  store.js  assets.js  charts.js
      plans.js  menus.js  collab.js  history.js  ai.js  agents.js
      database.js  blocks.js  modals.js  sidebar.js  app.js
```

`store.js` mantiene el estado (páginas, personas, espacios, comentarios,
versiones, auditoría) y lo persiste; `blocks.js` es el editor; `database.js`
dibuja las vistas y el motor de fórmulas, relaciones y automatizaciones;
`ai.js` el asistente; `agents.js` skills, conexiones MCP y rutinas; `collab.js` compartir y comentarios; `history.js`
versiones, analíticas, auditoría y exportaciones; `charts.js` las gráficas SVG; `assets.js` el almacén de archivos y el selector de medios;
`modals.js` buscador, plantillas, papelera, ajustes y el anuncio.

## Notas

- El HTML pegado en los bloques se ejecuta dentro de un `iframe` con `sandbox`,
  y el HTML enriquecido de los bloques de texto se sanea antes de guardarse.
- Las imágenes y archivos que subes se guardan en **IndexedDB** del navegador,
  no dentro del JSON del espacio: así el estado sigue siendo pequeño y no se
  llena la cuota de `localStorage`. Las fotos de más de 2000 px o 400 KB se
  reescalan antes de guardarse; los GIF y SVG se conservan intactos. Al exportar
  el espacio, las imágenes viajan dentro del archivo.
- Es una demo local: no hay servidor ni colaboración en tiempo real. Las personas
  del espacio son datos de ejemplo guardados en el navegador.
- La paleta de las gráficas está validada para visión normal y para daltonismo
  (protanopía, deuteranopía y tritanopía) en tema claro y oscuro; cada gráfica
  incluye además su tabla equivalente.
- Las fórmulas sólo admiten números, operadores y unas pocas funciones
  (`round`, `abs`, `min`, `max`, `floor`, `ceil`, `if`, `length`); cualquier otra
  cosa se rechaza antes de evaluarse.
