/* ==========================================================================
   Store: estado del workspace, persistencia y operaciones sobre páginas
   ========================================================================== */
const Store = (() => {
  const KEY = "zas-notion-v1";
  const listeners = new Set();
  const undoStack = [];
  const redoStack = [];

  let state = null;

  const SCHEMA = 2;

  const emptyState = () => ({
    version: SCHEMA,
    theme: "light",
    workspace: "Zas Studio",
    sidebarWidth: 240,
    pages: {},
    rootOrder: [],
    favorites: [],
    openId: null,
    expanded: {},
    seenAnnouncement: false,
    recent: [],

    /* --- Funciones avanzadas: todas activas, sin planes ni cobros --- */
    aiUsed: 0,
    aiKey: "",
    aiModel: "claude-opus-5",

    /* --- Personas y espacios de equipo --- */
    me: "me",
    members: [
      { id: "me", name: "Tú", email: "tu@zasstudio.com", color: "blue", role: "owner", type: "member" },
      { id: "u_ana", name: "Ana Reyes", email: "ana@zasstudio.com", color: "purple", role: "admin", type: "member" },
      { id: "u_luis", name: "Luis Cabrera", email: "luis@zasstudio.com", color: "green", role: "member", type: "member" },
      { id: "u_sofia", name: "Sofía Marín", email: "sofia@zasstudio.com", color: "orange", role: "member", type: "member" },
      { id: "u_marco", name: "Marco Díaz", email: "marco@externo.com", color: "pink", role: "guest", type: "guest" },
    ],
    teamspaces: [
      { id: "ts_general", name: "General", icon: "🏢", private: false, memberIds: ["me", "u_ana", "u_luis", "u_sofia"] },
    ],

    /* --- Funciones de pago --- */
    comments: {},
    versions: {},
    audit: [],
    stats: {},
  });

  /** Lleva un estado guardado al esquema actual sin perder contenido. */
  function migrate(prev) {
    const base = emptyState();
    const next = { ...base, ...prev };
    next.version = SCHEMA;
    // Campos nuevos que un estado v1 no tenía
    for (const key of ["aiUsed", "aiKey", "aiModel", "me"]) {
      if (next[key] === undefined) next[key] = base[key];
    }
    for (const key of ["members", "teamspaces"]) {
      if (!Array.isArray(next[key]) || !next[key].length) next[key] = base[key];
    }
    for (const key of ["comments", "versions", "stats"]) {
      if (!next[key] || typeof next[key] !== "object") next[key] = {};
    }
    if (!Array.isArray(next.audit)) next.audit = [];
    for (const page of Object.values(next.pages || {})) {
      if (page.teamspaceId === undefined) page.teamspaceId = null;
      if (!page.share) page.share = { public: false, roles: {}, locked: false };
      if (page.locked === undefined) page.locked = false;
    }
    return next;
  }

  /* ------------------------------ Persistencia ---------------------------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) {
      console.warn("No se pudo leer el estado guardado", e);
    }
    if (!state || !state.pages) {
      state = emptyState();
      Templates.seedWorkspace(api);
    } else {
      state = migrate(state);
    }
    return state;
  }

  const save = U.debounce(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("No se pudo guardar", e);
    }
  }, 250);

  function emit() {
    save();
    listeners.forEach((fn) => fn(state));
  }

  const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

  /* --------------------------------- Undo -------------------------------- */
  function snapshot() {
    undoStack.push(JSON.stringify({ pages: state.pages, rootOrder: state.rootOrder }));
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(JSON.stringify({ pages: state.pages, rootOrder: state.rootOrder }));
    Object.assign(state, JSON.parse(undoStack.pop()));
    emit();
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(JSON.stringify({ pages: state.pages, rootOrder: state.rootOrder }));
    Object.assign(state, JSON.parse(redoStack.pop()));
    emit();
    return true;
  }

  /* -------------------------------- Bloques ------------------------------- */
  const makeBlock = (type = "paragraph", props = {}) => ({
    id: U.uid("b"),
    type,
    text: "",
    indent: 0,
    color: "default",
    checked: false,
    open: true,
    ...props,
  });

  /* -------------------------------- Páginas ------------------------------- */
  function createPage({ title = "", icon = "", parentId = null, blocks, db, cover, index, teamspaceId } = {}) {
    const parent = parentId ? state.pages[parentId] : null;
    const page = {
      id: U.uid("p"),
      title,
      icon,
      cover: cover || "",
      parentId,
      teamspaceId: teamspaceId !== undefined ? teamspaceId : parent ? parent.teamspaceId : null,
      share: { public: false, roles: {}, locked: false },
      children: [],
      blocks: blocks && blocks.length ? blocks : [makeBlock()],
      db: db || null,
      fullWidth: false,
      small: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    state.pages[page.id] = page;
    const list = parentId ? state.pages[parentId].children : state.rootOrder;
    if (typeof index === "number") list.splice(index, 0, page.id);
    else list.push(page.id);
    emit();
    return page;
  }

  const getPage = (id) => state.pages[id] || null;

  function updatePage(id, patch) {
    const page = state.pages[id];
    if (!page) return;
    Object.assign(page, patch, { updatedAt: new Date().toISOString() });
    emit();
  }

  function childrenOf(parentId) {
    const ids = parentId ? state.pages[parentId]?.children || [] : state.rootOrder;
    return ids.map((id) => state.pages[id]).filter((p) => p && !p.deleted);
  }

  function pathOf(id) {
    const out = [];
    let cur = state.pages[id];
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? state.pages[cur.parentId] : null;
    }
    return out;
  }

  function detach(id) {
    const page = state.pages[id];
    if (!page) return;
    const list = page.parentId ? state.pages[page.parentId]?.children : state.rootOrder;
    if (list) {
      const i = list.indexOf(id);
      if (i > -1) list.splice(i, 1);
    }
  }

  function movePage(id, newParentId, index = null) {
    const page = state.pages[id];
    if (!page || id === newParentId) return;
    // Evita mover una página dentro de su propia descendencia
    let probe = newParentId;
    while (probe) {
      if (probe === id) return;
      probe = state.pages[probe]?.parentId;
    }
    detach(id);
    page.parentId = newParentId;
    const list = newParentId ? state.pages[newParentId].children : state.rootOrder;
    if (index === null || index > list.length) list.push(id);
    else list.splice(index, 0, id);
    emit();
  }

  function deletePage(id) {
    snapshot();
    const walk = (pid) => {
      const p = state.pages[pid];
      if (!p) return;
      p.deleted = true;
      p.deletedAt = new Date().toISOString();
      p.children.forEach(walk);
    };
    walk(id);
    const fav = state.favorites.indexOf(id);
    if (fav > -1) state.favorites.splice(fav, 1);
    emit();
  }

  function restorePage(id) {
    const walk = (pid) => {
      const p = state.pages[pid];
      if (!p) return;
      p.deleted = false;
      delete p.deletedAt;
      p.children.forEach(walk);
    };
    walk(id);
    emit();
  }

  function purgePage(id) {
    const walk = (pid) => {
      const p = state.pages[pid];
      if (!p) return;
      [...p.children].forEach(walk);
      detach(pid);
      delete state.pages[pid];
    };
    walk(id);
    emit();
  }

  const trashed = () =>
    Object.values(state.pages).filter((p) => p.deleted && (!p.parentId || !state.pages[p.parentId]?.deleted));

  function duplicatePage(id, { intoParent = undefined } = {}) {
    const src = state.pages[id];
    if (!src) return null;
    const clone = (pid, parentId) => {
      const p = state.pages[pid];
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = U.uid("p");
      copy.parentId = parentId;
      copy.children = [];
      copy.blocks.forEach((b) => (b.id = U.uid("b")));
      if (copy.db) {
        copy.db.id = U.uid("db");
        copy.db.rows.forEach((r) => (r.id = U.uid("r")));
      }
      copy.createdAt = copy.updatedAt = new Date().toISOString();
      state.pages[copy.id] = copy;
      p.children.forEach((c) => copy.children.push(clone(c, copy.id)));
      return copy.id;
    };
    const parentId = intoParent === undefined ? src.parentId : intoParent;
    const newId = clone(id, parentId);
    state.pages[newId].title = (src.title || "Sin título") + " (copia)";
    const list = parentId ? state.pages[parentId].children : state.rootOrder;
    list.splice(list.indexOf(id) + 1, 0, newId);
    emit();
    return newId;
  }

  /* ------------------------------- Favoritos ------------------------------ */
  function toggleFavorite(id) {
    const i = state.favorites.indexOf(id);
    if (i > -1) state.favorites.splice(i, 1);
    else state.favorites.push(id);
    emit();
  }
  const isFavorite = (id) => state.favorites.includes(id);

  /* -------------------------------- Apertura ------------------------------ */
  function open(id) {
    if (!state.pages[id] || state.pages[id].deleted) return;
    state.openId = id;
    state.recent = [id, ...state.recent.filter((r) => r !== id)].slice(0, 12);
    trackView(id);
    // Abre los ancestros en el árbol lateral
    let p = state.pages[id].parentId;
    while (p) {
      state.expanded[p] = true;
      p = state.pages[p]?.parentId;
    }
    emit();
    location.hash = "#" + id;
  }

  /* -------------------------------- Búsqueda ------------------------------ */
  function search(query) {
    const q = query.trim().toLowerCase();
    const pages = Object.values(state.pages).filter((p) => !p.deleted);
    if (!q) {
      return state.recent.map((id) => state.pages[id]).filter((p) => p && !p.deleted).slice(0, 8);
    }
    const scored = [];
    for (const p of pages) {
      const title = (p.title || "Sin título").toLowerCase();
      let score = 0;
      if (title.startsWith(q)) score = 100;
      else if (title.includes(q)) score = 60;
      const body = p.blocks.map((b) => U.stripHtml(b.text)).join(" ").toLowerCase();
      if (body.includes(q)) score += 20;
      if (score) scored.push({ p, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 30).map((s) => s.p);
  }

  /* ------------------------------ Personas -------------------------------- */
  const member = (id) => state.members.find((m) => m.id === id) || null;
  const me = () => member(state.me) || state.members[0];
  const membersOf = (type) => state.members.filter((m) => !type || m.type === type);

  function addMember({ name, email, role = "member", type = "member" }) {
    const m = {
      id: U.uid("u"), name, email,
      color: U.pickColor(email || name), role, type,
    };
    state.members.push(m);
    emit();
    return m;
  }

  function removeMember(id) {
    if (id === state.me) return;
    state.members = state.members.filter((m) => m.id !== id);
    Object.values(state.pages).forEach((p) => delete p.share?.roles?.[id]);
    emit();
  }

  /* --------------------------- Espacios de equipo -------------------------- */
  function createTeamspace({ name, icon = "🏢", isPrivate = false }) {
    const ts = {
      id: U.uid("ts"), name, icon, private: isPrivate,
      memberIds: [state.me],
    };
    state.teamspaces.push(ts);
    emit();
    return ts;
  }

  function deleteTeamspace(id) {
    Object.values(state.pages).forEach((p) => {
      if (p.teamspaceId === id) p.teamspaceId = null;
    });
    state.teamspaces = state.teamspaces.filter((t) => t.id !== id);
    emit();
  }

  const teamspace = (id) => state.teamspaces.find((t) => t.id === id) || null;

  /** Páginas raíz de un espacio de equipo (o privadas si id es null). */
  const rootPagesOf = (teamspaceId) =>
    state.rootOrder
      .map((id) => state.pages[id])
      .filter((p) => p && !p.deleted && (p.teamspaceId || null) === (teamspaceId || null));

  /* ------------------------------ Comentarios ------------------------------ */
  function addComment(pageId, blockId, body) {
    if (!state.comments[pageId]) state.comments[pageId] = [];
    const c = {
      id: U.uid("c"), blockId, body,
      authorId: state.me, at: new Date().toISOString(),
      resolved: false, replies: [],
    };
    state.comments[pageId].push(c);
    emit();
    return c;
  }

  function replyComment(pageId, commentId, body) {
    const c = (state.comments[pageId] || []).find((x) => x.id === commentId);
    if (!c) return;
    c.replies.push({
      id: U.uid("c"), body, authorId: state.me, at: new Date().toISOString(),
    });
    emit();
  }

  function resolveComment(pageId, commentId, resolved = true) {
    const c = (state.comments[pageId] || []).find((x) => x.id === commentId);
    if (!c) return;
    c.resolved = resolved;
    emit();
  }

  function deleteComment(pageId, commentId) {
    state.comments[pageId] = (state.comments[pageId] || []).filter((c) => c.id !== commentId);
    emit();
  }

  const commentsOf = (pageId, { includeResolved = false } = {}) =>
    (state.comments[pageId] || []).filter((c) => includeResolved || !c.resolved);

  /* ------------------------------- Versiones -------------------------------- */
  function recordVersion(pageId, label = "Edición") {
    const page = state.pages[pageId];
    if (!page) return;
    if (!state.versions[pageId]) state.versions[pageId] = [];
    const list = state.versions[pageId];
    const last = list[list.length - 1];
    // Agrupa ediciones seguidas del mismo autor en una ventana de 5 minutos
    if (last && last.by === state.me && Date.now() - new Date(last.at).getTime() < 5 * 60 * 1000) {
      last.snapshot = snapshotOf(page);
      last.at = new Date().toISOString();
      save();
      return;
    }
    list.push({
      id: U.uid("v"), at: new Date().toISOString(), by: state.me, label,
      snapshot: snapshotOf(page),
    });
    if (list.length > 80) list.shift();
    save();
  }

  const snapshotOf = (page) =>
    JSON.parse(JSON.stringify({ title: page.title, icon: page.icon, blocks: page.blocks, db: page.db }));

  const versionsOf = (pageId) => (state.versions[pageId] || []).slice().reverse();

  function restoreVersion(pageId, versionId) {
    const v = (state.versions[pageId] || []).find((x) => x.id === versionId);
    const page = state.pages[pageId];
    if (!v || !page) return false;
    recordVersion(pageId, "Antes de restaurar");
    Object.assign(page, JSON.parse(JSON.stringify(v.snapshot)));
    page.updatedAt = new Date().toISOString();
    emit();
    return true;
  }

  /* -------------------------------- Auditoría ------------------------------- */
  function audit(action, detail) {
    state.audit.unshift({
      id: U.uid("a"), at: new Date().toISOString(),
      actorId: state.me, action, detail,
    });
    if (state.audit.length > 400) state.audit.pop();
    save();
  }

  /* ------------------------------- Analíticas ------------------------------- */
  function trackView(pageId) {
    if (!state.stats[pageId]) state.stats[pageId] = { views: [] };
    state.stats[pageId].views.push({ memberId: state.me, at: new Date().toISOString() });
    if (state.stats[pageId].views.length > 500) state.stats[pageId].views.shift();
    save();
  }

  const statsOf = (pageId) => state.stats[pageId] || { views: [] };

  /* ---------------------------------- API --------------------------------- */
  const api = {
    get state() { return state; },
    load, save, emit, subscribe, snapshot, undo, redo,
    makeBlock, createPage, getPage, updatePage, childrenOf, pathOf,
    movePage, deletePage, restorePage, purgePage, trashed, duplicatePage,
    toggleFavorite, isFavorite, open, search,
    member, me, membersOf, addMember, removeMember,
    createTeamspace, deleteTeamspace, teamspace, rootPagesOf,
    addComment, replyComment, resolveComment, deleteComment, commentsOf,
    recordVersion, versionsOf, restoreVersion, snapshotOf,
    audit, trackView, statsOf,
    reset() { localStorage.removeItem(KEY); location.reload(); },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON(json) {
      const next = JSON.parse(json);
      if (!next.pages) throw new Error("Archivo inválido");
      state = next;
      emit();
    },
  };
  return api;
})();
