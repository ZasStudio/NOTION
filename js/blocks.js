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
    { type: "table-db", name: "Base de datos", icon: ICONS.table, desc: "Tabla, tablero, calendario, gráfica y más.", group: "Bases de datos" },
    { type: "subpage", name: "Subpágina", icon: ICONS.doc, desc: "Crea una página anidada.", group: "Bases de datos" },
    { type: "embed", name: "Insertar", icon: ICONS.link, desc: "YouTube, Figma, Maps y cualquier iframe.", group: "Medios" },
    { type: "file", name: "Archivo", icon: ICONS.import, desc: "Adjunta un archivo de cualquier tamaño.", group: "Medios" },
    { type: "toc", name: "Tabla de contenidos", icon: ICONS.list, desc: "Índice automático de los encabezados.", group: "Avanzado" },
    { type: "breadcrumb", name: "Ruta de navegación", icon: ICONS.chevronRight, desc: "Muestra dónde está esta página.", group: "Avanzado" },
    { type: "button", name: "Botón", icon: ICONS.routines, desc: "Un clic que inserta bloques o crea filas.", group: "Avanzado" },
    { type: "synced", name: "Bloque sincronizado", icon: ICONS.mcp, desc: "El mismo contenido en varias páginas.", group: "Avanzado" },
    { type: "ai", name: "Bloque de IA", icon: ICONS.sparkle, desc: "Resumen o texto generado que puedes regenerar.", group: "Avanzado" },
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
    image: "Escribe un pie de foto",
  };

  const NON_TEXT = ["divider", "image", "html", "table-db", "subpage", "bookmark",
    "toc", "breadcrumb", "button", "file", "embed", "synced", "ai"];

  let page = null;
  let root = null;
  let selection = new Set();

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
    if (type === "button" && !b.label) {
      b.label = "Añadir tarea";
      b.action = { type: "insert", blockType: "todo", text: "Nueva tarea" };
    }
    if (type === "ai" && !b.aiAction) b.aiAction = "summary";
    if (type === "toc" || type === "breadcrumb") b.text = "";
    if (type === "subpage" && !b.pageId) {
      const child = Store.createPage({ title: "Nueva página", parentId: page.id, icon: "📄" });
      b.pageId = child.id;
    }
    touch();
    render();
    if (!NON_TEXT.includes(type)) focusBlock(id);
  }

  /* ------------------------------ Menú "/" -------------------------------- */
  const Slash = (() => {
    let node = null, items = [], active = 0, ctx = null;

    const close = () => { node?.remove(); node = null; ctx = null; };
    const isOpen = () => !!node;

    function paint(query = "") {
      const q = query.toLowerCase().trim();
      const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      items = TYPES.filter(
        (t) => !q || norm(t.name).includes(norm(q)) || t.type.includes(q)
      );
      active = 0;
      node.innerHTML = "";
      if (!items.length) {
        node.append(U.el("div", { class: "menu-label", text: "Sin resultados" }));
        return 0;
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
      return items.length;
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
        { label: "Preguntar a la IA", icon: ICONS.sparkle,
          sub: AI.hasKey() ? "Claude conectado" : "modo local",
          onClick: (e) => { AI.open({ page, block, anchor: e.currentTarget }); } },
        { label: "Comentar", icon: ICONS.comment,
          onClick: () => Collab.commentOnBlock(page, block.id) },
        { type: "separator" },
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
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            select(block.id, true);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          blockMenu(block, r.left, r.bottom + 4);
        },
      })
    );
    wrap.append(gutter);
    dragHandlers(wrap, block);

    // Indicador de hilo de comentarios
    const threads = Store.commentsOf(page.id).filter((c) => c.blockId === block.id);
    if (threads.length) {
      wrap.classList.add("has-comments");
      wrap.append(
        U.el("button", {
          class: "block-comment-badge",
          html: ICONS.comment + `<span>${threads.length}</span>`,
          title: "Ver comentarios",
          onclick: () => Collab.togglePanel(true),
        })
      );
    }
    if (selection.has(block.id)) wrap.classList.add("is-selected");

    /* Contenido editable estándar */
    const locked = !!page.share?.locked;
    const makeContent = (extraClass = "") => {
      const c = U.el("div", {
        class: "block-content " + extraClass,
        contenteditable: locked ? "false" : "true",
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
          const img = U.el("img", { alt: U.stripHtml(block.text) });
          Assets.attach(img, block.src);

          // Sin ancho fijado se respeta el tamaño natural, como en Notion
          const frame = U.el("div", {
            class: "image-frame align-" + (block.align || "left") + (block.width ? "" : " is-natural"),
            style: block.width ? { width: block.width + "%" } : {},
          });

          // Asas de redimensionado a ambos lados, como en Notion
          ["left", "right"].forEach((side) => {
            const handle = U.el("div", { class: "image-handle handle-" + side });
            handle.addEventListener("mousedown", (e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = frame.offsetWidth;
              const containerW = frame.parentElement.offsetWidth;
              const onMove = (ev) => {
                const delta = (ev.clientX - startX) * (side === "right" ? 1 : -1);
                const pct = U.clamp(((startW + delta * 2) / containerW) * 100, 20, 100);
                frame.style.width = pct + "%";
                block.width = Math.round(pct);
              };
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                touch();
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            });
            handle.addEventListener("dblclick", () => { block.width = 100; touch(); render(); });
            frame.append(handle);
          });

          const toolbar = U.el(
            "div", { class: "image-tools" },
            U.el("button", {
              class: "btn", text: "Reemplazar",
              onclick: (e) => openPicker(block, e.currentTarget),
            }),
            U.el("button", {
              class: "btn", html: ICONS.palette, title: "Alineación",
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left - 60, y: r.bottom + 4, width: 180,
                  items: [
                    { label: "Izquierda", active: (block.align || "left") === "left",
                      onClick: () => { block.align = "left"; touch(); render(); } },
                    { label: "Centrada", active: block.align === "center",
                      onClick: () => { block.align = "center"; touch(); render(); } },
                    { label: "Derecha", active: block.align === "right",
                      onClick: () => { block.align = "right"; touch(); render(); } },
                    { type: "separator" },
                    { label: "Ancho original", onClick: () => { block.width = 100; touch(); render(); } },
                  ],
                });
              },
            }),
            U.el("button", {
              class: "btn", html: ICONS.import, title: "Descargar",
              onclick: async () => {
                const href = await Assets.url(block.src);
                if (!href) return U.toast("No se encontró el archivo");
                U.el("a", { href, download: Assets.meta(Assets.idOf(block.src))?.name || "imagen" }).click();
              },
            })
          );

          frame.append(img, toolbar);
          const box = U.el("div", { class: "image-wrap" }, frame, makeContent("image-caption"));
          img.addEventListener("error", () => {
            box.prepend(U.el("div", { class: "image-broken", text: "No se pudo cargar la imagen." }));
          });
          wrap.append(box);
        } else {
          const empty = U.el("div", {
            class: "image-empty",
            html: ICONS.image + "<span>Añade una imagen</span>",
            onclick: (e) => openPicker(block, e.currentTarget),
            ondragover: (e) => { e.preventDefault(); empty.classList.add("is-over"); },
            ondragleave: () => empty.classList.remove("is-over"),
            ondrop: async (e) => {
              e.preventDefault();
              empty.classList.remove("is-over");
              const file = e.dataTransfer.files[0];
              if (!file) return;
              const saved = await Assets.save(file);
              block.src = saved.ref;
              touch();
              render();
            },
          });
          wrap.append(empty);
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

      case "toc": {
        const heads = page.blocks.filter((b) => b.type.startsWith("heading"));
        wrap.append(
          U.el(
            "div", { class: "toc-block" },
            heads.length
              ? U.el("div", {}, ...heads.map((h) =>
                  U.el("button", {
                    class: "toc-link toc-" + h.type,
                    text: U.stripHtml(h.text) || "Sin título",
                    onclick: () => {
                      const node = root.querySelector(`[data-id="${h.id}"]`);
                      node?.scrollIntoView({ behavior: "smooth", block: "center" });
                    },
                  })))
              : U.el("div", { class: "db-hint", text: "Añade encabezados para construir el índice" })
          )
        );
        break;
      }

      case "breadcrumb": {
        const path = Store.pathOf(page.id);
        wrap.append(
          U.el("div", { class: "crumb-block" },
            ...path.flatMap((p, i) => [
              i ? U.el("span", { class: "crumb-sep", text: "/" }) : null,
              U.el("button", { class: "crumb-link", text: `${p.icon || "📄"} ${p.title || "Sin título"}`,
                onclick: () => Store.open(p.id) }),
            ].filter(Boolean)))
        );
        break;
      }

      case "button": {
        wrap.append(
          U.el(
            "div", { class: "btn-block" },
            U.el("button", {
              class: "btn btn-bordered btn-action",
              html: ICONS.plus + `<span>${U.escapeHtml(block.label || "Botón")}</span>`,
              onclick: () => {
                Store.snapshot();
                const a = block.action || {};
                if (a.type === "row" && page.db) {
                  page.db.rows.push({ id: U.uid("r"), cells: {}, pageId: null, createdAt: new Date().toISOString() });
                  U.toast("Fila creada");
                } else {
                  const at = blockIndex(block.id) + 1;
                  page.blocks.splice(at, 0, Store.makeBlock(a.blockType || "todo", {
                    text: U.escapeHtml(a.text || ""),
                  }));
                }
                touch();
                render();
              },
            }),
            U.el("button", {
              class: "icon-btn", html: ICONS.settings, title: "Configurar botón",
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left - 180, y: r.bottom + 4, width: 240,
                  items: [
                    { label: "Cambiar etiqueta…", icon: ICONS.rename, onClick: () => {
                        const v = prompt("Etiqueta del botón:", block.label);
                        if (v) { block.label = v; touch(); render(); }
                      } },
                    { type: "label", label: "Al pulsar" },
                    ...["todo", "paragraph", "heading3", "callout"].map((t) => ({
                      label: "Insertar " + (TYPES.find((x) => x.type === t)?.name || t),
                      active: block.action?.blockType === t && block.action?.type !== "row",
                      onClick: () => {
                        const text = prompt("Texto del bloque insertado:", block.action?.text || "");
                        block.action = { type: "insert", blockType: t, text: text || "" };
                        touch(); render();
                      },
                    })),
                    page.db && { label: "Añadir fila a la base de datos", icon: ICONS.table,
                      active: block.action?.type === "row",
                      onClick: () => { block.action = { type: "row" }; touch(); render(); } },
                  ].filter(Boolean),
                });
              },
            })
          )
        );
        break;
      }

      case "file": {
        if (block.fileName) {
          wrap.append(
            U.el(
              "div", { class: "file-block" },
              U.el("span", { html: ICONS.doc }),
              U.el("div", { class: "file-meta" },
                U.el("div", { class: "file-name", text: block.fileName }),
                U.el("div", { class: "file-size", text: block.fileSize || "" })),
              U.el("button", {
                class: "btn", text: "Descargar",
                onclick: async () => {
                  const href = block.dataUrl || (await Assets.url(block.src));
                  if (!href) return U.toast("No se encontró el archivo");
                  U.el("a", { href, download: block.fileName }).click();
                },
              })
            )
          );
        } else {
          wrap.append(
            U.el("div", {
              class: "image-empty", html: ICONS.import + "<span>Sube un archivo · sin límite de tamaño</span>",
              onclick: () => {
                const input = U.el("input", { type: "file" });
                input.onchange = async () => {
                  const f = input.files[0];
                  if (!f) return;
                  const saved = await Assets.save(f);
                  block.fileName = f.name;
                  block.fileSize = Assets.fmtSize(saved.size);
                  block.src = saved.ref;
                  delete block.dataUrl;
                  touch();
                  render();
                };
                input.click();
              },
            })
          );
        }
        break;
      }

      case "embed": {
        if (block.url) {
          wrap.append(
            U.el(
              "div", { class: "embed-block" },
              U.el("iframe", {
                src: embedUrl(block.url), loading: "lazy",
                allow: "accelerometer; clipboard-write; encrypted-media; picture-in-picture",
                referrerpolicy: "no-referrer",
                style: { height: (block.height || 360) + "px" },
              }),
              U.el("div", { class: "embed-bar" },
                U.el("span", { class: "file-size", text: block.url }),
                U.el("button", { class: "btn", text: "Cambiar", onclick: () => askEmbed(block) }))
            )
          );
        } else {
          wrap.append(
            U.el("div", {
              class: "image-empty", html: ICONS.link + "<span>Pega un enlace para insertar</span>",
              onclick: () => askEmbed(block),
            })
          );
        }
        break;
      }

      case "synced": {
        const source = block.sourceId ? Store.getPage(block.sourceId) : null;
        const box = U.el("div", { class: "synced-block" });
        box.append(
          U.el("div", { class: "synced-bar" },
            U.el("span", { html: ICONS.mcp }),
            U.el("span", { text: source ? `Sincronizado desde «${source.title || "Sin título"}»` : "Elige el origen" }),
            U.el("button", {
              class: "btn", text: source ? "Editar original" : "Elegir origen",
              onclick: () => {
                if (source) return Store.open(source.id);
                const pages = Object.values(Store.state.pages).filter((p) => !p.deleted && p.id !== page.id);
                Menus.open({
                  x: window.innerWidth / 2 - 120, y: 160, width: 260, searchable: true,
                  items: pages.map((p) => ({
                    label: `${p.icon || "📄"} ${U.escapeHtml(p.title || "Sin título")}`,
                    onClick: () => { block.sourceId = p.id; touch(); render(); },
                  })),
                });
              },
            }))
        );
        if (source) {
          const inner = U.el("div", { class: "synced-body" });
          source.blocks.slice(0, 20).forEach((b) => {
            const text = U.stripHtml(b.text);
            if (b.type === "divider") return inner.append(U.el("hr"));
            const tag = b.type.startsWith("heading") ? "h" + (Number(b.type.slice(-1)) + 1) : "p";
            inner.append(U.el(tag, {
              class: "synced-line",
              text: (b.type === "bulleted" ? "• " : b.type === "todo" ? (b.checked ? "☑ " : "☐ ") : "") + text,
            }));
          });
          box.append(inner);
        }
        wrap.append(box);
        break;
      }

      case "ai": {
        const box = U.el("div", { class: "ai-block" });
        const out = U.el("div", { class: "ai-block-out", text: block.result || "Genera contenido con IA a partir de esta página." });
        const action = AI.ACTIONS.find((a) => a.id === (block.aiAction || "summary"));
        box.append(
          U.el("div", { class: "ai-block-bar" },
            U.el("span", { class: "ai-badge", html: ICONS.sparkle + "<span>IA</span>" }),
            U.el("button", {
              class: "btn", text: action?.name || "Resumir",
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left, y: r.bottom + 4, width: 230,
                  items: AI.ACTIONS.map((a) => ({
                    label: a.name, active: a.id === block.aiAction,
                    onClick: () => { block.aiAction = a.id; touch(); render(); },
                  })),
                });
              },
            }),
            U.el("button", {
              class: "btn btn-primary", text: "Generar",
              onclick: async () => {
                out.textContent = "Generando…";
                const source = page.blocks.filter((b) => b.id !== block.id)
                  .map((b) => U.stripHtml(b.text)).filter(Boolean).join("\n");
                try {
                  block.result = await AI.run(block.aiAction || "summary", source);
                  out.textContent = block.result;
                  touch();
                } catch (err) {
                  out.textContent = err.message;
                }
              },
            }),
            U.el("button", {
              class: "btn", text: "Insertar como bloques",
              onclick: () => {
                if (!block.result) return U.toast("Genera algo primero");
                Store.snapshot();
                const at = blockIndex(block.id) + 1;
                const made = block.result.split("\n").map((l) => l.trim()).filter(Boolean)
                  .map((l) => Store.makeBlock(/^[-•*]\s+/.test(l) ? "bulleted" : "paragraph",
                    { text: U.escapeHtml(l.replace(/^[-•*]\s+/, "")) }));
                page.blocks.splice(at, 0, ...made);
                touch(); render();
              },
            })),
          out
        );
        wrap.append(box);
        break;
      }

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
            U.iconNode(child?.icon, 18),
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

  /** Abre el selector de medios para un bloque de imagen. */
  function openPicker(block, anchor) {
    Assets.pick({
      anchor,
      tabs: ["upload", "link", "recent"],
      onRemove: block.src ? () => { block.src = ""; touch(); render(); } : null,
      onPick: (value) => {
        block.src = value;
        touch();
        render();
      },
    });
  }

  /** Convierte enlaces conocidos en su URL insertable. */
  function embedUrl(url) {
    try {
      const u = new URL(url);
      if (/youtube\.com$/.test(u.hostname.replace("www.", "")) && u.searchParams.get("v"))
        return "https://www.youtube.com/embed/" + u.searchParams.get("v");
      if (u.hostname === "youtu.be") return "https://www.youtube.com/embed" + u.pathname;
      if (u.hostname.includes("vimeo.com") && /^\/\d+/.test(u.pathname))
        return "https://player.vimeo.com/video" + u.pathname;
      if (u.hostname.includes("figma.com"))
        return "https://www.figma.com/embed?embed_host=share&url=" + encodeURIComponent(url);
      return url;
    } catch {
      return url;
    }
  }

  function askEmbed(block) {
    const url = prompt("Enlace a insertar (YouTube, Vimeo, Figma, Maps…):", block.url || "https://");
    if (!url) return;
    block.url = url;
    touch();
    render();
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
    const keepVersion = U.debounce(() => Store.recordVersion(page.id, "Edición"), 2500);

    const sync = () => {
      block.text = node.dataset.plain ? node.textContent : U.sanitizeInline(node.innerHTML);
      node.dataset.empty = String(!node.textContent.trim());
      Store.save();
      keepVersion();
    };

    node.addEventListener("input", () => {
      sync();
      if (applyMarkdown(block, node)) return;
      // Menú "/" en vivo
      if (Slash.isOpen()) {
        const at = Slash.ctx?.slashAt ?? 0;
        const q = (node.textContent || "").slice(at + 1, U.caretOffset(node));
        // Se permiten espacios: el menú sólo se cierra si ya no hay coincidencias.
        if (q.length > 30 || Slash.paint(q) === 0) Slash.close();
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
          if (NON_TEXT.includes(prev.type)) {
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

      if (e.key === "Escape") {
        e.preventDefault();
        node.blur();
        select(block.id, false);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        AI.open({ page, block, anchor: node });
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

    node.addEventListener("paste", async (e) => {
      // Una imagen en el portapapeles se convierte en bloque de imagen
      const imageItem = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        U.toast("Guardando imagen…");
        const saved = await Assets.save(file);
        Store.snapshot();
        const isEmpty = !U.stripHtml(block.text).trim() && block.type === "paragraph";
        if (isEmpty) {
          block.type = "image";
          block.src = saved.ref;
          touch();
          render();
        } else {
          insertBlock(block.id, Store.makeBlock("image", { src: saved.ref }), false);
        }
        U.toast("Imagen insertada");
        return;
      }

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

  /* --------------------------- Selección de bloques ------------------------ */
  function select(id, additive) {
    if (!additive) selection.clear();
    if (id) selection.add(id);
    paintSelection();
  }

  const clearSelection = () => { selection.clear(); paintSelection(); };

  function paintSelection() {
    root?.querySelectorAll(".block").forEach((n) =>
      n.classList.toggle("is-selected", selection.has(n.dataset.id))
    );
  }

  /** Atajos que actúan sobre la selección (los engancha App). */
  function handleSelectionKey(e) {
    if (!selection.size) return false;
    if (e.key === "Escape") { clearSelection(); return true; }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      Store.snapshot();
      page.blocks = page.blocks.filter((b) => !selection.has(b.id));
      if (!page.blocks.length) page.blocks.push(Store.makeBlock());
      clearSelection();
      touch();
      render();
      return true;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      Store.snapshot();
      const copies = page.blocks.filter((b) => selection.has(b.id)).map((b) => ({ ...JSON.parse(JSON.stringify(b)), id: U.uid("b") }));
      const at = page.blocks.findIndex((b) => selection.has(b.id)) + selection.size;
      page.blocks.splice(at, 0, ...copies);
      touch();
      render();
      return true;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
      const md = page.blocks.filter((b) => selection.has(b.id))
        .map((b) => App.blockToMarkdown(b, page)).join("\n");
      navigator.clipboard?.writeText(md);
      U.toast(`${selection.size} bloque(s) copiados como Markdown`);
      return true;
    }
    return false;
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

  /** Permite soltar imágenes en cualquier punto de la página. */
  function bindPageDrop(container) {
    container.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      container.classList.add("is-file-over");
    });
    container.addEventListener("dragleave", (e) => {
      if (e.target === container) container.classList.remove("is-file-over");
    });
    container.addEventListener("drop", async (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      e.preventDefault();
      container.classList.remove("is-file-over");

      const near = e.target.closest?.(".block");
      const anchorId = near?.dataset.id || null;
      Store.snapshot();
      let cursor = anchorId;

      for (const file of files) {
        const isImage = /^image\//.test(file.type);
        const saved = await Assets.save(file);
        const made = isImage
          ? Store.makeBlock("image", { src: saved.ref })
          : Store.makeBlock("file", {
              src: saved.ref, fileName: file.name, fileSize: Assets.fmtSize(saved.size),
            });
        const at = cursor ? blockIndex(cursor) + 1 : page.blocks.length;
        page.blocks.splice(at, 0, made);
        cursor = made.id;
      }
      touch();
      render();
      U.toast(files.length > 1 ? `${files.length} archivos añadidos` : "Archivo añadido");
    });
  }

  function mount(targetPage, container) {
    page = targetPage;
    root = container;
    selection.clear();
    render();
    bindPageDrop(container);
  }

  return {
    mount, render, TYPES, TURNABLE, setType, insertBlock,
    select, clearSelection, handleSelectionKey,
    get page() { return page; },
    get selection() { return selection; },
  };
})();
