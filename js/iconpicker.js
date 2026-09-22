/* ==========================================================================
   Selector de iconos al estilo de Notion: pestañas Emoji · Íconos · Subir,
   buscador, color para los iconos de línea, aleatorio y recientes.
   ========================================================================== */
const IconPicker = (() => {
  let panel = null;
  let away = null;

  function close() {
    panel?.remove();
    panel = null;
    if (away) { document.removeEventListener("mousedown", away, true); away = null; }
  }

  function remember(value) {
    const list = (Store.state.recentIcons || []).filter((v) => v !== value);
    Store.state.recentIcons = [value, ...list].slice(0, 24);
    Store.save();
  }

  /** Abre el selector anclado a (x, y). */
  function open({ x, y, onPick, onRemove, onUpload, value = "" }) {
    close();
    Menus.closeAll();

    const state = {
      tab: "emoji",
      query: "",
      cat: "frecuentes",
      color: IconSet.parse(value)?.color || "default",
    };

    panel = U.el("div", { class: "icon-picker", tabindex: "-1" });
    const tabsRow = U.el("div", { class: "ip-tabs" });
    const toolsRow = U.el("div", { class: "ip-tools" });
    const railRow = U.el("div", { class: "ip-rail" });
    const bodyRow = U.el("div", { class: "ip-body" });
    panel.append(tabsRow, toolsRow, railRow, bodyRow);

    const pick = (v) => { remember(v); onPick(v); close(); };

    /* --------------------------- Pestañas y barra -------------------------- */
    function paintTabs() {
      tabsRow.innerHTML = "";
      [["emoji", "Emoji"], ["line", "Íconos"], ["upload", "Subir"]].forEach(([id, label]) => {
        tabsRow.append(U.el("button", {
          class: "ip-tab" + (state.tab === id ? " is-active" : ""),
          text: label,
          onclick: () => {
            if (id === "upload") { close(); onUpload?.(); return; }
            state.tab = id;
            state.cat = id === "emoji" ? "frecuentes" : "trabajo";
            state.query = "";
            paintAll();
          },
        }));
      });
      if (onRemove) {
        tabsRow.append(U.el("button", {
          class: "ip-remove", text: "Eliminar",
          onclick: () => { onRemove(); close(); },
        }));
      }
    }

    function paintTools() {
      toolsRow.innerHTML = "";
      const input = U.el("input", {
        class: "ip-search", type: "text", placeholder: "Filtrar…", value: state.query,
        oninput: (e) => { state.query = e.target.value.trim().toLowerCase(); paintRail(); paintBody(); },
      });
      toolsRow.append(input);
      toolsRow.append(U.el("button", {
        class: "ip-icon-btn", title: "Aleatorio", html: ICONS.shuffle || "🎲",
        onclick: () => {
          if (state.tab === "emoji") return pick(IconSet.randomEmoji());
          const all = IconSet.LINE_INDEX;
          pick("ico:" + all[Math.floor(Math.random() * all.length)].name + ":" + state.color);
        },
      }));
      if (state.tab === "line") {
        toolsRow.append(U.el("button", {
          class: "ip-color c-" + state.color, title: "Color del icono",
          html: '<i class="ip-dot"></i>',
          onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.left - 120, y: r.bottom + 4, width: 200,
              items: IconSet.COLORS.map(([id, name]) => ({
                label: name, active: state.color === id,
                icon: `<span class="ip-swatch c-${id}"></span>`,
                onClick: () => { state.color = id; paintTools(); paintBody(); return true; },
              })),
            });
          },
        }));
      }
      setTimeout(() => input.focus(), 30);
    }

    /* -------------------------- Carril de categorías ----------------------- */
    function paintRail() {
      railRow.innerHTML = "";
      if (state.query) { railRow.classList.add("is-hidden"); return; }
      railRow.classList.remove("is-hidden");
      const cats = state.tab === "emoji" ? IconSet.EMOJI_CATS : IconSet.LINE_CATS;
      cats.forEach((c) => {
        railRow.append(U.el("button", {
          class: "ip-cat" + (state.cat === c.id ? " is-active" : ""),
          title: c.name,
          html: state.tab === "emoji" ? c.icon : IconSet.lineSvg(Object.keys(c.icons)[0], 16),
          onclick: () => { state.cat = c.id; paintRail(); scrollToCat(c.id); },
        }));
      });
    }

    /* -------------------------------- Rejilla ------------------------------ */
    function grid(title, nodes, id) {
      if (!nodes.length) return null;
      return U.el("div", { class: "ip-group", dataset: id ? { cat: id } : {} },
        U.el("div", { class: "ip-group-title", text: title }),
        U.el("div", { class: "ip-grid" }, ...nodes));
    }

    /** Lleva la lista hasta la sección elegida en vez de ocultar el resto. */
    function scrollToCat(id) {
      const sec = bodyRow.querySelector(`.ip-group[data-cat="${id}"]`);
      if (sec) bodyRow.scrollTo({ top: sec.offsetTop - bodyRow.offsetTop - 4, behavior: "smooth" });
    }

    function emojiBtn(item) {
      return U.el("button", {
        class: "ip-cell", text: item.char, title: item.words || item.char,
        onclick: () => pick(item.char),
      });
    }

    function lineBtn(def) {
      return U.el("button", {
        class: "ip-cell is-line c-" + state.color,
        html: IconSet.lineSvg(def.name, 20), title: def.name,
        onclick: () => pick(`ico:${def.name}:${state.color}`),
      });
    }

    function paintBody() {
      bodyRow.innerHTML = "";
      const recents = (Store.state.recentIcons || []).slice(0, 12);

      if (state.tab === "emoji") {
        if (state.query) {
          const hits = IconSet.ALL_EMOJI.filter((i) => i.words.includes(state.query)).slice(0, 180);
          bodyRow.append(grid(`${hits.length} resultados`, hits.map(emojiBtn)) ||
            U.el("div", { class: "ip-empty", text: "Sin resultados" }));
          return;
        }
        if (recents.length) {
          bodyRow.append(grid("Recientes", recents.map((v) => {
            const line = IconSet.parse(v);
            if (line) return lineBtn({ name: line.name });
            if (v.startsWith("asset:") || /^https?:\/\//.test(v)) {
              const b = U.el("button", { class: "ip-cell", onclick: () => pick(v) });
              b.append(U.iconNode(v, 20));
              return b;
            }
            return emojiBtn({ char: v, words: v });
          }), "recientes"));
        }
        // Todas las categorías seguidas: el carril sólo desplaza la lista
        IconSet.EMOJI_CATS.forEach((c) => bodyRow.append(grid(c.name, c.items.map(emojiBtn), c.id)));
        scrollToCat(state.cat);
        return;
      }

      // Pestaña de iconos de línea
      if (state.query) {
        const hits = IconSet.LINE_INDEX.filter((i) => i.name.includes(state.query));
        bodyRow.append(grid(`${hits.length} resultados`, hits.map(lineBtn)) ||
          U.el("div", { class: "ip-empty", text: "Sin resultados" }));
        return;
      }
      IconSet.LINE_CATS.forEach((c) =>
        bodyRow.append(grid(c.name, Object.keys(c.icons).map((name) => lineBtn({ name })), c.id)));
      scrollToCat(state.cat);
    }

    function paintAll() { paintTabs(); paintTools(); paintRail(); paintBody(); }
    paintAll();

    document.body.append(panel);
    const r = panel.getBoundingClientRect();
    panel.style.left = U.clamp(x, 8, window.innerWidth - r.width - 8) + "px";
    panel.style.top = U.clamp(y, 8, window.innerHeight - r.height - 8) + "px";

    away = (e) => {
      if (panel && !panel.contains(e.target) && !e.target.closest(".menu")) close();
    };
    setTimeout(() => document.addEventListener("mousedown", away, true), 0);
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    return { close };
  }

  return { open, close };
})();
