/* ==========================================================================
   Bases de datos: tabla, tablero, galería, lista y calendario
   ========================================================================== */
const Database = (() => {
  const PROP_TYPES = [
    { id: "text", name: "Texto", icon: ICONS.text },
    { id: "number", name: "Número", icon: ICONS.numbered },
    { id: "select", name: "Selección", icon: ICONS.chevronDown },
    { id: "multi_select", name: "Selección múltiple", icon: ICONS.list },
    { id: "date", name: "Fecha", icon: ICONS.calendar },
    { id: "person", name: "Persona", icon: ICONS.people },
    { id: "checkbox", name: "Casilla", icon: ICONS.todo },
    { id: "url", name: "URL", icon: ICONS.link },
    { id: "formula", name: "Fórmula", icon: ICONS.code },
    { id: "relation", name: "Relación", icon: ICONS.mcp },
    { id: "rollup", name: "Rollup", icon: ICONS.sort },
    { id: "created", name: "Fecha de creación", icon: ICONS.clock },
    { id: "edited", name: "Última edición", icon: ICONS.clock },
  ];

  const OPERATORS = [
    { id: "contains", name: "contiene" },
    { id: "not_contains", name: "no contiene" },
    { id: "is", name: "es" },
    { id: "is_not", name: "no es" },
    { id: "empty", name: "está vacío" },
    { id: "not_empty", name: "no está vacío" },
    { id: "gt", name: "mayor que" },
    { id: "lt", name: "menor que" },
  ];

  const VIEW_TYPES = [
    { id: "table", name: "Tabla", icon: ICONS.table },
    { id: "board", name: "Tablero", icon: ICONS.board },
    { id: "gallery", name: "Galería", icon: ICONS.gallery },
    { id: "list", name: "Lista", icon: ICONS.list },
    { id: "calendar", name: "Calendario", icon: ICONS.calendar },
    { id: "chart", name: "Gráfica", icon: ICONS.board },
  ];

  let page = null, db = null, block = null, host = null, linked = false;
  const dirty = () => { Store.updatePage(page.id, {}); };

  /* Un panel de propiedades se repinta a sí mismo, no la base entera. */
  let repaintHook = null;
  const repaint = () => (repaintHook ? repaintHook() : paint());

  const titleProp = () => db.props.find((p) => p.type === "title") || db.props[0];

  /** Propiedades que esta vista muestra (la de título siempre se ve). */
  function shownProps(view = activeView()) {
    const hidden = view?.hiddenProps || [];
    return db.props.filter((p) => p.type === "title" || !hidden.includes(p.id));
  }

  /** Una vista enlazada recuerda su propia vista activa en el bloque. */
  const activeViewId = () => (linked && block?.activeView) || db.activeView;
  const activeView = () => db.views.find((v) => v.id === activeViewId()) || db.views[0];
  const setActiveView = (id) => {
    if (linked && block) block.activeView = id;
    else db.activeView = id;
  };

  /* --------------------- Fórmulas, relaciones y rollups ------------------- */

  // Sólo se evalúan expresiones con números, operadores y funciones permitidas.
  const SAFE_FORMULA = /^[\d\s+\-*/().,%<>=?:!&|"']*(?:(?:round|abs|min|max|floor|ceil|if|length)\s*\()?[\s\S]*$/;
  const FORBIDDEN = /(=>|\bfunction\b|\bthis\b|\bwindow\b|\bdocument\b|\bfetch\b|\[|\]|`|\$\{)/;

  /** Evalúa `{Propiedad} * 12` u otras expresiones simples sobre una fila. */
  function evalFormula(expr, row, props) {
    if (!expr) return "";
    let code = expr;
    for (const p of props) {
      const raw = row.cells[p.id];
      const value =
        p.type === "number" ? Number(raw) || 0
        : p.type === "checkbox" ? (raw ? 1 : 0)
        : JSON.stringify(raw === undefined || raw === null ? "" : String(Array.isArray(raw) ? raw.join(", ") : raw));
      code = code.split(`{${p.name}}`).join(String(value));
    }
    if (FORBIDDEN.test(code) || !SAFE_FORMULA.test(code)) return "⚠︎ expresión no permitida";
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        "round", "abs", "min", "max", "floor", "ceil", "iff", "length",
        `"use strict"; return (${code.replace(/\bif\s*\(/g, "iff(")});`
      );
      const out = fn(Math.round, Math.abs, Math.min, Math.max, Math.floor, Math.ceil,
        (c, a, b) => (c ? a : b), (v) => String(v).length);
      return typeof out === "number" && !isFinite(out) ? "—" : out;
    } catch {
      return "⚠︎ error";
    }
  }

  /** Base de datos de destino de una propiedad de relación. */
  const relationDb = (prop) => {
    const target = prop.targetPageId ? Store.getPage(prop.targetPageId) : null;
    return target && target.db ? { page: target, db: target.db } : null;
  };

  const relationTitle = (targetDb, rowId) => {
    const tp = targetDb.props.find((p) => p.type === "title") || targetDb.props[0];
    const row = targetDb.rows.find((r) => r.id === rowId);
    return row ? row.cells[tp.id] || "Sin título" : "(eliminado)";
  };

  /** Calcula el valor de un rollup a partir de la relación indicada. */
  function rollupValue(prop, row) {
    const relProp = db.props.find((p) => p.id === prop.relationPropId);
    if (!relProp) return "";
    const target = relationDb(relProp);
    if (!target) return "";
    const ids = row.cells[relProp.id] || [];
    const rows = target.db.rows.filter((r) => ids.includes(r.id));
    const targetProp = target.db.props.find((p) => p.id === prop.targetPropId);
    if (prop.fn === "count" || !targetProp) return rows.length;
    const nums = rows.map((r) => Number(r.cells[targetProp.id]) || 0);
    switch (prop.fn) {
      case "sum": return nums.reduce((a, b) => a + b, 0);
      case "avg": return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0;
      case "min": return nums.length ? Math.min(...nums) : 0;
      case "max": return nums.length ? Math.max(...nums) : 0;
      default: return rows.map((r) => r.cells[targetProp.id]).join(", ");
    }
  }

  /** Valor mostrado de cualquier propiedad (usado por filtros, orden y gráficas). */
  function valueOf(row, prop) {
    switch (prop.type) {
      case "formula": return evalFormula(prop.formula, row, db.props);
      case "rollup": return rollupValue(prop, row);
      case "created": return row.createdAt || "";
      case "edited": return row.updatedAt || row.createdAt || "";
      default: return row.cells[prop.id];
    }
  }

  function optionOf(prop, name) {
    if (!name) return null;
    let opt = prop.options.find((o) => o.name === name);
    if (!opt) {
      opt = { id: U.uid("o"), name, color: U.pickColor(name) };
      prop.options.push(opt);
    }
    return opt;
  }

  /* --------------------------- Filas como páginas ------------------------- */
  function openRow(row, { peek = true } = {}) {
    const tp = titleProp();
    const dbPageId = page.id;
    if (!row.pageId || !Store.getPage(row.pageId)) {
      const sub = Store.createPage({
        title: row.cells[tp.id] || "Sin título",
        icon: "📄",
        parentId: dbPageId,
        blocks: [Store.makeBlock("paragraph", { text: "" })],
      });
      sub.dbRef = { pageId: dbPageId, rowId: row.id };
      row.pageId = sub.id;
      dirty();
    } else {
      const existing = Store.getPage(row.pageId);
      if (!existing.dbRef) existing.dbRef = { pageId: dbPageId, rowId: row.id };
      Store.updatePage(row.pageId, { title: row.cells[tp.id] || "Sin título" });
    }
    if (peek) App.openPeek(row.pageId);
    else Store.open(row.pageId);
  }

  /* ---------------------- Panel de propiedades de una fila ----------------- */
  /**
   * Devuelve el bloque de propiedades que se muestra bajo el título de la
   * página de una fila, como en Notion.
   */
  function propertyPanel(dbPage, rowId) {
    const panel = U.el("div", { class: "prop-panel" });
    const bind = () => {
      page = dbPage;
      db = dbPage.db;
      block = null;
      linked = false;
      host = panel;
      repaintHook = paintPanel;
    };

    function paintPanel() {
      bind();
      const row = db.rows.find((r) => r.id === rowId);
      panel.innerHTML = "";
      if (!row) {
        panel.append(U.el("div", { class: "db-hint", text: "Esta fila ya no existe en la base de datos." }));
        return;
      }
      db.props.forEach((prop) => {
        if (prop.type === "title") return;
        const icon = (PROP_TYPES.find((t) => t.id === prop.type) || { icon: ICONS.text }).icon;
        panel.append(
          U.el(
            "div", { class: "prop-row" },
            U.el("button", {
              class: "prop-label", html: icon + `<span>${U.escapeHtml(prop.name)}</span>`,
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left, y: r.bottom + 4, width: 220,
                  items: [
                    { type: "custom", node: U.el("input", {
                        class: "menu-input", value: prop.name,
                        oninput: (ev) => { prop.name = ev.target.value; dirty(); },
                        onkeydown: (ev) => { ev.stopPropagation(); if (ev.key === "Enter") { Menus.closeAll(); paintPanel(); } },
                      }) },
                    { type: "label", label: "Tipo" },
                    ...PROP_TYPES.map((t) => ({
                      label: t.name, icon: t.icon, active: prop.type === t.id,
                      onClick: () => { prop.type = t.id; dirty(); paintPanel(); },
                    })),
                    { type: "separator" },
                    { label: "Eliminar propiedad", icon: ICONS.trash, danger: true,
                      onClick: () => {
                        db.props = db.props.filter((p) => p.id !== prop.id);
                        db.rows.forEach((r) => delete r.cells[prop.id]);
                        dirty(); paintPanel();
                      } },
                  ],
                });
              },
            }),
            renderCell(row, prop, { compact: true })
          )
        );
      });

      panel.append(
        U.el("button", {
          class: "prop-add", html: ICONS.plus + "<span>Añadir propiedad</span>",
          onclick: () => {
            db.props.push({ id: U.uid("pr"), name: "Propiedad", type: "text", options: [] });
            dirty();
            paintPanel();
          },
        })
      );
    }

    // Cualquier interacción dentro del panel restaura su contexto antes de
    // que corran los manejadores de las celdas.
    ["mousedown", "keydown", "input", "change", "click"].forEach((evt) =>
      panel.addEventListener(evt, bind, true)
    );

    paintPanel();
    return panel;
  }

  function addRow(preset = {}, { silent = false } = {}) {
    Store.snapshot();
    const row = {
      id: U.uid("r"), cells: { ...preset }, pageId: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.rows.push(row);
    runAutomations(row, "row_created");
    dirty();
    if (!silent) repaint();
    return row;
  }

  /* ---------------------------- Automatizaciones --------------------------- */
  /**
   * Reglas: { id, when: {type:'row_created'|'prop_equals', propId, value},
   *           then: {type:'set_prop'|'check'|'comment', propId, value} }
   */
  function runAutomations(row, trigger, changedPropId) {
    const rules = db.automations || [];
    let fired = 0;
    for (const rule of rules) {
      if (!rule.enabled) continue;
      const w = rule.when || {};
      let match = false;
      if (trigger === "row_created" && w.type === "row_created") match = true;
      if (trigger === "prop_changed" && w.type === "prop_equals") {
        const val = row.cells[w.propId];
        match = String(Array.isArray(val) ? val.join(",") : val ?? "") === String(w.value ?? "");
        if (changedPropId && w.propId !== changedPropId) match = false;
      }
      if (!match) continue;

      const t = rule.then || {};
      if (t.type === "set_prop" && t.propId) {
        const prop = db.props.find((p) => p.id === t.propId);
        if (prop) {
          row.cells[t.propId] =
            prop.type === "multi_select" ? [t.value]
            : prop.type === "checkbox" ? true
            : prop.type === "date" && t.value === "hoy" ? U.today()
            : prop.type === "number" ? Number(t.value) || 0
            : t.value;
        }
      } else if (t.type === "comment" && page) {
        Store.addComment(page.id, block?.id || "", `⚙︎ ${t.value || "Automatización ejecutada"}`);
      }
      fired++;
      History.log("db.automation", `${rule.name || "Regla"} en «${db.name}»`);
    }
    if (fired) Store.save();
    return fired;
  }

  function automationsModal() {
    db.automations = db.automations || [];
    const list = U.el("div", { class: "auto-list" });

    const paint2 = () => {
      list.innerHTML = "";
      if (!db.automations.length)
        list.append(U.el("div", { class: "cm-empty", text: "Sin automatizaciones. Crea una para que la base reaccione sola." }));
      db.automations.forEach((rule, i) => {
        const whenProp = db.props.find((p) => p.id === rule.when?.propId);
        const thenProp = db.props.find((p) => p.id === rule.then?.propId);
        list.append(
          U.el(
            "div", { class: "auto-rule" },
            U.el("button", {
              class: "switch" + (rule.enabled ? " is-on" : ""),
              onclick: (e) => { rule.enabled = !rule.enabled; e.currentTarget.classList.toggle("is-on", rule.enabled); dirty(); },
            }),
            U.el(
              "div", { class: "auto-body" },
              U.el("input", {
                class: "auto-name", value: rule.name || "Regla sin nombre",
                oninput: (e) => { rule.name = e.target.value; dirty(); },
              }),
              U.el("div", { class: "auto-desc", text:
                (rule.when?.type === "row_created"
                  ? "Cuando se crea una fila"
                  : `Cuando «${whenProp?.name || "?"}» es «${rule.when?.value ?? ""}»`) +
                " → " +
                (rule.then?.type === "comment"
                  ? `comentar «${rule.then.value}»`
                  : `poner «${thenProp?.name || "?"}» = «${rule.then?.value ?? ""}»`) })
            ),
            U.el("button", {
              class: "icon-btn", html: ICONS.settings, title: "Configurar",
              onclick: (e) => editRule(rule, e.currentTarget),
            }),
            U.el("button", {
              class: "icon-btn", html: ICONS.trash, title: "Eliminar",
              onclick: () => { db.automations.splice(i, 1); dirty(); paint2(); },
            })
          )
        );
      });
    };

    function editRule(rule, anchor) {
      const r = anchor.getBoundingClientRect();
      Menus.open({
        x: r.left - 220, y: r.bottom + 4, width: 260,
        items: [
          { type: "label", label: "Cuándo" },
          { label: "Al crear una fila", active: rule.when?.type === "row_created",
            onClick: () => { rule.when = { type: "row_created" }; dirty(); paint2(); } },
          ...db.props.filter((p) => ["select", "checkbox", "status"].includes(p.type)).map((p) => ({
            label: `«${p.name}» cambia a…`,
            onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 220,
                items: (p.options.length ? p.options.map((o) => o.name) : ["true"]).map((name) => ({
                  label: name,
                  onClick: () => { rule.when = { type: "prop_equals", propId: p.id, value: name }; dirty(); paint2(); },
                })),
              });
              return true;
            },
          })),
          { type: "separator" },
          { type: "label", label: "Entonces" },
          ...db.props.map((p) => ({
            label: `Poner «${p.name}» =…`,
            onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              const choices = p.options.length ? p.options.map((o) => o.name)
                : p.type === "date" ? ["hoy"] : p.type === "checkbox" ? ["true"] : ["(escribir)"];
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 220,
                items: choices.map((name) => ({
                  label: name,
                  onClick: () => {
                    const value = name === "(escribir)" ? prompt("Valor:") || "" : name;
                    rule.then = { type: "set_prop", propId: p.id, value };
                    dirty(); paint2();
                  },
                })),
              });
              return true;
            },
          })),
          { label: "Dejar un comentario…", icon: ICONS.comment, onClick: () => {
              const value = prompt("Texto del comentario:", "Revisar este registro");
              if (value) { rule.then = { type: "comment", value }; dirty(); paint2(); }
            } },
        ],
      });
    }

    const card = U.el(
      "div", { class: "modal", style: { width: "min(620px, 94vw)" } },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Automatizaciones" }),
        U.el("span", { class: "share-mail", text: db.name }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      list,
      U.el("div", { class: "features-foot" },
        U.el("span", { text: "Se ejecutan al crear filas o al cambiar una propiedad." }),
        U.el("button", {
          class: "btn btn-primary", text: "Nueva regla",
          onclick: () => {
            const statusProp = db.props.find((p) => p.type === "select") || db.props[1] || db.props[0];
            db.automations.push({
              id: U.uid("au"), name: "Nueva regla", enabled: true,
              when: { type: "row_created" },
              then: { type: "set_prop", propId: statusProp.id, value: statusProp.options?.[0]?.name || "" },
            });
            dirty(); paint2();
          },
        }))
    );
    paint2();
    const modal = Modals.overlay(card);
    return modal;
  }

  function deleteRow(id) {
    Store.snapshot();
    db.rows = db.rows.filter((r) => r.id !== id);
    dirty();
    repaint();
  }

  function addProp() {
    Store.snapshot();
    db.props.push({ id: U.uid("pr"), name: "Propiedad", type: "text", options: [] });
    dirty();
    repaint();
  }

  /* ------------------------------ Celdas ---------------------------------- */
  function renderCell(row, prop, { compact = false } = {}) {
    const value = row.cells[prop.id];

    const commit = (v) => {
      row.cells[prop.id] = v;
      row.updatedAt = new Date().toISOString();
      if (prop.type === "title" && row.pageId) Store.updatePage(row.pageId, { title: v });
      runAutomations(row, "prop_changed", prop.id);
      dirty();
    };

    switch (prop.type) {
      case "checkbox": {
        const box = U.el("button", {
          class: "checkbox-cell", dataset: { checked: String(!!value) }, html: ICONS.check,
          onclick: (e) => {
            e.stopPropagation();
            commit(!value);
            repaint();
          },
        });
        return U.el("div", { class: "db-cell" }, box);
      }

      case "select":
      case "multi_select": {
        const multi = prop.type === "multi_select";
        const values = multi ? (Array.isArray(value) ? value : value ? [value] : []) : value ? [value] : [];
        const cell = U.el(
          "div",
          {
            class: "db-cell",
            onclick: (e) => {
              e.stopPropagation();
              const r = cell.getBoundingClientRect();
              Menus.open({
                x: r.left, y: r.bottom + 2, width: 220, searchable: true,
                placeholder: "Buscar o crear…",
                items: [
                  { type: "label", label: multi ? "Selecciona varias" : "Selecciona una" },
                  ...prop.options.map((o) => ({
                    label: `<span class="tag b-${o.color}">${U.escapeHtml(o.name)}</span>`,
                    active: values.includes(o.name),
                    onClick: () => {
                      if (multi) {
                        const next = values.includes(o.name)
                          ? values.filter((v) => v !== o.name)
                          : [...values, o.name];
                        commit(next);
                      } else {
                        commit(values.includes(o.name) ? "" : o.name);
                      }
                      repaint();
                      return multi;
                    },
                  })),
                  { type: "separator" },
                  {
                    label: "Crear opción…", icon: ICONS.plus,
                    onClick: () => {
                      const name = prompt("Nombre de la opción:");
                      if (!name) return;
                      optionOf(prop, name);
                      commit(multi ? [...values, name] : name);
                      repaint();
                    },
                  },
                ],
              });
            },
          },
          ...values.map((v) => {
            const o = optionOf(prop, v);
            return U.el("span", { class: "tag b-" + (o?.color || "gray"), text: v });
          })
        );
        return cell;
      }

      case "date": {
        const cell = U.el("div", {
          class: "db-cell",
          text: value ? U.formatDate(value) : "",
          onclick: (e) => {
            e.stopPropagation();
            const input = U.el("input", {
              type: "date", value: value || "",
              style: { border: 0, outline: "none", background: "transparent", font: "inherit" },
              onchange: () => { commit(input.value); repaint(); },
            });
            cell.textContent = "";
            cell.append(input);
            input.focus();
            input.showPicker?.();
          },
        });
        return cell;
      }

      case "url": {
        return U.el(
          "div", { class: "db-cell" },
          value
            ? U.el("a", {
                href: value, target: "_blank", rel: "noreferrer noopener",
                text: value.replace(/^https?:\/\//, ""),
                style: { textDecoration: "underline", color: "var(--text)" },
                onclick: (e) => e.stopPropagation(),
              })
            : U.el("span", {
                text: "", style: { minHeight: "18px", width: "100%" },
                onclick: () => {
                  const u = prompt("URL:", "https://");
                  if (u) { commit(u); repaint(); }
                },
              })
        );
      }

      case "person": {
        const cell = U.el("div", { class: "db-cell" });
        if (value) {
          cell.append(
            U.el(
              "span", { class: "tag b-" + U.pickColor(value) },
              U.el("span", {
                text: value[0].toUpperCase(),
                style: {
                  width: "16px", height: "16px", borderRadius: "50%", background: "var(--accent)",
                  color: "#fff", display: "grid", placeItems: "center", fontSize: "10px",
                },
              }),
              value
            )
          );
        }
        cell.onclick = (e) => {
          e.stopPropagation();
          const name = prompt("Persona:", value || "");
          if (name !== null) { commit(name); repaint(); }
        };
        return cell;
      }

      case "formula":
      case "rollup": {
        const v = valueOf(row, prop);
        return U.el("div", { class: "db-cell db-cell-computed", title: "Calculado automáticamente",
          text: v === "" || v === undefined ? "" : String(v) });
      }

      case "created":
      case "edited":
        return U.el("div", { class: "db-cell db-cell-computed",
          text: U.formatDate(valueOf(row, prop) || page.createdAt) });

      case "relation": {
        const target = relationDb(prop);
        const ids = Array.isArray(value) ? value : [];
        const cell = U.el(
          "div",
          {
            class: "db-cell",
            onclick: (e) => {
              e.stopPropagation();
              if (!target) {
                pickRelationTarget(prop);
                return;
              }
              const r = cell.getBoundingClientRect();
              const tp = target.db.props.find((p) => p.type === "title") || target.db.props[0];
              Menus.open({
                x: r.left, y: r.bottom + 2, width: 260, searchable: true,
                placeholder: `Buscar en ${target.page.title}…`,
                items: [
                  { type: "label", label: `Relacionar con ${target.page.title}` },
                  ...target.db.rows.map((tr) => ({
                    label: U.escapeHtml(tr.cells[tp.id] || "Sin título"),
                    active: ids.includes(tr.id),
                    onClick: () => {
                      const next = ids.includes(tr.id) ? ids.filter((x) => x !== tr.id) : [...ids, tr.id];
                      commit(next);
                      repaint();
                      return true;
                    },
                  })),
                  { type: "separator" },
                  { label: "Cambiar base de datos…", icon: ICONS.table, onClick: () => pickRelationTarget(prop) },
                ],
              });
            },
          },
          ...(target ? ids.map((id) =>
                U.el("span", { class: "tag tag-rel", text: relationTitle(target.db, id) }))
              : [U.el("span", { class: "db-hint", text: "Elegir base de datos…" })])
        );
        return cell;
      }

      default: {
        // texto / número / título
        const cell = U.el("div", {
          class: "db-cell" + (prop.type === "title" ? " db-cell-title" : ""),
          contenteditable: "true", spellcheck: "false",
          text: value === undefined || value === null ? "" : String(value),
          oninput: () => {
            const raw = cell.textContent.trim();
            commit(prop.type === "number" ? (raw === "" ? "" : Number(raw) || 0) : raw);
          },
          onkeydown: (e) => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); cell.blur(); }
          },
        });
        if (prop.type === "title" && !compact) {
          const open = U.el("button", {
            class: "row-open", text: "ABRIR", contenteditable: "false",
            onclick: (e) => { e.stopPropagation(); openRow(row); },
          });
          cell.append(open);
        }
        return cell;
      }
    }
  }

  /** Elige a qué base de datos apunta una propiedad de relación. */
  function pickRelationTarget(prop) {
    const targets = Object.values(Store.state.pages).filter((p) => !p.deleted && p.db && p.id !== page.id);
    if (!targets.length) return U.toast("Crea otra página con base de datos para poder relacionarlas");
    Menus.open({
      x: window.innerWidth / 2 - 120, y: 160, width: 260, searchable: true,
      items: [
        { type: "label", label: "Relacionar con…" },
        ...targets.map((p) => ({
          label: `${p.icon || "📄"} ${U.escapeHtml(p.title || "Sin título")}`,
          active: prop.targetPageId === p.id,
          onClick: () => { prop.targetPageId = p.id; dirty(); repaint(); },
        })),
      ],
    });
  }

  /* -------------------------------- Tabla --------------------------------- */
  function renderTable() {
    const table = U.el("table", { class: "db-table" });
    const thead = U.el("thead");
    const hrow = U.el("tr");

    shownProps().forEach((prop) => {
      const th = U.el(
        "th", {},
        U.el(
          "div",
          {
            class: "db-th-inner",
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: r.left, y: r.bottom + 2, width: 220,
                items: [
                  {
                    type: "custom",
                    node: U.el("input", {
                      class: "menu-input", value: prop.name,
                      oninput: (ev) => { prop.name = ev.target.value; dirty(); },
                      onkeydown: (ev) => { ev.stopPropagation(); if (ev.key === "Enter") { Menus.closeAll(); repaint(); } },
                    }),
                  },
                  { type: "label", label: "Tipo de propiedad" },
                  ...PROP_TYPES.map((t) => ({
                    label: t.name, icon: t.icon, active: prop.type === t.id,
                    onClick: () => { prop.type = t.id; dirty(); repaint(); },
                  })),
                  { type: "separator" },
                  prop.type === "formula" && {
                    label: "Editar fórmula…", icon: ICONS.code,
                    onClick: () => {
                      const expr = prompt(
                        `Fórmula para «${prop.name}». Usa {Propiedad} y + - * / round() if():`,
                        prop.formula || "{" + (db.props.find((p) => p.type === "number")?.name || "Número") + "} * 12"
                      );
                      if (expr !== null) { prop.formula = expr; dirty(); repaint(); }
                    },
                  },
                  prop.type === "relation" && {
                    label: "Base de datos relacionada…", icon: ICONS.table,
                    onClick: () => pickRelationTarget(prop),
                  },
                  prop.type === "rollup" && {
                    label: "Configurar rollup…", icon: ICONS.sort,
                    onClick: (e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const rels = db.props.filter((p) => p.type === "relation");
                      Menus.open({
                        x: r.right + 4, y: r.top, width: 240,
                        items: rels.length
                          ? [
                              { type: "label", label: "A través de la relación" },
                              ...rels.map((rel) => ({
                                label: rel.name, active: prop.relationPropId === rel.id,
                                onClick: (ev) => {
                                  prop.relationPropId = rel.id;
                                  const target = relationDb(rel);
                                  const rr = ev.currentTarget.getBoundingClientRect();
                                  Menus.open({
                                    x: rr.right + 4, y: rr.top, width: 230,
                                    items: [
                                      { type: "label", label: "Calcular" },
                                      { label: "Conteo", active: prop.fn === "count",
                                        onClick: () => { prop.fn = "count"; dirty(); repaint(); } },
                                      ...(target ? target.db.props
                                        .filter((tp2) => ["number", "formula"].includes(tp2.type))
                                        .flatMap((tp2) => ["sum", "avg", "min", "max"].map((fn) => ({
                                          label: `${fn} de ${tp2.name}`,
                                          active: prop.fn === fn && prop.targetPropId === tp2.id,
                                          onClick: () => { prop.fn = fn; prop.targetPropId = tp2.id; dirty(); repaint(); },
                                        }))) : []),
                                    ],
                                  });
                                  return true;
                                },
                              })),
                            ]
                          : [{ type: "label", label: "Crea antes una propiedad de relación" }],
                      });
                      return true;
                    },
                  },
                  {
                    label: "Rellenar con IA", icon: ICONS.sparkle,
                    sub: AI.hasKey() ? "con Claude" : "modo local",
                    onClick: async () => {
                      if (["formula", "rollup", "created", "edited", "title"].includes(prop.type))
                        return U.toast("Esta propiedad se calcula sola");
                      U.toast("Rellenando con IA…");
                      const done = await AI.autofill(db, prop, visibleRows().filter((r) => !r.cells[prop.id]));
                      repaint();
                      U.toast(done ? `${done} celdas rellenadas` : "Nada que rellenar");
                    },
                  },
                  { type: "separator" },
                  { label: "Ordenar ascendente", icon: ICONS.sort, onClick: () => sortBy(prop.id, 1) },
                  { label: "Ordenar descendente", icon: ICONS.sort, onClick: () => sortBy(prop.id, -1) },
                  { label: "Duplicar propiedad", icon: ICONS.duplicate, onClick: () => {
                      Store.snapshot();
                      const copy = JSON.parse(JSON.stringify(prop));
                      copy.id = U.uid("pr");
                      copy.name += " (copia)";
                      db.props.push(copy);
                      db.rows.forEach((r) => (r.cells[copy.id] = r.cells[prop.id]));
                      dirty(); repaint();
                    } },
                  prop.type !== "title" && {
                    label: "Eliminar propiedad", icon: ICONS.trash, danger: true,
                    onClick: () => {
                      Store.snapshot();
                      db.props = db.props.filter((p) => p.id !== prop.id);
                      db.rows.forEach((r) => delete r.cells[prop.id]);
                      dirty(); repaint();
                    },
                  },
                ].filter(Boolean),
              });
            },
          },
          U.el("span", { html: (PROP_TYPES.find((t) => t.id === prop.type) || { icon: ICONS.text }).icon }),
          U.el("span", { text: prop.name })
        )
      );
      hrow.append(th);
    });

    hrow.append(
      U.el(
        "th", { style: { width: "44px" } },
        U.el("button", { class: "db-th-inner", html: ICONS.plus, onclick: addProp, title: "Añadir propiedad" })
      )
    );
    thead.append(hrow);

    const tbody = U.el("tbody");
    visibleRows().forEach((row) => {
      const tr = U.el("tr", { class: "db-row" });
      shownProps().forEach((prop) => tr.append(U.el("td", {}, renderCell(row, prop))));
      tr.append(
        U.el(
          "td", {},
          U.el("div", {
            class: "db-cell",
            style: { justifyContent: "center", color: "var(--text-tertiary)", cursor: "pointer" },
            html: ICONS.dots,
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: r.left, y: r.bottom + 2, width: 200,
                items: [
                  { label: "Abrir en ventana lateral", icon: ICONS.expand, onClick: () => openRow(row) },
                  { label: "Abrir como página", icon: ICONS.doc, onClick: () => openRow(row, { peek: false }) },
                  { label: "Duplicar", icon: ICONS.duplicate, onClick: () => {
                      Store.snapshot();
                      db.rows.splice(db.rows.indexOf(row) + 1, 0, {
                        id: U.uid("r"), cells: { ...row.cells }, pageId: null,
                      });
                      dirty(); repaint();
                    } },
                  { label: "Eliminar", icon: ICONS.trash, danger: true, onClick: () => deleteRow(row.id) },
                ],
              });
            },
          })
        )
      );
      tbody.append(tr);
    });

    // Pie con cálculos por columna, como en Notion
    const foot = U.el("tfoot");
    const frow = U.el("tr", { class: "db-calc-row" });
    shownProps().forEach((prop) => {
      const view = activeView();
      view.calcs = view.calcs || {};
      const fn = view.calcs[prop.id] || "none";
      frow.append(
        U.el("td", {},
          U.el("button", {
            class: "db-calc" + (fn === "none" ? "" : " is-on"),
            text: fn === "none" ? "Calcular" : calcLabel(prop, fn),
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: r.left, y: r.bottom + 4, width: 210,
                items: CALCS.filter((c) => !c.numeric || ["number", "formula", "rollup"].includes(prop.type))
                  .map((c) => ({
                    label: c.name, active: fn === c.id,
                    onClick: () => { view.calcs[prop.id] = c.id; dirty(); repaint(); },
                  })),
              });
            },
          })
        )
      );
    });
    frow.append(U.el("td"));
    foot.append(frow);

    table.append(thead, tbody, foot);
    return U.el(
      "div", {},
      table,
      U.el("button", { class: "db-add-row", html: ICONS.plus + "<span>Nueva</span>", onclick: () => addRow() }),
      U.el("div", { class: "db-count", text: `${db.rows.length} registro${db.rows.length === 1 ? "" : "s"}` })
    );
  }

  /* ------------------------ Cálculos de columna --------------------------- */
  const CALCS = [
    { id: "none", name: "Ninguno" },
    { id: "count", name: "Contar todo" },
    { id: "filled", name: "Contar con valor" },
    { id: "empty", name: "Contar vacíos" },
    { id: "unique", name: "Valores únicos" },
    { id: "percent_filled", name: "Porcentaje con valor" },
    { id: "sum", name: "Suma", numeric: true },
    { id: "avg", name: "Media", numeric: true },
    { id: "min", name: "Mínimo", numeric: true },
    { id: "max", name: "Máximo", numeric: true },
    { id: "range", name: "Rango", numeric: true },
  ];

  function calcLabel(prop, fn) {
    const rows = visibleRows();
    const values = rows.map((r) => valueOf(r, prop));
    const filled = values.filter((v) => v !== "" && v !== undefined && v !== null && !(Array.isArray(v) && !v.length));
    const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
    const round = (n) => Math.round(n * 100) / 100;
    switch (fn) {
      case "count": return `Total ${rows.length}`;
      case "filled": return `Con valor ${filled.length}`;
      case "empty": return `Vacíos ${rows.length - filled.length}`;
      case "unique": return `Únicos ${new Set(filled.map(String)).size}`;
      case "percent_filled": return rows.length ? `${Math.round((filled.length / rows.length) * 100)}% con valor` : "0%";
      case "sum": return `Suma ${round(nums.reduce((a, b) => a + b, 0))}`;
      case "avg": return nums.length ? `Media ${round(nums.reduce((a, b) => a + b, 0) / nums.length)}` : "Media —";
      case "min": return nums.length ? `Mín ${round(Math.min(...nums))}` : "Mín —";
      case "max": return nums.length ? `Máx ${round(Math.max(...nums))}` : "Máx —";
      case "range": return nums.length ? `Rango ${round(Math.max(...nums) - Math.min(...nums))}` : "Rango —";
      default: return "Calcular";
    }
  }

  function sortBy(propId, dir) {
    Store.snapshot();
    db.rows.sort((a, b) => {
      const x = a.cells[propId] ?? "", y = b.cells[propId] ?? "";
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
    dirty();
    repaint();
  }

  /* -------------------------------- Tablero ------------------------------- */
  let dragRowId = null;

  function renderBoard(viewCfg) {
    const groupProp =
      db.props.find((p) => p.id === viewCfg.groupBy) ||
      db.props.find((p) => p.type === "select");
    if (!groupProp) {
      return U.el("div", { class: "db-count", text: "Añade una propiedad de selección para agrupar." });
    }
    const tp = titleProp();
    const groups = [...groupProp.options.map((o) => o.name), ""];
    const board = U.el("div", { class: "db-board" });

    groups.forEach((g) => {
      const opt = groupProp.options.find((o) => o.name === g);
      const rows = visibleRows().filter((r) => (r.cells[groupProp.id] || "") === g);
      const cards = U.el("div", { class: "board-cards" });

      rows.forEach((row) => {
        const card = U.el(
          "div",
          {
            class: "board-card", draggable: "true",
            ondragstart: (e) => { dragRowId = row.id; e.dataTransfer.effectAllowed = "move"; },
            onclick: () => openRow(row),
          },
          U.el("div", { class: "board-card-title", text: row.cells[tp.id] || "Sin título" }),
          U.el(
            "div", { class: "board-card-meta" },
            ...shownProps()
              .filter((p) => p.id !== tp.id && p.id !== groupProp.id)
              .flatMap((p) => {
                const v = row.cells[p.id];
                if (v === undefined || v === "" || v === false || (Array.isArray(v) && !v.length)) return [];
                if (p.type === "multi_select")
                  return v.map((x) => U.el("span", { class: "tag b-" + (optionOf(p, x)?.color || "gray"), text: x }));
                if (p.type === "select")
                  return [U.el("span", { class: "tag b-" + (optionOf(p, v)?.color || "gray"), text: v })];
                if (p.type === "date") return [U.el("span", { class: "tag", text: U.formatDate(v) })];
                if (p.type === "checkbox") return [U.el("span", { class: "tag", text: p.name })];
                return [U.el("span", { class: "tag", text: String(v) })];
              })
          )
        );
        cards.append(card);
      });

      const col = U.el(
        "div",
        {
          class: "board-col",
          ondragover: (e) => { e.preventDefault(); col.classList.add("drop-target"); },
          ondragleave: () => col.classList.remove("drop-target"),
          ondrop: (e) => {
            e.preventDefault();
            col.classList.remove("drop-target");
            const row = db.rows.find((r) => r.id === dragRowId);
            if (!row) return;
            Store.snapshot();
            row.cells[groupProp.id] = g;
            dragRowId = null;
            dirty();
            repaint();
          },
        },
        U.el(
          "div", { class: "board-col-head" },
          U.el("span", { class: "tag b-" + (opt?.color || "gray"), text: g || "Sin " + groupProp.name.toLowerCase() }),
          U.el("span", { class: "board-count", text: String(rows.length) })
        ),
        cards,
        U.el("button", {
          class: "board-add", html: ICONS.plus + "<span>Nueva</span>",
          onclick: () => addRow({ [groupProp.id]: g }),
        })
      );
      board.append(col);
    });
    return board;
  }

  /* -------------------------------- Galería -------------------------------- */
  function renderGallery() {
    const tp = titleProp();
    const grid = U.el("div", { class: "db-gallery" });
    visibleRows().forEach((row) => {
      const cover = db.props.find((p) => p.type === "url" && row.cells[p.id]?.match(/\.(png|jpe?g|gif|webp)$/i));
      grid.append(
        U.el(
          "div", { class: "gallery-card", onclick: () => openRow(row) },
          (() => {
            const el = U.el("div", { class: "gallery-cover" });
            if (cover) el.style.backgroundImage = `url(${row.cells[cover.id]})`;
            else el.append(U.iconNode(Store.getPage(row.pageId)?.icon, 34));
            return el;
          })(),
          U.el(
            "div", { class: "gallery-body" },
            U.el("div", { class: "gallery-title", text: row.cells[tp.id] || "Sin título" }),
            U.el(
              "div", { class: "board-card-meta" },
              ...shownProps()
                .filter((p) => ["select", "multi_select", "date"].includes(p.type))
                .flatMap((p) => {
                  const v = row.cells[p.id];
                  if (!v) return [];
                  const vals = Array.isArray(v) ? v : [v];
                  return vals.map((x) =>
                    U.el("span", {
                      class: "tag b-" + (p.type === "date" ? "gray" : optionOf(p, x)?.color || "gray"),
                      text: p.type === "date" ? U.formatDate(x) : x,
                    })
                  );
                })
            )
          )
        )
      );
    });
    return grid;
  }

  /* --------------------------------- Lista --------------------------------- */
  function renderList() {
    const tp = titleProp();
    const wrap = U.el("div", { class: "db-list" });
    visibleRows().forEach((row) => {
      wrap.append(
        U.el(
          "div", { class: "list-row", onclick: () => openRow(row) },
          U.iconNode(Store.getPage(row.pageId)?.icon, 16),
          U.el("span", { class: "list-title", text: row.cells[tp.id] || "Sin título" }),
          U.el(
            "span", { class: "list-meta" },
            ...shownProps()
              .filter((p) => ["select", "date", "person"].includes(p.type) && row.cells[p.id])
              .map((p) =>
                U.el("span", {
                  class: "tag b-" + (p.type === "select" ? optionOf(p, row.cells[p.id])?.color || "gray" : "gray"),
                  text: p.type === "date" ? U.formatDate(row.cells[p.id]) : row.cells[p.id],
                })
              )
          )
        )
      );
    });
    return wrap;
  }

  /* ------------------------------- Calendario ------------------------------ */
  function renderCalendar(viewCfg) {
    const dateProp =
      db.props.find((p) => p.id === viewCfg.dateProp) || db.props.find((p) => p.type === "date");
    if (!dateProp)
      return U.el("div", { class: "db-count", text: "Añade una propiedad de fecha para ver el calendario." });

    const tp = titleProp();
    const cursor = viewCfg.month ? new Date(viewCfg.month + "-01T00:00:00") : new Date();
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // semana inicia en lunes

    const shift = (delta) => {
      const d = new Date(y, m + delta, 1);
      viewCfg.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      dirty();
      repaint();
    };

    const grid = U.el("div", { class: "cal-grid" });
    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((d) =>
      grid.append(U.el("div", { class: "cal-dow", text: d }))
    );

    const todayStr = U.today();
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const cell = U.el(
        "div",
        {
          class: "cal-day" + (day.getMonth() !== m ? " other" : "") + (iso === todayStr ? " today" : ""),
          ondblclick: () => addRow({ [dateProp.id]: iso }),
        },
        U.el("span", { class: "cal-daynum", text: String(day.getDate()) })
      );
      visibleRows()
        .filter((r) => (r.cells[dateProp.id] || "").slice(0, 10) === iso)
        .forEach((r) =>
          cell.append(
            U.el("div", {
              class: "cal-event", text: r.cells[tp.id] || "Sin título",
              onclick: (e) => { e.stopPropagation(); openRow(r); },
            })
          )
        );
      grid.append(cell);
    }

    return U.el(
      "div", { class: "db-calendar" },
      U.el(
        "div", { class: "cal-head" },
        U.el("div", {
          class: "cal-title",
          text: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        }),
        U.el("button", { class: "icon-btn", html: ICONS.chevronLeft, onclick: () => shift(-1) }),
        U.el("button", { class: "btn", text: "Hoy", onclick: () => { delete viewCfg.month; dirty(); repaint(); } }),
        U.el("button", { class: "icon-btn", html: ICONS.chevronRight, onclick: () => shift(1) })
      ),
      grid
    );
  }

  /* --------------------------- Plantillas de fila -------------------------- */
  /** Crea una fila desde una plantilla, con su contenido de página si lo trae. */
  function addRowFromTemplate(tpl) {
    const row = addRow({ ...tpl.cells }, { silent: true });
    if (tpl.blocks && tpl.blocks.length) {
      const tp = titleProp();
      const sub = Store.createPage({
        title: row.cells[tp.id] || tpl.name,
        icon: tpl.icon || "📄",
        parentId: page.id,
        blocks: JSON.parse(JSON.stringify(tpl.blocks)).map((b) => ({ ...b, id: U.uid("b") })),
      });
      sub.dbRef = { pageId: page.id, rowId: row.id };
      row.pageId = sub.id;
      dirty();
    }
    repaint();
    U.toast(`Fila creada desde «${tpl.name}»`);
    if (row.pageId) App.openPeek(row.pageId);
    return row;
  }

  function templatesModal() {
    db.templates = db.templates || [];
    const list = U.el("div", { class: "auto-list" });

    const paint2 = () => {
      list.innerHTML = "";
      if (!db.templates.length)
        list.append(U.el("div", { class: "cm-empty", text: "Guarda una fila como plantilla para reutilizar sus valores." }));
      db.templates.forEach((t, i) =>
        list.append(
          U.el(
            "div", { class: "auto-rule" },
            U.el("span", { html: ICONS.template }),
            U.el(
              "div", { class: "auto-body" },
              U.el("input", {
                class: "auto-name", value: t.name,
                oninput: (e) => { t.name = e.target.value; dirty(); },
              }),
              U.el("div", { class: "auto-desc", text: db.props
                .filter((p) => t.cells[p.id])
                .map((p) => `${p.name}: ${Array.isArray(t.cells[p.id]) ? t.cells[p.id].join(", ") : t.cells[p.id]}`)
                .join(" · ") || "Sin valores" })
            ),
            U.el("button", { class: "btn", text: "Editar contenido",
              onclick: () => {
                // El contenido se edita en una página real y se vuelve a guardar
                const draft = Store.createPage({
                  title: t.name, icon: t.icon || "📄", parentId: page.id,
                  blocks: (t.blocks && t.blocks.length)
                    ? JSON.parse(JSON.stringify(t.blocks)).map((b) => ({ ...b, id: U.uid("b") }))
                    : [Store.makeBlock("heading2", { text: "Estructura" }), Store.makeBlock()],
                });
                draft.templateRef = { pageId: page.id, templateId: t.id };
                modal.close();
                App.openPeek(draft.id);
                U.toast("Edita el contenido y pulsa «Guardar en la plantilla»");
              } }),
            U.el("button", { class: "btn btn-primary", text: "Usar",
              onclick: () => { addRowFromTemplate(t); modal.close(); } }),
            U.el("button", {
              class: "icon-btn", html: ICONS.trash,
              onclick: () => { db.templates.splice(i, 1); dirty(); paint2(); },
            })
          )
        )
      );
    };

    const card = U.el(
      "div", { class: "modal", style: { width: "min(600px, 94vw)" } },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Plantillas de fila" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      list,
      U.el("div", { class: "features-foot" },
        U.el("span", { text: "Crea filas nuevas con valores ya rellenados." }),
        U.el("button", {
          class: "btn btn-primary", text: "Guardar fila actual como plantilla",
          onclick: () => {
            const source = visibleRows()[0];
            if (!source) return U.toast("No hay filas que guardar");
            const tp = titleProp();
            const sourcePage = source.pageId ? Store.getPage(source.pageId) : null;
            db.templates.push({
              id: U.uid("t"),
              name: source.cells[tp.id] || "Plantilla",
              icon: sourcePage?.icon || "📄",
              cells: { ...source.cells },
              // La plantilla se lleva también el contenido de la página
              blocks: sourcePage ? JSON.parse(JSON.stringify(sourcePage.blocks)) : [],
            });
            dirty(); paint2();
            U.toast("Plantilla guardada con su contenido");
          },
        }))
    );
    paint2();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ------------------------------- Gráfica --------------------------------- */
  function renderChart(viewCfg) {
    const groupProp =
      db.props.find((p) => p.id === viewCfg.groupBy) ||
      db.props.find((p) => ["select", "multi_select", "person"].includes(p.type)) ||
      db.props[0];
    const measureProp = db.props.find((p) => p.id === viewCfg.measureProp);
    const rows = visibleRows();

    const buckets = new Map();
    rows.forEach((r) => {
      const raw = valueOf(r, groupProp);
      const keys = Array.isArray(raw) ? (raw.length ? raw : ["Sin valor"]) : [raw || "Sin valor"];
      keys.forEach((k) => {
        const add = measureProp ? Number(valueOf(r, measureProp)) || 0 : 1;
        buckets.set(String(k), (buckets.get(String(k)) || 0) + add);
      });
    });

    const data = [...buckets.entries()].map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const config = U.el(
      "div", { class: "chart-config" },
      U.el("button", {
        class: "btn", html: ICONS.board + `<span>Agrupar por ${U.escapeHtml(groupProp?.name || "—")}</span>`,
        onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          Menus.open({
            x: r.left, y: r.bottom + 4, width: 220,
            items: db.props.map((p) => ({
              label: p.name, active: p.id === groupProp?.id,
              onClick: () => { viewCfg.groupBy = p.id; dirty(); repaint(); },
            })),
          });
        },
      }),
      U.el("button", {
        class: "btn", html: ICONS.sort + `<span>${measureProp ? "Suma de " + U.escapeHtml(measureProp.name) : "Conteo de registros"}</span>`,
        onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          Menus.open({
            x: r.left, y: r.bottom + 4, width: 220,
            items: [
              { label: "Conteo de registros", active: !measureProp,
                onClick: () => { delete viewCfg.measureProp; dirty(); repaint(); } },
              ...db.props.filter((p) => ["number", "formula", "rollup"].includes(p.type)).map((p) => ({
                label: "Suma de " + p.name, active: p.id === measureProp?.id,
                onClick: () => { viewCfg.measureProp = p.id; dirty(); repaint(); },
              })),
            ],
          });
        },
      })
    );

    return U.el(
      "div", { class: "db-chart" },
      config,
      Charts.bars(data, { height: 240 }),
      U.el("details", { class: "chart-details" },
        U.el("summary", { text: "Ver como tabla" }),
        Charts.table(data, { labelHead: groupProp?.name || "Grupo", valueHead: measureProp ? measureProp.name : "Registros" }))
    );
  }

  /* --------------------- Búsqueda, filtros y ordenación -------------------- */
  let query = "";

  function matchesFilter(row, f) {
    const prop = db.props.find((p) => p.id === f.propId);
    if (!prop) return true;
    const raw = valueOf(row, prop);
    const value = Array.isArray(raw) ? raw.join(", ") : raw === undefined || raw === null ? "" : String(raw);

    // Un filtro puede llevar varios valores: basta con que coincida uno
    if (Array.isArray(f.value)) {
      if (!f.value.length) return true;
      const cells = Array.isArray(raw) ? raw.map(String) : [value];
      const hit = f.value.some((v) =>
        cells.some((c) => c.toLowerCase() === String(v).toLowerCase()));
      return f.op === "is_not" || f.op === "not_contains" ? !hit : hit;
    }

    const needle = String(f.value ?? "");
    switch (f.op) {
      case "contains": return value.toLowerCase().includes(needle.toLowerCase());
      case "not_contains": return !value.toLowerCase().includes(needle.toLowerCase());
      case "is": return value.toLowerCase() === needle.toLowerCase();
      case "is_not": return value.toLowerCase() !== needle.toLowerCase();
      case "empty": return !value;
      case "not_empty": return !!value;
      case "gt": return Number(value) > Number(needle);
      case "lt": return Number(value) < Number(needle);
      default: return true;
    }
  }

  function visibleRows() {
    const v = activeView();
    let rows = db.rows;

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        db.props.some((p) => {
          const val = valueOf(r, p);
          return String(Array.isArray(val) ? val.join(" ") : val ?? "").toLowerCase().includes(q);
        })
      );
    }

    (v.filters || []).forEach((f) => (rows = rows.filter((r) => matchesFilter(r, f))));

    if (v.sorts && v.sorts.length) {
      rows = rows.slice().sort((a, b) => {
        for (const st of v.sorts) {
          const prop = db.props.find((p) => p.id === st.propId);
          if (!prop) continue;
          const x = valueOf(a, prop) ?? "", y = valueOf(b, prop) ?? "";
          let cmp;
          if (typeof x === "number" && typeof y === "number") cmp = x - y;
          else cmp = String(x).localeCompare(String(y), undefined, { numeric: true });
          if (cmp) return cmp * (st.dir === "desc" ? -1 : 1);
        }
        return 0;
      });
    }
    return rows;
  }

  /* ------------------------------ Menús de vista --------------------------- */
  function filterMenu(x, y) {
    const v = activeView();
    v.filters = v.filters || [];
    const items = [{ type: "label", label: "Filtros activos" }];

    v.filters.forEach((f, i) => {
      const prop = db.props.find((p) => p.id === f.propId);
      const shown = Array.isArray(f.value)
        ? (f.value.length ? f.value.join(", ") : "cualquiera")
        : String(f.value ?? "");
      items.push({
        label: `${U.escapeHtml(prop?.name || "?")} ${OPERATORS.find((o) => o.id === f.op)?.name || ""} ${U.escapeHtml(shown)}`,
        icon: ICONS.filter,
        onClick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const hasOptions = prop && ["select", "multi_select"].includes(prop.type);
          Menus.open({
            x: r.right + 4, y: r.top, width: 240,
            items: [
              ...OPERATORS.filter((op) => !hasOptions || ["is", "is_not", "empty", "not_empty"].includes(op.id))
                .map((op) => ({
                  label: op.name, active: op.id === f.op,
                  onClick: () => { f.op = op.id; dirty(); repaint(); },
                })),
              { type: "separator" },
              ...(hasOptions
                ? [
                    { type: "label", label: "Valores (marca varios)" },
                    ...prop.options.map((o) => {
                      const list = Array.isArray(f.value) ? f.value : f.value ? [f.value] : [];
                      return {
                        label: `<span class="tag b-${o.color}">${U.escapeHtml(o.name)}</span>`,
                        active: list.includes(o.name),
                        onClick: () => {
                          const next = list.includes(o.name)
                            ? list.filter((x) => x !== o.name)
                            : [...list, o.name];
                          f.value = next;
                          dirty();
                          repaint();
                          return true;
                        },
                      };
                    }),
                  ]
                : [
                    {
                      type: "custom",
                      node: U.el("input", {
                        class: "menu-input", placeholder: "Valor…",
                        value: Array.isArray(f.value) ? "" : f.value || "",
                        oninput: (ev) => { f.value = ev.target.value; dirty(); },
                        onkeydown: (ev) => { ev.stopPropagation(); if (ev.key === "Enter") { Menus.closeAll(); repaint(); } },
                      }),
                    },
                  ]),
              { type: "separator" },
              { label: "Quitar filtro", icon: ICONS.trash, danger: true,
                onClick: () => { v.filters.splice(i, 1); dirty(); repaint(); } },
            ],
          });
          return true;
        },
      });
    });

    if (!v.filters.length) items.push({ type: "label", label: "Ninguno todavía" });
    items.push({ type: "separator" });
    items.push({
      label: "Añadir filtro", icon: ICONS.plus,
      onClick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        Menus.open({
          x: r.right + 4, y: r.top, width: 220,
          items: db.props.map((p) => ({
            label: p.name,
            onClick: () => {
              const multi = ["select", "multi_select"].includes(p.type);
              v.filters.push({ propId: p.id, op: multi ? "is" : "contains", value: multi ? [] : "" });
              dirty(); repaint();
            },
          })),
        });
        return true;
      },
    });
    Menus.open({ x, y, width: 260, items });
  }

  function sortMenu(x, y) {
    const v = activeView();
    v.sorts = v.sorts || [];
    const items = [{ type: "label", label: "Orden" }];
    v.sorts.forEach((st, i) => {
      const prop = db.props.find((p) => p.id === st.propId);
      items.push({
        label: `${U.escapeHtml(prop?.name || "?")} · ${st.dir === "desc" ? "descendente" : "ascendente"}`,
        icon: ICONS.sort,
        onClick: () => { st.dir = st.dir === "desc" ? "asc" : "desc"; dirty(); repaint(); },
      });
      items.push({ label: "  Quitar", icon: ICONS.trash, danger: true,
        onClick: () => { v.sorts.splice(i, 1); dirty(); repaint(); } });
    });
    if (!v.sorts.length) items.push({ type: "label", label: "Sin ordenar" });
    items.push({ type: "separator" }, {
      label: "Añadir orden", icon: ICONS.plus,
      onClick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        Menus.open({
          x: r.right + 4, y: r.top, width: 220,
          items: db.props.map((p) => ({
            label: p.name,
            onClick: () => { v.sorts.push({ propId: p.id, dir: "asc" }); dirty(); repaint(); },
          })),
        });
        return true;
      },
    });
    Menus.open({ x, y, width: 240, items });
  }

  /* --------------------------------- Pintado ------------------------------- */
  function paint() {
    repaintHook = null;
    host.innerHTML = "";
    const v = activeView();

    const tabs = U.el("div", { class: "db-views" });
    db.views.forEach((view) => {
      const meta = VIEW_TYPES.find((t) => t.id === view.type) || VIEW_TYPES[0];
      tabs.append(
        U.el("button", {
          class: "db-view-tab" + (view.id === v.id ? " is-active" : ""),
          html: meta.icon + `<span>${U.escapeHtml(view.name)}</span>`,
          onclick: () => { setActiveView(view.id); dirty(); repaint(); },
          oncontextmenu: (e) => {
            e.preventDefault();
            Menus.open({
              x: e.clientX, y: e.clientY, width: 200,
              items: [
                { label: "Renombrar vista", icon: ICONS.rename, onClick: () => {
                    const n = prompt("Nombre de la vista:", view.name);
                    if (n) { view.name = n; dirty(); repaint(); }
                  } },
                db.views.length > 1 && {
                  label: "Eliminar vista", icon: ICONS.trash, danger: true,
                  onClick: () => {
                    db.views = db.views.filter((x) => x.id !== view.id);
                    setActiveView(db.views[0].id);
                    dirty(); repaint();
                  },
                },
              ].filter(Boolean),
            });
          },
        })
      );
    });

    tabs.append(
      U.el("button", {
        class: "db-view-tab", html: ICONS.plus,
        title: "Añadir vista",
        onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          Menus.open({
            x: r.left, y: r.bottom + 4, width: 200,
            items: VIEW_TYPES.map((t) => ({
              label: t.name, icon: t.icon,
              onClick: () => {
                const nv = { id: U.uid("v"), name: t.name, type: t.id };
                if (t.id === "board") nv.groupBy = (db.props.find((p) => p.type === "select") || {}).id;
                if (t.id === "calendar") nv.dateProp = (db.props.find((p) => p.type === "date") || {}).id;
                db.views.push(nv);
                setActiveView(nv.id);
                dirty(); repaint();
              },
            })),
          });
        },
      })
    );

    const searchWrap = U.el(
      "div", { class: "db-search" },
      U.el("input", {
        placeholder: "Buscar…", value: query,
        oninput: U.debounce((e) => { query = e.target.value; repaint(); setTimeout(() => {
          const i = host.querySelector(".db-search input"); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length);
        }, 0); }, 200),
      })
    );
    if (query) searchWrap.classList.add("open");

    const header = U.el(
      "div", { class: "db-header" },
      tabs,
      U.el(
        "div", { class: "db-tools" },
        searchWrap,
        U.el("button", {
          class: "btn", html: ICONS.search, title: "Buscar",
          onclick: () => {
            searchWrap.classList.toggle("open");
            searchWrap.querySelector("input")?.focus();
          },
        }),
        U.el("button", {
          class: "btn", html: ICONS.settings +
            ((activeView().hiddenProps?.length) ? `<span>${db.props.length - activeView().hiddenProps.length}</span>` : ""),
          title: "Propiedades visibles",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const v = activeView();
            v.hiddenProps = v.hiddenProps || [];
            Menus.open({
              x: r.left - 120, y: r.bottom + 4, width: 250,
              items: [
                { type: "label", label: "Mostrar en esta vista" },
                ...db.props.map((p) => ({
                  label: p.name,
                  icon: (PROP_TYPES.find((t) => t.id === p.type) || { icon: ICONS.text }).icon,
                  active: p.type === "title" || !v.hiddenProps.includes(p.id),
                  sub: p.type === "title" ? "siempre visible" : null,
                  onClick: () => {
                    if (p.type === "title") return true;
                    v.hiddenProps = v.hiddenProps.includes(p.id)
                      ? v.hiddenProps.filter((x) => x !== p.id)
                      : [...v.hiddenProps, p.id];
                    dirty();
                    repaint();
                    return true;
                  },
                })),
                { type: "separator" },
                { label: "Mostrar todas", icon: ICONS.check,
                  onClick: () => { v.hiddenProps = []; dirty(); repaint(); } },
              ],
            });
          },
        }),
        U.el("button", {
          class: "btn", html: ICONS.filter + (activeView().filters?.length ? `<span>${activeView().filters.length}</span>` : ""),
          title: "Filtrar",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            filterMenu(r.left - 100, r.bottom + 4);
          },
        }),
        U.el("button", {
          class: "btn", html: ICONS.sort + (activeView().sorts?.length ? `<span>${activeView().sorts.length}</span>` : ""),
          title: "Ordenar",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            sortMenu(r.left - 100, r.bottom + 4);
          },
        }),
        U.el("button", {
          class: "btn", html: ICONS.routines, title: "Automatizaciones",
          onclick: automationsModal,
        }),
        U.el("button", {
          class: "btn", html: ICONS.dots, title: "Opciones",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.left - 120, y: r.bottom + 4, width: 220,
              items: [
                { label: "Renombrar base de datos", icon: ICONS.rename, onClick: () => {
                    const n = prompt("Nombre:", db.name);
                    if (n) { db.name = n; dirty(); repaint(); }
                  } },
                { label: "Añadir propiedad", icon: ICONS.plus, onClick: addProp },
                { label: "Automatizaciones", icon: ICONS.routines, onClick: automationsModal },
                { label: "Plantillas de fila", icon: ICONS.template, onClick: templatesModal },
                { type: "separator" },
                { label: "Exportar CSV", icon: ICONS.import, onClick: exportCsv },
              ],
            });
          },
        }),
        U.el("button", { class: "btn btn-primary", text: "Nueva", onclick: () => addRow() }),
        U.el("button", {
          class: "btn btn-primary btn-split", html: ICONS.chevronDown, title: "Nueva desde plantilla",
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.right - 220, y: r.bottom + 4, width: 220,
              items: [
                { type: "label", label: "Plantillas de fila" },
                ...(db.templates || []).map((t) => ({
                  label: t.name, icon: ICONS.template,
                  sub: t.blocks?.length ? `${t.blocks.length} bloques` : "solo propiedades",
                  onClick: () => { addRowFromTemplate(t); },
                })),
                ...(db.templates && db.templates.length ? [] : [{ type: "label", label: "Aún no hay plantillas" }]),
                { type: "separator" },
                { label: "Gestionar plantillas", icon: ICONS.settings, onClick: templatesModal },
              ],
            });
          },
        })
      )
    );

    let body;
    if (v.type === "chart") body = renderChart(v);
    else if (v.type === "board") body = renderBoard(v);
    else if (v.type === "gallery") body = renderGallery();
    else if (v.type === "list") body = renderList();
    else if (v.type === "calendar") body = renderCalendar(v);
    else body = renderTable();

    host.append(header, U.el("div", { class: "db-body" }, body));
  }

  function exportCsv() {
    const head = db.props.map((p) => `"${p.name}"`).join(",");
    const lines = db.rows.map((r) =>
      db.props
        .map((p) => {
          const v = r.cells[p.id];
          return `"${String(Array.isArray(v) ? v.join("; ") : v ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = U.el("a", { href: URL.createObjectURL(blob), download: `${db.name || "base"}.csv` });
    a.click();
    U.toast("CSV exportado");
  }

  /** Punto de entrada: devuelve el nodo de la base de datos del bloque dado. */
  function render(targetPage, targetBlock, opts = {}) {
    page = targetPage;
    block = targetBlock;
    linked = !!opts.linked;
    if (!page.db) {
      page.db = Templates.db(
        "Nueva base de datos",
        [Templates.prop("Nombre", "title"),
         Templates.prop("Estado", "select", ["Por hacer", "En progreso", "Hecho"]),
         Templates.prop("Fecha", "date")],
        [["Primer registro", "Por hacer", U.today()], ["Segundo registro", "En progreso", ""]]
      );
      Store.save();
    }
    db = page.db;
    query = "";
    host = U.el("div", { class: "db" });
    paint();
    return host;
  }

  return { render, propertyPanel, PROP_TYPES, VIEW_TYPES, CALCS };
})();
