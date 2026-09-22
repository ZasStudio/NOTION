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
            U.el("span", { text: p.icon || "📄" }),
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
        U.el("span", { class: "btn", text: "Editado " + U.timeAgo(page.updatedAt) }),
        U.el("button", { class: "btn", text: "Compartir", onclick: () => U.toast("Demo local: no hay colaboración en tiempo real") }),
        U.el("button", { class: "icon-btn", html: ICONS.comment, title: "Comentarios", onclick: () => U.toast("Comentarios en la demo: próximamente") }),
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
  function exportMarkdown(page) {
    const lines = [`# ${page.title || "Sin título"}`, ""];
    page.blocks.forEach((b) => {
      const text = U.stripHtml(b.text);
      switch (b.type) {
        case "heading1": lines.push(`## ${text}`); break;
        case "heading2": lines.push(`### ${text}`); break;
        case "heading3": lines.push(`#### ${text}`); break;
        case "bulleted": lines.push(`${"  ".repeat(b.indent || 0)}- ${text}`); break;
        case "numbered": lines.push(`${"  ".repeat(b.indent || 0)}1. ${text}`); break;
        case "todo": lines.push(`- [${b.checked ? "x" : " "}] ${text}`); break;
        case "quote": lines.push(`> ${text}`); break;
        case "callout": lines.push(`> ${b.emoji || "💡"} ${text}`); break;
        case "divider": lines.push("---"); break;
        case "code": lines.push("```" + (b.lang || ""), text, "```"); break;
        case "image": lines.push(`![${text}](${b.src || ""})`); break;
        case "bookmark": lines.push(`[${b.title || b.url}](${b.url})`); break;
        case "html": lines.push("```html", b.src || "", "```"); break;
        case "table-db": {
          const db = page.db;
          if (!db) break;
          lines.push(`| ${db.props.map((p) => p.name).join(" | ")} |`);
          lines.push(`| ${db.props.map(() => "---").join(" | ")} |`);
          db.rows.forEach((r) =>
            lines.push(`| ${db.props.map((p) => {
              const v = r.cells[p.id];
              return Array.isArray(v) ? v.join(", ") : v ?? "";
            }).join(" | ")} |`)
          );
          break;
        }
        default: lines.push(text);
      }
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
    renderedId = page.id;

    contentEl.innerHTML = "";
    const wrap = U.el("div", { class: "page" + (page.fullWidth ? " page-full" : "") });

    /* Portada */
    if (page.cover) {
      const isGradient = page.cover.startsWith("linear-gradient");
      wrap.append(
        U.el(
          "div",
          {
            class: "page-cover",
            style: isGradient ? { backgroundImage: page.cover } : { backgroundImage: `url(${page.cover})` },
          },
          U.el(
            "div", { class: "cover-actions" },
            U.el("button", {
              class: "btn", text: "Cambiar portada",
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left - 60, y: r.bottom + 4, width: 240,
                  items: [
                    ...COVERS.map((c, i) => ({
                      label: "Degradado " + (i + 1),
                      swatch: { class: "", text: "" },
                      onClick: () => { Store.updatePage(page.id, { cover: c }); renderPage(true); },
                    })),
                    { type: "separator" },
                    { label: "Desde una URL…", icon: ICONS.link, onClick: () => {
                        const url = prompt("URL de la imagen:");
                        if (url) { Store.updatePage(page.id, { cover: url }); renderPage(true); }
                      } },
                  ],
                });
              },
            }),
            U.el("button", {
              class: "btn", text: "Quitar",
              onclick: () => { Store.updatePage(page.id, { cover: "" }); renderPage(true); },
            })
          )
        )
      );
    }

    const body = U.el("div", { class: "page-body" });
    if (page.small) body.style.fontSize = "14px";
    const top = U.el("div", { class: "page-top" });

    /* Icono */
    if (page.icon) {
      top.append(
        U.el("div", {
          class: "page-icon", text: page.icon,
          onclick: (e) => {
            const r = e.target.getBoundingClientRect();
            Menus.emojiMenu({
              x: r.left, y: r.bottom + 6,
              onPick: (emo) => { Store.updatePage(page.id, { icon: emo }); renderPage(true); },
              onRemove: () => { Store.updatePage(page.id, { icon: "" }); renderPage(true); },
            });
          },
        })
      );
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
    const title = U.el("h1", {
      class: "page-title", contenteditable: "true", spellcheck: "false",
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

    body.append(top);
    const blocks = U.el("div", { class: "blocks" });
    body.append(blocks);
    wrap.append(body);
    contentEl.append(wrap);

    Editor.mount(page, blocks);
    if (!page.title) U.placeCaret(title, true);
  }

  /* ------------------------------- Atajos --------------------------------- */
  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
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
    document.documentElement.style.setProperty("--sidebar-width", (Store.state.sidebarWidth || 240) + "px");

    contentEl = U.$("#content");
    topbarEl = U.$("#topbar");

    if (window.innerWidth < 760) document.body.classList.add("sidebar-collapsed");

    Sidebar.mount(U.$("#sidebar"));
    initResizer();
    initShortcuts();

    const hashId = location.hash.slice(1).split(":")[0];
    if (hashId && Store.getPage(hashId) && !Store.getPage(hashId).deleted) Store.state.openId = hashId;
    if (!Store.getPage(Store.state.openId)) Store.state.openId = Store.childrenOf(null)[0]?.id || null;

    renderTopbar();
    renderPage(true);

    Store.subscribe(() => {
      renderTopbar();
      renderPage();
    });

    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1).split(":")[0];
      if (id && id !== Store.state.openId && Store.getPage(id)) Store.open(id);
    });

    if (!Store.state.seenAnnouncement) setTimeout(Modals.cooking, 600);
  }

  return { boot, setTheme, toggleTheme, toggleSidebar, renderPage, renderTopbar, exportMarkdown };
})();

document.addEventListener("DOMContentLoaded", App.boot);
