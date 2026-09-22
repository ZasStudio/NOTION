/* ==========================================================================
   Funciones avanzadas: TODO desbloqueado.
   No hay paywall, planes ni cobros — este módulo sólo expone las
   capacidades como siempre disponibles y un panel informativo.
   ========================================================================== */
const Plans = (() => {
  /** Catálogo de lo que normalmente sería de pago y aquí viene incluido. */
  const FEATURES = [
    { id: "ai", name: "Notion AI", icon: "sparkle",
      desc: "Redacta, resume, traduce, extrae tareas y rellena bases de datos." },
    { id: "unlimitedBlocks", name: "Bloques ilimitados", icon: "doc",
      desc: "Sin tope de bloques ni de páginas en todo el espacio." },
    { id: "versionRestore", name: "Historial de versiones", icon: "clock",
      desc: "Historial ilimitado con vista previa y restauración." },
    { id: "comments", name: "Comentarios y debates", icon: "comment",
      desc: "Comenta cualquier bloque, responde y resuelve hilos." },
    { id: "advancedPermissions", name: "Permisos avanzados", icon: "lock",
      desc: "Acceso total, edición, comentario o solo lectura por persona." },
    { id: "privateTeamspaces", name: "Espacios de equipo privados", icon: "people",
      desc: "Espacios abiertos o privados, con sus propios miembros." },
    { id: "largeUploads", name: "Subidas sin límite", icon: "import",
      desc: "Archivos de cualquier tamaño en los bloques de archivo." },
    { id: "automations", name: "Automatizaciones", icon: "routines",
      desc: "Reglas que reaccionan a cambios en una base de datos." },
    { id: "syncedBlocks", name: "Bloques sincronizados", icon: "mcp",
      desc: "Un contenido, muchas páginas, siempre igual." },
    { id: "charts", name: "Gráficas", icon: "board",
      desc: "Vista de gráfica en cualquier base de datos." },
    { id: "analytics", name: "Analíticas de página", icon: "sort",
      desc: "Vistas, personas y actividad reciente por página." },
    { id: "audit", name: "Registro de auditoría", icon: "list",
      desc: "Todo lo que pasa en el espacio, con autor y fecha." },
    { id: "adminSearch", name: "Búsqueda de administrador", icon: "search",
      desc: "Busca en todo el contenido del espacio, incluida la papelera." },
    { id: "bulkExport", name: "Exportación completa", icon: "doc",
      desc: "Exporta el espacio entero a Markdown, JSON o PDF." },
    { id: "sso", name: "SSO y aprovisionamiento", icon: "lock",
      desc: "Gestión de personas y roles del espacio de trabajo." },
  ];

  const LABELS = Object.fromEntries(FEATURES.map((f) => [f.id, f.name]));

  /* Todo disponible, siempre. Se mantiene la firma para el resto de módulos. */
  const has = () => true;
  const require = () => true;
  const atLeast = () => true;
  const current = () => "unlocked";

  /* Sin topes de ningún tipo. */
  const LIMITS = {
    historyDays: Infinity,
    guests: Infinity,
    uploadMB: Infinity,
    teamBlocks: Infinity,
    aiCredits: Infinity,
  };
  const limit = (key) => LIMITS[key];

  const blockCount = () =>
    Object.values(Store.state.pages)
      .filter((p) => !p.deleted)
      .reduce((n, p) => n + p.blocks.length, 0);

  /* ------------------------- Panel de funciones ---------------------------- */
  function features() {
    const card = U.el(
      "div", { class: "modal features-modal" },
      U.el(
        "div", { class: "tpl-head" },
        U.el("h2", { text: "Funciones incluidas" }),
        U.el("span", { class: "chip chip-pro", text: "Todo desbloqueado" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })
      ),
      U.el("p", { class: "features-intro", text: "Nada está detrás de un plan: cada función avanzada está activa en este espacio." }),
      U.el(
        "div", { class: "features-grid" },
        ...FEATURES.map((f) =>
          U.el(
            "div", { class: "feature-card" },
            U.el("span", { class: "feature-icon", html: ICONS[f.icon] || ICONS.sparkle }),
            U.el(
              "div", {},
              U.el("div", { class: "feature-name" },
                U.el("span", { text: f.name }),
                U.el("span", { class: "feature-on", html: ICONS.check })),
              U.el("div", { class: "feature-desc", text: f.desc })
            )
          )
        )
      ),
      U.el(
        "div", { class: "features-foot" },
        U.el("span", { text: `${blockCount()} bloques en el espacio · sin límite` }),
        U.el("button", { class: "btn btn-primary", text: "Entendido", onclick: () => modal.close() })
      )
    );
    const modal = Modals.overlay(card);
    return modal;
  }

  /** Insignia de la barra lateral. */
  const badge = () =>
    U.el(
      "button",
      { class: "plan-badge", onclick: features, title: "Ver funciones incluidas" },
      U.el("span", { class: "plan-chip", text: "Todo desbloqueado" }),
      U.el("span", { class: "plan-meta", text: `${blockCount()} bloques` })
    );

  /* Sin candados: nunca hay nada que marcar como bloqueado. */
  const lockChip = () => null;
  const upsell = () => {};
  const pricing = features;

  return {
    FEATURES, LABELS, LIMITS, has, require, atLeast, current, limit,
    blockCount, features, badge, lockChip, upsell, pricing,
    aiCreditsLeft: () => Infinity,
    blocksLeft: () => Infinity,
  };
})();
