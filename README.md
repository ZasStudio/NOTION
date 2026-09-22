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

## Qué replica

### Editor de bloques
- Tipos: texto, encabezados 1–3, viñetas, numeradas, tareas, desplegable,
  cita, destacado, divisor, código, imagen, marcador web, **bloque HTML**,
  base de datos y subpágina.
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
      overlays.css  pro.css
js/   utils.js  icons.js  templates.js  store.js  charts.js  plans.js
      menus.js  collab.js  history.js  ai.js  database.js  blocks.js
      modals.js  sidebar.js  app.js
```

`store.js` mantiene el estado (páginas, personas, espacios, comentarios,
versiones, auditoría) y lo persiste; `blocks.js` es el editor; `database.js`
dibuja las vistas y el motor de fórmulas, relaciones y automatizaciones;
`ai.js` el asistente; `collab.js` compartir y comentarios; `history.js`
versiones, analíticas, auditoría y exportaciones; `charts.js` las gráficas SVG;
`modals.js` buscador, plantillas, papelera, ajustes y el anuncio.

## Notas

- El HTML pegado en los bloques se ejecuta dentro de un `iframe` con `sandbox`,
  y el HTML enriquecido de los bloques de texto se sanea antes de guardarse.
- Es una demo local: no hay servidor ni colaboración en tiempo real. Las personas
  del espacio son datos de ejemplo guardados en el navegador.
- La paleta de las gráficas está validada para visión normal y para daltonismo
  (protanopía, deuteranopía y tritanopía) en tema claro y oscuro; cada gráfica
  incluye además su tabla equivalente.
- Las fórmulas sólo admiten números, operadores y unas pocas funciones
  (`round`, `abs`, `min`, `max`, `floor`, `ceil`, `if`, `length`); cualquier otra
  cosa se rechaza antes de evaluarse.
