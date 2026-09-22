/* ==========================================================================
   Historial de versiones, analíticas de página, auditoría y exportaciones
   ========================================================================== */
const History = (() => {
  const log = (action, detail) => Store.audit(action, detail);

  /* --------------------------- Historial de versiones ---------------------- */
  function versions(page) {
    const list = Store.versionsOf(page.id);
    let selected = list[0]?.id || null;

    const timeline = U.el("div", { class: "hist-list" });
    const preview = U.el("div", { class: "hist-preview" });

    const renderPreview = () => {
      preview.innerHTML = "";
      const v = list.find((x) => x.id === selected);
      if (!v) {
        preview.append(U.el("div", { class: "cm-empty", text: "Sin versiones guardadas todavía." }));
        return;
      }
      const author = Store.member(v.by);
      preview.append(
        U.el(
          "div", { class: "hist-head" },
          Collab.avatar(author, 26),
          U.el("div", {},
            U.el("div", { class: "share-name", text: U.formatDate(v.at, { dateStyle: "long" }) + " · " + new Date(v.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }),
            U.el("div", { class: "share-mail", text: `${author?.name || "Alguien"} · ${v.label}` })),
          U.el("button", {
            class: "btn btn-primary", text: "Restaurar esta versión",
            onclick: () => {
              if (!confirm("¿Restaurar esta versión? La actual se guardará en el historial.")) return;
              Store.restoreVersion(page.id, v.id);
              log("page.restore", `«${page.title}» restaurada al ${U.formatDate(v.at)}`);
              modal.close();
              App.renderPage(true);
              U.toast("Versión restaurada");
            },
          })
        )
      );

      const snap = v.snapshot;
      const body = U.el("div", { class: "hist-doc" });
      body.append(U.el("h1", { text: (snap.icon ? snap.icon + " " : "") + (snap.title || "Sin título") }));
      snap.blocks.forEach((b) => {
        const text = U.stripHtml(b.text);
        if (b.type === "divider") return body.append(U.el("hr"));
        if (b.type === "table-db") return body.append(U.el("p", { class: "hist-meta", text: "[base de datos]" }));
        const tag = { heading1: "h2", heading2: "h3", heading3: "h4", quote: "blockquote", code: "pre" }[b.type] || "p";
        const prefix = b.type === "bulleted" ? "• " : b.type === "numbered" ? "1. " : b.type === "todo" ? (b.checked ? "☑ " : "☐ ") : "";
        body.append(U.el(tag, { text: prefix + text }));
      });
      preview.append(body);
    };

    const renderList = () => {
      timeline.innerHTML = "";
      if (!list.length) {
        timeline.append(U.el("div", { class: "cm-empty", text: "Edita la página para empezar a guardar versiones." }));
        return;
      }
      list.forEach((v) => {
        const author = Store.member(v.by);
        timeline.append(
          U.el(
            "button",
            {
              class: "hist-item" + (v.id === selected ? " is-active" : ""),
              onclick: () => { selected = v.id; renderList(); renderPreview(); },
            },
            U.el("div", { class: "hist-when", text: U.timeAgo(v.at) }),
            U.el("div", { class: "hist-who" }, Collab.avatar(author, 18),
              U.el("span", { text: author?.name || "Alguien" }))
          )
        );
      });
    };

    const card = U.el(
      "div", { class: "modal hist-modal" },
      U.el("div", { class: "hist-side" },
        U.el("div", { class: "menu-label", text: "Historial · sin límite de antigüedad" }),
        timeline),
      U.el("div", { class: "hist-main" },
        U.el("div", { class: "tpl-head" },
          U.el("h2", { text: "Historial de versiones" }),
          U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
        preview)
    );

    renderList();
    renderPreview();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ---------------------------- Analíticas de página ----------------------- */
  function analytics(page) {
    const stats = Store.statsOf(page.id);
    const views = stats.views || [];

    // Vistas por día de los últimos 14 días
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        value: views.filter((v) => v.at.slice(0, 10) === iso).length,
      });
    }

    const uniques = new Set(views.map((v) => v.memberId));
    const last = views[views.length - 1];

    const byPerson = [...uniques].map((id) => ({
      label: (Store.member(id)?.name || "Alguien").split(" ")[0],
      value: views.filter((v) => v.memberId === id).length,
    }));

    const card = U.el(
      "div", { class: "modal analytics-modal" },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Analíticas" }),
        U.el("span", { class: "share-mail", text: page.title || "Sin título" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      U.el("div", { class: "stat-row" },
        Charts.stat("Vistas totales", String(views.length)),
        Charts.stat("Personas", String(uniques.size)),
        Charts.stat("Última vista", last ? U.timeAgo(last.at) : "—"),
        Charts.stat("Creada", U.formatDate(page.createdAt))),
      U.el("div", { class: "chart-block" },
        U.el("h3", { class: "chart-title", text: "Vistas por día · últimos 14 días" }),
        Charts.bars(days, { height: 190, valueLabels: false })),
      U.el("div", { class: "chart-block" },
        U.el("h3", { class: "chart-title", text: "Vistas por persona" }),
        byPerson.length ? Charts.bars(byPerson, { height: 170 })
                        : U.el("div", { class: "chart-empty", text: "Sin visitas registradas" }),
        U.el("details", { class: "chart-details" },
          U.el("summary", { text: "Ver como tabla" }),
          Charts.table(byPerson, { labelHead: "Persona", valueHead: "Vistas" })))
    );
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ------------------------------ Auditoría -------------------------------- */
  const ACTION_LABELS = {
    "page.create": "Página creada",
    "page.delete": "Página eliminada",
    "page.restore": "Versión restaurada",
    "page.publish": "Publicación web",
    "page.permission": "Permiso cambiado",
    "page.invite": "Invitación a página",
    "workspace.invite": "Persona añadida",
    "comment.add": "Comentario",
    "ai.run": "Notion AI",
    "db.automation": "Automatización",
    "export.bulk": "Exportación",
  };

  function auditLog() {
    const body = U.el("div", { class: "search-results" });

    const paint = (q = "") => {
      body.innerHTML = "";
      const items = Store.state.audit.filter(
        (a) => !q || (ACTION_LABELS[a.action] || a.action).toLowerCase().includes(q.toLowerCase()) ||
               (a.detail || "").toLowerCase().includes(q.toLowerCase())
      );
      if (!items.length) return body.append(U.el("div", { class: "search-empty", text: "Sin actividad registrada" }));
      items.forEach((a) => {
        const actor = Store.member(a.actorId);
        body.append(
          U.el(
            "div", { class: "audit-row" },
            Collab.avatar(actor, 24),
            U.el("div", { class: "audit-body" },
              U.el("div", { class: "audit-action", text: ACTION_LABELS[a.action] || a.action }),
              U.el("div", { class: "audit-detail", text: a.detail || "" })),
            U.el("div", { class: "audit-time", text: U.timeAgo(a.at) })
          )
        );
      });
    };

    const card = U.el(
      "div", { class: "modal search-modal" },
      U.el("div", { class: "search-input-row" },
        U.el("span", { html: ICONS.list }),
        U.el("input", { placeholder: "Filtrar el registro de auditoría…", oninput: (e) => paint(e.target.value) }),
        U.el("button", {
          class: "btn", text: "Exportar CSV",
          onclick: () => {
            const rows = Store.state.audit.map((a) =>
              [a.at, Store.member(a.actorId)?.name || a.actorId, a.action, (a.detail || "").replace(/"/g, '""')]
                .map((x) => `"${x}"`).join(",")
            );
            const blob = new Blob([["fecha,autor,accion,detalle", ...rows].join("\n")], { type: "text/csv" });
            U.el("a", { href: URL.createObjectURL(blob), download: "auditoria.csv" }).click();
          },
        })),
      body
    );
    paint();
    return Modals.overlay(card, { top: true });
  }

  /* ------------------ Búsqueda de contenido (administrador) ---------------- */
  function adminSearch() {
    const body = U.el("div", { class: "search-results" });

    const paint = (q = "") => {
      body.innerHTML = "";
      if (!q.trim()) return body.append(U.el("div", { class: "search-empty", text: "Busca en todas las páginas del espacio, incluidas las privadas y la papelera." }));
      const needle = q.toLowerCase();
      const hits = [];
      Object.values(Store.state.pages).forEach((p) => {
        p.blocks.forEach((b) => {
          const text = U.stripHtml(b.text);
          if (text.toLowerCase().includes(needle))
            hits.push({ page: p, text });
        });
        if ((p.title || "").toLowerCase().includes(needle)) hits.push({ page: p, text: "(título)" });
      });
      if (!hits.length) return body.append(U.el("div", { class: "search-empty", text: "Sin coincidencias" }));
      hits.slice(0, 60).forEach((h) =>
        body.append(
          U.el("button", {
            class: "search-item",
            onclick: () => { if (!h.page.deleted) { Store.open(h.page.id); modal.close(); } else U.toast("Está en la papelera"); },
          },
            U.el("span", { text: h.page.icon || "📄" }),
            U.el("span", {},
              U.el("div", { class: "s-title", text: h.page.title || "Sin título" }),
              U.el("div", { class: "s-crumb", text: h.text.slice(0, 90) })),
            h.page.deleted ? U.el("span", { class: "chip", text: "papelera" }) : null)
        )
      );
    };

    const card = U.el(
      "div", { class: "modal search-modal" },
      U.el("div", { class: "search-input-row" },
        U.el("span", { html: ICONS.search }),
        U.el("input", { placeholder: "Búsqueda de administrador…", oninput: (e) => paint(e.target.value) })),
      body
    );
    paint();
    const modal = Modals.overlay(card, { top: true });
    return modal;
  }

  /* --------------------------- Exportación completa ------------------------ */
  function bulkExport() {
    Menus.open({
      x: window.innerWidth / 2 - 110, y: 160, width: 240,
      items: [
        { type: "label", label: "Exportar todo el espacio" },
        { label: "Markdown (.md por página)", icon: ICONS.doc, onClick: () => exportMarkdownAll() },
        { label: "JSON (copia completa)", icon: ICONS.import, onClick: () => {
            const blob = new Blob([Store.exportJSON()], { type: "application/json" });
            U.el("a", { href: URL.createObjectURL(blob), download: "workspace.json" }).click();
            log("export.bulk", "JSON");
          } },
        { label: "PDF (imprimir todo)", icon: ICONS.doc, onClick: () => exportPdfAll() },
      ],
    });
  }

  function exportMarkdownAll() {
    const parts = [];
    Object.values(Store.state.pages)
      .filter((p) => !p.deleted)
      .forEach((p) => {
        parts.push(`\n\n<!-- ${"=".repeat(60)} -->\n# ${p.icon || ""} ${p.title || "Sin título"}\n`);
        p.blocks.forEach((b) => parts.push(App.blockToMarkdown(b, p)));
      });
    const blob = new Blob([parts.join("\n")], { type: "text/markdown" });
    U.el("a", { href: URL.createObjectURL(blob), download: "workspace.md" }).click();
    log("export.bulk", "Markdown");
    U.toast("Markdown del espacio exportado");
  }

  function exportPdfAll() {
    const win = window.open("", "_blank");
    if (!win) return U.toast("Permite las ventanas emergentes para exportar a PDF");
    const esc = U.escapeHtml;
    const body = Object.values(Store.state.pages)
      .filter((p) => !p.deleted)
      .map((p) => {
        const blocks = p.blocks
          .map((b) => {
            const t = esc(U.stripHtml(b.text));
            if (b.type === "divider") return "<hr>";
            if (b.type.startsWith("heading")) return `<h${b.type.slice(-1)}>${t}</h${b.type.slice(-1)}>`;
            if (b.type === "bulleted" || b.type === "numbered") return `<li>${t}</li>`;
            if (b.type === "todo") return `<p>${b.checked ? "☑" : "☐"} ${t}</p>`;
            if (b.type === "code") return `<pre>${t}</pre>`;
            if (b.type === "table-db" && p.db)
              return `<table><tr>${p.db.props.map((x) => `<th>${esc(x.name)}</th>`).join("")}</tr>` +
                p.db.rows.map((r) => `<tr>${p.db.props.map((x) => `<td>${esc(String(Array.isArray(r.cells[x.id]) ? r.cells[x.id].join(", ") : r.cells[x.id] ?? ""))}</td>`).join("")}</tr>`).join("") + "</table>";
            return `<p>${t}</p>`;
          })
          .join("");
        return `<section><h1>${esc(p.icon || "")} ${esc(p.title || "Sin título")}</h1>${blocks}</section>`;
      })
      .join("");
    win.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(Store.state.workspace)}</title>
      <style>
        body{font-family:ui-sans-serif,-apple-system,Segoe UI,Arial;max-width:720px;margin:40px auto;color:#37352f;line-height:1.6}
        section{page-break-after:always}
        h1{font-size:30px;border-bottom:1px solid #e9e9e7;padding-bottom:8px}
        pre{background:#f7f6f3;padding:12px;border-radius:6px;white-space:pre-wrap}
        table{border-collapse:collapse;width:100%} td,th{border:1px solid #e9e9e7;padding:6px;text-align:left;font-size:13px}
      </style>${body}<script>window.onload=()=>window.print()<\/script>`);
    win.document.close();
    log("export.bulk", "PDF");
  }

  return { log, versions, analytics, auditLog, adminSearch, bulkExport, exportMarkdownAll, exportPdfAll };
})();
