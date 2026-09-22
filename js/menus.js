/* ==========================================================================
   Menús contextuales, menú "/" y barra flotante de formato
   ========================================================================== */
const Menus = (() => {
  let current = null;

  function closeAll() {
    document.querySelectorAll(".menu").forEach((m) => m.remove());
    current = null;
  }

  /**
   * Abre un menú flotante.
   * items: [{label, icon, hint, sub, onClick, danger, type:'separator'|'label'|'custom'}]
   */
  function open({ x, y, items, width, anchor, onClose, searchable = false, placeholder = "Buscar…" }) {
    closeAll();
    const menu = U.el("div", { class: "menu" });
    if (width) menu.style.minWidth = width + "px";

    let input = null;
    const listWrap = U.el("div");

    const render = (q = "") => {
      listWrap.innerHTML = "";
      const query = q.trim().toLowerCase();
      const visible = items.filter(
        (it) => !query || it.type === "separator" || (it.label || "").toLowerCase().includes(query)
      );
      visible.forEach((it) => {
        if (it.type === "separator") return listWrap.append(U.el("div", { class: "menu-sep" }));
        if (it.type === "label")
          return listWrap.append(U.el("div", { class: "menu-label", text: it.label }));
        if (it.type === "custom") return listWrap.append(it.node);

        const btn = U.el(
          "button",
          {
            class: "menu-item" + (it.active ? " is-active" : ""),
            onclick: (e) => {
              e.stopPropagation();
              const keep = it.onClick?.(e);
              if (!keep) closeAll();
            },
          },
          it.icon ? U.el("span", { class: "menu-icon", html: it.icon }) : null,
          it.swatch
            ? U.el("span", { class: "menu-swatch " + it.swatch.class, text: it.swatch.text || "" })
            : null,
          U.el(
            "span",
            { class: "menu-item-body" },
            U.el("span", { html: it.label }),
            it.sub ? U.el("span", { class: "menu-sub", text: it.sub }) : null
          ),
          it.hint ? U.el("span", { class: "menu-hint", text: it.hint }) : null,
          it.active ? U.el("span", { class: "menu-hint", html: ICONS.check }) : null
        );
        if (it.danger) btn.style.color = "var(--c-red)";
        listWrap.append(btn);
      });
      if (!listWrap.children.length)
        listWrap.append(U.el("div", { class: "menu-label", text: "Sin resultados" }));
    };

    if (searchable) {
      input = U.el("input", {
        class: "menu-input", placeholder,
        oninput: (e) => render(e.target.value),
        onkeydown: (e) => {
          if (e.key === "Escape") closeAll();
          if (e.key === "Enter") listWrap.querySelector(".menu-item")?.click();
          e.stopPropagation();
        },
      });
      menu.append(input);
    }
    render();
    menu.append(listWrap);
    document.body.append(menu);

    // Posicionamiento con corrección de bordes
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      x = r.left;
      y = r.bottom + 4;
    }
    const rect = menu.getBoundingClientRect();
    menu.style.left = U.clamp(x, 8, window.innerWidth - rect.width - 8) + "px";
    menu.style.top = U.clamp(y, 8, window.innerHeight - rect.height - 8) + "px";
    input?.focus();

    current = { menu, onClose };
    setTimeout(() => {
      const away = (e) => {
        if (!menu.contains(e.target)) {
          closeAll();
          onClose?.();
          document.removeEventListener("mousedown", away, true);
        }
      };
      document.addEventListener("mousedown", away, true);
    }, 0);
    return menu;
  }

  /* --------------------------- Selector de color -------------------------- */
  function colorMenu({ x, y, onPick, current: cur }) {
    const items = [{ type: "label", label: "Color del texto" }];
    U.NOTION_COLORS.forEach((c) =>
      items.push({
        label: U.COLOR_LABELS[c],
        swatch: { class: "c-" + c, text: "A" },
        active: cur === "text:" + c,
        onClick: () => onPick("text", c),
      })
    );
    items.push({ type: "separator" }, { type: "label", label: "Fondo" });
    U.NOTION_COLORS.forEach((c) =>
      items.push({
        label: "Fondo " + U.COLOR_LABELS[c].toLowerCase(),
        swatch: { class: "b-" + c, text: "A" },
        active: cur === "bg:" + c,
        onClick: () => onPick("bg", c),
      })
    );
    return open({ x, y, items, width: 220 });
  }

  /* ------------------------------ Selector emoji -------------------------- */
  const EMOJI = ("😀 😅 🤩 🫠 🤔 🙌 👏 👋 💪 🧠 👀 🔥 ✨ 🌟 💡 📌 📎 📝 🗒️ 📚 📖 📈 📉 📊 " +
    "🗂️ 🗓️ 📅 ⏰ ⚡ 🚀 🛠️ ⚙️ 🧩 🔧 🔒 🔑 🎯 🏆 🥇 ✅ ☑️ ❌ ⚠️ ❗ ❓ 💬 📣 🔔 🎨 🖌️ 🎬 🎧 " +
    "🎵 🍀 🌱 🌍 🌤️ 🌙 ⭐ 🔥 🐞 🤝 🏢 🏠 🧭 💼 💰 🧾 🛒 🍎 ☕ 🍕 🐳 🦊 🐼 🦄 🎉 🎁 ❤️ 💜 💙 " +
    "💚 🧡 🤍 🖤").split(" ");

  function emojiMenu({ x, y, onPick, onRemove, onUpload, value }) {
    // El selector completo (emoji, iconos de línea y subida) vive en IconPicker
    return IconPicker.open({ x, y, onPick, onRemove, onUpload, value });
  }

  /* ------------------------ Barra flotante de formato --------------------- */
  let formatBar = null;

  function hideFormatBar() {
    formatBar?.remove();
    formatBar = null;
  }

  function showFormatBar(rect, target) {
    hideFormatBar();
    const cmd = (name) => () => {
      document.execCommand(name);
      target?.dispatchEvent(new Event("input"));
      syncStates();
    };
    const mk = (label, title, action, name) =>
      U.el("button", { title, onmousedown: (e) => e.preventDefault(), onclick: action, dataset: { cmd: name || "" }, html: label });

    formatBar = U.el(
      "div",
      { class: "format-bar" },
      mk("<strong>B</strong>", "Negrita (⌘B)", cmd("bold"), "bold"),
      mk("<em>i</em>", "Cursiva (⌘I)", cmd("italic"), "italic"),
      mk("<u>U</u>", "Subrayado (⌘U)", cmd("underline"), "underline"),
      mk("<s>S</s>", "Tachado", cmd("strikeThrough"), "strikeThrough"),
      mk(ICONS.code, "Código en línea", () => {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        const codeEl = document.createElement("code");
        try {
          range.surroundContents(codeEl);
        } catch {
          codeEl.textContent = sel.toString();
          range.deleteContents();
          range.insertNode(codeEl);
        }
        target?.dispatchEvent(new Event("input"));
      }),
      mk(ICONS.link, "Enlace (⌘K)", () => {
        const url = prompt("URL del enlace:");
        if (url) document.execCommand("createLink", false, url);
        target?.dispatchEvent(new Event("input"));
      }),
      U.el("span", { class: "sep" }),
      mk(ICONS.palette, "Color", (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        colorMenu({
          x: r.left, y: r.bottom + 6,
          onPick: (kind, color) => {
            const sel = window.getSelection();
            if (!sel.rangeCount || sel.isCollapsed) return;
            const span = document.createElement("span");
            span.className = (kind === "text" ? "c-" : "b-") + color;
            try {
              sel.getRangeAt(0).surroundContents(span);
            } catch { /* selección compleja: se ignora */ }
            target?.dispatchEvent(new Event("input"));
          },
        });
      })
    );

    function syncStates() {
      formatBar?.querySelectorAll("[data-cmd]").forEach((b) => {
        const name = b.dataset.cmd;
        if (!name) return;
        try {
          b.classList.toggle("is-on", document.queryCommandState(name));
        } catch { /* comando no soportado */ }
      });
    }

    document.body.append(formatBar);
    const w = formatBar.offsetWidth;
    formatBar.style.left = U.clamp(rect.left + rect.width / 2 - w / 2, 8, window.innerWidth - w - 8) + "px";
    formatBar.style.top = Math.max(8, rect.top - 42) + "px";
    syncStates();
  }

  return { open, closeAll, colorMenu, emojiMenu, showFormatBar, hideFormatBar, EMOJI };
})();
