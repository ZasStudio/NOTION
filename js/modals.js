/* ==========================================================================
   Modales: búsqueda, plantillas, papelera, ajustes y anuncio "We've been cooking"
   ========================================================================== */
const Modals = (() => {
  function overlay(content, { top = false, onClose } = {}) {
    Menus.closeAll();
    Menus.hideFormatBar();
    const ov = U.el("div", { class: "overlay" + (top ? " top" : "") });
    ov.append(content);
    ov.addEventListener("mousedown", (e) => {
      if (e.target === ov) close();
    });
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    function close() {
      ov.remove();
      document.removeEventListener("keydown", onKey, true);
      onClose?.();
    }
    document.addEventListener("keydown", onKey, true);
    document.body.append(ov);
    return { close, node: ov };
  }

  /* ------------------------------- Búsqueda ------------------------------- */
  function search() {
    let active = 0, results = [];
    const listWrap = U.el("div", { class: "search-results" });

    const paint = () => {
      listWrap.innerHTML = "";
      if (!results.length) {
        listWrap.append(U.el("div", { class: "search-empty", text: "Sin resultados" }));
        return;
      }
      results.forEach((p, i) => {
        const crumb = Store.pathOf(p.id).slice(0, -1).map((x) => x.title || "Sin título").join(" / ");
        listWrap.append(
          U.el(
            "button",
            {
              class: "search-item" + (i === active ? " is-active" : ""),
              onmouseenter: () => { active = i; paint(); },
              onclick: () => { Store.open(p.id); modal.close(); },
            },
            U.el("span", { text: p.icon || "📄", style: { fontSize: "16px" } }),
            U.el(
              "span", {},
              U.el("div", { class: "s-title", text: p.title || "Sin título" }),
              crumb ? U.el("div", { class: "s-crumb", text: crumb }) : null
            ),
            U.el("span", { class: "s-crumb", style: { marginLeft: "auto" }, text: U.timeAgo(p.updatedAt) })
          )
        );
      });
    };

    const input = U.el("input", {
      placeholder: "Buscar en " + Store.state.workspace + "…",
      oninput: (e) => { results = Store.search(e.target.value); active = 0; paint(); },
      onkeydown: (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % Math.max(results.length, 1); paint(); }
        if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + results.length) % Math.max(results.length, 1); paint(); }
        if (e.key === "Enter" && results[active]) { Store.open(results[active].id); modal.close(); }
      },
    });

    const card = U.el(
      "div", { class: "modal search-modal" },
      U.el("div", { class: "search-input-row" }, U.el("span", { html: ICONS.search }), input),
      listWrap,
      U.el(
        "div", { class: "search-foot" },
        U.el("span", { text: "↑↓ para navegar" }),
        U.el("span", { text: "↵ para abrir" }),
        U.el("span", { text: "esc para cerrar" })
      )
    );

    const modal = overlay(card, { top: true });
    results = Store.search("");
    paint();
    input.focus();
    return modal;
  }

  /* ------------------------------- Plantillas ------------------------------ */
  function templates(parentId = null) {
    let cat = "all";
    const grid = U.el("div", { class: "tpl-grid" });
    const side = U.el("div", { class: "tpl-side" });

    const paintGrid = () => {
      grid.innerHTML = "";
      Templates.list
        .filter((t) => cat === "all" || t.category === cat)
        .forEach((t) =>
          grid.append(
            U.el(
              "div",
              {
                // <div> en vez de <button>: los botones como elementos de una
                // grid no calculan su alto por contenido en Chromium.
                class: "tpl-card", role: "button", tabindex: "0",
                onkeydown: (ev) => {
                  if (ev.key === "Enter" || ev.key === " ") ev.currentTarget.click();
                },
                onclick: () => {
                  const page = Templates.apply(Store, t.id, parentId);
                  modal.close();
                  Store.open(page.id);
                  U.toast(`Plantilla «${t.name}» añadida`);
                },
              },
              U.el("div", { class: "tpl-preview b-" + U.pickColor(t.id), text: t.icon }),
              U.el(
                "div", { class: "tpl-info" },
                U.el("div", { class: "tpl-name", text: t.name }),
                U.el("div", { class: "tpl-desc", text: t.desc })
              )
            )
          )
        );
    };

    const paintSide = () => {
      side.innerHTML = "";
      side.append(U.el("h3", { text: "Categorías" }));
      Templates.CATEGORIES.forEach((c) =>
        side.append(
          U.el("button", {
            class: "tpl-cat" + (c.id === cat ? " is-active" : ""),
            html: `<span>${c.icon}</span><span>${c.name}</span>`,
            onclick: () => { cat = c.id; paintSide(); paintGrid(); },
          })
        )
      );
    };

    const card = U.el(
      "div", { class: "modal tpl-modal" },
      side,
      U.el(
        "div", { class: "tpl-main" },
        U.el(
          "div", { class: "tpl-head" },
          U.el("h2", { text: "Plantillas" }),
          U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })
        ),
        grid
      )
    );

    paintSide();
    paintGrid();
    const modal = overlay(card);
    return modal;
  }

  /* -------------------------------- Papelera ------------------------------- */
  function trash() {
    const listWrap = U.el("div", { class: "search-results" });
    const paint = (q = "") => {
      listWrap.innerHTML = "";
      const items = Store.trashed().filter((p) =>
        !q || (p.title || "").toLowerCase().includes(q.toLowerCase())
      );
      if (!items.length) {
        listWrap.append(U.el("div", { class: "search-empty", text: "La papelera está vacía" }));
        return;
      }
      items.forEach((p) =>
        listWrap.append(
          U.el(
            "div", { class: "search-item" },
            U.el("span", { text: p.icon || "📄" }),
            U.el("span", { class: "s-title", text: p.title || "Sin título" }),
            U.el(
              "span", { style: { marginLeft: "auto", display: "flex", gap: "6px" } },
              U.el("button", {
                class: "btn", text: "Restaurar",
                onclick: () => { Store.restorePage(p.id); paint(q); },
              }),
              U.el("button", {
                class: "icon-btn", html: ICONS.trash, title: "Eliminar definitivamente",
                onclick: () => {
                  if (confirm(`¿Eliminar «${p.title || "Sin título"}» para siempre?`)) {
                    Store.purgePage(p.id);
                    paint(q);
                  }
                },
              })
            )
          )
        )
      );
    };

    const card = U.el(
      "div", { class: "modal search-modal" },
      U.el(
        "div", { class: "search-input-row" },
        U.el("span", { html: ICONS.trash }),
        U.el("input", { placeholder: "Buscar páginas en la papelera…", oninput: (e) => paint(e.target.value) })
      ),
      listWrap
    );
    paint();
    return overlay(card, { top: true });
  }

  /* -------------------------------- Ajustes -------------------------------- */
  function settings() {
    const st = Store.state;
    const row = (label, node) =>
      U.el(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--divider)" } },
        U.el("span", { text: label, style: { flex: "1", fontSize: "14px" } }),
        node
      );

    const card = U.el(
      "div", { class: "modal", style: { width: "min(560px, 92vw)" } },
      U.el(
        "div", { class: "tpl-head" },
        U.el("h2", { text: "Ajustes" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })
      ),
      row(
        "Nombre del espacio",
        U.el("input", {
          class: "menu-input", style: { margin: 0, width: "220px" }, value: st.workspace,
          oninput: (e) => { st.workspace = e.target.value; Store.emit(); },
        })
      ),
      row(
        "Tema",
        U.el(
          "div", { style: { display: "flex", gap: "6px" } },
          U.el("button", { class: "btn btn-bordered", html: ICONS.sun + " Claro", onclick: () => App.setTheme("light") }),
          U.el("button", { class: "btn btn-bordered", html: ICONS.moon + " Oscuro", onclick: () => App.setTheme("dark") })
        )
      ),
      row(
        "Novedades",
        U.el("button", { class: "btn btn-bordered", text: "Ver anuncio", onclick: () => { modal.close(); cooking(); } })
      ),
      row(
        "Datos",
        U.el(
          "div", { style: { display: "flex", gap: "6px" } },
          U.el("button", {
            class: "btn btn-bordered", text: "Exportar",
            onclick: () => {
              const blob = new Blob([Store.exportJSON()], { type: "application/json" });
              const a = U.el("a", { href: URL.createObjectURL(blob), download: "workspace.json" });
              a.click();
              U.toast("Workspace exportado");
            },
          }),
          U.el("button", {
            class: "btn btn-bordered", text: "Importar",
            onclick: () => {
              const input = U.el("input", { type: "file", accept: "application/json" });
              input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                  Store.importJSON(await file.text());
                  U.toast("Workspace importado");
                  modal.close();
                } catch (err) {
                  alert("No se pudo importar: " + err.message);
                }
              };
              input.click();
            },
          }),
          U.el("button", {
            class: "btn btn-bordered", text: "Reiniciar", style: { color: "var(--c-red)" },
            onclick: () => confirm("¿Borrar todo y volver al contenido de ejemplo?") && Store.reset(),
          })
        )
      )
    );
    const modal = overlay(card);
    return modal;
  }

  /* ------------------- Anuncio: "We've been cooking!" ---------------------- */
  const MASCOT = `
    <svg viewBox="0 0 120 120" class="cooking-mascot" aria-hidden="true">
      <path d="M74 24c6-10 16-14 22-12" stroke="#f5b41c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="86" cy="15" rx="12" ry="4.6" fill="#f5b41c"/>
      <ellipse cx="102" cy="19" rx="11" ry="4.2" fill="#f5b41c"/>
      <path d="M60 30c22 0 34 16 34 36 0 24-16 40-34 40S26 90 26 66c0-20 12-36 34-36z" fill="#fff"/>
      <path d="M34 56c-7-2-12-7-13-13 7-1 13 2 17 7z" fill="#fff"/>
      <ellipse cx="50" cy="62" rx="3.4" ry="4.4" fill="#191919"/>
      <ellipse cx="72" cy="62" rx="3.4" ry="4.4" fill="#191919"/>
      <path d="M55 76c3 3 7 3 10 0" stroke="#191919" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    </svg>`;

  function pane(cls, bar, body) {
    return U.el(
      "div", { class: "cooking-pane " + cls },
      U.el("div", { class: "pane-bar", html: bar }),
      U.el("div", { class: "pane-body" }, body)
    );
  }

  function miniGrid() {
    const g = U.el("div", { class: "mini-grid" });
    for (let i = 0; i < 88; i++) {
      const on = [1, 2, 3, 9, 12, 20, 23, 24, 25, 31, 34, 42, 45, 46, 53, 56, 64, 67, 68, 69, 75, 78].includes(i);
      const dot = i === 58;
      g.append(U.el("div", { class: "mini-cell" + (dot ? " dot" : on ? " on" : "") }));
    }
    return g;
  }

  function cooking() {
    const feature = (icon, html, chip) =>
      U.el(
        "button",
        {
          class: "cooking-row",
          onclick: () => { modal.close(); templates(); },
        },
        U.el("span", { html: icon }),
        U.el("span", { class: "cr-body", html: html + (chip ? ` <span class="chip">${chip}</span>` : "") }),
        U.el("span", { class: "cr-chevron", html: ICONS.chevronRight })
      );

    const card = U.el(
      "div", { class: "modal cooking-modal" },
      U.el("button", { class: "cooking-close", html: ICONS.x, onclick: () => modal.close() }),
      U.el(
        "div", {},
        U.el("div", { class: "cooking-eyebrow", text: "Just shipped" }),
        U.el("h2", { class: "cooking-title", text: "We've been cooking!" }),
        U.el(
          "div", { class: "cooking-list" },
          feature(ICONS.sparkle, "<strong>HTML blocks</strong> bring interactive visuals to any page and we can't stop playing with them!"),
          feature(ICONS.skills, "Skills"),
          feature(ICONS.mcp, "MCP"),
          feature(ICONS.routines, "Routines", "Coming soon")
        ),
        U.el(
          "div", { class: "cooking-actions" },
          U.el("button", {
            class: "btn btn-primary", html: "Try for free &nbsp;→",
            onclick: () => { modal.close(); templates(); },
          }),
          U.el("button", { class: "btn btn-secondary", text: "Save for later", onclick: () => modal.close() })
        )
      ),
      U.el(
        "div", { class: "cooking-art" },
        U.el("div", { html: MASCOT }),
        U.el(
          "div", { class: "cooking-stack" },
          pane("pane-1", '<span style="color:#f5c63f">●</span><span>Snack-Man</span>',
            U.el("div", {}, miniGrid())),
          pane("pane-2", "<span>👤</span><span>Severance Qu…</span>",
            U.el(
              "div", {},
              U.el("div", { class: "pane-avatar" }),
              U.el("div", { class: "pane-h", text: "Sev…" }),
              U.el("div", { class: "pane-line" }),
              U.el("div", { class: "pane-line s" }),
              U.el("div", { class: "pane-card" },
                U.el("div", { class: "pane-line" }), U.el("div", { class: "pane-line s" })),
              U.el("div", { class: "pane-card" },
                U.el("div", { class: "pane-line" }), U.el("div", { class: "pane-line s" }))
            )),
          pane("pane-3", '<span>📈 ROI Notes</span><span style="margin-left:auto">⇪ Share &nbsp;☆</span>',
            U.el(
              "div", {},
              U.el("div", { class: "pane-icon", text: "📈" }),
              U.el("div", { class: "pane-h", text: "ROI Notes" }),
              U.el("div", { class: "pane-sec", text: "Overview" }),
              U.el("div", { class: "pane-li", text: "Replaced a patchwork of tools + manual reporting (baseline: ~$18.5k/mo)" }),
              U.el("div", { class: "pane-li", text: "Notion/tooling cost estimated at ~$2.2k/mo" }),
              U.el("div", { class: "pane-li", text: "Estimated time saved: ~320 hrs/month across Ops + CS" }),
              U.el("div", { class: "pane-li", text: "Fully loaded rate assumed: $95/hr" }),
              U.el("div", { class: "pane-sec", text: "Outcomes (estimated)" }),
              U.el("div", { class: "pane-li", text: "Monthly savings: ~$30.4k" }),
              U.el("div", { class: "pane-li", text: "Annual net benefit: ~$337.2k" }),
              U.el("div", { class: "pane-li", text: "Payback period: ~2.1 months" })
            ))
        )
      )
    );

    const modal = overlay(card, {
      onClose: () => {
        Store.state.seenAnnouncement = true;
        Store.emit();
      },
    });
    return modal;
  }

  return { search, templates, trash, settings, cooking, overlay };
})();
