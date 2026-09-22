/* ==========================================================================
   Plantillas y contenido inicial del workspace
   ========================================================================== */
const Templates = (() => {
  /* --------------------------- DSL para bloques --------------------------- */
  const B = (type, text = "", extra = {}) => ({
    id: U.uid("b"), type, text, indent: 0, color: "default",
    checked: false, open: true, ...extra,
  });

  const p = (t, e) => B("paragraph", t, e);
  const h1 = (t) => B("heading1", t);
  const h2 = (t) => B("heading2", t);
  const h3 = (t) => B("heading3", t);
  const bul = (t, indent = 0) => B("bulleted", t, { indent });
  const num = (t, indent = 0) => B("numbered", t, { indent });
  const todo = (t, checked = false) => B("todo", t, { checked });
  const quote = (t) => B("quote", t);
  const callout = (t, emoji = "💡", color = "gray") => B("callout", t, { emoji, color });
  const divider = () => B("divider");
  const code = (t, lang = "javascript") => B("code", t, { lang });
  const toggle = (t, children = []) => B("toggle", t, { children });
  const html = (src, height = 260) => B("html", "", { src, height });
  const image = (src, caption = "") => B("image", caption, { src });

  /* ------------------------- Helpers de base de datos --------------------- */
  const prop = (name, type, options = []) => ({
    id: U.uid("pr"), name, type,
    options: options.map((o) =>
      typeof o === "string" ? { id: U.uid("o"), name: o, color: U.pickColor(o) } : o
    ),
  });

  function db(name, props, rows, views) {
    const database = {
      id: U.uid("db"),
      name,
      props,
      rows: [],
      views: views || [{ id: U.uid("v"), name: "Tabla", type: "table" }],
      activeView: null,
    };
    database.activeView = database.views[0].id;
    for (const raw of rows) {
      const cells = {};
      props.forEach((pr, i) => {
        if (raw[i] !== undefined && raw[i] !== null) cells[pr.id] = raw[i];
      });
      database.rows.push({ id: U.uid("r"), cells, pageId: null });
    }
    return database;
  }

  const view = (name, type, opts = {}) => ({ id: U.uid("v"), name, type, ...opts });

  /* ------------------------------ Plantillas ------------------------------ */
  const list = [
    {
      id: "roi-notes",
      name: "ROI Notes",
      icon: "📈",
      category: "work",
      desc: "Calcula y documenta el retorno de una implementación con supuestos explícitos.",
      build: () => ({
        title: "ROI Notes",
        icon: "📈",
        blocks: [
          h2("Overview"),
          bul("Replaced a patchwork of tools + manual reporting (baseline: ~$18.5k/mo)"),
          bul("Notion/tooling cost estimated at ~$2.2k/mo"),
          bul("Estimated time saved: ~320 hrs/month across Ops + CS"),
          bul("Fully loaded rate assumed: $95/hr"),
          h2("Outcomes (estimated)"),
          bul("Monthly savings: ~$30.4k"),
          bul("Annual net benefit: ~$337.2k"),
          bul("Payback period: ~2.1 months"),
          h2("Assumptions"),
          callout(
            "Todas las cifras son estimaciones internas. Revisa los supuestos con Finanzas antes de publicar.",
            "⚠️",
            "yellow"
          ),
          B("table-db"),
        ],
        db: db(
          "Cálculo",
          [prop("Concepto", "title"), prop("Mensual", "number"), prop("Anual", "number"),
           prop("Fuente", "select", ["Finanzas", "Ops", "Estimado"])],
          [
            ["Baseline de herramientas", 18500, 222000, "Finanzas"],
            ["Costo de la nueva stack", -2200, -26400, "Finanzas"],
            ["Horas ahorradas × tarifa", 30400, 364800, "Ops"],
            ["Beneficio neto", 28100, 337200, "Estimado"],
          ]
        ),
      }),
    },
    {
      id: "meeting-notes",
      name: "Notas de reunión",
      icon: "🗒️",
      category: "work",
      desc: "Agenda, decisiones y próximos pasos con responsables.",
      build: () => ({
        title: "Notas de reunión",
        icon: "🗒️",
        blocks: [
          p("<strong>Fecha:</strong> " + U.formatDate(U.today())),
          p("<strong>Asistentes:</strong> "),
          divider(),
          h2("Agenda"),
          num("Revisión de la semana"),
          num("Bloqueos"),
          num("Próximos pasos"),
          h2("Decisiones"),
          callout("Escribe aquí las decisiones tomadas y quién las aprueba.", "✅", "green"),
          h2("Action items"),
          todo("Asignar responsable de cada acuerdo"),
          todo("Compartir notas en el canal del equipo"),
        ],
      }),
    },
    {
      id: "project-roadmap",
      name: "Roadmap de proyectos",
      icon: "🗺️",
      category: "work",
      desc: "Tablero kanban por estado con prioridad, responsable y fechas.",
      build: () => ({
        title: "Roadmap de proyectos",
        icon: "🗺️",
        blocks: [p("Arrastra tarjetas entre columnas para actualizar el estado."), B("table-db")],
        db: (() => {
          const props = [
            prop("Proyecto", "title"),
            prop("Estado", "select", ["Backlog", "En progreso", "En revisión", "Listo"]),
            prop("Prioridad", "select", ["Alta", "Media", "Baja"]),
            prop("Responsable", "person"),
            prop("Entrega", "date"),
            prop("Etiquetas", "multi_select", ["Producto", "Diseño", "Backend", "Growth"]),
          ];
          const d = db("Proyectos", props, [
            ["Rediseño del onboarding", "En progreso", "Alta", "Ana", U.today(), ["Producto", "Diseño"]],
            ["Migración a la nueva API", "Backlog", "Media", "Luis", "", ["Backend"]],
            ["Campaña de lanzamiento", "En revisión", "Alta", "Sofía", "", ["Growth"]],
            ["Documentación pública", "Listo", "Baja", "Marco", "", ["Producto"]],
          ]);
          d.views = [
            view("Tablero", "board", { groupBy: props[1].id }),
            view("Tabla", "table"),
            view("Calendario", "calendar", { dateProp: props[4].id }),
            view("Galería", "gallery"),
          ];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
    {
      id: "task-list",
      name: "Lista de tareas",
      icon: "✅",
      category: "productivity",
      desc: "Tareas con estado, fecha y prioridad en tabla o lista.",
      build: () => ({
        title: "Lista de tareas",
        icon: "✅",
        blocks: [B("table-db")],
        db: (() => {
          const props = [
            prop("Tarea", "title"),
            prop("Hecho", "checkbox"),
            prop("Estado", "select", ["Por hacer", "En progreso", "Hecho"]),
            prop("Fecha", "date"),
            prop("Prioridad", "select", ["Alta", "Media", "Baja"]),
          ];
          const d = db("Tareas", props, [
            ["Preparar demo del viernes", false, "En progreso", U.today(), "Alta"],
            ["Responder feedback de diseño", false, "Por hacer", "", "Media"],
            ["Actualizar la wiki del equipo", true, "Hecho", "", "Baja"],
          ]);
          d.views = [view("Tabla", "table"), view("Lista", "list"),
                     view("Tablero", "board", { groupBy: props[2].id })];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
    {
      id: "company-wiki",
      name: "Wiki de la empresa",
      icon: "📚",
      category: "company",
      desc: "Punto único de verdad: procesos, equipos y enlaces clave.",
      build: () => ({
        title: "Wiki de la empresa",
        icon: "📚",
        blocks: [
          callout("Todo lo que el equipo necesita saber, en un solo lugar.", "📚", "blue"),
          h2("Equipos"),
          bul("Producto · Diseño · Ingeniería · Operaciones"),
          h2("Procesos"),
          bul("Onboarding de nuevas personas"),
          bul("Cómo pedir vacaciones"),
          bul("Política de gastos"),
          h2("Enlaces"),
          bul("Brand kit"),
          bul("Repositorios"),
        ],
        children: [
          { title: "Onboarding", icon: "🚀", blocks: [h2("Primer día"), todo("Accesos"), todo("Buddy asignado"), todo("Lectura de la wiki")] },
          { title: "Políticas", icon: "📋", blocks: [h2("Vacaciones"), p("Solicita con 2 semanas de anticipación."), h2("Gastos"), p("Reembolso a 15 días.")] },
        ],
      }),
    },
    {
      id: "weekly-agenda",
      name: "Agenda semanal",
      icon: "📅",
      category: "productivity",
      desc: "Planifica la semana por día con prioridades y notas.",
      build: () => ({
        title: "Agenda semanal",
        icon: "📅",
        blocks: [
          h2("Prioridades de la semana"),
          todo("Prioridad #1"),
          todo("Prioridad #2"),
          todo("Prioridad #3"),
          divider(),
          ...["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].flatMap((d) => [
            h3(d), todo("…"),
          ]),
        ],
      }),
    },
    {
      id: "simple-crm",
      name: "CRM simple",
      icon: "🤝",
      category: "work",
      desc: "Pipeline de clientes con etapa, valor y siguiente contacto.",
      build: () => ({
        title: "CRM simple",
        icon: "🤝",
        blocks: [B("table-db")],
        db: (() => {
          const props = [
            prop("Empresa", "title"),
            prop("Etapa", "select", ["Lead", "Contactado", "Propuesta", "Ganado", "Perdido"]),
            prop("Valor", "number"),
            prop("Contacto", "person"),
            prop("Siguiente paso", "date"),
            prop("Sitio", "url"),
          ];
          const d = db("Pipeline", props, [
            ["Acme Corp", "Propuesta", 12000, "Ana", U.today(), "https://acme.com"],
            ["Globex", "Lead", 4500, "Luis", "", ""],
            ["Initech", "Ganado", 22000, "Sofía", "", ""],
          ]);
          d.views = [view("Tablero", "board", { groupBy: props[1].id }), view("Tabla", "table")];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
    {
      id: "content-calendar",
      name: "Calendario de contenido",
      icon: "🗓️",
      category: "work",
      desc: "Publicaciones por canal y fecha, con vista de calendario.",
      build: () => ({
        title: "Calendario de contenido",
        icon: "🗓️",
        blocks: [B("table-db")],
        db: (() => {
          const props = [
            prop("Pieza", "title"),
            prop("Canal", "multi_select", ["Blog", "Newsletter", "X", "LinkedIn", "YouTube"]),
            prop("Publicación", "date"),
            prop("Estado", "select", ["Idea", "Borrador", "Revisión", "Publicado"]),
            prop("Autor", "person"),
          ];
          const d = db("Contenido", props, [
            ["Cómo usamos bloques HTML", ["Blog"], U.today(), "Borrador", "Ana"],
            ["Newsletter de septiembre", ["Newsletter"], "", "Idea", "Marco"],
            ["Demo de Skills", ["YouTube", "X"], "", "Revisión", "Sofía"],
          ]);
          d.views = [view("Calendario", "calendar", { dateProp: props[2].id }),
                     view("Tabla", "table"),
                     view("Tablero", "board", { groupBy: props[3].id })];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
    {
      id: "habit-tracker",
      name: "Seguimiento de hábitos",
      icon: "🔥",
      category: "productivity",
      desc: "Marca tus hábitos diarios y observa la racha.",
      build: () => ({
        title: "Seguimiento de hábitos",
        icon: "🔥",
        blocks: [B("table-db")],
        db: db(
          "Hábitos",
          [prop("Hábito", "title"), prop("L", "checkbox"), prop("M", "checkbox"),
           prop("X", "checkbox"), prop("J", "checkbox"), prop("V", "checkbox")],
          [
            ["Leer 20 min", true, true, false, false, false],
            ["Ejercicio", true, false, true, false, false],
            ["Escribir", false, true, true, false, false],
          ]
        ),
      }),
    },
    {
      id: "reading-list",
      name: "Lista de lectura",
      icon: "📖",
      category: "notes",
      desc: "Libros y artículos con estado, autor y valoración.",
      build: () => ({
        title: "Lista de lectura",
        icon: "📖",
        blocks: [B("table-db")],
        db: (() => {
          const props = [
            prop("Título", "title"),
            prop("Autor", "text"),
            prop("Estado", "select", ["Por leer", "Leyendo", "Leído"]),
            prop("Tipo", "select", ["Libro", "Artículo", "Paper"]),
            prop("Enlace", "url"),
          ];
          const d = db("Lecturas", props, [
            ["Shape Up", "Ryan Singer", "Leyendo", "Libro", "https://basecamp.com/shapeup"],
            ["The Making of a Manager", "Julie Zhuo", "Por leer", "Libro", ""],
          ]);
          d.views = [view("Galería", "gallery"), view("Tabla", "table"), view("Lista", "list")];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
    {
      id: "product-spec",
      name: "Especificación de producto",
      icon: "📐",
      category: "work",
      desc: "Problema, alcance, métricas y riesgos de una funcionalidad.",
      build: () => ({
        title: "Especificación de producto",
        icon: "📐",
        blocks: [
          callout("Estado: borrador · Autor: · Revisores: ", "📝", "blue"),
          h2("Problema"),
          p("¿Qué dolor real estamos resolviendo y para quién?"),
          h2("Objetivos"),
          bul("Objetivo principal"),
          bul("No-objetivos"),
          h2("Propuesta"),
          p("Describe la solución con el detalle suficiente para implementarla."),
          h2("Métricas de éxito"),
          bul("Métrica primaria"),
          bul("Métricas de guardarraíl"),
          h2("Riesgos"),
          toggle("Riesgos abiertos"),
        ],
      }),
    },
    {
      id: "daily-journal",
      name: "Diario",
      icon: "🌤️",
      category: "notes",
      desc: "Entrada diaria con gratitud, foco y aprendizajes.",
      build: () => ({
        title: U.formatDate(U.today(), { weekday: "long", day: "numeric", month: "long" }),
        icon: "🌤️",
        blocks: [
          h3("Foco de hoy"),
          p(""),
          h3("Tres cosas buenas"),
          bul(""), bul(""), bul(""),
          h3("Aprendizajes"),
          p(""),
        ],
      }),
    },
    {
      id: "okrs",
      name: "OKRs trimestrales",
      icon: "🎯",
      category: "company",
      desc: "Objetivos y resultados clave con progreso por trimestre.",
      build: () => ({
        title: "OKRs del trimestre",
        icon: "🎯",
        blocks: [B("table-db")],
        db: db(
          "OKRs",
          [prop("Resultado clave", "title"), prop("Objetivo", "select", ["Crecer ingresos", "Mejorar retención", "Acelerar entrega"]),
           prop("Dueño", "person"), prop("Progreso", "number"), prop("Estado", "select", ["En riesgo", "En curso", "Logrado"])],
          [
            ["Reducir churn a 2%", "Mejorar retención", "Ana", 45, "En curso"],
            ["Cerrar 20 cuentas nuevas", "Crecer ingresos", "Sofía", 70, "En curso"],
            ["Deploy diario estable", "Acelerar entrega", "Luis", 100, "Logrado"],
          ]
        ),
      }),
    },
    {
      id: "bug-tracker",
      name: "Seguimiento de bugs",
      icon: "🐞",
      category: "work",
      desc: "Reportes con severidad, área y estado de resolución.",
      build: () => ({
        title: "Seguimiento de bugs",
        icon: "🐞",
        blocks: [B("table-db")],
        db: (() => {
          const props = [
            prop("Bug", "title"),
            prop("Severidad", "select", ["Crítico", "Alto", "Medio", "Bajo"]),
            prop("Área", "select", ["Editor", "Sidebar", "Base de datos", "Sync"]),
            prop("Estado", "select", ["Nuevo", "Confirmado", "En arreglo", "Cerrado"]),
            prop("Reportado", "date"),
          ];
          const d = db("Bugs", props, [
            ["El slash menu no cierra con Escape", "Medio", "Editor", "Confirmado", U.today()],
            ["Arrastrar tarjeta pierde el grupo", "Alto", "Base de datos", "Nuevo", ""],
          ]);
          d.views = [view("Tabla", "table"), view("Tablero", "board", { groupBy: props[3].id })];
          d.activeView = d.views[0].id;
          return d;
        })(),
      }),
    },
  ];

  const CATEGORIES = [
    { id: "all", name: "Todas", icon: "✨" },
    { id: "work", name: "Trabajo", icon: "💼" },
    { id: "productivity", name: "Productividad", icon: "⚡" },
    { id: "notes", name: "Notas", icon: "📝" },
    { id: "company", name: "Empresa", icon: "🏢" },
  ];

  const byId = (id) => list.find((t) => t.id === id);

  /** Inserta una plantilla como página (con subpáginas si las define). */
  function apply(store, tplId, parentId = null) {
    const tpl = byId(tplId);
    if (!tpl) return null;
    const spec = tpl.build();
    const page = store.createPage({
      title: spec.title, icon: spec.icon, blocks: spec.blocks, db: spec.db, parentId,
    });
    (spec.children || []).forEach((child) =>
      store.createPage({ ...child, parentId: page.id })
    );
    return page;
  }

  /* ----------------------- Contenido inicial del espacio ------------------- */
  function seedWorkspace(store) {
    const home = store.createPage({
      title: "Inicio",
      icon: "🏠",
      cover: "linear-gradient(135deg,#2383e2,#9065b0 60%,#d9730d)",
      blocks: [
        callout(
          "Bienvenido a tu réplica de Notion. Escribe <code>/</code> en cualquier línea para insertar bloques.",
          "👋", "blue"
        ),
        h2("Empieza por aquí"),
        todo("Escribe <code>/</code> y prueba los bloques"),
        todo("Crea una base de datos y cambia entre vistas"),
        todo("Abre la galería de plantillas desde la barra lateral"),
        h2("Atajos"),
        bul("<strong>⌘/Ctrl + K</strong> — buscar en el espacio"),
        bul("<strong>⌘/Ctrl + \\</strong> — mostrar u ocultar la barra lateral"),
        bul("<strong>⌘/Ctrl + Shift + L</strong> — cambiar entre claro y oscuro"),
        bul("<strong>Tab / Shift + Tab</strong> — sangrar bloques"),
        h2("Bloque HTML"),
        p("Los bloques HTML traen visuales interactivos a cualquier página:"),
        html(
          `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;font-family:ui-sans-serif,-apple-system,Segoe UI,Arial;background:#fbfbfa;color:#37352f;
       display:grid;place-items:center;height:240px}
  .card{text-align:center}
  .bar{display:flex;gap:6px;align-items:flex-end;height:110px;margin-top:14px}
  .bar div{width:26px;background:#2383e2;border-radius:4px 4px 0 0;animation:g .9s var(--d,0s) ease both}
  @keyframes g{from{height:0}}
  h3{margin:0;font-size:15px}
  small{color:#787774}
</style>
<div class="card">
  <h3>Ingresos por trimestre</h3>
  <small>Ejemplo interactivo en un iframe aislado</small>
  <div class="bar">
    <div style="height:40px;--d:.0s"></div><div style="height:66px;--d:.1s"></div>
    <div style="height:52px;--d:.2s"></div><div style="height:92px;--d:.3s"></div>
    <div style="height:110px;--d:.4s"></div>
  </div>
</div>`,
          260
        ),
      ],
    });

    const tasks = apply(store, "task-list", null);
    const roadmap = apply(store, "project-roadmap", null);
    apply(store, "meeting-notes", roadmap.id);
    apply(store, "roi-notes", null);
    store.createPage({
      title: "Notas rápidas",
      icon: "⚡",
      blocks: [p("Un lugar para lo que no tiene lugar."), bul("Idea suelta"), bul("Enlace por leer")],
    });

    store.state.favorites = [home.id, tasks.id];
    store.state.openId = home.id;
    store.state.expanded[roadmap.id] = true;
    store.emit();
  }

  return { list, CATEGORIES, byId, apply, seedWorkspace, B, db, prop, view };
})();
