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
  ];

  const VIEW_TYPES = [
    { id: "table", name: "Tabla", icon: ICONS.table },
    { id: "board", name: "Tablero", icon: ICONS.board },
    { id: "gallery", name: "Galería", icon: ICONS.gallery },
    { id: "list", name: "Lista", icon: ICONS.list },
    { id: "calendar", name: "Calendario", icon: ICONS.calendar },
  ];

  let page = null, db = null, block = null, host = null;
  const dirty = () => { Store.updatePage(page.id, {}); };
  const repaint = () => { paint(); };

  const titleProp = () => db.props.find((p) => p.type === "title") || db.props[0];
  const activeView = () => db.views.find((v) => v.id === db.activeView) || db.views[0];

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
  function openRow(row) {
    const tp = titleProp();
    if (!row.pageId || !Store.getPage(row.pageId)) {
      const sub = Store.createPage({
        title: row.cells[tp.id] || "Sin título",
        icon: "📄",
        parentId: page.id,
        blocks: [Store.makeBlock("paragraph", { text: "" })],
      });
      row.pageId = sub.id;
      dirty();
    } else {
      Store.updatePage(row.pageId, { title: row.cells[tp.id] || "Sin título" });
    }
    Store.open(row.pageId);
  }

  function addRow(preset = {}) {
    Store.snapshot();
    db.rows.push({ id: U.uid("r"), cells: { ...preset }, pageId: null });
    dirty();
    repaint();
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
      if (prop.type === "title" && row.pageId) Store.updatePage(row.pageId, { title: v });
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

  /* -------------------------------- Tabla --------------------------------- */
  function renderTable() {
    const table = U.el("table", { class: "db-table" });
    const thead = U.el("thead");
    const hrow = U.el("tr");

    db.props.forEach((prop) => {
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
      db.props.forEach((prop) => tr.append(U.el("td", {}, renderCell(row, prop))));
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
                  { label: "Abrir como página", icon: ICONS.expand, onClick: () => openRow(row) },
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

    table.append(thead, tbody);
    return U.el(
      "div", {},
      table,
      U.el("button", { class: "db-add-row", html: ICONS.plus + "<span>Nueva</span>", onclick: () => addRow() }),
      U.el("div", { class: "db-count", text: `${db.rows.length} registro${db.rows.length === 1 ? "" : "s"}` })
    );
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
            ...db.props
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
          U.el("div", {
            class: "gallery-cover",
            text: cover ? "" : (Store.getPage(row.pageId)?.icon || "📄"),
            style: cover ? { backgroundImage: `url(${row.cells[cover.id]})` } : {},
          }),
          U.el(
            "div", { class: "gallery-body" },
            U.el("div", { class: "gallery-title", text: row.cells[tp.id] || "Sin título" }),
            U.el(
              "div", { class: "board-card-meta" },
              ...db.props
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
          U.el("span", { text: Store.getPage(row.pageId)?.icon || "📄" }),
          U.el("span", { class: "list-title", text: row.cells[tp.id] || "Sin título" }),
          U.el(
            "span", { class: "list-meta" },
            ...db.props
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

  /* ------------------------------- Filtro/búsqueda ------------------------- */
  let query = "";
  function visibleRows() {
    if (!query.trim()) return db.rows;
    const q = query.toLowerCase();
    return db.rows.filter((r) =>
      Object.values(r.cells).some((v) =>
        String(Array.isArray(v) ? v.join(" ") : v).toLowerCase().includes(q)
      )
    );
  }

  /* --------------------------------- Pintado ------------------------------- */
  function paint() {
    host.innerHTML = "";
    const v = activeView();

    const tabs = U.el("div", { class: "db-views" });
    db.views.forEach((view) => {
      const meta = VIEW_TYPES.find((t) => t.id === view.type) || VIEW_TYPES[0];
      tabs.append(
        U.el("button", {
          class: "db-view-tab" + (view.id === v.id ? " is-active" : ""),
          html: meta.icon + `<span>${U.escapeHtml(view.name)}</span>`,
          onclick: () => { db.activeView = view.id; dirty(); repaint(); },
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
                    db.activeView = db.views[0].id;
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
                db.activeView = nv.id;
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
                { label: "Exportar CSV", icon: ICONS.import, onClick: exportCsv },
              ],
            });
          },
        }),
        U.el("button", { class: "btn btn-primary", text: "Nueva", onclick: () => addRow() })
      )
    );

    let body;
    if (v.type === "board") body = renderBoard(v);
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
  function render(targetPage, targetBlock) {
    page = targetPage;
    block = targetBlock;
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

  return { render, PROP_TYPES, VIEW_TYPES };
})();
