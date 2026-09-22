/* ==========================================================================
   App: tema, barra superior, render de página, atajos y arranque
   ========================================================================== */
const App = (() => {
  let contentEl, topbarEl, renderedId = null;

  const COVERS = [
    "linear-gradient(135deg,#2383e2,#9065b0 60%,#d9730d)",
    "linear-gradient(135deg,#448361,#cb912f)",
    "linear-gradient(135deg,#d44c47,#d9730d)",
    "linear-gradient(135deg,#337ea9,#448361)",
    "linear-gradient(120deg,#9065b0,#c14c8a)",
    "linear-gradient(160deg,#191919,#787774)",
  ];

  /* --------------------------------- Tema -------------------------------- */
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    Store.state.theme = theme;
    Store.emit();
  }

  /** Apariencia: «glass» (cristal líquido) o «classic» (réplica fiel). */
  function setSkin(skin) {
    if (skin === "classic") delete document.documentElement.dataset.skin;
    else document.documentElement.dataset.skin = "glass";
    Store.state.skin = skin;
    Store.emit();
    renderPage(true);
  }
  const toggleTheme = () => setTheme(Store.state.theme === "dark" ? "light" : "dark");

  /* ------------------------------ Barra lateral --------------------------- */
  function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
  }

  function initResizer() {
    const resizer = U.$("#resizer");
    const sidebar = U.$("#sidebar");
    let startX = 0, startW = 0, dragging = false;

    resizer.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const w = U.clamp(startW + e.clientX - startX, 180, 480);
      document.documentElement.style.setProperty("--sidebar-width", w + "px");
      Store.state.sidebarWidth = w;
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      Store.save();
    });
  }

  /* ------------------------------ Barra superior -------------------------- */
  function renderTopbar() {
    const page = Store.getPage(Store.state.openId);
    topbarEl.innerHTML = "";
    topbarEl.append(
      U.el("button", {
        class: "icon-btn", id: "sidebar-open", html: ICONS.doubleChevronRight,
        title: "Mostrar barra lateral", onclick: toggleSidebar,
      })
    );

    const crumbs = U.el("div", { class: "breadcrumb" });
    if (page) {
      Store.pathOf(page.id).forEach((p, i, arr) => {
        if (i) crumbs.append(U.el("span", { class: "crumb-sep", text: "/" }));
        crumbs.append(
          U.el(
            "button",
            { class: "crumb", onclick: () => Store.open(p.id) },
            U.iconNode(p.icon, 15),
            U.el("span", { text: p.title || "Sin título" })
          )
        );
      });
    }
    topbarEl.append(crumbs);

    if (!page) return;
    topbarEl.append(
      U.el(
        "div", { class: "topbar-actions" },
        U.el("span", { class: "btn btn-quiet", text: "Editado " + U.timeAgo(page.updatedAt) }),
        Collab.facepile([Store.state.me, ...Object.keys(page.share?.roles || {})].slice(0, 4)),
        U.el("button", {
          class: "btn ai-trigger", html: ICONS.sparkle + "<span>IA</span>", title: "Notion AI (⌘J)",
          onclick: (e) => AI.open({ page, anchor: e.currentTarget }),
        }),
        U.el("button", { class: "btn", text: "Compartir", onclick: () => Collab.shareModal(page) }),
        U.el("button", {
          class: "icon-btn" + (Collab.countFor(page.id) ? " has-badge" : ""),
          html: ICONS.comment + (Collab.countFor(page.id) ? `<i>${Collab.countFor(page.id)}</i>` : ""),
          title: "Comentarios",
          onclick: () => Collab.togglePanel(),
        }),
        U.el("button", {
          class: "icon-btn", html: ICONS.clock, title: "Historial de versiones",
          onclick: () => History.versions(page),
        }),
        U.el("button", {
          class: "icon-btn fav-star" + (Store.isFavorite(page.id) ? " is-fav" : ""),
          html: ICONS.star, title: "Favorito",
          onclick: () => Store.toggleFavorite(page.id),
        }),
        U.el("button", {
          class: "icon-btn", html: ICONS.dots, title: "Más opciones",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.right - 240, y: r.bottom + 4, width: 240,
              items: [
                { label: "Ancho completo", icon: ICONS.expand, active: page.fullWidth,
                  onClick: () => { Store.updatePage(page.id, { fullWidth: !page.fullWidth }); renderPage(true); } },
                { label: "Texto pequeño", icon: ICONS.text, active: page.small,
                  onClick: () => { Store.updatePage(page.id, { small: !page.small }); renderPage(true); } },
                { type: "separator" },
                { label: "Duplicar", icon: ICONS.duplicate, onClick: () => {
                    const id = Store.duplicatePage(page.id);
                    if (id) Store.open(id);
                  } },
                { label: "Copiar enlace", icon: ICONS.link, onClick: () => {
                    navigator.clipboard?.writeText(location.href);
                    U.toast("Enlace copiado");
                  } },
                { label: "Exportar a Markdown", icon: ICONS.import, onClick: () => exportMarkdown(page) },
                { label: "Historial de versiones", icon: ICONS.clock, onClick: () => History.versions(page) },
                { label: "Analíticas de la página", icon: ICONS.sort, onClick: () => History.analytics(page) },
                { label: page.share?.locked ? "Desbloquear página" : "Bloquear página", icon: ICONS.lock,
                  onClick: () => {
                    page.share = page.share || { public: false, roles: {}, locked: false };
                    page.share.locked = !page.share.locked;
                    Store.emit();
                    renderPage(true);
                    U.toast(page.share.locked ? "Página bloqueada" : "Página desbloqueada");
                  } },
                { label: "Compartir y permisos", icon: ICONS.share, onClick: () => Collab.shareModal(page) },
                { type: "separator" },
                { label: "Mover a la papelera", icon: ICONS.trash, danger: true,
                  onClick: () => {
                    Store.deletePage(page.id);
                    const next = Store.childrenOf(null)[0];
                    if (next) Store.open(next.id);
                    else renderPage(true);
                  } },
              ],
            });
          },
        }),
        U.el("button", {
          class: "icon-btn", title: "Cambiar tema (⌘⇧L)",
          html: Store.state.theme === "dark" ? ICONS.sun : ICONS.moon,
          onclick: toggleTheme,
        })
      )
    );
  }

  /* --------------------------- Exportar a Markdown ------------------------ */
  /** Convierte un bloque a Markdown (lo usan la exportación y el copiado). */
  function blockToMarkdown(b, page) {
    const text = U.stripHtml(b.text);
    switch (b.type) {
      case "heading1": return `## ${text}`;
      case "heading2": return `### ${text}`;
      case "heading3": return `#### ${text}`;
      case "bulleted": return `${"  ".repeat(b.indent || 0)}- ${text}`;
      case "numbered": return `${"  ".repeat(b.indent || 0)}1. ${text}`;
      case "todo": return `- [${b.checked ? "x" : " "}] ${text}`;
      case "toggle": return `<details><summary>${text}</summary></details>`;
      case "quote": return `> ${text}`;
      case "callout": {
        const head = `> ${b.emoji || "💡"} ${text}`;
        const kids = (b.children || []).map((c) => "> " + blockToMarkdown(c, page)).join("\n");
        return kids ? `${head}\n${kids}` : head;
      }
      case "divider": return "---";
      case "code": return "```" + (b.lang || "") + "\n" + text + "\n```";
      case "image": return `![${text}](${b.src || ""})`;
      case "bookmark": return `[${b.title || b.url}](${b.url})`;
      case "embed": return `[embed](${b.url || ""})`;
      case "file": return `[${b.fileName || "archivo"}](${b.fileName || ""})`;
      case "html": return "```html\n" + (b.src || "") + "\n```";
      case "ai": return b.result ? `> 🤖 ${b.result.replace(/\n/g, "\n> ")}` : "";
      case "synced": {
        const src = b.sourceId ? Store.getPage(b.sourceId) : null;
        return src ? `> 🔗 Sincronizado desde ${src.title}` : "";
      }
      case "toc": return "<!-- tabla de contenidos -->";
      case "breadcrumb": return "";
      case "button": return `[${b.label || "Botón"}]`;
      case "subpage": {
        const sub = b.pageId ? Store.getPage(b.pageId) : null;
        return sub ? `- [[${sub.title || "Sin título"}]]` : "";
      }
      case "table-db": {
        const db = page?.db;
        if (!db) return "";
        const head = `| ${db.props.map((p) => p.name).join(" | ")} |`;
        const sep = `| ${db.props.map(() => "---").join(" | ")} |`;
        const rows = db.rows.map((r) =>
          `| ${db.props.map((p) => {
            const v = r.cells[p.id];
            return Array.isArray(v) ? v.join(", ") : v ?? "";
          }).join(" | ")} |`
        );
        return [head, sep, ...rows].join("\n");
      }
      default: return text;
    }
  }

  function exportMarkdown(page) {
    const lines = [`# ${page.title || "Sin título"}`, ""];
    page.blocks.forEach((b) => {
      lines.push(blockToMarkdown(b, page));
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const a = U.el("a", {
      href: URL.createObjectURL(blob),
      download: `${(page.title || "pagina").replace(/[^\w\s-]/g, "").trim() || "pagina"}.md`,
    });
    a.click();
    U.toast("Markdown exportado");
  }

  /* ------------------------------ Render página --------------------------- */
  function renderPage(force = false) {
    const page = Store.getPage(Store.state.openId);
    if (!page) {
      contentEl.innerHTML = "";
      contentEl.append(
        U.el(
          "div", { style: { padding: "80px", textAlign: "center", color: "var(--text-tertiary)" } },
          U.el("p", { text: "No hay ninguna página abierta." }),
          U.el("button", {
            class: "btn btn-primary", text: "Crear una página",
            style: { margin: "12px auto" },
            onclick: () => Store.open(Store.createPage({ title: "" }).id),
          })
        )
      );
      renderedId = null;
      return;
    }
    if (!force && renderedId === page.id) return;
    if (peekId && !force) return; // el editor está prestado a la ventana lateral
    renderedId = page.id;

    contentEl.innerHTML = "";
    const wrap = U.el("div", { class: "page" + (page.fullWidth ? " page-full" : ""), "data-tour": "pagina" });

    /* Portada */
    if (page.cover) {
      const isGradient = page.cover.startsWith("linear-gradient");
      const coverEl = U.el(
          "div",
          {
            class: "page-cover",
            style: isGradient ? { backgroundImage: page.cover } : {},
          },
          U.el(
            "div", { class: "cover-actions" },
            U.el("button", {
              class: "btn", text: "Cambiar portada",
              onclick: (e) =>
                Assets.pick({
                  anchor: e.currentTarget,
                  tabs: ["gallery", "upload", "link", "recent"],
                  onPick: (value) => { Store.updatePage(page.id, { cover: value }); renderPage(true); },
                  onRemove: () => { Store.updatePage(page.id, { cover: "" }); renderPage(true); },
                }),
            }),
            U.el("button", {
              class: "btn", text: "Quitar",
              onclick: () => { Store.updatePage(page.id, { cover: "" }); renderPage(true); },
            })
          )
      );
      if (!isGradient) Assets.attach(coverEl, page.cover, "background");
      wrap.append(coverEl);
    }

    const body = U.el("div", { class: "page-body" });
    if (page.small) body.style.fontSize = "14px";
    const top = U.el("div", { class: "page-top" });
    body.append(top);

    /* Icono */
    if (page.icon) {
      const isImageIcon = page.icon.startsWith("asset:") || /^https?:\/\//.test(page.icon);
      const lineIcon = IconSet.parse(page.icon);
      const iconEl = U.el("div", {
        class: "page-icon" + (isImageIcon ? " is-image" : "") +
          (lineIcon ? " is-line c-" + lineIcon.color : ""),
        html: lineIcon ? IconSet.lineSvg(lineIcon.name, 72) : null,
        text: isImageIcon || lineIcon ? null : page.icon,
        onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          Menus.emojiMenu({
            x: r.left, y: r.bottom + 6,
            onPick: (emo) => { Store.updatePage(page.id, { icon: emo }); renderPage(true); },
            onRemove: () => { Store.updatePage(page.id, { icon: "" }); renderPage(true); },
            onUpload: () =>
              Assets.pick({
                anchor: iconEl, tabs: ["upload", "link", "recent"],
                onPick: (value) => { Store.updatePage(page.id, { icon: value }); renderPage(true); },
              }),
          });
        },
      });
      if (isImageIcon) Assets.attach(iconEl, page.icon, "background");
      top.append(iconEl);
    }

    /* Controles de portada/icono */
    const controls = U.el("div", { class: "page-controls" });
    if (!page.icon)
      controls.append(
        U.el("button", {
          class: "btn", html: ICONS.emoji + "<span>Añadir icono</span>",
          onclick: () => {
            Store.updatePage(page.id, { icon: Menus.EMOJI[Math.floor(Math.random() * Menus.EMOJI.length)] });
            renderPage(true);
          },
        })
      );
    if (!page.cover)
      controls.append(
        U.el("button", {
          class: "btn", html: ICONS.cover + "<span>Añadir portada</span>",
          onclick: () => {
            Store.updatePage(page.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] });
            renderPage(true);
          },
        })
      );
    controls.append(
      U.el("button", {
        class: "btn", html: ICONS.template + "<span>Plantillas</span>",
        onclick: () => Modals.templates(page.id),
      })
    );
    top.append(controls);

    /* Título */
    if (page.share?.locked) {
      wrap.classList.add("is-locked");
      body.append(
        U.el("div", { class: "lock-banner" },
          U.el("span", { html: ICONS.lock }),
          U.el("span", { text: "Página bloqueada · solo lectura" }),
          U.el("button", {
            class: "btn", text: "Desbloquear",
            onclick: () => { page.share.locked = false; Store.emit(); renderPage(true); },
          }))
      );
    }

    const title = U.el("h1", {
      class: "page-title", contenteditable: page.share?.locked ? "false" : "true", spellcheck: "false",
      text: page.title, dataset: { placeholder: "Sin título", empty: String(!page.title) },
    });
    title.addEventListener("input", () => {
      title.dataset.empty = String(!title.textContent.trim());
      Store.state.pages[page.id].title = title.textContent;
      Store.state.pages[page.id].updatedAt = new Date().toISOString();
      Store.emit();
    });
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = page.blocks[0];
        if (first) U.placeCaret(contentEl.querySelector(`[data-id="${first.id}"] .block-content`), false);
      }
    });
    top.append(title);

    // Propiedades de la base de datos a la que pertenece esta página
    if (page.dbRef) {
      const dbPage = Store.getPage(page.dbRef.pageId);
      if (dbPage && dbPage.db) {
        top.append(Database.propertyPanel(dbPage, page.dbRef.rowId));
        top.append(
          U.el("button", {
            class: "prop-source", html: ICONS.table + `<span>En ${U.escapeHtml(dbPage.title || "la base de datos")}</span>`,
            onclick: () => Store.open(dbPage.id),
          })
        );
      }
    }

    const blocks = U.el("div", { class: "blocks" });
    body.append(blocks);
    wrap.append(body);
    contentEl.append(wrap);

    Editor.mount(page, blocks);
    if (!page.title) U.placeCaret(title, true);
  }

  /* ----------------------------- Ventana lateral --------------------------- */
  let peekId = null;
  let peekBaseId = null;   // página principal que quedó detrás

  function openPeek(pageId) {
    const page = Store.getPage(pageId);
    if (!page) return;
    peekId = pageId;
    peekBaseId = Store.state.openId;
    Store.trackView(pageId);
    document.body.classList.add("peek-open");
    renderPeek();
  }

  function closePeek() {
    if (!peekId) return;
    peekId = null;
    document.body.classList.remove("peek-open");
    U.$("#peek").innerHTML = "";
    renderPage(true); // devuelve el editor a la página principal
  }

  function renderPeek() {
    const host = U.$("#peek");
    const page = Store.getPage(peekId);
    if (!host || !page) return;
    host.innerHTML = "";

    host.append(
      U.el(
        "div", { class: "peek-top" },
        U.el("button", {
          class: "icon-btn", html: ICONS.doubleChevronRight, title: "Cerrar",
          onclick: closePeek,
        }),
        U.el("button", {
          class: "icon-btn", html: ICONS.expand, title: "Abrir como página",
          onclick: () => { const id = peekId; closePeek(); Store.open(id); },
        }),
        U.el("div", { class: "peek-crumb" },
          ...Store.pathOf(page.id).slice(-2).flatMap((p, i, arr) => [
            i ? U.el("span", { class: "crumb-sep", text: "/" }) : null,
            U.el("button", { class: "crumb-link", text: p.title || "Sin título",
              onclick: () => { closePeek(); Store.open(p.id); } }),
          ].filter(Boolean))),
        U.el("button", {
          class: "icon-btn", html: ICONS.comment, title: "Comentarios",
          onclick: () => Collab.togglePanel(true),
        }),
        page.templateRef
          ? U.el("button", {
              class: "btn btn-primary", text: "Guardar en la plantilla",
              onclick: () => {
                const dbPage = Store.getPage(page.templateRef.pageId);
                const tpl = dbPage?.db?.templates?.find((t) => t.id === page.templateRef.templateId);
                if (!tpl) return U.toast("La plantilla ya no existe");
                tpl.blocks = JSON.parse(JSON.stringify(page.blocks));
                tpl.icon = page.icon || tpl.icon;
                Store.deletePage(page.id);
                closePeek();
                U.toast(`«${tpl.name}» actualizada con ${tpl.blocks.length} bloques`);
              },
            })
          : null,
        U.el("button", {
          class: "icon-btn", html: ICONS.dots, title: "Más",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.left - 200, y: r.bottom + 4, width: 230,
              items: [
                { label: "Abrir como página", icon: ICONS.expand,
                  onClick: () => { const id = peekId; closePeek(); Store.open(id); } },
                { label: "Copiar enlace", icon: ICONS.link,
                  onClick: () => { navigator.clipboard?.writeText(location.origin + location.pathname + "#" + page.id); U.toast("Enlace copiado"); } },
                { label: "Duplicar", icon: ICONS.duplicate, onClick: () => { Store.duplicatePage(page.id); U.toast("Duplicada"); } },
                { type: "separator" },
                { label: "Mover a la papelera", icon: ICONS.trash, danger: true,
                  onClick: () => { Store.deletePage(page.id); closePeek(); } },
              ],
            });
          },
        })
      )
    );

    const body = U.el("div", { class: "peek-body" });
    const inner = U.el("div", { class: "peek-page" });

    const isImageIcon = page.icon && (page.icon.startsWith("asset:") || /^https?:\/\//.test(page.icon));
    const peekLine = IconSet.parse(page.icon || "");
    const icon = U.el("div", {
      class: "peek-icon" + (isImageIcon ? " is-image" : "") +
        (peekLine ? " is-line c-" + peekLine.color : ""),
      html: peekLine ? IconSet.lineSvg(peekLine.name, 40) : null,
      text: isImageIcon || peekLine ? null : page.icon || "📄",
      onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        Menus.emojiMenu({
          x: r.left, y: r.bottom + 6,
          onPick: (emo) => { Store.updatePage(page.id, { icon: emo }); renderPeek(); },
          onRemove: () => { Store.updatePage(page.id, { icon: "" }); renderPeek(); },
          onUpload: () => Assets.pick({
            anchor: icon, tabs: ["upload", "link", "recent"],
            onPick: (value) => { Store.updatePage(page.id, { icon: value }); renderPeek(); },
          }),
        });
      },
    });
    if (isImageIcon) Assets.attach(icon, page.icon, "background");

    const title = U.el("h1", {
      class: "peek-title", contenteditable: "true", spellcheck: "false", text: page.title,
      dataset: { placeholder: "Sin título", empty: String(!page.title) },
    });
    title.addEventListener("input", () => {
      title.dataset.empty = String(!title.textContent.trim());
      const p = Store.state.pages[page.id];
      p.title = title.textContent;
      p.updatedAt = new Date().toISOString();
      // Mantiene sincronizado el título con la celda de la base de datos
      if (p.dbRef) {
        const dbPage = Store.getPage(p.dbRef.pageId);
        const row = dbPage?.db?.rows.find((r) => r.id === p.dbRef.rowId);
        const tp = dbPage?.db?.props.find((x) => x.type === "title");
        if (row && tp) row.cells[tp.id] = p.title;
      }
      Store.emit();
    });

    inner.append(icon, title);

    if (page.dbRef) {
      const dbPage = Store.getPage(page.dbRef.pageId);
      if (dbPage && dbPage.db) inner.append(Database.propertyPanel(dbPage, page.dbRef.rowId));
    }

    const blocks = U.el("div", { class: "blocks" });
    inner.append(U.el("div", { class: "peek-divider" }), blocks);
    body.append(inner);
    host.append(body);

    Editor.mount(page, blocks);
  }

  /* ------------------------------- Atajos --------------------------------- */
  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (Editor.handleSelectionKey(e)) return;
      if (e.key === "Escape" && peekId && !document.querySelector(".overlay, .menu, .ai-panel")) {
        e.preventDefault();
        closePeek();
        return;
      }
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const page = Store.getPage(Store.state.openId);
        if (page) AI.open({ page, anchor: U.$(".ai-trigger") || U.$("#topbar") });
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        Collab.togglePanel();
        return;
      }
      if (mod && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        Modals.search();
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleTheme();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        Store.open(Store.createPage({ title: "" }).id);
      } else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        const editing = document.activeElement?.isContentEditable;
        if (!editing) {
          e.preventDefault();
          if (Store.undo()) { renderPage(true); U.toast("Deshecho"); }
        }
      } else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        const editing = document.activeElement?.isContentEditable;
        if (!editing) {
          e.preventDefault();
          if (Store.redo()) { renderPage(true); U.toast("Rehecho"); }
        }
      }
    });
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".format-bar")) Menus.hideFormatBar();
    });
  }

  /* -------------------------------- Arranque ------------------------------ */
  function boot() {
    Store.load();
    document.documentElement.dataset.theme = Store.state.theme || "light";
    if ((Store.state.skin || "glass") === "classic") delete document.documentElement.dataset.skin;
    else document.documentElement.dataset.skin = "glass";
    document.documentElement.style.setProperty("--sidebar-width", (Store.state.sidebarWidth || 240) + "px");

    contentEl = U.$("#content");
    topbarEl = U.$("#topbar");

    if (window.innerWidth <= 760) document.body.classList.add("sidebar-collapsed");

    Sidebar.mount(U.$("#sidebar"));
    initResizer();
    initShortcuts();

    const hashId = location.hash.slice(1).split(":")[0];
    if (hashId && Store.getPage(hashId) && !Store.getPage(hashId).deleted) Store.state.openId = hashId;
    if (!Store.getPage(Store.state.openId)) Store.state.openId = Store.childrenOf(null)[0]?.id || null;

    if (Store.state.openId) Store.trackView(Store.state.openId);
    renderTopbar();
    renderPage(true);

    // En móvil el lateral es un cajón: navegar a otra página lo cierra
    let lastOpenId = Store.state.openId;
    Store.subscribe(() => {
      if (Store.state.openId !== lastOpenId) {
        lastOpenId = Store.state.openId;
        if (window.innerWidth <= 760) document.body.classList.add("sidebar-collapsed");
      }
      renderTopbar();
      // Navegar a otra página cierra la ventana lateral
      if (peekId && Store.state.openId !== peekBaseId) {
        peekId = null;
        document.body.classList.remove("peek-open");
        U.$("#peek").innerHTML = "";
        renderPage(true);
      }
      renderPage();
      if (Collab.panelOpen) Collab.renderPanel();
    });

    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1).split(":")[0];
      if (id && id !== Store.state.openId && Store.getPage(id)) Store.open(id);
    });

    Agents.startScheduler();

    if (Store.state.isNew) {
      // Espacio recién creado: se pregunta el nombre y con qué empezar
      Store.state.seenAnnouncement = true;
      setTimeout(Modals.onboarding, 350);
    } else {
      if (!Store.state.seenAnnouncement) setTimeout(Modals.cooking, 600);
      // La guía se abre sola la primera vez, cuando no hay nada más encima
      Tour.maybeAutoStart(Store.state.seenAnnouncement ? 800 : 1200);
    }
  }

  return {
    boot, setTheme, setSkin, toggleTheme, toggleSidebar, renderPage, renderTopbar,
    exportMarkdown, blockToMarkdown, openPeek, closePeek,
  };
})();

document.addEventListener("DOMContentLoaded", App.boot);
