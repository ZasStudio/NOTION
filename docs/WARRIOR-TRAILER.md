# Réplica de Notion — Zas Studio

Aplicación web que replica el diseño y las funciones de Notion, con **todas las
funciones avanzadas desbloqueadas**. Sin dependencias, sin build y sin pasarelas
de pago.

## Enlaces

| Recurso | Dónde |
| --- | --- |
| Repositorio | `github.com/ZasStudio/NOTION` |
| Rama | `claude/quirky-euler-ycwgru` |
| Demo en vivo (privada) | `https://claude.ai/artifact/Fw2yzBk1wKzyeti1UzypKK` |

---

## Cómo abrirlo

**1. Demo en vivo** — abre el enlace de arriba. Es privado: solo tu cuenta lo ve
hasta que lo compartas desde el menú *Share* de esa página.

**2. Doble clic**

```
git clone -b claude/quirky-euler-ycwgru https://github.com/ZasStudio/NOTION.git
```

Abre `index.html` con doble clic. Funciona porque no hay build ni dependencias.

**3. Servidor local** (recomendado)

```
cd NOTION
npx http-server -p 8080 -c-1 .
```

Entra a `http://localhost:8080`.

> El contenido se guarda en el navegador (`localStorage`), así que cada entorno
> tiene su propio espacio de trabajo. Desde *Ajustes → Datos* puedes exportar a
> JSON e importarlo en el otro.

---

## Editor de bloques

Diecisiete tipos de bloque, menú `/` con búsqueda en vivo y atajos de Markdown.

- Texto, encabezados 1–3, viñetas, listas numeradas, tareas, desplegable, cita,
  destacado, divisor, código con resaltado de lenguaje, imagen y marcador web.
- **Bloque HTML**: visuales interactivos dentro de un `iframe` con `sandbox`.
- **Imágenes** con el selector completo: subir del equipo, arrastrar y soltar,
  pegar del portapapeles, insertar por enlace o reutilizar una subida previa,
  con redimensionado por asas, alineación y pie de foto. La portada y el icono
  de página aceptan lo mismo.
- Base de datos y subpágina.
- Índice automático, ruta de navegación, botón configurable, archivo adjunto,
  contenido insertado (YouTube, Vimeo, Figma), bloque sincronizado y bloque de IA.

**Interacción**

