/* ==========================================================================
   Barra lateral: workspace, favoritos, árbol de páginas y acciones
   ========================================================================== */
const Sidebar = (() => {
  let root = null;
  let dragPageId = null;

  function pageMenu(page, x, y) {
    Menus.open({
      x, y, width: 230,
      items: [
        { label: "Renombrar", icon: ICONS.rename, onClick: () => {
            const t = prompt("Nuevo título:", page.title);
            if (t !== null) Store.updatePage(page.id, { title: t });
          } },
        { label: Store.isFavorite(page.id) ? "Quitar de favoritos" : "Añadir a favoritos",
          icon: ICONS.star, onClick: () => Store.toggleFavorite(page.id) },
        { label: "Duplicar", icon: ICONS.duplicate, onClick: () => Store.duplicatePage(page.id) },
        { label: "Copiar enlace", icon: ICONS.link, onClick: () => {
            navigator.clipboard?.writeText(location.origin + location.pathname + "#" + page.id);
            U.toast("Enlace copiado");
          } },
        { type: "separator" },
        { label: "Añadir subpágina", icon: ICONS.plus, onClick: () => {
            const child = Store.createPage({ title: "", parentId: page.id });
            Store.state.expanded[page.id] = true;
            Store.open(child.id);
          } },
        { label: "Insertar plantilla", icon: ICONS.template, onClick: () => Modals.templates(page.id) },
        { type: "separator" },
        { label: "Mover a la papelera", icon: ICONS.trash, danger: true,
          onClick: () => Store.deletePage(page.id) },
      ],
    });
  }

  function treeRow(page, depth) {
    const st = Store.state;
    const kids = Store.childrenOf(page.id);
    const expanded = !!st.expanded[page.id];
    const row = U.el("div", {
      class: "tree-row" + (st.openId === page.id ? " is-active" : ""),
      style: { paddingLeft: 4 + depth * 14 + "px" },
      draggable: "true",
      ondragstart: (e) => { dragPageId = page.id; e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; },
      ondragover: (e) => {
        if (!dragPageId || dragPageId === page.id) return;
        e.preventDefault();
        row.classList.add("drop-target");
      },
      ondragleave: () => row.classList.remove("drop-target"),
      ondrop: (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove("drop-target");
        if (!dragPageId || dragPageId === page.id) return;
        Store.movePage(dragPageId, page.id);
        Store.state.expanded[page.id] = true;
        dragPageId = null;
        Store.emit();
      },
      onclick: () => Store.open(page.id),
      oncontextmenu: (e) => { e.preventDefault(); pageMenu(page, e.clientX, e.clientY); },
    });

    row.append(
      U.el("button", {
        class: "tree-toggle" + (expanded ? " open" : ""),
        html: ICONS.chevronRight,
        onclick: (e) => {
          e.stopPropagation();
          st.expanded[page.id] = !expanded;
          Store.emit();
        },
      }),
      U.el("span", { class: "tree-emoji" + (kids.length ? " has-children" : "") },
        U.iconNode(page.icon, 14)),
      U.el("span", { class: "tree-label", text: page.title || "Sin título" }),
      U.el(
        "span", { class: "tree-actions" },
        U.el("button", {
          class: "icon-btn", html: ICONS.dots, title: "Opciones",
          onclick: (e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            pageMenu(page, r.left - 180, r.bottom + 4);
          },
        }),
        U.el("button", {
          class: "icon-btn", html: ICONS.plus, title: "Añadir subpágina",
          onclick: (e) => {
            e.stopPropagation();
            const child = Store.createPage({ title: "", parentId: page.id });
            st.expanded[page.id] = true;
            Store.open(child.id);
          },
        })
      )
    );

    const frag = document.createDocumentFragment();
    frag.append(row);
    if (expanded) {
      if (!kids.length) {
        frag.append(
          U.el("div", {
            class: "tree-empty", text: "Sin páginas dentro",
            style: { paddingLeft: 26 + depth * 14 + "px" },
          })
        );
      }
      kids.forEach((k) => frag.append(treeRow(k, depth + 1)));
    }
    return frag;
  }

  function newTeamspace(isPrivate) {
    const name = prompt(isPrivate ? "Nombre del espacio privado:" : "Nombre del espacio de equipo:");
    if (!name) return;
    const ts = Store.createTeamspace({ name, isPrivate });
    Store.audit("teamspace.create", `${name}${isPrivate ? " (privado)" : ""}`);
    U.toast(`Espacio «${name}» creado`);
    return ts;
  }

  function section(title, { onAdd, collapsedKey } = {}) {
    const st = Store.state;
    const collapsed = collapsedKey ? !!st[collapsedKey] : false;
    return U.el(
      "div", { class: "sb-section" },
      U.el("button", {
        class: "sb-section-title", text: title,
        onclick: () => {
          if (!collapsedKey) return;
          st[collapsedKey] = !collapsed;
          Store.emit();
        },
      }),
      onAdd
        ? U.el("button", { class: "icon-btn", html: ICONS.plus, title: "Nueva página", onclick: onAdd })
        : null
    );
  }

  function render() {
    const st = Store.state;
    root.innerHTML = "";

    /* Cabecera */
    root.append(
      U.el(
        "div", { class: "sb-head" },
        U.el(
          "button",
          {
            class: "sb-workspace",
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: r.left, y: r.bottom + 4, width: 240,
                items: [
                  { type: "label", label: "Espacio de trabajo" },
                  { label: st.workspace, sub: "Plan gratuito · 1 miembro", icon: ICONS.home, active: true },
                  { type: "separator" },
                  { label: "Ajustes", icon: ICONS.settings, onClick: Modals.settings },
                  { label: "Novedades", icon: ICONS.sparkle, onClick: Modals.cooking },
                  { label: "Invitar miembros", icon: ICONS.people, onClick: () => U.toast("Demo local: sin colaboradores") },
                ],
              });
            },
          },
          U.el("span", { class: "ws-avatar", text: (st.workspace || "Z")[0].toUpperCase() }),
          U.el("span", { class: "ws-name", text: st.workspace }),
          U.el("span", { html: ICONS.chevronDown, style: { color: "var(--text-tertiary)" } })
        ),
        U.el(
          "div", { class: "sb-head-actions" },
          U.el("button", {
            class: "icon-btn", html: ICONS.doubleChevronLeft, title: "Ocultar barra lateral (⌘\\)",
            onclick: () => App.toggleSidebar(),
          }),
          U.el("button", {
            class: "icon-btn", html: ICONS.rename, title: "Nueva página",
            onclick: () => Store.open(Store.createPage({ title: "" }).id),
          })
        )
      )
    );

    const scroll = U.el("div", { class: "sb-scroll" });

    /* Acciones rápidas */
    scroll.append(
      U.el("button", { class: "sb-item", html: ICONS.search + "<span>Buscar</span><kbd>⌘K</kbd>", onclick: Modals.search }),
      U.el("button", {
        class: "sb-item", html: ICONS.home + "<span>Inicio</span>",
        onclick: () => {
          const home = Object.values(st.pages).find((p) => !p.deleted && p.title === "Inicio");
          if (home) Store.open(home.id);
        },
      }),
      U.el("button", {
        class: "sb-item", html: ICONS.sparkle + "<span>Notion AI</span><kbd>⌘J</kbd>",
        onclick: () => {
          const page = Store.getPage(st.openId);
          if (page) AI.open({ page, anchor: U.$("#topbar") });
        },
      }),
      U.el("button", {
        class: "sb-item", html: ICONS.routines + "<span>Agentes y rutinas</span>",
        onclick: () => Agents.routines(),
      }),
      U.el("button", { class: "sb-item", html: ICONS.settings + "<span>Ajustes</span>", onclick: Modals.settings })
    );

    /* Favoritos */
    const favs = st.favorites.map((id) => st.pages[id]).filter((p) => p && !p.deleted);
    if (favs.length) {
      scroll.append(section("Favoritos"));
      favs.forEach((p) => scroll.append(treeRow(p, 0)));
    }

    /* Espacios de equipo */
    scroll.append(
      U.el(
        "div", { class: "sb-section" },
        U.el("span", { class: "sb-section-title", text: "Espacios de equipo" }),
        U.el("button", {
          class: "icon-btn", html: ICONS.plus, title: "Nuevo espacio de equipo",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.left - 180, y: r.bottom + 4, width: 250,
              items: [
                { type: "label", label: "Crear espacio de equipo" },
                { label: "Espacio abierto", sub: "Cualquiera del espacio puede unirse", icon: ICONS.people,
                  onClick: () => newTeamspace(false) },
                { label: "Espacio privado", sub: "Solo para los miembros que invites", icon: ICONS.lock,
                  onClick: () => newTeamspace(true) },
              ],
            });
          },
        })
      )
    );

    st.teamspaces.forEach((ts) => {
      const open = st.expanded["ts:" + ts.id] !== false;
      const row = U.el(
        "div", { class: "tree-row ts-row" },
        U.el("button", {
          class: "tree-toggle" + (open ? " open" : ""), html: ICONS.chevronRight,
          onclick: () => { st.expanded["ts:" + ts.id] = !open; Store.emit(); },
        }),
        U.el("span", { class: "tree-emoji", text: ts.icon }),
        U.el("span", { class: "tree-label", text: ts.name }),
        ts.private ? U.el("span", { class: "ts-lock", html: ICONS.lock, title: "Privado" }) : null,
        U.el(
          "span", { class: "tree-actions" },
          U.el("button", {
            class: "icon-btn", html: ICONS.dots,
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: r.left - 200, y: r.bottom + 4, width: 240,
                items: [
                  { label: "Renombrar", icon: ICONS.rename, onClick: () => {
                      const n = prompt("Nombre del espacio:", ts.name);
                      if (n) { ts.name = n; Store.emit(); }
                    } },
                  { label: ts.private ? "Hacerlo abierto" : "Hacerlo privado", icon: ICONS.lock,
                    onClick: () => {
                      ts.private = !ts.private;
                      Store.audit("teamspace.privacy", `${ts.name} → ${ts.private ? "privado" : "abierto"}`);
                      Store.emit();
                    } },
                  { label: "Miembros del espacio", icon: ICONS.people, onClick: Collab.peopleModal },
                  { type: "separator" },
                  { label: "Eliminar espacio", icon: ICONS.trash, danger: true,
                    onClick: () => {
                      if (confirm(`¿Eliminar «${ts.name}»? Sus páginas pasan a Privado.`))
                        Store.deleteTeamspace(ts.id);
                    } },
                ],
              });
            },
          }),
          U.el("button", {
            class: "icon-btn", html: ICONS.plus, title: "Nueva página aquí",
            onclick: () => Store.open(Store.createPage({ title: "", teamspaceId: ts.id }).id),
          })
        )
      );
      row.addEventListener("dragover", (e) => { if (dragPageId) { e.preventDefault(); row.classList.add("drop-target"); } });
      row.addEventListener("dragleave", () => row.classList.remove("drop-target"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drop-target");
        if (!dragPageId) return;
        Store.movePage(dragPageId, null);
        Store.getPage(dragPageId).teamspaceId = ts.id;
        dragPageId = null;
        Store.emit();
      });
      scroll.append(row);
      if (open) {
        const pages = Store.rootPagesOf(ts.id);
        if (!pages.length)
          scroll.append(U.el("div", { class: "tree-empty", text: "Arrastra páginas aquí", style: { marginLeft: "22px" } }));
        pages.forEach((p) => scroll.append(treeRow(p, 1)));
      }
    });

    /* Privado */
    scroll.append(
      section("Privado", {
        onAdd: () => Store.open(Store.createPage({ title: "" }).id),
      })
    );
    const rootDrop = U.el("div", {
      ondragover: (e) => { if (dragPageId) e.preventDefault(); },
      ondrop: (e) => {
        e.preventDefault();
        if (!dragPageId) return;
        Store.movePage(dragPageId, null);
        Store.getPage(dragPageId).teamspaceId = null;
        dragPageId = null;
        Store.emit();
      },
    });
    Store.rootPagesOf(null).forEach((p) => rootDrop.append(treeRow(p, 0)));
    scroll.append(rootDrop);

    scroll.append(
      U.el("button", {
        class: "sb-item", html: ICONS.plus + "<span>Nueva página</span>",
        onclick: () => Store.open(Store.createPage({ title: "" }).id),
      })
    );

    root.append(scroll);

    /* Pie */
    root.append(
      U.el(
        "div", { class: "sb-foot" },
        U.el("button", { class: "sb-item", html: ICONS.template + "<span>Plantillas</span>", onclick: () => Modals.templates() }),
        U.el("button", { class: "sb-item", html: ICONS.people + "<span>Personas</span>", onclick: Collab.peopleModal }),
        U.el("button", {
          class: "sb-item", html: ICONS.settings + "<span>Administración</span>",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.left + 20, y: r.top - 8, width: 260,
              items: [
                { type: "label", label: "Herramientas del espacio" },
                { label: "Registro de auditoría", icon: ICONS.list, onClick: History.auditLog },
                { label: "Búsqueda de contenido", icon: ICONS.search, onClick: History.adminSearch },
                { label: "Exportar todo el espacio", icon: ICONS.import, onClick: History.bulkExport },
                { label: "Ajustes de Notion AI", icon: ICONS.sparkle, onClick: AI.settings },
                { label: "Skills del espacio", icon: ICONS.skills, onClick: () => Agents.skills() },
                { label: "Conexiones MCP", icon: ICONS.mcp, onClick: () => Agents.connections() },
                { type: "separator" },
                { label: "Funciones incluidas", icon: ICONS.check, onClick: Plans.features },
              ],
            });
          },
        }),
        U.el("button", { class: "sb-item", html: ICONS.trash + "<span>Papelera</span>", onclick: Modals.trash }),
        U.el("button", { class: "sb-item", html: ICONS.sparkle + "<span>Novedades</span>", onclick: Modals.cooking }),
        Plans.badge()
      )
    );
  }

  function mount(node) {
    root = node;
    render();
    Store.subscribe(render);
  }

  return { mount, render };
})();
