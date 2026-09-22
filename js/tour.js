/* ==========================================================================
   Guía en tiempo real: recorrido guiado con foco, tarjetas animadas y
   demostraciones que se escriben solas. Se abre sola la primera vez que
   alguien entra y se puede repetir desde «Guía rápida».
   ========================================================================== */
const Tour = (() => {
  let node = null;      // capa de la guía
  let spot = null;      // recuadro del foco
  let card = null;      // tarjeta con el texto
  let idx = 0;
  let timers = [];
  let onKey = null;
  let onResize = null;

  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ----------------------------- Demostraciones ---------------------------
     Cada demo es una maqueta animada dentro de la tarjeta: enseña el gesto
     sin tocar el contenido real de quien mira. */

  /** Escribe un texto letra a letra dentro de un nodo. */
  async function typewriter(target, text, speed = 42) {
    const caret = U.el("i", { class: "demo-caret" });
    target.textContent = "";
    target.append(caret);
    for (const ch of text) {
      caret.before(document.createTextNode(ch));
      await wait(speed);
    }
  }

  const demos = {
    /* Escribir y convertir un bloque con «/» */
    async slash(box) {
      const line = U.el("div", { class: "demo-line" });
      const list = U.el("div", { class: "demo-menu" });
      box.append(U.el("div", { class: "demo-editor" }, line), list);
      const items = [
        [ICONS.text, "Texto"],
        [ICONS.h1, "Encabezado 1"],
        [ICONS.todo, "Lista de tareas"],
        [ICONS.table, "Base de datos"],
      ];
      while (box.isConnected) {
        list.innerHTML = "";
        list.classList.remove("is-open");
        await typewriter(line, "Ideas para el tráiler");
        await wait(500);
        await typewriter(line, "Ideas para el tráiler\n/lis", 60);
        list.classList.add("is-open");
        items.forEach(([ic, tx], i) => {
          const row = U.el("div", { class: "demo-menu-item" + (i === 2 ? " is-active" : ""), html: ic + `<span>${tx}</span>` });
          row.style.animationDelay = i * 40 + "ms";
          list.append(row);
        });
        await wait(1200);
        list.querySelector(".is-active")?.classList.add("is-pressed");
        await wait(320);
        list.classList.remove("is-open");
        line.innerHTML = '<span class="demo-todo"><i></i>Grabar plano de apertura</span>';
        await wait(1400);
      }
    },

    /* Seleccionar texto y darle formato */
    async formato(box) {
      const line = U.el("div", { class: "demo-line", html: 'El tráiler abre con un <span class="demo-sel">plano cenital</span> de la ciudad.' });
      const bar = U.el("div", { class: "demo-bar", html:
        ICONS.sparkle + '<b>B</b><i>i</i><u>U</u>' + ICONS.palette });
      box.append(U.el("div", { class: "demo-editor" }, line, bar));
      const sel = line.querySelector(".demo-sel");
      while (box.isConnected) {
        sel.className = "demo-sel";
        bar.classList.remove("is-open");
        await wait(700);
        sel.classList.add("is-selected");
        bar.classList.add("is-open");
        await wait(900);
        bar.children[1].classList.add("is-pressed");
        sel.classList.add("is-bold");
        await wait(700);
        bar.children[4].classList.add("is-pressed");
        sel.classList.add("is-colored");
        await wait(1500);
        bar.querySelectorAll(".is-pressed").forEach((n) => n.classList.remove("is-pressed"));
        sel.classList.remove("is-bold", "is-colored");
      }
    },

    /* Cambiar de vista en una base de datos */
    async vistas(box) {
      const tabs = U.el("div", { class: "demo-tabs" });
      const stage = U.el("div", { class: "demo-stage" });
      box.append(tabs, stage);
      const views = [
        ["Tabla", ICONS.table], ["Tablero", ICONS.board],
        ["Calendario", ICONS.calendar], ["Galería", ICONS.gallery],
      ];
      const tabEls = views.map(([n, ic]) => {
        const t = U.el("div", { class: "demo-tab", html: ic + `<span>${n}</span>` });
        tabs.append(t);
        return t;
      });
      const paint = (i) => {
        tabEls.forEach((t, j) => t.classList.toggle("is-active", i === j));
        stage.className = "demo-stage kind-" + i;
        stage.innerHTML = "";
        const cells = i === 0 ? 12 : i === 1 ? 9 : i === 2 ? 21 : 6;
        for (let c = 0; c < cells; c++) {
          const cell = U.el("div", { class: "demo-cell" });
          cell.style.animationDelay = c * 26 + "ms";
          stage.append(cell);
        }
      };
      let i = 0;
      paint(0);
      while (box.isConnected) {
        await wait(1800);
        i = (i + 1) % views.length;
        paint(i);
      }
    },

    /* Preguntar a Notion AI */
    async ia(box) {
      const prompt = U.el("div", { class: "demo-line" });
      const answer = U.el("div", { class: "demo-answer" });
      box.append(
        U.el("div", { class: "demo-ai" },
          U.el("div", { class: "demo-ai-head", html: ICONS.sparkle + "<span>Notion AI</span>" }),
          prompt, answer)
      );
      while (box.isConnected) {
        answer.innerHTML = "";
        await typewriter(prompt, "Resume esta página en 3 puntos");
        await wait(400);
        answer.innerHTML = '<div class="demo-dots"><i class="demo-dot"></i><i class="demo-dot"></i><i class="demo-dot"></i></div>';
        await wait(1100);
        answer.innerHTML = "";
        const pts = ["Rodaje en dos jornadas", "Entrega del corte el 14", "Falta aprobar la música"];
        for (const p of pts) {
          const row = U.el("div", { class: "demo-bullet", text: p });
          answer.append(row);
          await wait(320);
        }
        await wait(1800);
      }
    },

    /* Arrastrar un bloque */
    async arrastrar(box) {
      const rows = ["Guion", "Storyboard", "Rodaje"].map((t) =>
        U.el("div", { class: "demo-row", html: ICONS.grip + `<span>${t}</span>` }));
      box.append(U.el("div", { class: "demo-editor" }, ...rows));
      while (box.isConnected) {
        rows.forEach((r) => (r.className = "demo-row"));
        await wait(800);
        rows[2].classList.add("is-lift");
        await wait(500);
        rows[2].classList.add("is-moved");
        rows[0].classList.add("is-down");
        rows[1].classList.add("is-down");
        await wait(1400);
        rows[2].classList.remove("is-lift");
        await wait(900);
      }
    },
  };

  /* -------------------------------- Pasos -------------------------------- */
  const STEPS_COUNT = 9;
  const STEPS = [
    {
      hero: true,
      icon: "👋",
      title: "Bienvenido a tu Notion",
      body: "Te enseño en un minuto lo esencial: escribir, organizar y automatizar. Puedes salir cuando quieras con Esc.",
      hint: `1 minuto · ${STEPS_COUNT} pasos`,
    },
    {
      target: '#sidebar',
      placement: "right",
      icon: "🗂️",
      title: "Todo vive en el lateral",
      body: "Tus páginas se anidan unas dentro de otras como carpetas. Arrastra para reordenar, marca favoritos con la estrella y recupera lo borrado en la Papelera.",
      hint: "⌘\\ abre y cierra el lateral",
    },
    {
      target: '[data-tour="nueva-pagina"]',
      placement: "right",
      icon: "✨",
      title: "Una página en blanco, siempre",
      body: "Cada página tiene portada, icono y título. Dentro caben textos, tableros, calendarios, archivos y otras páginas.",
      demo: "arrastrar",
      hint: "Arrastra cualquier bloque por su manija ⠿",
    },
    {
      target: ['.page-body .blocks .block', '[data-tour="pagina"]'],
      placement: "left",
      icon: "⌨️",
      title: "Escribe y pulsa «/»",
      body: "Todo es un bloque. Escribe «/» y elige qué quieres insertar: encabezado, tarea, tabla, código, imagen… También funcionan los atajos de Markdown: «# » o «- ».",
      demo: "slash",
      hint: "«/» para insertar · «@» para mencionar",
    },
    {
      target: [".page-body .blocks .block-paragraph", '.page-body .blocks .block', '[data-tour="pagina"]'],
      placement: "left",
      icon: "🎨",
      title: "Selecciona para dar formato",
      body: "Al seleccionar texto aparece la barra flotante: negrita, color, enlace, comentario o convertirlo en otro bloque.",
      demo: "formato",
      hint: "⌘B negrita · ⌘E código · ⌘⇧H color",
    },
    {
      target: ['.page-body .db', '.page-body .block-table-db', '.page-body .blocks .block'],
      placement: "left",
      icon: "📊",
      title: "Una base, muchas vistas",
      body: "Los mismos datos se ven como tabla, tablero, calendario, galería o lista. Cada vista guarda sus filtros, su orden y qué propiedades muestra.",
      demo: "vistas",
      hint: "Fórmulas, relaciones y automatizaciones incluidas",
    },
    {
      target: '[data-tour="ia"]',
      placement: "right",
      icon: "🤖",
      title: "Notion AI y los agentes",
      body: "Pide resúmenes, traducciones o que continúe un texto. En «Agentes y rutinas» dejas trabajo programado: informes, recordatorios o skills propias.",
      demo: "ia",
      hint: "⌘J en cualquier página",
    },
    {
      target: '[data-tour="plantillas"]',
      placement: "right",
      icon: "🧩",
      title: "Empieza con una plantilla",
      body: "Hay plantillas listas para gestión de rodajes, guiones, CRM, hábitos o notas de reunión. Duplícalas y hazlas tuyas.",
      hint: "También puedes guardar las tuyas",
    },
    {
      hero: true,
      finale: true,
      icon: "🚀",
      title: "Listo, a crear",
      body: "Pulsa ⌘K para buscar cualquier cosa y ⌘/ para ver todos los atajos. Puedes volver a abrir esta guía desde «Guía rápida», abajo en el lateral.",
      hint: "Todas las funciones están desbloqueadas",
    },
  ];

  /* ------------------------------ Mecánica ------------------------------- */
  function targetOf(step) {
    if (!step.target) return null;
    // El paso puede ofrecer varios anclajes: se usa el primero que exista
    const sels = Array.isArray(step.target) ? step.target : [step.target];
    const el = sels.map((s) => document.querySelector(s)).find(Boolean);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? { el, r } : null;
  }

  function placeSpot(hit) {
    if (!hit) {
      spot.classList.add("is-hidden");
      return;
    }
    spot.classList.remove("is-hidden");
    const pad = 6;
    Object.assign(spot.style, {
      left: Math.max(4, hit.r.left - pad) + "px",
      top: Math.max(4, hit.r.top - pad) + "px",
      width: Math.min(window.innerWidth - 8, hit.r.width + pad * 2) + "px",
      height: Math.min(window.innerHeight - 8, hit.r.height + pad * 2) + "px",
    });
  }

  function placeCard(step, hit) {
    const mobile = window.innerWidth <= 760;
    card.classList.toggle("is-hero", !!step.hero);
    if (mobile || !hit) {
      card.classList.add("is-centered");
      card.style.left = card.style.top = "";
      return;
    }
    card.classList.remove("is-centered");
    const cr = card.getBoundingClientRect();
    const gap = 18;
    let left, top;
    if (step.placement === "right") left = hit.r.right + gap;
    else if (step.placement === "left") left = hit.r.left - cr.width - gap;
    else left = hit.r.left + hit.r.width / 2 - cr.width / 2;
    top = hit.r.top + hit.r.height / 2 - cr.height / 2;
    // Si no cabe a un lado, se pone al otro
    const sb = document.querySelector("#sidebar");
    const sbRight = sb && !document.body.classList.contains("sidebar-collapsed")
      ? sb.getBoundingClientRect().right : 0;
    const minLeft = Math.max(12, sbRight + 12);
    if (left < minLeft) left = Math.min(hit.r.right + gap, window.innerWidth - cr.width - 12);
    if (left < minLeft) left = minLeft;
    if (left + cr.width > window.innerWidth - 12) left = Math.max(minLeft, hit.r.left - cr.width - gap);
    top = Math.max(12, Math.min(top, window.innerHeight - cr.height - 12));
    card.style.left = Math.round(left) + "px";
    card.style.top = Math.round(top) + "px";
  }

  function render() {
    clearTimers();
    const step = STEPS[idx];
    const hit = targetOf(step);
    hit?.el.scrollIntoView?.({ block: "center", behavior: "smooth" });

    card.innerHTML = "";
    card.classList.remove("is-in");
    const demoBox = step.demo ? U.el("div", { class: "tour-demo demo-" + step.demo }) : null;

    [
      U.el("div", { class: "tour-head" },
        U.el("div", { class: "tour-emoji", text: step.icon }),
        U.el("div", { class: "tour-titles" },
          U.el("div", { class: "tour-step", text: `Paso ${idx + 1} de ${STEPS.length}` }),
          U.el("h3", { text: step.title })),
        U.el("button", { class: "tour-x", html: ICONS.x, title: "Cerrar (Esc)", onclick: () => finish(false) })),
      U.el("p", { class: "tour-body", text: step.body }),
      demoBox,
      step.hint ? U.el("div", { class: "tour-hint", text: step.hint }) : null,
      U.el("div", { class: "tour-foot" },
        U.el("div", { class: "tour-dots" },
          ...STEPS.map((_, i) =>
            U.el("button", {
              class: "tour-dot" + (i === idx ? " is-on" : i < idx ? " is-done" : ""),
              title: `Paso ${i + 1}`, onclick: () => { idx = i; render(); },
            }))),
        U.el("div", { class: "tour-btns" },
          idx > 0 ? U.el("button", { class: "btn", text: "Atrás", onclick: () => { idx--; render(); } }) : null,
          U.el("button", {
            class: "btn btn-primary",
            text: step.finale ? "Empezar" : idx === 0 ? "Vamos allá" : "Siguiente",
            onclick: () => next(),
          }))),
      U.el("div", { class: "tour-progress" },
        U.el("i", { style: { width: ((idx + 1) / STEPS.length) * 100 + "%" } })),
    ].filter(Boolean).forEach((n) => card.append(n));

    placeSpot(hit);
    placeCard(step, hit);
    requestAnimationFrame(() => {
      card.classList.add("is-in");
      placeCard(step, hit);
    });
    if (demoBox) demos[step.demo]?.(demoBox);
  }

  function next() {
    if (idx >= STEPS.length - 1) return finish(true);
    idx++;
    render();
  }

  function start({ manual = false } = {}) {
    if (node) finish(false);
    idx = 0;
    node = U.el("div", { class: "tour-layer" + (manual ? " is-manual" : "") });
    spot = U.el("div", { class: "tour-spot" });
    card = U.el("div", { class: "tour-card", role: "dialog", "aria-label": "Guía rápida" });
    const skip = U.el("button", { class: "tour-skip", text: "Saltar guía", onclick: () => finish(false) });
    node.append(spot, card, skip);
    document.body.append(node);
    document.body.classList.add("tour-open");

    onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); idx--; render(); }
    };
    onResize = () => { const s = STEPS[idx]; const h = targetOf(s); placeSpot(h); placeCard(s, h); };
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    render();
  }

  function finish(completed) {
    clearTimers();
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onResize, true);
    node?.classList.add("is-out");
    const dying = node;
    setTimeout(() => dying?.remove(), 220);
    node = spot = card = null;
    document.body.classList.remove("tour-open");
    Store.state.seenTour = true;
    Store.save();
    if (completed) U.toast("Guía terminada — pulsa ⌘K para buscar cualquier cosa");
  }

  /** Se abre sola la primera vez, después del anuncio de novedades. */
  function maybeAutoStart(delay = 700) {
    if (Store.state.seenTour) return;
    setTimeout(() => {
      if (Store.state.seenTour) return;          // se marcó vista mientras esperaba
      if (!document.querySelector(".overlay")) start();
      else maybeAutoStart(900);
    }, delay);
  }

  return { start, maybeAutoStart, STEPS };
})();
