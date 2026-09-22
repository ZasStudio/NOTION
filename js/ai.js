/* ==========================================================================
   Notion AI: asistente de escritura sobre bloques y bases de datos.

   Funciona en dos modos:
   · local  — transformaciones deterministas que corren sin red ni claves.
   · claude — si el usuario conecta su propia clave, usa la API de Anthropic.
   ========================================================================== */
const AI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const DEFAULT_MODEL = "claude-opus-5";

  const MODELS = [
    { id: "claude-opus-5", name: "Claude Opus 5", note: "El más capaz" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", note: "Equilibrado" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", note: "El más rápido" },
  ];

  const hasKey = () => !!(Store.state.aiKey || "").trim();
  const mode = () => (hasKey() ? "claude" : "local");

  /* ======================== Motor local (sin red) ========================= */
  const STOP = new Set(
    ("de la que el en y a los se del las un por con no una su para es al lo como más o pero sus " +
     "the of to and a in is it for on with as this that are be or from an by at we you your").split(" ")
  );

  const sentences = (text) =>
    String(text)
      .split(/\n+/)
      .flatMap((line) => line.match(/[^.!?…]+[.!?…]?/g) || [])
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 1);

  const words = (text) =>
    text.toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];

  /** Resumen extractivo: puntúa frases por frecuencia de términos relevantes. */
  function summarize(text, max = 3) {
    const ss = sentences(text);
    if (ss.length <= max) return ss;
    const freq = {};
    words(text).forEach((w) => {
      if (STOP.has(w) || w.length < 4) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    const scored = ss.map((s, i) => {
      const ws = words(s).filter((w) => !STOP.has(w));
      const score = ws.reduce((n, w) => n + (freq[w] || 0), 0) / Math.max(ws.length, 1);
      return { s, i, score: score + (i === 0 ? 0.6 : 0) };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.s);
  }

  const ACTION_HINTS = /(hay que|debemos|necesitamos|pendiente|revisar|enviar|preparar|definir|agendar|confirmar|escribir|actualizar|crear|contactar|cerrar|decidir|todo:)/i;

  /** Extrae frases accionables y las normaliza como tareas. */
  function actionItems(text) {
    const found = sentences(text)
      .filter((s) => ACTION_HINTS.test(s))
      .map((s) =>
        s.replace(/^(hay que|debemos|necesitamos|todo:)\s*/i, "")
          .replace(/[.!?…]+$/, "")
          .trim()
      )
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    return [...new Set(found)];
  }

  const FILLER = /\b(realmente|básicamente|simplemente|un poco|como que|en realidad|obviamente|literalmente)\s*/gi;

  /** Limpieza de redacción: quita muletillas, dobles espacios y cierra frases. */
  function improve(text) {
    let out = text.replace(FILLER, "").replace(/\s{2,}/g, " ").trim();
    out = out.replace(/([.!?…])\s*([a-záéíóúñ])/g, (m, p, c) => `${p} ${c.toUpperCase()}`);
    out = out.charAt(0).toUpperCase() + out.slice(1);
    if (out && !/[.!?…:]$/.test(out)) out += ".";
    return out;
  }

  const shorten = (text) => {
    const ss = sentences(text);
    return ss
      .map((s) => s.split(/,\s*/)[0].replace(/[.!?…]+$/, ""))
      .slice(0, Math.max(1, Math.ceil(ss.length / 2)))
      .join(". ") + ".";
  };

  const TONE = {
    formal: [[/\bhola\b/gi, "Estimado equipo"], [/\bchido|genial\b/gi, "excelente"],
             [/\bok\b/gi, "de acuerdo"], [/\bcosas\b/gi, "aspectos"], [/\bhacer\b/gi, "realizar"]],
    casual: [[/\bestimado equipo\b/gi, "Hola"], [/\bexcelente\b/gi, "genial"],
             [/\bde acuerdo\b/gi, "ok"], [/\baspectos\b/gi, "cosas"], [/\brealizar\b/gi, "hacer"]],
  };

  const tone = (text, kind) =>
    (TONE[kind] || []).reduce((s, [re, to]) => s.replace(re, to), text);

  const toBullets = (text) => sentences(text).map((s) => s.replace(/[.!?…]+$/, ""));

  const keywords = (text, n = 6) => {
    const freq = {};
    words(text).forEach((w) => {
      if (STOP.has(w) || w.length < 5) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
  };

  /* ===================== Motor Claude (clave del usuario) ================== */
  async function callClaude(prompt, { system, maxTokens = 4000 } = {}) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Store.state.aiKey.trim(),
        "anthropic-version": "2023-06-01",
        // Necesario para llamar a la API directamente desde el navegador.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: Store.state.aiModel || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: system || "Eres el asistente de escritura de un editor tipo Notion. Responde en el mismo idioma del texto del usuario, sin preámbulos ni explicaciones: devuelve únicamente el contenido pedido.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`La API respondió ${res.status}. ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.stop_reason === "refusal") throw new Error("El modelo declinó responder a esta petición.");
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }

  /* =============================== Acciones =============================== */
  const ACTIONS = [
    { id: "summary", name: "Resumir", icon: "list", needsText: true,
      prompt: (t) => `Resume el siguiente texto en 3 viñetas breves:\n\n${t}` },
    { id: "tasks", name: "Extraer tareas", icon: "todo", needsText: true,
      prompt: (t) => `Extrae las tareas accionables del texto como lista, una por línea, empezando por un verbo:\n\n${t}` },
    { id: "improve", name: "Mejorar redacción", icon: "sparkle", needsText: true,
      prompt: (t) => `Mejora la redacción de este texto conservando el significado y el idioma:\n\n${t}` },
    { id: "shorten", name: "Acortar", icon: "text", needsText: true,
      prompt: (t) => `Acorta este texto a la mitad conservando lo esencial:\n\n${t}` },
    { id: "expand", name: "Alargar", icon: "text", needsText: true, apiOnly: true,
      prompt: (t) => `Desarrolla este texto con más detalle, en el mismo tono e idioma:\n\n${t}` },
    { id: "bullets", name: "Convertir en viñetas", icon: "bullet", needsText: true,
      prompt: (t) => `Convierte este texto en una lista de viñetas concisas:\n\n${t}` },
    { id: "formal", name: "Tono profesional", icon: "quote", needsText: true,
      prompt: (t) => `Reescribe este texto en un tono profesional:\n\n${t}` },
    { id: "casual", name: "Tono cercano", icon: "quote", needsText: true,
      prompt: (t) => `Reescribe este texto en un tono cercano y directo:\n\n${t}` },
    { id: "translate_en", name: "Traducir al inglés", icon: "link", needsText: true, apiOnly: true,
      prompt: (t) => `Traduce al inglés:\n\n${t}` },
    { id: "translate_es", name: "Traducir al español", icon: "link", needsText: true, apiOnly: true,
      prompt: (t) => `Traduce al español:\n\n${t}` },
    { id: "continue", name: "Continuar escribiendo", icon: "rename", apiOnly: true,
      prompt: (t) => `Continúa escribiendo este documento con uno o dos párrafos coherentes:\n\n${t}` },
    { id: "brainstorm", name: "Lluvia de ideas", icon: "sparkle", apiOnly: true,
      prompt: (t) => `Propón 6 ideas en lista sobre:\n\n${t}` },
    { id: "outline", name: "Esquema de la página", icon: "h2",
      prompt: (t) => `Escribe un esquema con encabezados para un documento sobre:\n\n${t}` },
  ];

  /** Ejecuta una acción; devuelve texto plano (líneas separadas por \n). */
  async function run(actionId, text, custom) {
    const action = ACTIONS.find((a) => a.id === actionId);
    Store.state.aiUsed = (Store.state.aiUsed || 0) + 1;
    History.log("ai.run", action ? action.name : "Pregunta libre");

    if (hasKey()) {
      const prompt = custom
        ? `${custom}\n\n---\nTexto de referencia:\n${text || "(vacío)"}`
        : action.prompt(text);
      return await callClaude(prompt);
    }

    // ---- Modo local ----
    if (custom) {
      const ideas = keywords(text || custom, 5);
      return [
        `Nota: sin clave de Claude conectada, respondo en modo local.`,
        `Pregunta: ${custom}`,
        ideas.length ? `Términos clave del contexto: ${ideas.join(", ")}.` : "",
        text ? `Resumen del contexto: ${summarize(text, 2).join(" ")}` : "",
      ].filter(Boolean).join("\n");
    }

    switch (actionId) {
      case "summary": return summarize(text, 3).join("\n");
      case "tasks": {
        const items = actionItems(text);
        return items.length ? items.join("\n") : "No encontré frases accionables en el texto.";
      }
      case "improve": return improve(text);
      case "shorten": return shorten(text);
      case "bullets": return toBullets(text).join("\n");
      case "formal": return improve(tone(text, "formal"));
      case "casual": return tone(text, "casual");
      case "outline": {
        const ks = keywords(text, 4);
        return ["Contexto", "Objetivos", ...ks.map((k) => k.charAt(0).toUpperCase() + k.slice(1)), "Próximos pasos"].join("\n");
      }
      default:
        throw new Error("Esta acción necesita una clave de Claude conectada. Actívala en Ajustes → Notion AI.");
    }
  }

  /* ================================ Panel ================================= */
  let panel = null;
  const closePanel = () => { panel?.remove(); panel = null; };

  /**
   * Abre el panel de IA.
   * ctx: { page, block, anchor }  — block opcional (si no, trabaja con la página)
   */
  function open(ctx) {
    closePanel();
    const { page, block, anchor } = ctx;
    const sourceText = block
      ? U.stripHtml(block.text)
      : page.blocks.map((b) => U.stripHtml(b.text)).filter(Boolean).join("\n");

    let result = "";
    const output = U.el("div", { class: "ai-output" });
    const actionsRow = U.el("div", { class: "ai-result-actions" });

    const input = U.el("input", {
      class: "ai-input",
      placeholder: block ? "Pide algo sobre este bloque…" : "Pide algo sobre esta página…",
      onkeydown: (e) => {
        if (e.key === "Escape") return closePanel();
        if (e.key === "Enter" && e.target.value.trim()) execute(null, e.target.value.trim());
        e.stopPropagation();
      },
    });

    const listWrap = U.el("div", { class: "ai-actions" });
    const paintList = (q = "") => {
      listWrap.innerHTML = "";
      ACTIONS.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase())).forEach((a) =>
        listWrap.append(
          U.el(
            "button",
            { class: "menu-item", onclick: () => execute(a.id) },
            U.el("span", { html: ICONS[a.icon] || ICONS.sparkle }),
            U.el("span", { class: "menu-item-body", text: a.name }),
            a.apiOnly && !hasKey()
              ? U.el("span", { class: "menu-hint", text: "requiere Claude" })
              : null
          )
        )
      );
    };
    input.addEventListener("input", (e) => paintList(e.target.value));

    async function execute(actionId, custom) {
      listWrap.style.display = "none";
      output.innerHTML = "";
      output.append(U.el("div", { class: "ai-loading" }, U.el("span", { class: "ai-dot" }),
        U.el("span", { text: hasKey() ? "Claude está escribiendo…" : "Procesando…" })));
      actionsRow.innerHTML = "";
      try {
        result = await run(actionId, sourceText, custom);
        output.innerHTML = "";
        output.append(U.el("div", { class: "ai-text", text: result }));
        actionsRow.append(
          U.el("button", { class: "btn btn-primary", text: block ? "Reemplazar" : "Insertar al final", onclick: apply }),
          U.el("button", { class: "btn", text: "Insertar debajo", onclick: () => insertBelow() }),
          U.el("button", { class: "btn", text: "Reintentar", onclick: () => execute(actionId, custom) }),
          U.el("button", { class: "btn", text: "Descartar", onclick: closePanel })
        );
      } catch (err) {
        output.innerHTML = "";
        output.append(U.el("div", { class: "ai-error", text: err.message }));
        actionsRow.append(
          U.el("button", { class: "btn", text: "Conectar Claude", onclick: () => { closePanel(); settings(); } }),
          U.el("button", { class: "btn", text: "Cerrar", onclick: closePanel })
        );
      }
    }

    const lines = () => result.split("\n").map((l) => l.trim()).filter(Boolean);

    function apply() {
      Store.snapshot();
      if (block) {
        block.text = U.escapeHtml(result.replace(/\n+/g, " "));
      } else {
        lines().forEach((line) => {
          const isBullet = /^[-•*]\s+/.test(line);
          page.blocks.push(Store.makeBlock(isBullet ? "bulleted" : "paragraph", {
            text: U.escapeHtml(line.replace(/^[-•*]\s+/, "")),
          }));
        });
      }
      Store.recordVersion(page.id, "Notion AI");
      Store.updatePage(page.id, {});
      closePanel();
      App.renderPage(true);
      U.toast("Texto aplicado");
    }

    function insertBelow() {
      Store.snapshot();
      const at = block ? page.blocks.findIndex((b) => b.id === block.id) + 1 : page.blocks.length;
      const made = lines().map((line) => {
        const isTask = /^\[?\s?[-•*]?\s*(todo|tarea)?:?/i.test(line) && /^[-•*]\s+/.test(line);
        return Store.makeBlock(isTask ? "todo" : /^[-•*]\s+/.test(line) ? "bulleted" : "paragraph", {
          text: U.escapeHtml(line.replace(/^[-•*]\s+/, "")),
        });
      });
      page.blocks.splice(at, 0, ...made);
      Store.recordVersion(page.id, "Notion AI");
      Store.updatePage(page.id, {});
      closePanel();
      App.renderPage(true);
      U.toast(`${made.length} bloque(s) insertado(s)`);
    }

    panel = U.el(
      "div", { class: "ai-panel" },
      U.el(
        "div", { class: "ai-head" },
        U.el("span", { class: "ai-badge", html: ICONS.sparkle + "<span>Notion AI</span>" }),
        U.el("span", {
          class: "ai-mode" + (hasKey() ? " is-live" : ""),
          text: hasKey() ? (Store.state.aiModel || DEFAULT_MODEL) : "modo local",
        }),
        U.el("button", { class: "icon-btn", html: ICONS.settings, title: "Ajustes de IA", onclick: () => { closePanel(); settings(); } })
      ),
      input, output, actionsRow, listWrap
    );

    document.body.append(panel);
    const rect = (anchor || document.body).getBoundingClientRect();
    panel.style.left = U.clamp(rect.left, 12, window.innerWidth - panel.offsetWidth - 12) + "px";
    panel.style.top = U.clamp(rect.bottom + 8, 12, window.innerHeight - panel.offsetHeight - 12) + "px";
    paintList();
    input.focus();

    setTimeout(() => {
      const away = (e) => {
        if (panel && !panel.contains(e.target)) { closePanel(); document.removeEventListener("mousedown", away, true); }
      };
      document.addEventListener("mousedown", away, true);
    }, 0);
  }

  /* ============================ Ajustes de IA ============================== */
  function settings() {
    const keyInput = U.el("input", {
      class: "menu-input", type: "password", placeholder: "sk-ant-…",
      value: Store.state.aiKey || "", style: { margin: 0, width: "100%" },
    });

    const card = U.el(
      "div", { class: "modal", style: { width: "min(520px, 92vw)" } },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Notion AI" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      U.el(
        "div", { class: "ai-settings" },
        U.el("p", { class: "features-intro", text: "La IA funciona sin configurar nada en modo local: resúmenes, extracción de tareas, limpieza de redacción, viñetas y tono. Para generación y traducción, conecta tu propia clave de Anthropic." }),
        U.el("label", { class: "ai-field" },
          U.el("span", { text: "Clave de API de Anthropic" }), keyInput),
        U.el("div", { class: "ai-warning", html: ICONS.lock +
          "<span>La clave se guarda solo en este navegador y viaja directo a api.anthropic.com. En producción, llama a la API desde tu servidor en lugar del navegador.</span>" }),
        U.el("label", { class: "ai-field" },
          U.el("span", { text: "Modelo" }),
          U.el("select", {
            class: "menu-input", style: { margin: 0, width: "100%" },
            onchange: (e) => { Store.state.aiModel = e.target.value; Store.emit(); },
          }, ...MODELS.map((m) =>
            U.el("option", { value: m.id, selected: (Store.state.aiModel || DEFAULT_MODEL) === m.id },
              `${m.name} — ${m.note}`)))),
        U.el("div", { class: "ai-stats", text: `Acciones de IA usadas: ${Store.state.aiUsed || 0} · sin límite` })
      ),
      U.el(
        "div", { class: "features-foot" },
        U.el("button", {
          class: "btn", text: "Quitar clave",
          onclick: () => { Store.state.aiKey = ""; Store.emit(); modal.close(); U.toast("Clave eliminada"); },
        }),
        U.el("button", {
          class: "btn btn-primary", text: "Guardar",
          onclick: () => {
            Store.state.aiKey = keyInput.value.trim();
            Store.emit();
            modal.close();
            U.toast(hasKey() ? "Claude conectado" : "Guardado en modo local");
          },
        })
      )
    );
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ==================== Autorrelleno en bases de datos ==================== */
  async function autofill(db, prop, rows) {
    const titleProp = db.props.find((p) => p.type === "title") || db.props[0];
    let done = 0;
    for (const row of rows) {
      const title = row.cells[titleProp.id];
      if (!title) continue;
      try {
        if (hasKey()) {
          const context = db.props
            .filter((p) => p.id !== prop.id && row.cells[p.id])
            .map((p) => `${p.name}: ${row.cells[p.id]}`)
            .join("; ");
          const ask =
            prop.type === "select" || prop.type === "multi_select"
              ? `Elige la opción más adecuada entre: ${prop.options.map((o) => o.name).join(", ")}. Responde solo con la opción.`
              : prop.type === "number"
              ? "Responde solo con un número."
              : "Responde con una frase muy breve.";
          const out = await callClaude(
            `Para el registro «${title}»${context ? ` (${context})` : ""}, completa la propiedad «${prop.name}». ${ask}`,
            { maxTokens: 200 }
          );
          row.cells[prop.id] = prop.type === "number" ? Number(out.replace(/[^\d.-]/g, "")) || 0
            : prop.type === "multi_select" ? [out.split(/,\s*/)[0]] : out.split("\n")[0];
        } else {
          // Modo local: deduce a partir del propio contenido de la fila.
          if (prop.type === "select" && prop.options.length) {
            const text = Object.values(row.cells).join(" ").toLowerCase();
            const hit = prop.options.find((o) => text.includes(o.name.toLowerCase()));
            row.cells[prop.id] = (hit || prop.options[0]).name;
          } else if (prop.type === "number") {
            row.cells[prop.id] = words(String(title)).length;
          } else if (prop.type === "date") {
            row.cells[prop.id] = U.today();
          } else {
            row.cells[prop.id] = summarize(String(title), 1)[0] || String(title);
          }
        }
        done++;
      } catch (err) {
        U.toast("IA: " + err.message);
        break;
      }
    }
    Store.state.aiUsed = (Store.state.aiUsed || 0) + done;
    History.log("ai.run", `Autorrelleno de «${prop.name}» en ${done} filas`);
    Store.save();
    return done;
  }

  return {
    ACTIONS, MODELS, open, settings, run, autofill, hasKey, mode, closePanel,
    summarize, actionItems, improve, keywords,
  };
})();
