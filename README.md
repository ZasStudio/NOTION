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
| `⌘/Ctrl + D` | Duplicar bloque |
| `⌘/Ctrl + Z` / `⌘/Ctrl + Shift + Z` | Deshacer / rehacer |
| `/` | Menú de bloques |

## Estructura

```
index.html
css/  tokens.css  base.css  layout.css  editor.css  database.css  overlays.css
js/   utils.js  icons.js  templates.js  store.js  menus.js
      database.js  blocks.js  modals.js  sidebar.js  app.js
```

`store.js` mantiene el estado y lo persiste; `blocks.js` es el editor;
`database.js` dibuja las vistas; `modals.js` contiene buscador, plantillas,
papelera, ajustes y el anuncio.

## Notas

- El HTML pegado en los bloques se ejecuta dentro de un `iframe` con `sandbox`,
  y el HTML enriquecido de los bloques de texto se sanea antes de guardarse.
- Es una demo local: no hay servidor, cuentas ni colaboración en tiempo real.
