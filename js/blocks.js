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
    { type: "video", name: "Vídeo", icon: ICONS.video, desc: "Sube un vídeo o pega un enlace y se reproduce aquí.", group: "Medios" },
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
    { type: "table", name: "Tabla simple", icon: ICONS.table, desc: "Una tabla de texto, sin base de datos.", group: "Básicos" },
    { type: "columns2", name: "2 columnas", icon: ICONS.board, desc: "Divide el contenido en dos columnas.", group: "Diseño" },
    { type: "columns3", name: "3 columnas", icon: ICONS.board, desc: "Tres columnas lado a lado.", group: "Diseño" },
    { type: "columns4", name: "4 columnas", icon: ICONS.board, desc: "Cuatro columnas lado a lado.", group: "Diseño" },
    { type: "linked-db", name: "Vista enlazada", icon: ICONS.table, desc: "Muestra la base de datos de otra página.", group: "Bases de datos" },
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
    "toc", "breadcrumb", "button", "file", "embed", "synced", "ai", "video",
    "columns", "table", "linked-db"];

  let page = null;
  let root = null;
  let selection = new Set();
  let rendering = false;   // el blur dispara durante el re-render: hay que ignorarlo

  /* ------------------------------ Utilidades ------------------------------ */
  /* Cada bloque sabe en qué lista vive: la de la página o la de una columna. */
  const ownerOf = new Map();

  function indexBlocks(list) {
    list.forEach((b) => {
      ownerOf.set(b.id, list);
      if (b.type === "columns") (b.cols || []).forEach((c) => indexBlocks(c.blocks || []));
      if (b.children && b.children.length) indexBlocks(b.children);
    });
  }

  const listOf = (id) => ownerOf.get(id) || page.blocks;
  const blockIndex = (id) => listOf(id).findIndex((b) => b.id === id);

  function blockById(id) {
    let found = null;
    const walk = (list) => {
      for (const b of list) {
        if (b.id === id) { found = b; return; }
        if (b.type === "columns") (b.cols || []).forEach((c) => walk(c.blocks || []));
        if (b.children && b.children.length) walk(b.children);
      }
    };
    walk(page.blocks);
    return found;
  }

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
    const list = afterId ? listOf(afterId) : page.blocks;
    const i = afterId ? blockIndex(afterId) + 1 : list.length;
    list.splice(i, 0, block);
    ownerOf.set(block.id, list);
    touch();
    render();
    if (focus) focusBlock(block.id, false);
    return block;
  }

  function removeBlock(id) {
    const list = listOf(id);
    const i = list.findIndex((b) => b.id === id);
    if (i < 0) return;
    list.splice(i, 1);
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
    if (type === "callout" && !b.children) b.children = [];
    if (type === "callout" && b.color === "default") b.color = "gray";
    if (type === "code" && !b.lang) b.lang = "javascript";
    if (type === "html" && !b.src) {
      b.src = "<!doctype html>\n<h2 style=\"font-family:sans-serif\">¡Hola desde un bloque HTML!</h2>";
      b.height = 200;
    }
    // Las columnas nacen con el contenido actual en la primera
    if (/^columns[234]$/.test(type)) {
      const count = Number(type.slice(-1));
      const list = listOf(b.id);
      const at = list.findIndex((x) => x.id === b.id);
      const first = { ...JSON.parse(JSON.stringify(b)), id: U.uid("b") };
      if (first.type === "paragraph" && !U.stripHtml(first.text).trim()) first.text = "";
      const columns = Store.makeBlock("columns", {
        cols: Array.from({ length: count }, (_, i) => ({
          width: 100 / count,
          blocks: [i === 0 ? first : Store.makeBlock()],
        })),
      });
      list.splice(at, 1, columns);
      touch();
      render();
      focusBlock(columns.cols[0].blocks[0].id);
      return;
    }

    if (type === "table" && !b.rows) {
      b.rows = [["", "", ""], ["", "", ""], ["", "", ""]];
      b.headerRow = true;
      b.headerCol = false;
    }

    if (type === "linked-db" && !b.sourcePageId) {
      const sources = Object.values(Store.state.pages).filter((p) => !p.deleted && p.db);
      if (!sources.length) {
        U.toast("Crea antes una página con base de datos");
        b.type = "paragraph";
        return;
      }
      setTimeout(() => pickLinkedSource(b), 0);
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
      // Si se escribió más rápido que el temporizador, arranca ya filtrado
      const typed = (contentEl.textContent || "").slice(slashAt + 1, U.caretOffset(contentEl));
      if (typed) paint(typed);
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

  /* ------------------------------ Menciones ------------------------------- */
  const Mention = (() => {
    let node = null, ctx = null, items = [], active = 0;

    const close = () => { node?.remove(); node = null; ctx = null; };
    const isOpen = () => !!node;

    function candidates(query) {
      const q = query.toLowerCase().trim();
      const out = [];
      Object.values(Store.state.pages)
        .filter((p) => !p.deleted && p.id !== page.id)
        .filter((p) => !q || (p.title || "").toLowerCase().includes(q))
        .slice(0, 6)
        .forEach((p) => out.push({
          kind: "page", id: p.id, icon: p.icon || "📄",
          label: p.title || "Sin título", sub: "Página",
        }));
      Store.state.members
        .filter((m) => !q || m.name.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((m) => out.push({ kind: "person", id: m.id, icon: "👤", label: m.name, sub: m.email }));

      const today = new Date();
      const day = (n, label) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return { kind: "date", id: d.toISOString().slice(0, 10), icon: "📅", label, sub: U.formatDate(d.toISOString().slice(0, 10)) };
      };
      [day(0, "Hoy"), day(1, "Mañana"), day(7, "En una semana")]
        .filter((d) => !q || d.label.toLowerCase().includes(q))
        .forEach((d) => out.push(d));
      return out;
    }

    function paint(query = "") {
      items = candidates(query);
      active = 0;
      node.innerHTML = "";
      if (!items.length) {
        node.append(U.el("div", { class: "menu-label", text: "Sin coincidencias" }));
        return 0;
      }
      items.forEach((it, i) =>
        node.append(
          U.el("button", {
            class: "menu-item" + (i === active ? " is-active" : ""),
            dataset: { i },
            onmousedown: (e) => e.preventDefault(),
            onclick: () => choose(i),
          },
            U.el("span", { text: it.icon }),
            U.el("span", { class: "menu-item-body" },
              U.el("span", { text: it.label }),
              U.el("span", { class: "menu-sub", text: it.sub })),
          )
        )
      );
      return items.length;
    }

    const setActive = (i) => {
      active = i;
      node.querySelectorAll(".menu-item").forEach((b) =>
        b.classList.toggle("is-active", Number(b.dataset.i) === active));
    };

    function choose(i) {
      const it = items[i];
      if (!it || !ctx) return;
      const { block: b, contentEl, at } = ctx;
      const text = contentEl.textContent || "";
      const before = U.escapeHtml(text.slice(0, at));
      const after = U.escapeHtml(text.slice(U.caretOffset(contentEl)));
      const html =
        it.kind === "page"
          ? `<a class="mention mention-page" data-page="${it.id}" contenteditable="false">${it.icon} ${U.escapeHtml(it.label)}</a>`
          : it.kind === "person"
          ? `<span class="mention mention-person" data-person="${it.id}" contenteditable="false">@${U.escapeHtml(it.label)}</span>`
          : `<span class="mention mention-date" data-date="${it.id}" contenteditable="false">📅 ${U.escapeHtml(U.formatDate(it.id))}</span>`;
      b.text = before + html + "&nbsp;" + after;
      close();
      touch();
      render();
      focusBlock(b.id);
    }

    function openFor(block, contentEl, at) {
      close();
      ctx = { block, contentEl, at };
      node = U.el("div", { class: "menu mention-menu" });
      node.style.width = "290px";
      document.body.append(node);
      paint("");
      const r = contentEl.getBoundingClientRect();
      node.style.left = U.clamp(r.left, 8, window.innerWidth - 300) + "px";
      node.style.top = (window.innerHeight - r.bottom > 320 ? r.bottom + 6 : Math.max(8, r.top - 326)) + "px";
      const typed = (contentEl.textContent || "").slice(at + 1, U.caretOffset(contentEl));
      if (typed) paint(typed);
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
        block.type.startsWith("heading") && {
          label: block.collapsible ? "Quitar el desplegable" : "Convertir en encabezado desplegable",
          icon: ICONS.toggle,
          onClick: () => {
            block.collapsible = !block.collapsible;
            if (block.collapsible) block.open = true;
            touch(); render();
          },
        },
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
    const list = listOf(id);
    const i = list.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    Store.snapshot();
    const [b] = list.splice(i, 1);
    list.splice(j, 0, b);
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
      const fromList = listOf(dragId);
      const from = fromList.findIndex((b) => b.id === dragId);
      if (from < 0) return;
      const [moved] = fromList.splice(from, 1);
      const toList = listOf(block.id);
      const to = toList.findIndex((b) => b.id === block.id) + (after ? 1 : 0);
      toList.splice(to, 0, moved);
      ownerOf.set(moved.id, toList);
      dragId = null;
      touch();
      render();
    });
  }

  /* ------------------------- Render de un bloque -------------------------- */
  function renderBlock(block, index, list = page.blocks) {
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
            const prev = list[i];
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

      case "heading1":
      case "heading2":
      case "heading3": {
        if (block.collapsible) {
          wrap.append(
            U.el("button", {
              class: "toggle-arrow heading-arrow" + (block.open === false ? "" : " open"),
              html: ICONS.chevronRight,
              onclick: () => { block.open = block.open === false; touch(); render(); },
            })
          );
        }
        wrap.append(makeContent());
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
        const inner = U.el("div", { class: "callout-inner" });
        inner.append(makeContent());

        // Un destacado puede contener otros bloques, como en Notion
        if (block.children && block.children.length) {
          const kids = U.el("div", { class: "callout-children" });
          renderList(block.children, kids);
          inner.append(kids);
        }
        inner.append(
          U.el("button", {
            class: "callout-add", html: ICONS.plus + "<span>Añadir dentro</span>",
            onclick: () => {
              block.children = block.children || [];
              const b = Store.makeBlock();
              block.children.push(b);
              touch();
              render();
              focusBlock(b.id);
            },
          })
        );

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
          inner
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

      case "video": {
        if (block.src) {
          const frame = U.el("div", {
            class: "video-frame align-" + (block.align || "left"),
            style: block.width ? { width: block.width + "%" } : {},
          });

          let media;
          const stream = videoEmbedUrl(block.src);
          if (stream) {
            // YouTube o Vimeo: se reproduce dentro de su propio reproductor
            media = U.el("iframe", {
              src: stream, loading: "lazy", allowfullscreen: true,
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen",
              referrerpolicy: "no-referrer",
            });
          } else {
            // Archivo subido o enlace directo: reproductor nativo del navegador
            media = U.el("video", {
              controls: true, playsinline: true, preload: "metadata",
              poster: block.poster || null,
              onloadedmetadata: (e) => {
                if (!block.ratio) {
                  block.ratio = e.target.videoHeight / e.target.videoWidth;
                  frame.style.setProperty("--ratio", block.ratio);
                }
              },
            });
            Assets.attach(media, block.src);
            media.addEventListener("error", () =>
              frame.append(U.el("div", { class: "image-broken", text: "No se pudo cargar el vídeo." })));
          }
          if (block.ratio) frame.style.setProperty("--ratio", block.ratio);

          // Asas para ajustar el ancho, igual que en las imágenes
          ["left", "right"].forEach((side) => {
            const handle = U.el("div", { class: "image-handle handle-" + side });
            handle.addEventListener("mousedown", (e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = frame.offsetWidth;
              const containerW = frame.parentElement.offsetWidth;
              const onMove = (ev) => {
                const delta = (ev.clientX - startX) * (side === "right" ? 1 : -1);
                const pct = U.clamp(((startW + delta * 2) / containerW) * 100, 25, 100);
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

          const tools = U.el(
            "div", { class: "image-tools" },
            U.el("button", { class: "btn", text: "Reemplazar", onclick: (e) => openVideoPicker(block, e.currentTarget) }),
            U.el("button", {
              class: "btn", html: ICONS.palette, title: "Alineación",
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left - 60, y: r.bottom + 4, width: 180,
                  items: [
                    { label: "Izquierda", active: (block.align || "left") === "left",
                      onClick: () => { block.align = "left"; touch(); render(); } },
                    { label: "Centrado", active: block.align === "center",
                      onClick: () => { block.align = "center"; touch(); render(); } },
                    { label: "Derecha", active: block.align === "right",
                      onClick: () => { block.align = "right"; touch(); render(); } },
                    { type: "separator" },
                    { label: "Ancho completo", onClick: () => { block.width = 100; touch(); render(); } },
                  ],
                });
              },
            }),
            !stream ? U.el("button", {
              class: "btn", html: ICONS.import, title: "Descargar",
              onclick: async () => {
                const href = await Assets.url(block.src);
                if (!href) return U.toast("No se encontró el vídeo");
                U.el("a", { href, download: Assets.meta(Assets.idOf(block.src))?.name || "video" }).click();
              },
            }) : null
          );

          frame.append(media, tools);
          wrap.append(U.el("div", { class: "image-wrap video-wrap" }, frame, makeContent("image-caption")));
        } else {
          const empty = U.el("div", {
            class: "image-empty",
            html: ICONS.video + "<span>Añade un vídeo</span>",
            onclick: (e) => openVideoPicker(block, e.currentTarget),
            ondragover: (e) => { e.preventDefault(); empty.classList.add("is-over"); },
            ondragleave: () => empty.classList.remove("is-over"),
            ondrop: async (e) => {
              e.preventDefault();
              empty.classList.remove("is-over");
              const file = e.dataTransfer.files[0];
              if (!file) return;
              if (!/^video\//.test(file.type)) return U.toast("Ese archivo no es un vídeo");
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

      case "columns": {
        if (!block.cols || !block.cols.length)
          block.cols = [{ width: 50, blocks: [Store.makeBlock()] }, { width: 50, blocks: [Store.makeBlock()] }];
        const row = U.el("div", { class: "columns-row" });
        (block.cols || []).forEach((col, ci) => {
          const colHost = U.el("div", {
            class: "column",
            style: { flexBasis: (col.width || 100 / block.cols.length) + "%" },
          });
          const inner = U.el("div", { class: "column-inner" });
          if (!col.blocks || !col.blocks.length) col.blocks = [Store.makeBlock()];
          renderList(col.blocks, inner);
          inner.append(
            U.el("button", {
              class: "column-add", html: ICONS.plus + "<span>Añadir bloque</span>",
              onclick: () => {
                const b = Store.makeBlock();
                col.blocks.push(b);
                touch();
                render();
                focusBlock(b.id);
              },
            })
          );
          colHost.append(inner);

          // Divisor arrastrable entre columnas
          if (ci < block.cols.length - 1) {
            const divider = U.el("div", { class: "column-divider" });
            divider.addEventListener("mousedown", (e) => {
              e.preventDefault();
              const startX = e.clientX;
              const total = row.offsetWidth;
              const a = block.cols[ci], b2 = block.cols[ci + 1];
              const aStart = a.width || 100 / block.cols.length;
              const bStart = b2.width || 100 / block.cols.length;
              const onMove = (ev) => {
                const deltaPct = ((ev.clientX - startX) / total) * 100;
                const aNew = U.clamp(aStart + deltaPct, 12, aStart + bStart - 12);
                a.width = aNew;
                b2.width = aStart + bStart - aNew;
                colHost.style.flexBasis = a.width + "%";
                colHost.nextElementSibling.nextElementSibling.style.flexBasis = b2.width + "%";
              };
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                touch();
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            });
            row.append(colHost, divider);
          } else {
            row.append(colHost);
          }
        });
        wrap.append(row);
        break;
      }

      case "html":
        wrap.append(renderHtmlBlock(block));
        break;

      case "toc": {
        // Los encabezados pueden vivir dentro de columnas o destacados
        const collectHeadings = (list, out = []) => {
          list.forEach((b) => {
            if (b.type.startsWith("heading")) out.push(b);
            if (b.type === "columns") (b.cols || []).forEach((c) => collectHeadings(c.blocks || [], out));
            if (b.children && b.children.length) collectHeadings(b.children, out);
          });
          return out;
        };
        const heads = collectHeadings(page.blocks);
        wrap.append(
          U.el(
            "div", { class: "toc-block" },
            heads.length
              ? U.el("div", {}, ...heads.map((h) =>
                  U.el("button", {
                    class: "toc-link toc-" + h.type,
                    text: U.stripHtml(h.text) || "Sin título",
                    onclick: () => {
                      const node = document.querySelector(`.blocks [data-id="${h.id}"]`);
                      node?.scrollIntoView({ behavior: "smooth", block: "center" });
                      node?.classList.add("is-flash");
                      setTimeout(() => node?.classList.remove("is-flash"), 1200);
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

      case "linked-db": {
        const source = block.sourcePageId ? Store.getPage(block.sourcePageId) : null;
        if (!source || !source.db) {
          wrap.append(
            U.el("div", {
              class: "image-empty", html: ICONS.table + "<span>Elige la base de datos a mostrar</span>",
              onclick: () => pickLinkedSource(block),
            })
          );
          break;
        }
        const box = U.el("div", { class: "linked-db" });
        box.append(
          U.el("div", { class: "linked-bar" },
            U.el("span", { html: ICONS.link }),
            U.el("span", { text: `Vista enlazada de «${source.title || "Sin título"}»` }),
            U.el("button", { class: "btn", text: "Ir al original", onclick: () => Store.open(source.id) }),
            U.el("button", { class: "btn", text: "Cambiar", onclick: () => pickLinkedSource(block) })),
          Database.render(source, block, { linked: true })
        );
        wrap.append(box);
        break;
      }

      case "table": {
        wrap.append(renderSimpleTable(block));
        break;
      }

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

  /** Elige la base de datos de origen de una vista enlazada. */
  function pickLinkedSource(block) {
    const sources = Object.values(Store.state.pages).filter((p) => !p.deleted && p.db);
    Menus.open({
      x: window.innerWidth / 2 - 130, y: 160, width: 280, searchable: true,
      items: [
        { type: "label", label: "Mostrar la base de datos de…" },
        ...sources.map((p) => ({
          label: `${p.icon || "📄"} ${U.escapeHtml(p.title || "Sin título")}`,
          sub: p.db.name,
          active: block.sourcePageId === p.id,
          onClick: () => { block.sourcePageId = p.id; touch(); render(); },
        })),
      ],
    });
  }

  /** Tabla de texto sin base de datos detrás. */
  function renderSimpleTable(block) {
    const table = U.el("table", { class: "simple-table" + (block.headerRow ? " head-row" : "") + (block.headerCol ? " head-col" : "") });
    const body = U.el("tbody");

    (block.rows || []).forEach((row, r) => {
      const tr = U.el("tr");
      row.forEach((cell, c) => {
        const td = U.el(r === 0 && block.headerRow ? "th" : "td", {},
          U.el("div", {
            class: "st-cell", contenteditable: page.share?.locked ? "false" : "true",
            spellcheck: "false", html: cell || "",
            oninput: (e) => { block.rows[r][c] = U.sanitizeInline(e.target.innerHTML); Store.save(); },
            onkeydown: (e) => {
              e.stopPropagation();
              if (e.key === "Tab") {
                e.preventDefault();
                const cells = [...table.querySelectorAll(".st-cell")];
                const i = cells.indexOf(e.target);
                const next = cells[i + (e.shiftKey ? -1 : 1)];
                if (next) U.placeCaret(next, true);
              }
            },
          })
        );
        tr.append(td);
      });
      // Control de fila
      tr.append(
        U.el("td", { class: "st-ctl" },
          U.el("button", {
            class: "st-btn", html: ICONS.dots, title: "Fila",
            onclick: (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: rect.left - 160, y: rect.bottom + 4, width: 200,
                items: [
                  { label: "Insertar fila encima", icon: ICONS.plus,
                    onClick: () => { block.rows.splice(r, 0, block.rows[r].map(() => "")); touch(); render(); } },
                  { label: "Insertar fila debajo", icon: ICONS.plus,
                    onClick: () => { block.rows.splice(r + 1, 0, block.rows[r].map(() => "")); touch(); render(); } },
                  { type: "separator" },
                  { label: "Eliminar fila", icon: ICONS.trash, danger: true,
                    onClick: () => { if (block.rows.length > 1) { block.rows.splice(r, 1); touch(); render(); } } },
                ],
              });
            },
          })
        )
      );
      body.append(tr);
    });

    table.append(body);

    const tools = U.el(
      "div", { class: "st-tools" },
      U.el("button", {
        class: "btn", html: ICONS.plus + "<span>Fila</span>",
        onclick: () => { block.rows.push(block.rows[0].map(() => "")); touch(); render(); },
      }),
      U.el("button", {
        class: "btn", html: ICONS.plus + "<span>Columna</span>",
        onclick: () => { block.rows.forEach((r) => r.push("")); touch(); render(); },
      }),
      U.el("button", {
        class: "btn", text: "Quitar columna",
        onclick: () => {
          if (block.rows[0].length <= 1) return;
          block.rows.forEach((r) => r.pop());
          touch(); render();
        },
      }),
      U.el("button", {
        class: "btn" + (block.headerRow ? " is-on" : ""), text: "Encabezado de fila",
        onclick: () => { block.headerRow = !block.headerRow; touch(); render(); },
      }),
      U.el("button", {
        class: "btn" + (block.headerCol ? " is-on" : ""), text: "Encabezado de columna",
        onclick: () => { block.headerCol = !block.headerCol; touch(); render(); },
      })
    );

    return U.el("div", { class: "st-wrap" }, U.el("div", { class: "st-scroll" }, table), tools);
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

  function openVideoPicker(block, anchor) {
    Assets.pick({
      anchor, kind: "video", tabs: ["upload", "link", "recent"],
      onRemove: block.src ? () => { block.src = ""; delete block.ratio; touch(); render(); } : null,
      onPick: (value) => {
        block.src = value;
        delete block.ratio;
        touch();
        render();
      },
    });
  }

  /** YouTube o Vimeo → URL de su reproductor; null si es un archivo o enlace directo. */
  function videoEmbedUrl(src) {
    if (typeof src !== "string" || src.startsWith("asset:")) return null;
    try {
      const u = new URL(src);
      const host = u.hostname.replace("www.", "");
      if (host.endsWith("youtube.com") && u.searchParams.get("v"))
        return "https://www.youtube.com/embed/" + u.searchParams.get("v");
      if (host === "youtu.be") return "https://www.youtube.com/embed" + u.pathname;
      if (host.endsWith("vimeo.com") && /^\/\d+/.test(u.pathname))
        return "https://player.vimeo.com/video" + u.pathname;
      return null;
    } catch {
      return null;
    }
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
      // El blur se dispara mientras se reconstruye el DOM, con el nodo viejo
      // todavía conectado: escribir ahí pisaría el contenido nuevo.
      if (rendering || !node.isConnected) return;
      block.text = node.dataset.plain ? node.textContent : U.sanitizeInline(node.innerHTML);
      node.dataset.empty = String(!node.textContent.trim());
      Store.save();
      keepVersion();
    };

    node.addEventListener("input", () => {
      sync();
      if (applyMarkdown(block, node)) return;
      // Menú "/" en vivo
      if (Mention.isOpen()) {
        const at = Mention.ctx?.at ?? 0;
        const q = (node.textContent || "").slice(at + 1, U.caretOffset(node));
        if (q.length > 24 || Mention.paint(q) === 0) Mention.close();
      }
      if (Slash.isOpen()) {
        const at = Slash.ctx?.slashAt ?? 0;
        const q = (node.textContent || "").slice(at + 1, U.caretOffset(node));
        // Se permiten espacios: el menú sólo se cierra si ya no hay coincidencias.
        if (q.length > 30 || Slash.paint(q) === 0) Slash.close();
      }
    });

    node.addEventListener("keydown", (e) => {
      if (Slash.handleKey(e)) return;
      if (Mention.handleKey(e)) return;

      if (e.key === "@" && !e.ctrlKey && !e.metaKey) {
        const at = U.caretOffset(node);
        setTimeout(() => Mention.openFor(block, node, at), 0);
        return;
      }

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
        const siblings = listOf(block.id);
        const i = siblings.findIndex((b) => b.id === block.id);
        if (block.indent > 0) { e.preventDefault(); block.indent--; touch(); render(); focusBlock(block.id, false); return; }
        if (block.type !== "paragraph") { e.preventDefault(); setType(block.id, "paragraph"); return; }
        if (i > 0) {
          const prev = siblings[i - 1];
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
          siblings.splice(i, 1);
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
        const nearby = listOf(block.id);
        const i = nearby.findIndex((b) => b.id === block.id);
        const goUp = e.key === "ArrowUp";
        if ((goUp && U.atStart(node)) || (!goUp && U.atEnd(node))) {
          const target = nearby[i + (goUp ? -1 : 1)];
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
        const list = listOf(anchor);
        list.splice(list.findIndex((x) => x.id === anchor) + 1, 0, b);
        ownerOf.set(b.id, list);
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
    node.addEventListener("click", (e) => {
      const mention = e.target.closest?.(".mention-page");
      if (mention?.dataset.page) {
        e.preventDefault();
        Store.open(mention.dataset.page);
      }
    });
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
  const headingLevel = (b) => (b.type.startsWith("heading") ? Number(b.type.slice(-1)) : 0);

  /** Pinta una lista de bloques (la de la página o la de una columna). */
  function renderList(list, host, { tail = false } = {}) {
    let hideUntilIndent = null;
    let hideUnderHeading = null;

    list.forEach((block, i) => {
      // Contenido plegado por un desplegable
      if (hideUntilIndent !== null) {
        if ((block.indent || 0) > hideUntilIndent) return;
        hideUntilIndent = null;
      }
      // Contenido plegado por un encabezado desplegable
      if (hideUnderHeading !== null) {
        const lvl = headingLevel(block);
        if (!lvl || lvl > hideUnderHeading) return;
        hideUnderHeading = null;
      }

      host.append(renderBlock(block, i, list));

      if (block.type === "toggle" && !block.open) hideUntilIndent = block.indent || 0;
      if (headingLevel(block) && block.collapsible && block.open === false)
        hideUnderHeading = headingLevel(block);
    });

    if (tail) {
      host.append(
        U.el("div", {
          class: "blocks-tail",
          onclick: (e) => {
            if (e.target !== e.currentTarget) return;
            const last = list[list.length - 1];
            // Sólo reutiliza el último bloque si está vacío y además visible:
            // bajo una sección plegada no hay dónde poner el cursor.
            const visible = last && root.querySelector(`[data-id="${last.id}"]`);
            if (visible && last.type === "paragraph" && !U.stripHtml(last.text).trim()) {
              focusBlock(last.id);
              return;
            }
            // Si el final de la lista quedó dentro de una sección plegada, se
            // despliega para que el bloque nuevo sea visible.
            if (last && !visible) {
              for (let i = list.length - 1; i >= 0; i--) {
                const b = list[i];
                if (!headingLevel(b)) continue;
                if (b.collapsible && b.open === false) { b.open = true; break; }
                break;
              }
            }
            insertBlock(last ? last.id : null, Store.makeBlock());
          },
        })
      );
    }
  }

  function render() {
    if (!page || !root) return;
    const scroll = root.parentElement?.scrollTop;
    rendering = true;
    try {
      ownerOf.clear();
      indexBlocks(page.blocks);
      root.innerHTML = "";
      renderList(page.blocks, root, { tail: true });
    } finally {
      rendering = false;
    }
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
