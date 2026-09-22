/* ==========================================================================
   Colaboración: personas, permisos de página, compartir y comentarios
   ========================================================================== */
const Collab = (() => {
  const ROLES = [
    { id: "full", name: "Acceso total", desc: "Puede editar, compartir y eliminar." },
    { id: "edit", name: "Puede editar", desc: "Puede editar, pero no compartir." },
    { id: "comment", name: "Puede comentar", desc: "Puede leer y comentar." },
    { id: "view", name: "Puede ver", desc: "Solo lectura." },
  ];

  const roleName = (id) => (ROLES.find((r) => r.id === id) || ROLES[0]).name;

  /* -------------------------------- Avatares ------------------------------- */
  function avatar(member, size = 22) {
    if (!member) return U.el("span");
    const initials = member.name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return U.el("span", {
      class: "avatar b-" + member.color,
      title: `${member.name} · ${member.email}`,
      text: initials,
      style: { width: size + "px", height: size + "px", fontSize: Math.round(size * 0.42) + "px" },
    });
  }

  function facepile(memberIds, max = 4) {
    const wrap = U.el("div", { class: "facepile" });
    memberIds.slice(0, max).forEach((id) => wrap.append(avatar(Store.member(id), 22)));
    if (memberIds.length > max)
      wrap.append(U.el("span", { class: "avatar b-gray", text: "+" + (memberIds.length - max) }));
    return wrap;
  }

  /* ------------------------------ Compartir -------------------------------- */
  function shareModal(page) {
    const share = page.share || (page.share = { public: false, roles: {}, locked: false });

    const peopleList = U.el("div", { class: "share-people" });

    const paintPeople = () => {
      peopleList.innerHTML = "";
      const owner = Store.me();
      peopleList.append(personRow(owner, "full", true));
      Store.state.members
        .filter((m) => m.id !== owner.id && share.roles[m.id])
        .forEach((m) => peopleList.append(personRow(m, share.roles[m.id], false)));
    };

    function personRow(member, role, locked) {
      return U.el(
        "div", { class: "share-row" },
        avatar(member, 28),
        U.el(
          "div", { class: "share-who" },
          U.el("div", { class: "share-name", text: member.name + (locked ? " (tú)" : "") }),
          U.el("div", { class: "share-mail", text: member.email + (member.type === "guest" ? " · invitado" : "") })
        ),
        locked
          ? U.el("span", { class: "share-role", text: "Propietario" })
          : U.el("button", {
              class: "share-role",
              html: `${roleName(role)} ${ICONS.chevronDown}`,
              onclick: (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                Menus.open({
                  x: r.left - 60, y: r.bottom + 4, width: 240,
                  items: [
                    ...ROLES.map((opt) => ({
                      label: opt.name, sub: opt.desc, active: opt.id === role,
                      onClick: () => {
                        share.roles[member.id] = opt.id;
                        Store.audit("page.permission", `${member.name} → ${opt.name} en «${page.title}»`);
                        Store.emit();
                        paintPeople();
                      },
                    })),
                    { type: "separator" },
                    {
                      label: "Quitar acceso", icon: ICONS.trash, danger: true,
                      onClick: () => {
                        delete share.roles[member.id];
                        Store.emit();
                        paintPeople();
                      },
                    },
                  ],
                });
              },
            })
      );
    }

    const invite = U.el("input", {
      class: "share-input", placeholder: "Correo o nombre…",
      onkeydown: (e) => {
        if (e.key !== "Enter" || !e.target.value.trim()) return;
        const value = e.target.value.trim();
        let m = Store.state.members.find(
          (x) => x.email.toLowerCase() === value.toLowerCase() || x.name.toLowerCase() === value.toLowerCase()
        );
        if (!m) {
          m = Store.addMember({ name: value.split("@")[0], email: value.includes("@") ? value : value + "@externo.com", role: "guest", type: "guest" });
        }
        share.roles[m.id] = "edit";
        Store.audit("page.invite", `${m.name} invitado a «${page.title}»`);
        Store.emit();
        e.target.value = "";
        paintPeople();
        U.toast(`${m.name} ahora tiene acceso`);
      },
    });

    const publicRow = U.el(
      "div", { class: "share-public" },
      U.el(
        "div", { class: "share-who" },
        U.el("div", { class: "share-name", text: "Publicar en la web" }),
        U.el("div", { class: "share-mail", text: share.public ? "Cualquiera con el enlace puede verla" : "Solo las personas invitadas" })
      ),
      U.el("button", {
        class: "switch" + (share.public ? " is-on" : ""),
        onclick: (e) => {
          share.public = !share.public;
          e.currentTarget.classList.toggle("is-on", share.public);
          publicRow.querySelector(".share-mail").textContent = share.public
            ? "Cualquiera con el enlace puede verla"
            : "Solo las personas invitadas";
          linkRow.style.display = share.public ? "flex" : "none";
          Store.audit("page.publish", `«${page.title}» ${share.public ? "publicada" : "despublicada"}`);
          Store.emit();
        },
      })
    );

    const publicUrl = `${location.origin}${location.pathname}#${page.id}`;
    const linkRow = U.el(
      "div", { class: "share-link", style: { display: share.public ? "flex" : "none" } },
      U.el("input", { value: publicUrl, readonly: true }),
      U.el("button", {
        class: "btn btn-primary", text: "Copiar",
        onclick: () => { navigator.clipboard?.writeText(publicUrl); U.toast("Enlace copiado"); },
      })
    );

    const card = U.el(
      "div", { class: "modal share-modal" },
      U.el(
        "div", { class: "share-head" },
        U.el("div", { class: "share-invite" }, invite,
          U.el("button", { class: "btn btn-primary", text: "Invitar", onclick: () => invite.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })) })),
        U.el("div", { class: "share-hint", text: `${Store.membersOf("guest").length} invitados · sin límite` })
      ),
      peopleList,
      U.el("div", { class: "menu-sep" }),
      publicRow,
      linkRow,
      U.el(
        "div", { class: "share-foot" },
        U.el("button", {
          class: "btn", html: (page.share.locked ? ICONS.lock : ICONS.doc) + `<span>${page.share.locked ? "Desbloquear página" : "Bloquear página"}</span>`,
          onclick: (e) => {
            page.share.locked = !page.share.locked;
            Store.emit();
            App.renderPage(true);
            U.toast(page.share.locked ? "Página bloqueada: solo lectura" : "Página desbloqueada");
            modal.close();
          },
        }),
        U.el("button", {
          class: "btn", html: ICONS.people + "<span>Gestionar personas</span>",
          onclick: () => { modal.close(); peopleModal(); },
        })
      )
    );

    paintPeople();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ----------------------------- Personas (admin) --------------------------- */
  function peopleModal() {
    const list = U.el("div", { class: "people-list" });

    const paint = () => {
      list.innerHTML = "";
      ["member", "guest"].forEach((type) => {
        const group = Store.membersOf(type);
        list.append(
          U.el("div", { class: "menu-label", text: `${type === "member" ? "Miembros" : "Invitados"} · ${group.length}` })
        );
        group.forEach((m) =>
          list.append(
            U.el(
              "div", { class: "share-row" },
              avatar(m, 30),
              U.el(
                "div", { class: "share-who" },
                U.el("div", { class: "share-name", text: m.name }),
                U.el("div", { class: "share-mail", text: m.email })
              ),
              U.el("button", {
                class: "share-role", html: `${m.role} ${ICONS.chevronDown}`,
                onclick: (e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  Menus.open({
                    x: r.left - 40, y: r.bottom + 4, width: 200,
                    items: [
                      ...["owner", "admin", "member", "guest"].map((role) => ({
                        label: role, active: m.role === role,
                        onClick: () => { m.role = role; Store.emit(); paint(); },
                      })),
                      { type: "separator" },
                      m.id !== Store.state.me && {
                        label: "Quitar del espacio", icon: ICONS.trash, danger: true,
                        onClick: () => { Store.removeMember(m.id); paint(); },
                      },
                    ].filter(Boolean),
                  });
                },
              })
            )
          )
        );
      });
    };

    const card = U.el(
      "div", { class: "modal share-modal" },
      U.el(
        "div", { class: "tpl-head" },
        U.el("h2", { text: "Personas" }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => modal.close() })
      ),
      U.el(
        "div", { class: "share-head" },
        U.el(
          "div", { class: "share-invite" },
          U.el("input", {
            class: "share-input", placeholder: "Añadir por correo…",
            onkeydown: (e) => {
              if (e.key !== "Enter" || !e.target.value.trim()) return;
              const email = e.target.value.trim();
              Store.addMember({ name: email.split("@")[0], email, role: "member" });
              Store.audit("workspace.invite", email);
              e.target.value = "";
              paint();
            },
          })
        ),
        U.el("div", { class: "share-hint", text: "SSO y aprovisionamiento activos" })
      ),
      list
    );
    paint();
    const modal = Modals.overlay(card);
    return modal;
  }

  /* ------------------------------- Comentarios ------------------------------ */
  let panelOpen = false;

  const togglePanel = (force) => {
    panelOpen = force === undefined ? !panelOpen : force;
    document.body.classList.toggle("comments-open", panelOpen);
    renderPanel();
  };

  function renderPanel() {
    const host = U.$("#comments");
    if (!host) return;
    host.innerHTML = "";
    const page = Store.getPage(Store.state.openId);
    if (!page) return;

    let showResolved = false;

    const body = U.el("div", { class: "cm-body" });

    const paint = () => {
      body.innerHTML = "";
      const items = Store.commentsOf(page.id, { includeResolved: showResolved });
      if (!items.length) {
        body.append(
          U.el("div", { class: "cm-empty" },
            U.el("div", { html: ICONS.comment }),
            U.el("p", { text: "Aún no hay comentarios. Selecciona el menú de un bloque y elige «Comentar»." }))
        );
        return;
      }
      items.forEach((c) => body.append(thread(c)));
    };

    function thread(c) {
      const author = Store.member(c.authorId);
      const block = page.blocks.find((b) => b.id === c.blockId);
      const quote = block ? U.stripHtml(block.text).slice(0, 70) : "";
      const wrap = U.el("div", { class: "cm-thread" + (c.resolved ? " is-resolved" : "") });

      wrap.append(
        quote
          ? U.el("div", {
              class: "cm-quote", text: quote,
              onclick: () => {
                const node = document.querySelector(`[data-id="${c.blockId}"]`);
                node?.scrollIntoView({ behavior: "smooth", block: "center" });
                node?.classList.add("is-flash");
                setTimeout(() => node?.classList.remove("is-flash"), 1200);
              },
            })
          : null,
        U.el(
          "div", { class: "cm-head" },
          avatar(author, 22),
          U.el("span", { class: "cm-author", text: author?.name || "Alguien" }),
          U.el("span", { class: "cm-time", text: U.timeAgo(c.at) }),
          U.el("button", {
            class: "icon-btn", html: ICONS.check, title: c.resolved ? "Reabrir" : "Resolver",
            onclick: () => { Store.resolveComment(page.id, c.id, !c.resolved); paint(); },
          }),
          U.el("button", {
            class: "icon-btn", html: ICONS.trash, title: "Eliminar",
            onclick: () => { Store.deleteComment(page.id, c.id); paint(); },
          })
        ),
        U.el("div", { class: "cm-text", text: c.body })
      );

      c.replies.forEach((r) => {
        const ra = Store.member(r.authorId);
        wrap.append(
          U.el(
            "div", { class: "cm-reply" },
            U.el("div", { class: "cm-head" }, avatar(ra, 20),
              U.el("span", { class: "cm-author", text: ra?.name || "Alguien" }),
              U.el("span", { class: "cm-time", text: U.timeAgo(r.at) })),
            U.el("div", { class: "cm-text", text: r.body })
          )
        );
      });

      wrap.append(
        U.el("input", {
          class: "cm-input", placeholder: "Responder…",
          onkeydown: (e) => {
            if (e.key !== "Enter" || !e.target.value.trim()) return;
            Store.replyComment(page.id, c.id, e.target.value.trim());
            e.target.value = "";
            paint();
          },
        })
      );
      return wrap;
    }

    host.append(
      U.el(
        "div", { class: "cm-top" },
        U.el("strong", { text: "Comentarios" }),
        U.el("button", {
          class: "btn", text: "Resueltos",
          onclick: (e) => {
            showResolved = !showResolved;
            e.currentTarget.classList.toggle("is-on", showResolved);
            paint();
          },
        }),
        U.el("button", { class: "icon-btn", html: ICONS.x, onclick: () => togglePanel(false) })
      ),
      body
    );
    paint();
  }

  /** Abre el compositor para comentar un bloque concreto. */
  function commentOnBlock(page, blockId) {
    const text = prompt("Comentario:");
    if (!text || !text.trim()) return;
    Store.addComment(page.id, blockId, text.trim());
    Store.audit("comment.add", `en «${page.title}»`);
    togglePanel(true);
    App.renderPage(true);
  }

  const countFor = (pageId) => Store.commentsOf(pageId).length;

  return {
    ROLES, roleName, avatar, facepile, shareModal, peopleModal,
    togglePanel, renderPanel, commentOnBlock, countFor,
    get panelOpen() { return panelOpen; },
  };
})();
