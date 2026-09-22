/* ==========================================================================
   Editor de bloques
   ========================================================================== */
const Editor = (() => {
  /* --------------------------- Catálogo de bloques ------------------------ */
  const TYPES = [
    { type: "paragraph", name: "Texto", icon: ICONS.text, desc: "Empieza a escribir en texto plano.", group: "Básicos", md: "" },
    { type: "heading1", name: "Encabezado 1", icon: ICONS.h1, desc: "Título de sección grande.", group: "Básicos", md: "#" },
    { type: "heading2", name: "Encabezado 2", icon: ICONS.h2, desc: "Título de sección mediano.", group: "Básicos", md: "##" },
    { type: "heading3", name: "Encabezado 3", icon: ICONS.h3, desc: "Título de sección pequeño.", group: "Básicos", md: "###" },
    { type: "bulleted", name: "Lista con viñetas", icon: ICONS.bullet, desc: "Una lista simple.", group: "Básicos", md: "-" },
    { type: "numbered", name: "Lista numerada", icon: ICONS.numbered, desc: "Una lista ordenada.", group: "Básicos", md: "1." },
    { type: "todo", name: "Lista de tareas", icon: ICONS.todo, desc: "Rastrea tareas con casillas.", group: "Básicos", md: "[]" },
    { type: "toggle", name: "Lista desplegable", icon: ICONS.toggle, desc: "Oculta contenido dentro.", group: "Básicos", md: ">" },
    { type: "quote", name: "Cita", icon: ICONS.quote, desc: "Captura una cita.", group: "Básicos", md: '"' },
    { type: "callout", name: "Destacado", icon: ICONS.callout, desc: "Resalta una idea.", group: "Básicos" },
    { type: "divider", name: "Divisor", icon: ICONS.divider, desc: "Separa visualmente bloques.", group: "Básicos", md: "---" },
    { type: "code", name: "Código", icon: ICONS.code, desc: "Fragmento de código.", group: "Medios", md: "```" },
    { type: "image", name: "Imagen", icon: ICONS.image, desc: "Sube o enlaza una imagen.", group: "Medios" },
    { type: "bookmark", name: "Marcador web", icon: ICONS.bookmark, desc: "Guarda un enlace con vista previa.", group: "Medios" },
    { type: "html", name: "Bloque HTML", icon: ICONS.html, desc: "Visuales interactivos en un iframe aislado.", group: "Medios" },
    { type: "table-db", name: "Base de datos", icon: ICONS.table, desc: "Tabla, tablero, calendario y más.", group: "Bases de datos" },
    { type: "subpage", name: "Subpágina", icon: ICONS.doc, desc: "Crea una página anidada.", group: "Bases de datos" },
  ];

  const TURNABLE = TYPES.filter((t) =>
    ["paragraph", "heading1", "heading2", "heading3", "bulleted", "numbered", "todo", "toggle", "quote", "callout", "code"].includes(t.type)
  );

  const PLACEHOLDERS = {
    paragraph: "Escribe algo o pulsa '/' para comandos",
    heading1: "Encabezado 1",
    heading2: "Encabezado 2",
    heading3: "Encabezado 3",
    bulleted: "Elemento de lista",
    numbered: "Elemento de lista",
    todo: "Tarea pendiente",
    toggle: "Desplegable",
    quote: "Cita",
    callout: "Escribe algo destacado…",
    code: "Escribe tu código…",
  };

  let page = null;
  let root = null;

  /* ------------------------------ Utilidades ------------------------------ */
  const blockIndex = (id) => page.blocks.findIndex((b) => b.id === id);
  const blockById = (id) => page.blocks.find((b) => b.id === id);
  const touch = () => Store.updatePage(page.id, {});

  function focusBlock(id, atEnd = true) {
    // Enfoca de inmediato (el DOM ya está pintado) para no perder pulsaciones
    // rápidas; si el nodo aún no existe, se reintenta en el siguiente frame.
    const node = root.querySelector(`[data-id="${id}"] .block-content`);
    if (node) {
      U.placeCaret(node, atEnd);
      return;
    }
    requestAnimationFrame(() => {
      const late = root.querySelector(`[data-id="${id}"] .block-content`);
      if (late) U.placeCaret(late, atEnd);
    });
  }

  function insertBlock(afterId, block, focus = true) {
    const i = afterId ? blockIndex(afterId) + 1 : page.blocks.length;
    page.blocks.splice(i, 0, block);
    touch();
    render();
    if (focus) focusBlock(block.id, false);
    return block;
  }

  function removeBlock(id) {
    const i = blockIndex(id);
    if (i < 0) return;
    page.blocks.splice(i, 1);
    if (!page.blocks.length) page.blocks.push(Store.makeBlock());
    touch();
    render();
  }

  function setType(id, type) {
    const b = blockById(id);
    if (!b) return;
    Store.snapshot();
    b.type = type;
    if (type === "callout" && !b.emoji) b.emoji = "💡";
    if (type === "callout" && b.color === "default") b.color = "gray";
    if (type === "code" && !b.lang) b.lang = "javascript";
    if (type === "html" && !b.src) {
      b.src = "<!doctype html>\n<h2 style=\"font-family:sans-serif\">¡Hola desde un bloque HTML!</h2>";
      b.height = 200;
    }
    if (type === "subpage" && !b.pageId) {
      const child = Store.createPage({ title: "Nueva página", parentId: page.id, icon: "📄" });
      b.pageId = child.id;
    }
    touch();
    render();
    if (!["divider", "image", "html", "table-db", "subpage", "bookmark"].includes(type))
      focusBlock(id);
  }

  /* ------------------------------ Menú "/" -------------------------------- */
  const Slash = (() => {
    let node = null, items = [], active = 0, ctx = null;

    const close = () => { node?.remove(); node = null; ctx = null; };
    const isOpen = () => !!node;

    function paint(query = "") {
      const q = query.toLowerCase();
      items = TYPES.filter(
        (t) => !q || t.name.toLowerCase().includes(q) || t.type.includes(q)
      );
      active = 0;
      node.innerHTML = "";
      if (!items.length) {
        node.append(U.el("div", { class: "menu-label", text: "Sin resultados" }));
        return;
      }
      let group = null;
      items.forEach((t, i) => {
        if (t.group !== group) {
          group = t.group;
          node.append(U.el("div", { class: "menu-label", text: group }));
        }
        node.append(
          U.el(
            "button",
            {
              class: "menu-item" + (i === active ? " is-active" : ""),
              dataset: { i },
              onmouseenter: () => setActive(i),
              onmousedown: (e) => e.preventDefault(),
              onclick: () => choose(i),
            },
            U.el("span", { class: "menu-thumb", html: t.icon }),
            U.el(
              "span", { class: "menu-item-body" },
              U.el("span", { text: t.name }),
              U.el("span", { class: "menu-sub", text: t.desc })
            )
          )
        );
      });
    }

    function setActive(i) {
      active = i;
      node.querySelectorAll(".menu-item").forEach((b, k) =>
        b.classList.toggle("is-active", Number(b.dataset.i) === active)
      );
      node.querySelector(".menu-item.is-active")?.scrollIntoView({ block: "nearest" });
    }

    function choose(i) {
      const t = items[i];
      if (!t || !ctx) return;
      const { blockId, contentEl, slashAt } = ctx;
      const b = blockById(blockId);
      if (b) {
        const text = contentEl.textContent || "";
        b.text = U.sanitizeInline(text.slice(0, slashAt));
      }
      close();
      setType(blockId, t.type);
    }

    function openFor(blockId, contentEl, slashAt) {
      close();
      ctx = { blockId, contentEl, slashAt };
      node = U.el("div", { class: "menu" });
      node.style.width = "320px";
      document.body.append(node);
      paint("");
      const r = contentEl.getBoundingClientRect();
      node.style.left = U.clamp(r.left, 8, window.innerWidth - 330) + "px";
      const below = window.innerHeight - r.bottom;
      node.style.maxHeight = "340px";
      node.style.top = (below > 360 ? r.bottom + 6 : Math.max(8, r.top - 346)) + "px";
    }

    function handleKey(e) {
      if (!isOpen()) return false;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % items.length); return true; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + items.length) % items.length); return true; }
      if (e.key === "Enter") { e.preventDefault(); choose(active); return true; }
      if (e.key === "Escape") { e.preventDefault(); close(); return true; }
      return false;
    }

    return { openFor, close, isOpen, paint, handleKey, get ctx() { return ctx; } };
  })();

  /* -------------------------- Atajos de Markdown -------------------------- */
  function applyMarkdown(block, contentEl) {
    const text = contentEl.textContent || "";
    const map = [
      [/^# $/, "heading1"], [/^## $/, "heading2"], [/^### $/, "heading3"],
      [/^[-*+] $/, "bulleted"], [/^1\. $/, "numbered"],
      [/^\[\] $/, "todo"], [/^\[x\] $/i, "todo"],
      [/^> $/, "toggle"], [/^" $/, "quote"], [/^\| $/, "quote"],
      [/^```$/, "code"], [/^--- $/, "divider"],
    ];
    for (const [re, type] of map) {
      if (re.test(text)) {
        block.text = "";
        contentEl.innerHTML = "";
        if (type === "todo" && /^\[x\] $/i.test(text)) block.checked = true;
        setType(block.id, type);
        return true;
      }
    }
    return false;
  }

  /* ----------------------------- Menú de bloque --------------------------- */
  function blockMenu(block, x, y) {
    Menus.open({
      x, y, width: 240,
      items: [
        { label: "Eliminar", icon: ICONS.trash, hint: "Del", danger: true,
          onClick: () => { Store.snapshot(); removeBlock(block.id); } },
        { label: "Duplicar", icon: ICONS.duplicate, hint: "⌘D", onClick: () => {
            Store.snapshot();
            const copy = JSON.parse(JSON.stringify(block));
            copy.id = U.uid("b");
            insertBlock(block.id, copy, false);
          } },
        { label: "Convertir en", icon: ICONS.turnInto, onClick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.open({
              x: r.right + 4, y: r.top, width: 220,
              items: TURNABLE.map((t) => ({
                label: t.name, icon: t.icon, active: t.type === block.type,
                onClick: () => setType(block.id, t.type),
              })),
            });
            return true;
          } },
        { label: "Color", icon: ICONS.palette, onClick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            Menus.colorMenu({
              x: r.right + 4, y: r.top, current: block.bg ? "bg:" + block.bg : "text:" + block.color,
              onPick: (kind, color) => {
                Store.snapshot();
                if (kind === "text") block.color = color;
                else block.bg = color === "default" ? "" : color;
                touch(); render();
              },
            });
            return true;
          } },
        { type: "separator" },
        { label: "Copiar enlace al bloque", icon: ICONS.link, onClick: () => {
            navigator.clipboard?.writeText(location.origin + location.pathname + "#" + page.id + ":" + block.id);
            U.toast("Enlace copiado");
          } },
        { label: "Mover arriba", icon: ICONS.sort, onClick: () => moveBlock(block.id, -1) },
        { label: "Mover abajo", icon: ICONS.sort, onClick: () => moveBlock(block.id, 1) },
      ],
    });
  }

  function moveBlock(id, delta) {
    const i = blockIndex(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= page.blocks.length) return;
    Store.snapshot();
    const [b] = page.blocks.splice(i, 1);
    page.blocks.splice(j, 0, b);
    touch();
    render();
  }

  /* -------------------------------- Arrastre ------------------------------ */
  let dragId = null;

  function dragHandlers(wrap, block) {
    wrap.addEventListener("dragover", (e) => {
      if (!dragId || dragId === block.id) return;
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      wrap.classList.toggle("is-dragover-bottom", after);
      wrap.classList.toggle("is-dragover-top", !after);
    });
    wrap.addEventListener("dragleave", () =>
      wrap.classList.remove("is-dragover-top", "is-dragover-bottom")
    );
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      const after = wrap.classList.contains("is-dragover-bottom");
      wrap.classList.remove("is-dragover-top", "is-dragover-bottom");
      if (!dragId || dragId === block.id) return;
      Store.snapshot();
      const from = blockIndex(dragId);
      const [moved] = page.blocks.splice(from, 1);
      let to = blockIndex(block.id) + (after ? 1 : 0);
      page.blocks.splice(to, 0, moved);
      dragId = null;
      touch();
      render();
    });
  }

  /* ------------------------- Render de un bloque -------------------------- */
  function renderBlock(block, index) {
    // El color de un destacado tiñe su caja, no el texto del bloque
    const textColor = block.type === "callout" ? "default" : block.color || "default";
    const wrap = U.el("div", {
      class: `block block-${block.type} c-${textColor}`,
      dataset: { id: block.id, indent: String(block.indent || 0), checked: String(!!block.checked) },
    });
    if (block.bg) wrap.classList.add("b-" + block.bg);

    /* Gutter: añadir + arrastrar */
    const gutter = U.el(
      "div", { class: "block-gutter" },
      U.el("button", {
        class: "gutter-btn", title: "Insertar bloque debajo", html: ICONS.plus,
        onclick: () => {
          Store.snapshot();
          insertBlock(block.id, Store.makeBlock("paragraph", { indent: block.indent }));
        },
      }),
      U.el("button", {
        class: "gutter-btn", title: "Arrastrar o clic para opciones", html: ICONS.grip,
        draggable: "true",
        ondragstart: (e) => {
          dragId = block.id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", block.id);
        },
        ondragend: () => (dragId = null),
        onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          blockMenu(block, r.left, r.bottom + 4);
        },
      })
    );
    wrap.append(gutter);
    dragHandlers(wrap, block);

    /* Contenido editable estándar */
    const makeContent = (extraClass = "") => {
      const c = U.el("div", {
        class: "block-content " + extraClass,
        contenteditable: "true",
        spellcheck: "false",
        html: block.text || "",
        dataset: { placeholder: PLACEHOLDERS[block.type] || "" },
      });
      c.dataset.empty = String(!c.textContent.trim());
      if (block.type === "paragraph" && page.blocks.length === 1) c.dataset.alwaysPh = "true";
      bindContent(c, block);
      return c;
    };

    switch (block.type) {
      case "divider":
        wrap.append(U.el("div", { class: "rule" }));
        break;

      case "todo": {
        wrap.append(
          U.el(
            "button",
            {
              class: "todo-check", dataset: { checked: String(!!block.checked) },
              html: ICONS.check,
              onclick: () => {
                block.checked = !block.checked;
                touch();
                render();
              },
            }
          ),
          makeContent()
        );
        break;
      }

      case "bulleted":
      case "numbered": {
        let label = "•";
        if (block.type === "numbered") {
          let n = 1;
          for (let i = index - 1; i >= 0; i--) {
            const prev = page.blocks[i];
            if (prev.type === "numbered" && prev.indent === block.indent) n++;
            else if ((prev.indent || 0) < (block.indent || 0)) continue;
            else break;
          }
          label = n + ".";
        }
        wrap.append(
          U.el("div", { class: "block-marker", text: block.type === "numbered" ? label : "" }),
          makeContent()
        );
        break;
      }

      case "toggle": {
        wrap.append(
          U.el("button", {
            class: "toggle-arrow" + (block.open ? " open" : ""), html: ICONS.chevronRight,
            onclick: () => { block.open = !block.open; touch(); render(); },
          }),
          makeContent()
        );
        break;
      }

      case "callout": {
        const box = U.el(
          "div", { class: "callout-box b-" + (block.color === "default" ? "gray" : block.color) },
          U.el("span", {
            class: "callout-emoji", text: block.emoji || "💡",
            onclick: (e) => {
              const r = e.target.getBoundingClientRect();
              Menus.emojiMenu({
                x: r.left, y: r.bottom + 6,
                onPick: (emo) => { block.emoji = emo; touch(); render(); },
              });
            },
          }),
          makeContent()
        );
        wrap.append(box);
        break;
      }

      case "code": {
        const content = makeContent();
        content.dataset.plain = "true";
        wrap.append(
          U.el(
            "div", { class: "code-wrap" },
            U.el("button", {
              class: "code-lang", text: block.lang || "javascript",
              onclick: (e) => {
                const r = e.target.getBoundingClientRect();
                Menus.open({
                  x: r.left, y: r.bottom + 4, searchable: true, width: 200,
                  items: ["javascript", "typescript", "python", "bash", "json", "html", "css", "sql", "go", "rust", "java", "markdown", "plain text"]
                    .map((l) => ({
                      label: l, active: l === block.lang,
                      onClick: () => { block.lang = l; touch(); render(); },
                    })),
                });
              },
            }),
            U.el("button", {
              class: "code-copy", text: "Copiar",
              onclick: () => {
                navigator.clipboard?.writeText(content.textContent || "");
                U.toast("Código copiado");
              },
            }),
            content
          )
        );
        break;
      }

      case "image": {
        if (block.src) {
          wrap.append(
            U.el(
              "div", { class: "image-wrap" },
              U.el("img", { src: block.src, alt: U.stripHtml(block.text) }),
              makeContent("image-caption")
            )
          );
        } else {
          wrap.append(
            U.el("div", {
              class: "image-empty", html: ICONS.image + "<span>Añade una imagen (URL)</span>",
              onclick: () => {
                const url = prompt("URL de la imagen:");
                if (url) { block.src = url; touch(); render(); }
              },
            })
          );
        }
        break;
      }

      case "bookmark": {
        if (!block.url) {
          wrap.append(
            U.el("div", {
              class: "image-empty", html: ICONS.bookmark + "<span>Pega un enlace</span>",
              onclick: () => {
                const url = prompt("URL:");
                if (!url) return;
                block.url = url;
                try { block.title = new URL(url).hostname; } catch { block.title = url; }
                touch(); render();
              },
            })
          );
        } else {
          wrap.append(
            U.el(
              "a", { class: "bookmark-card", href: block.url, target: "_blank", rel: "noreferrer noopener" },
              U.el(
                "div", { class: "bookmark-info" },
                U.el("div", { class: "bookmark-title", text: block.title || block.url }),
                U.el("div", { class: "bookmark-desc", text: block.desc || "Enlace guardado desde el editor." }),
                U.el("div", { class: "bookmark-url", text: block.url })
              )
            )
          );
        }
        break;
      }

      case "html":
        wrap.append(renderHtmlBlock(block));
        break;

      case "table-db":
        wrap.append(Database.render(page, block));
        break;

      case "subpage": {
        const child = block.pageId ? Store.getPage(block.pageId) : null;
        wrap.append(
          U.el(
            "button",
            {
              class: "subpage-link",
              onclick: () => child && Store.open(child.id),
            },
            U.el("span", { text: child?.icon || "📄", style: { fontSize: "18px" } }),
            U.el("span", { class: "subpage-title", text: child?.title || "Página eliminada" })
          )
        );
        break;
      }

      default:
        wrap.append(makeContent());
    }
    return wrap;
  }

  /* ----------------------------- Bloque HTML ------------------------------ */
  function renderHtmlBlock(block) {
    const box = U.el("div", { class: "html-block", dataset: { mode: block.mode || "preview" } });
    const frame = U.el("iframe", {
      sandbox: "allow-scripts allow-popups",
      title: "Bloque HTML",
      style: { height: (block.height || 240) + "px" },
    });
    const source = U.el("div", {
      class: "html-source", contenteditable: "true", spellcheck: "false", text: block.src || "",
    });

    const paint = () => { frame.srcdoc = block.src || ""; };

    source.addEventListener("input", U.debounce(() => {
      block.src = source.textContent || "";
      touch();
      paint();
    }, 400));
    source.addEventListener("keydown", (e) => e.stopPropagation());

    const toolbar = U.el(
      "div", { class: "html-toolbar" },
      U.el("span", { html: ICONS.html }),
      U.el("span", { text: "Bloque HTML" }),
      U.el("span", { class: "spacer" }),
      U.el("button", {
        class: "btn", text: box.dataset.mode === "code" ? "Vista previa" : "Editar código",
        onclick: (e) => {
          const next = box.dataset.mode === "code" ? "preview" : "code";
          box.dataset.mode = next;
          block.mode = next;
          e.target.textContent = next === "code" ? "Vista previa" : "Editar código";
          touch();
          if (next === "preview") paint();
        },
      }),
      U.el("button", {
        class: "btn", text: "Alto",
        onclick: () => {
          const h = prompt("Alto en píxeles:", block.height || 240);
          if (h && !isNaN(+h)) {
            block.height = U.clamp(+h, 80, 1200);
            frame.style.height = block.height + "px";
            touch();
          }
        },
      })
    );

    box.append(toolbar, frame, source);
    paint();
    return box;
  }

  /* --------------------- Eventos del contenido editable ------------------- */
  function bindContent(node, block) {
    const sync = () => {
      block.text = node.dataset.plain ? node.textContent : U.sanitizeInline(node.innerHTML);
      node.dataset.empty = String(!node.textContent.trim());
      Store.save();
    };

    node.addEventListener("input", () => {
      sync();
      if (applyMarkdown(block, node)) return;
      // Menú "/" en vivo
      if (Slash.isOpen()) {
        const at = Slash.ctx?.slashAt ?? 0;
        const q = (node.textContent || "").slice(at + 1, U.caretOffset(node));
        if (q.length > 24 || q.includes(" ")) Slash.close();
        else Slash.paint(q);
      }
    });

    node.addEventListener("keydown", (e) => {
      if (Slash.handleKey(e)) return;

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const at = U.caretOffset(node);
        setTimeout(() => Slash.openFor(block.id, node, at), 0);
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (block.type === "code") return; // salto de línea dentro del código
        e.preventDefault();
        Store.snapshot();
        sync();
        const caret = U.caretOffset(node);
        const full = node.textContent || "";
        const isList = ["bulleted", "numbered", "todo"].includes(block.type);

        // Enter en un elemento de lista vacío: vuelve a párrafo
        if (isList && !full.trim()) {
          if (block.indent > 0) { block.indent--; touch(); render(); focusBlock(block.id); }
          else setType(block.id, "paragraph");
          return;
        }
        // Divide el texto si el cursor está en medio
        let carried = "";
        if (caret < full.length) {
          carried = U.escapeHtml(full.slice(caret));
          block.text = U.escapeHtml(full.slice(0, caret));
          node.textContent = full.slice(0, caret);
        }
        const nextType = isList ? block.type : block.type === "toggle" ? "paragraph" : "paragraph";
        insertBlock(block.id, Store.makeBlock(nextType, { indent: block.indent, text: carried }));
        return;
      }

      if (e.key === "Backspace" && U.atStart(node)) {
        const i = blockIndex(block.id);
        if (block.indent > 0) { e.preventDefault(); block.indent--; touch(); render(); focusBlock(block.id, false); return; }
        if (block.type !== "paragraph") { e.preventDefault(); setType(block.id, "paragraph"); return; }
        if (i > 0) {
          const prev = page.blocks[i - 1];
          if (["divider", "image", "html", "table-db", "subpage", "bookmark"].includes(prev.type)) {
            e.preventDefault();
            Store.snapshot();
            removeBlock(prev.id);
            return;
          }
          e.preventDefault();
          Store.snapshot();
          const prevText = prev.text || "";
          prev.text = prevText + (block.text || "");
          page.blocks.splice(i, 1);
          touch();
          render();
          requestAnimationFrame(() => {
            const el2 = root.querySelector(`[data-id="${prev.id}"] .block-content`);
            if (!el2) return;
            el2.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            const target = U.stripHtml(prevText).length;
            let remaining = target, done = false;
            const walk = (n) => {
              if (done) return;
              if (n.nodeType === 3) {
                if (remaining <= n.length) { range.setStart(n, remaining); done = true; }
                else remaining -= n.length;
              } else Array.from(n.childNodes).forEach(walk);
            };
            walk(el2);
            if (!done) range.selectNodeContents(el2), range.collapse(false);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          });
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (block.type === "code") {
          document.execCommand("insertText", false, "  ");
          return;
        }
        block.indent = U.clamp((block.indent || 0) + (e.shiftKey ? -1 : 1), 0, 4);
        touch();
        render();
        focusBlock(block.id);
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const i = blockIndex(block.id);
        const goUp = e.key === "ArrowUp";
        if ((goUp && U.atStart(node)) || (!goUp && U.atEnd(node))) {
          const target = page.blocks[i + (goUp ? -1 : 1)];
          if (target) {
            const el2 = root.querySelector(`[data-id="${target.id}"] .block-content`);
            if (el2) { e.preventDefault(); U.placeCaret(el2, goUp); }
          }
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        Store.snapshot();
        const copy = JSON.parse(JSON.stringify(block));
        copy.id = U.uid("b");
        insertBlock(block.id, copy, false);
      }
    });

    node.addEventListener("paste", (e) => {
      const text = e.clipboardData?.getData("text/plain") || "";
      if (!text) return;
      e.preventDefault();
      const lines = text.split(/\r?\n/).filter((l, i, a) => l.trim() || i < a.length - 1);
      if (lines.length <= 1) {
        document.execCommand("insertText", false, text);
        return;
      }
      Store.snapshot();
      let anchor = block.id;
      node.textContent = (node.textContent || "") + lines[0];
      sync();
      lines.slice(1).forEach((line) => {
        const b = Store.makeBlock("paragraph", { text: U.escapeHtml(line), indent: block.indent });
        page.blocks.splice(blockIndex(anchor) + 1, 0, b);
        anchor = b.id;
      });
      touch();
      render();
      focusBlock(anchor);
    });

    const maybeBar = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed || !node.contains(sel.anchorNode)) {
        Menus.hideFormatBar();
        return;
      }
      Menus.showFormatBar(sel.getRangeAt(0).getBoundingClientRect(), node);
    };
    node.addEventListener("mouseup", () => setTimeout(maybeBar, 0));
    node.addEventListener("keyup", (e) => {
      if (e.shiftKey || e.key.startsWith("Arrow")) setTimeout(maybeBar, 0);
    });
    node.addEventListener("blur", () => { sync(); });
  }

  /* --------------------------- Render de la página ------------------------ */
  function render() {
    if (!page || !root) return;
    const scroll = root.parentElement?.scrollTop;
    root.innerHTML = "";

    let hideUntilIndent = null;
    page.blocks.forEach((block, i) => {
      if (hideUntilIndent !== null) {
        if ((block.indent || 0) > hideUntilIndent) return;
        hideUntilIndent = null;
      }
      root.append(renderBlock(block, i));
      if (block.type === "toggle" && !block.open) hideUntilIndent = block.indent || 0;
    });

    root.append(
      U.el("div", {
        class: "blocks-tail",
        onclick: (e) => {
          if (e.target !== e.currentTarget) return;
          const last = page.blocks[page.blocks.length - 1];
          if (last && last.type === "paragraph" && !U.stripHtml(last.text).trim()) {
            focusBlock(last.id);
            return;
          }
          insertBlock(null, Store.makeBlock());
        },
      })
    );
    if (scroll !== undefined && root.parentElement) root.parentElement.scrollTop = scroll;
  }

  function mount(targetPage, container) {
    page = targetPage;
    root = container;
    render();
  }

  return { mount, render, TYPES, TURNABLE, setType, insertBlock, get page() { return page; } };
})();
