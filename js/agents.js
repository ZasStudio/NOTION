/* ==========================================================================
   Skills, conexiones MCP y rutinas con agentes
   (las tres funciones que anuncia el modal «We've been cooking!»)
   ========================================================================== */
const Agents = (() => {

  /* ================================ Skills ================================ */
  function skills() {
    let current = Store.state.skills[0]?.id || null;

    const list = U.el("div", { class: "sk-list" });
    const editor = U.el("div", { class: "sk-editor" });

    const paintList = () => {
      list.innerHTML = "";
      Store.state.skills.forEach((s) => {
        list.append(
          U.el(
            "button",
            {
              class: "sk-item" + (s.id === current ? " is-active" : ""),
              onclick: () => { current = s.id; paintList(); paintEditor(); },
            },
            U.el("span", { class: "sk-icon", text: s.icon }),
            U.el(
              "span", { class: "sk-meta" },
              U.el("span", { class: "sk-name", text: s.name }),
              U.el("span", { class: "sk-sub", text: `v${s.version} · ${U.timeAgo(s.updatedAt)}` })
            ),
            s.enabled ? U.el("span", { class: "sk-on", html: ICONS.check }) : null
          )
        );
      });
      list.append(
        U.el("button", {
          class: "sk-item sk-new", html: ICONS.plus + "<span>Nueva skill</span>",
          onclick: () => { current = Store.saveSkill({}).id; paintList(); paintEditor(); },
        })
      );
    };

    const paintEditor = () => {
      editor.innerHTML = "";
      const s = Store.skill(current);
      if (!s) {
        editor.append(U.el("div", { class: "cm-empty", text: "Elige o crea una skill." }));
        return;
      }

      const name = U.el("input", { class: "sk-title", value: s.name });
      const desc = U.el("input", {
        class: "menu-input", style: { margin: 0, width: "100%" },
        value: s.description, placeholder: "Para qué sirve, en una línea",
      });
      const body = U.el("div", {
        class: "sk-body", contenteditable: "true", spellcheck: "false", text: s.body,
      });

      editor.append(
        U.el(
          "div", { class: "sk-head" },
          U.el("button", {
            class: "sk-emoji", text: s.icon, title: "Cambiar icono",
            onclick: (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              Menus.emojiMenu({
                x: r.left, y: r.bottom + 6,
                onPick: (emo) => { Store.saveSkill({ id: s.id, icon: emo }); paintList(); paintEditor(); },
              });
            },
          }),
          name,
          U.el("span", { class: "chip", text: "SKILL.md" }),
          U.el("button", {
            class: "switch" + (s.enabled ? " is-on" : ""),
            title: "Disponible para la IA",
            onclick: (e) => {
              Store.saveSkill({ id: s.id, enabled: !s.enabled });
              e.currentTarget.classList.toggle("is-on", !s.enabled);
              paintList();
            },
          })
        ),
        desc,
        body,
        U.el(
          "div", { class: "sk-foot" },
          U.el("span", { class: "sk-sub", text: `Versión ${s.version}. Al guardar sube a la ${s.version + 1} y los agentes que la usan ven la insignia de actualizada.` }),
          U.el("button", {
            class: "btn", text: "Eliminar", style: { color: "var(--c-red)" },
            onclick: () => {
              if (!confirm(`¿Eliminar la skill «${s.name}»?`)) return;
              Store.deleteSkill(s.id);
              current = Store.state.skills[0]?.id || null;
              paintList(); paintEditor();
            },
          }),
          U.el("button", {
            class: "btn btn-primary", text: "Guardar",
            onclick: () => {
              Store.saveSkill({
                id: s.id, name: name.value.trim() || "Sin nombre",
                description: desc.value.trim(), body: body.textContent,
              });
              History.log("skill.save", name.value.trim());
              paintList(); paintEditor();
              U.toast("Skill guardada");
            },
          })
        )
      );
    };

    const card = U.el(
      "div", { class: "modal agents-modal" },
      U.el("div", { class: "ag-side" },
        U.el("div", { class: "menu-label", text: "Skills del espacio" }), list),
      U.el("div", { class: "ag-main" },
        U.el("div", { class: "tpl-head" },
          U.el("h2", { text: "Skills" }),
          U.el("span", { class: "share-mail", text: "Instrucciones que tu equipo mantiene en un solo lugar" }),
          U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
        editor)
    );

    paintList();
    paintEditor();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ============================= Conexiones MCP ============================ */
  const SAMPLES = {
    mensajes: {
      name: "Mensajes de Slack",
      props: [["Mensaje", "title"], ["Canal", "select"], ["Autor", "person"], ["Fecha", "date"]],
      rows: [
        ["El deploy de ayer dejó el editor lento", "#incidencias", "Ana", U.today()],
        ["¿Movemos la demo al jueves?", "#producto", "Luis", U.today()],
        ["Nueva cuenta firmada 🎉", "#ventas", "Sofía", U.today()],
      ],
    },
    issues: {
      name: "Issues de GitHub",
      props: [["Issue", "title"], ["Estado", "select"], ["Etiqueta", "multi_select"], ["Autor", "person"]],
      rows: [
        ["El menú / no cierra con Escape", "Abierto", ["bug"], "Marco"],
        ["Soporte de columnas en el editor", "Abierto", ["enhancement"], "Ana"],
        ["Migrar el store a v2", "Cerrado", ["chore"], "Luis"],
      ],
    },
    metricas: {
      name: "Eventos de Mixpanel",
      props: [["Evento", "title"], ["Usuarios", "number"], ["Semana", "date"]],
      rows: [["page_created", 1284, U.today()], ["ai_action_run", 642, U.today()], ["db_view_changed", 310, U.today()]],
    },
    tableros: {
      name: "Tableros de Miro",
      props: [["Tablero", "title"], ["Equipo", "select"], ["Última edición", "date"]],
      rows: [["Mapa de onboarding", "Producto", U.today()], ["Arquitectura v2", "Ingeniería", U.today()]],
    },
    archivos: {
      name: "Archivos de Box",
      props: [["Archivo", "title"], ["Tipo", "select"], ["Tamaño", "text"]],
      rows: [["Contrato-Acme.pdf", "PDF", "240 KB"], ["Brand-kit.zip", "ZIP", "18 MB"]],
    },
    transacciones: {
      name: "Transacciones de Mercury",
      props: [["Concepto", "title"], ["Importe", "number"], ["Fecha", "date"]],
      rows: [["Suscripción anual", -1200, U.today()], ["Pago de cliente", 8400, U.today()]],
    },
  };

  function importFromConnection(conn) {
    const sample = SAMPLES[conn.sample];
    if (!sample) return U.toast("Esta conexión no trae datos de ejemplo");
    const props = sample.props.map(([name, type]) => Templates.prop(name, type,
      type === "select" || type === "multi_select"
        ? [...new Set(sample.rows.flatMap((r) => {
            const v = r[sample.props.findIndex((p) => p[0] === name)];
            return Array.isArray(v) ? v : [v];
          }))]
        : []));
    const db = Templates.db(sample.name, props, sample.rows);
    const page = Store.createPage({
      title: sample.name,
      icon: conn.icon,
      blocks: [
        Store.makeBlock("callout", {
          text: `Datos traídos desde <strong>${U.escapeHtml(conn.name)}</strong> vía MCP. En esta demo son datos de ejemplo, no una sincronización real.`,
          emoji: "🔌", color: "blue",
        }),
        Store.makeBlock("table-db"),
      ],
      db,
    });
    History.log("mcp.import", `${sample.name} desde ${conn.name}`);
    Store.open(page.id);
    U.toast(`Importado desde ${conn.name}`);
  }

  function connections() {
    const grid = U.el("div", { class: "cx-grid" });

    const paint = () => {
      grid.innerHTML = "";
      Store.state.connections.forEach((c) => {
        grid.append(
          U.el(
            "div", { class: "cx-card" + (c.connected ? " is-on" : "") },
            U.el("div", { class: "cx-top" },
              U.el("span", { class: "cx-icon", text: c.icon }),
              U.el("div", {},
                U.el("div", { class: "cx-name", text: c.name }),
                U.el("div", { class: "cx-sub", text: c.connected ? `Conectado · ${U.timeAgo(c.lastSync)}` : "Sin conectar" })),
              U.el("button", {
                class: "switch" + (c.connected ? " is-on" : ""),
                onclick: () => { Store.toggleConnection(c.id); paint(); },
              })),
            U.el("div", { class: "cx-tools" },
              ...c.tools.map((t) => U.el("span", { class: "tag", text: t }))),
            U.el("button", {
              class: "btn btn-bordered cx-import", text: "Traer datos a una página",
              disabled: !c.connected,
              onclick: () => { importFromConnection(c); modal.close(); },
            })
          )
        );
      });
    };

    const card = U.el(
      "div", { class: "modal features-modal" },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Conexiones MCP" }),
        U.el("span", { class: "chip chip-pro", text: "Model Context Protocol" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      U.el("p", { class: "features-intro", text: "Las conexiones dan herramientas a los agentes. Actívalas y podrán traer contenido a tus páginas. En esta demo local los datos son de ejemplo: no hay llamadas a servicios externos." }),
      grid
    );
    paint();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ========================= Rutinas y agentes ============================= */
  const COLUMNS = [
    { id: "todo", name: "Pendiente" },
    { id: "doing", name: "En curso" },
    { id: "done", name: "Listo" },
  ];

  /** Ejecuta una rutina: corre la acción de IA y escribe el resultado. */
  async function runRoutine(routine, { silent = false } = {}) {
    const page = Store.getPage(routine.targetPageId) || Store.getPage(Store.state.openId);
    if (!page) {
      U.toast("La rutina no tiene página de destino");
      return null;
    }
    routine.status = "doing";
    Store.emit();

    const source = page.blocks.map((b) => U.stripHtml(b.text)).filter(Boolean).join("\n");
    const skill = routine.skillId ? Store.skill(routine.skillId) : null;

    try {
      const output = await AI.run(routine.aiAction, source, null, routine.skillId);

      Store.snapshot();
      const agent = Store.agent(routine.agentId);
      page.blocks.push(
        Store.makeBlock("callout", {
          text: `<strong>${U.escapeHtml(agent?.name || "Agente")}</strong> · ${U.escapeHtml(routine.name)}${skill ? ` · skill «${U.escapeHtml(skill.name)}» v${skill.version}` : ""}`,
          emoji: agent?.icon || "🤖", color: "purple",
        })
      );
      output.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) =>
        page.blocks.push(Store.makeBlock(/^[-•*]\s+/.test(line) ? "bulleted" : "paragraph", {
          text: U.escapeHtml(line.replace(/^[-•*]\s+/, "")),
        }))
      );

      routine.status = "done";
      routine.lastRun = new Date().toISOString();
      routine.runs = [{ at: routine.lastRun, ok: true, chars: output.length }, ...(routine.runs || [])].slice(0, 20);

      Store.recordVersion(page.id, "Rutina de agente");
      Store.updatePage(page.id, {});
      History.log("agent.run", `${routine.name} → «${page.title}»`);
      if (!silent) {
        U.toast(`${agent?.name || "Agente"} terminó «${routine.name}»`);
        App.renderPage(true);
      }
      return output;
    } catch (err) {
      routine.status = "todo";
      routine.runs = [{ at: new Date().toISOString(), ok: false, error: err.message }, ...(routine.runs || [])].slice(0, 20);
      Store.emit();
      if (!silent) U.toast("La rutina falló: " + err.message);
      return null;
    }
  }

  /* Programación mientras la pestaña esté abierta */
  let timer = null;
  function startScheduler() {
    clearInterval(timer);
    timer = setInterval(() => {
      const now = Date.now();
      Store.state.routines
        .filter((r) => r.everyMinutes > 0 && r.status !== "doing")
        .forEach((r) => {
          const last = r.lastRun ? new Date(r.lastRun).getTime() : 0;
          if (now - last >= r.everyMinutes * 60000) runRoutine(r, { silent: true });
        });
    }, 30000);
  }

  function routines() {
    const board = U.el("div", { class: "ag-board" });

    const paint = () => {
      board.innerHTML = "";
      COLUMNS.forEach((col) => {
        const cards = U.el("div", { class: "board-cards" });
        Store.state.routines.filter((r) => r.status === col.id).forEach((r) => {
          const agent = Store.agent(r.agentId);
          const skill = r.skillId ? Store.skill(r.skillId) : null;
          cards.append(
            U.el(
              "div",
              {
                class: "board-card ag-card", draggable: "true",
                ondragstart: (e) => e.dataTransfer.setData("text/plain", r.id),
              },
              U.el("div", { class: "board-card-title", text: r.name }),
              U.el(
                "div", { class: "board-card-meta" },
                U.el("span", { class: "tag b-" + (agent?.color || "gray"),
                  text: `${agent?.icon || "🤖"} ${agent?.name || "Agente"}` }),
                U.el("span", { class: "tag", text: AI.ACTIONS.find((a) => a.id === r.aiAction)?.name || r.aiAction }),
                skill ? U.el("span", { class: "tag b-purple", text: `${skill.icon} ${skill.name}` }) : null,
                r.everyMinutes ? U.el("span", { class: "tag b-blue", text: `cada ${r.everyMinutes} min` }) : null
              ),
              U.el("div", { class: "ag-card-foot" },
                U.el("span", { class: "sk-sub",
                  text: r.lastRun ? `Última ejecución ${U.timeAgo(r.lastRun)}` : "Nunca ejecutada" }),
                U.el("button", { class: "btn", html: ICONS.settings, title: "Configurar",
                  onclick: (e) => configure(r, e.currentTarget) }),
                U.el("button", { class: "btn btn-primary", text: "Ejecutar",
                  onclick: async (e) => {
                    e.currentTarget.textContent = "…";
                    await runRoutine(r);
                    paint();
                  } }))
            )
          );
        });

        board.append(
          U.el(
            "div",
            {
              class: "board-col ag-col",
              ondragover: (e) => e.preventDefault(),
              ondrop: (e) => {
                e.preventDefault();
                const r = Store.state.routines.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                if (!r) return;
                r.status = col.id;
                Store.emit();
                paint();
              },
            },
            U.el("div", { class: "board-col-head" },
              U.el("span", { class: "tag", text: col.name }),
              U.el("span", { class: "board-count",
                text: String(Store.state.routines.filter((r) => r.status === col.id).length) })),
            cards,
            col.id === "todo"
              ? U.el("button", {
                  class: "board-add", html: ICONS.plus + "<span>Nueva rutina</span>",
                  onclick: () => {
                    const page = Store.getPage(Store.state.openId);
                    Store.saveRoutine({
                      name: "Resumir " + (page?.title || "la página"),
                      targetPageId: page?.id || null,
                    });
                    paint();
                  },
                })
              : null
          )
        );
      });
    };

    function configure(routine, anchor) {
      const r = anchor.getBoundingClientRect();
      Menus.open({
        x: r.left - 240, y: r.bottom + 4, width: 270,
        items: [
          { label: "Renombrar…", icon: ICONS.rename, onClick: () => {
              const n = prompt("Nombre de la rutina:", routine.name);
              if (n) { Store.saveRoutine({ id: routine.id, name: n }); paint(); }
            } },
          { type: "label", label: "Agente" },
          ...Store.state.agents.map((a) => ({
            label: `${a.icon} ${a.name}`, sub: a.kind === "external" ? "Agente externo" : "Del espacio",
            active: routine.agentId === a.id,
            onClick: () => { Store.saveRoutine({ id: routine.id, agentId: a.id }); paint(); },
          })),
          { type: "separator" },
          { label: "Qué hace…", icon: ICONS.sparkle, onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 230,
                items: AI.ACTIONS.map((a) => ({
                  label: a.name, active: routine.aiAction === a.id,
                  onClick: () => { Store.saveRoutine({ id: routine.id, aiAction: a.id }); paint(); },
                })),
              });
              return true;
            } },
          { label: "Con la skill…", icon: ICONS.skills, onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 240,
                items: [
                  { label: "Sin skill", active: !routine.skillId,
                    onClick: () => { Store.saveRoutine({ id: routine.id, skillId: null }); paint(); } },
                  ...Store.enabledSkills().map((s) => ({
                    label: `${s.icon} ${s.name}`, sub: `v${s.version}`, active: routine.skillId === s.id,
                    onClick: () => { Store.saveRoutine({ id: routine.id, skillId: s.id }); paint(); },
                  })),
                ],
              });
              return true;
            } },
          { label: "Sobre la página…", icon: ICONS.doc, onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              const pages = Object.values(Store.state.pages).filter((p) => !p.deleted);
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 260, searchable: true,
                items: pages.map((p) => ({
                  label: `${p.icon || "📄"} ${U.escapeHtml(p.title || "Sin título")}`,
                  active: routine.targetPageId === p.id,
                  onClick: () => { Store.saveRoutine({ id: routine.id, targetPageId: p.id }); paint(); },
                })),
              });
              return true;
            } },
          { label: "Repetir cada…", icon: ICONS.routines, onClick: (e) => {
              const rr = e.currentTarget.getBoundingClientRect();
              Menus.open({
                x: rr.right + 4, y: rr.top, width: 220,
                items: [0, 5, 15, 60].map((m) => ({
                  label: m ? `Cada ${m} minutos` : "Solo cuando la ejecute yo",
                  active: routine.everyMinutes === m,
                  onClick: () => { Store.saveRoutine({ id: routine.id, everyMinutes: m }); paint(); },
                })),
              });
              return true;
            } },
          { type: "separator" },
          { label: "Eliminar rutina", icon: ICONS.trash, danger: true,
            onClick: () => { Store.deleteRoutine(routine.id); paint(); } },
        ],
      });
    }

    const card = U.el(
      "div", { class: "modal routines-modal" },
      U.el("div", { class: "tpl-head" },
        U.el("h2", { text: "Rutinas y agentes" }),
        U.el("span", { class: "share-mail", text: "Asigna trabajo a un agente y míralo ejecutarse" }),
        U.el("button", { class: "btn", html: ICONS.skills + "<span>Skills</span>",
          onclick: () => { modal.close(); skills(); } }),
        U.el("button", { class: "btn", html: ICONS.mcp + "<span>Conexiones</span>",
          onclick: () => { modal.close(); connections(); } }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })),
      board,
      U.el("div", { class: "features-foot" },
        U.el("span", { text: AI.hasKey()
          ? "Las rutinas usan Claude con tu clave conectada."
          : "Sin clave conectada, las rutinas usan el motor local. Las skills solo guían al modelo cuando hay clave." }),
        U.el("span", { class: "sk-sub", text: "Las repeticiones corren mientras esta pestaña esté abierta." }))
    );

    paint();
    const modal = Modals.overlay(card);
    return modal;
  }

  return { skills, connections, routines, runRoutine, startScheduler, SAMPLES };
})();