- Atajos de Markdown: `#`, `##`, `###`, `-`, `1.`, `[]`, `>`, `"`, ``` ``` ```, `---`.
- Barra flotante de formato al seleccionar texto: negrita, cursiva, subrayado,
  tachado, código en línea, enlaces y los diez colores de texto y fondo de Notion.
- Enter divide el bloque por el cursor, Backspace fusiona con el anterior,
  `Tab` / `Shift+Tab` sangra hasta cuatro niveles.
- Arrastrar para reordenar, menú por bloque (convertir en, color, duplicar,
  mover, comentar, preguntar a la IA) y selección múltiple.
- Portada con degradados o URL, icono emoji, ancho completo y texto pequeño.

---

## Bases de datos

**Cinco vistas**: tabla, tablero kanban con arrastre entre columnas, galería,
lista y calendario. Más la vista de **gráfica**.

**Propiedades**: título, texto, número, selección, selección múltiple, fecha,
persona, casilla, URL, **fórmula**, **relación**, **rollup**, fecha de creación y
última edición.

- Fórmulas del tipo `{Mensual} * 36`, con `round`, `abs`, `min`, `max`, `floor`,
  `ceil`, `if` y `length`.
- Relaciones entre bases de datos de distintas páginas.
- Rollups con conteo, suma, media, mínimo y máximo.
- Filtros y ordenaciones por vista, búsqueda, plantillas de fila y exportación a CSV.
- **Automatizaciones**: al crear una fila o cuando una propiedad toma un valor, se
  asignan propiedades o se deja un comentario.

---

## Funciones avanzadas (todas activas)

No hay planes, paywall ni cobros en ninguna parte. El panel **Todo desbloqueado**
de la barra lateral lista las quince funciones incluidas.

### Notion AI — `⌘J` o el botón *IA*

**Modo local, sin red ni claves.** Motor determinista que hace de verdad lo que
promete: resumen extractivo, extracción de frases accionables como tareas,
limpieza de redacción, acortar, convertir en viñetas, cambiar de tono y esquema
de página.

**Modo Claude.** Conectando tu propia clave de Anthropic en *Administración →
Ajustes de Notion AI* se suman continuar escribiendo, alargar, traducir y lluvia
de ideas. Modelos disponibles: Claude Opus 5, Sonnet 5 y Haiku 4.5.

También: bloque de IA regenerable dentro de la página y **autorrelleno de
propiedades** en las bases de datos.

### Skills, MCP y agentes

Las tres funciones que el anuncio de novedades promete, implementadas de verdad.

**Skills.** Instrucciones del equipo escritas como `SKILL.md`, con número de
versión que sube al guardar. Se eligen desde el panel de IA o desde una rutina;
cuando hay clave conectada viajan en el system prompt del modelo.

**Conexiones MCP.** Slack, GitHub, Mixpanel, Miro, Box y Mercury, cada una con sus
herramientas declaradas. Al activarlas pueden traer contenido a una página nueva
en forma de base de datos. Los datos son de ejemplo: no hay llamadas reales a
esos servicios.

**Rutinas y agentes.** Un tablero donde asignas trabajo a un agente —Claude,
Cursor o el del espacio— con tres columnas: pendiente, en curso y listo. Cada
rutina ejecuta una acción de IA sobre una página concreta, con una skill opcional,
y escribe el resultado dentro de ella. Se pueden repetir cada 5, 15 o 60 minutos
mientras la pestaña siga abierta.

### Colaboración

- Comentarios por bloque con respuestas, resolución y panel lateral (`⌘⇧C`).
- Compartir con permisos por persona: acceso total, editar, comentar o ver.
- Invitados, publicación en la web y bloqueo de página.
- Personas del espacio con roles, y facepile en la barra superior.

### Historial y control

- Historial de versiones ilimitado, con vista previa y restauración.
- Analíticas de página: vistas por día y por persona, con tabla equivalente.
- Registro de auditoría de todo lo que ocurre, exportable a CSV.
- Búsqueda de contenido para administradores, que llega hasta la papelera.
- Exportación del espacio completo a Markdown, JSON o PDF.

### Espacios de equipo

Espacios abiertos o privados con sus propios miembros, junto al área privada.

---

## Plantillas incluidas

ROI Notes · Notas de reunión · Roadmap de proyectos · Lista de tareas · Wiki de la
empresa · Agenda semanal · CRM simple · Calendario de contenido · Seguimiento de
hábitos · Lista de lectura · Especificación de producto · Diario · OKRs
trimestrales · Seguimiento de bugs.

---

## Atajos

| Atajo | Acción |
| --- | --- |
| `⌘/Ctrl + K` | Buscar en el espacio |
| `⌘/Ctrl + J` | Notion AI |
| `⌘/Ctrl + Shift + C` | Panel de comentarios |
| `⌘/Ctrl + \` | Mostrar u ocultar la barra lateral |
| `⌘/Ctrl + Shift + L` | Cambiar entre claro y oscuro |
| `⌘/Ctrl + Shift + N` | Nueva página |
| `⌘/Ctrl + D` | Duplicar bloque |
| `⌘/Ctrl + Z` y `⌘/Ctrl + Shift + Z` | Deshacer y rehacer |
| `Esc` | Seleccionar el bloque (luego `Supr`, `⌘D` o `⌘C` como Markdown) |
| `/` | Menú de bloques |
| `Tab` y `Shift + Tab` | Sangrar bloques |

---

## Estructura del proyecto

```
index.html
css/  tokens.css  base.css  layout.css  editor.css  database.css
      overlays.css  pro.css
js/   utils.js  icons.js  templates.js  store.js  charts.js  plans.js
      menus.js  collab.js  history.js  ai.js  database.js  blocks.js
      modals.js  sidebar.js  app.js
```

| Archivo | Responsabilidad |
| --- | --- |
| `store.js` | Estado y persistencia: páginas, personas, espacios, comentarios, versiones, auditoría |
| `blocks.js` | Editor de bloques |
| `database.js` | Vistas, fórmulas, relaciones y automatizaciones |
| `ai.js` | Asistente en modo local y modo Claude |
| `collab.js` | Compartir, permisos y comentarios |
| `history.js` | Versiones, analíticas, auditoría y exportaciones |
| `charts.js` | Gráficas SVG |
| `modals.js` | Buscador, plantillas, papelera, ajustes y el anuncio |

---

## Decisiones técnicas que conviene conocer

**La paleta de Notion no sirve para gráficas.** Al validarla, dos pares de colores
quedan a ΔE 6.2 para protanopía y 10.7 para visión normal: son indistinguibles.
Las gráficas usan una paleta validada aparte para visión normal y para daltonismo
en ambos temas, y cada gráfica trae su tabla equivalente. Los colores de Notion se
mantienen para etiquetas y textos.

**La clave de API se guarda en el navegador** y viaja directo a `api.anthropic.com`.
Está avisado dentro de la propia interfaz: en producción esa llamada debería salir
de tu servidor, no del navegador.

**Las fórmulas se validan antes de evaluarse.** Solo se admiten números, operadores
y las funciones listadas; cualquier otra cosa se rechaza.

**El HTML se sanea.** Lo que se pega en los bloques de texto pasa por un
saneamiento que quita `script`, `iframe` y atributos de evento; los bloques HTML
se ejecutan aislados en un `iframe` con `sandbox`.

**Los archivos subidos viven en IndexedDB.** No dentro del JSON del espacio: así
el estado guardado sigue siendo pequeño y no revienta la cuota de
`localStorage`. Las fotos de más de 2000 px se reescalan antes de guardarse, los
GIF y SVG se dejan intactos, y al exportar el espacio las imágenes viajan dentro
del JSON.

**Es una demo local.** No hay servidor ni colaboración en tiempo real: las personas
del espacio son datos de ejemplo guardados en el navegador.

---

## Problemas encontrados y corregidos

| Problema | Causa | Solución |
| --- | --- | --- |
| Se perdían pulsaciones al crear un bloque | El foco se colocaba en el siguiente frame | Enfoque síncrono tras el render |
| Las tarjetas de plantilla salían sin texto | Las filas del grid se encogían al alto del modal | `grid-auto-rows: max-content` |
| El tablero se desbordaba de la página | El bloque de base de datos no limitaba su ancho | `display: block` y desplazamiento interno |
| El menú `/` se cerraba al escribir espacios | Se cerraba ante cualquier espacio | Ahora cierra solo si no hay coincidencias |
| Las gráficas salían deformadas | El SVG se estiraba al 100% | Tamaño natural con `max-width` |
| Los menús tapaban los modales | No se cerraban al abrir un modal | `Menus.closeAll()` al abrir |
| Los submenús dentro de un modal no se podían pulsar | El `z-index` del menú quedaba por debajo del overlay | Menús a 700, por encima de modales y paneles |
| Elegir una skill cerraba el panel de IA | El menú vive fuera del panel y disparaba el cierre por clic externo | Se ignoran los clics dentro de un `.menu` |

---

## Estado

Verificado en Chromium sin errores de consola: carga, editor, bases de datos,
IA, comentarios, compartir, historial, analíticas, auditoría, gráficas,
persistencia tras recargar y layout móvil a 414 px.

- [x] Réplica del diseño y del editor
- [x] Bases de datos con cinco vistas y plantillas
- [x] Anuncio «We've been cooking!» replicado
- [x] Funciones avanzadas desbloqueadas
- [ ] Publicar en GitHub Pages para una URL pública permanente
- [ ] Conectar Notion para sincronizar desde aquí
