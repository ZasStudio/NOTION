/* ==========================================================================
   Store: estado del workspace, persistencia y operaciones sobre páginas
   ========================================================================== */
const Store = (() => {
  const KEY = "zas-notion-v1";
  const listeners = new Set();
  const undoStack = [];
  const redoStack = [];

  let state = null;

  const emptyState = () => ({
    version: 1,
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
  });

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
  function createPage({ title = "", icon = "", parentId = null, blocks, db, cover, index } = {}) {
    const page = {
      id: U.uid("p"),
      title,
      icon,
      cover: cover || "",
      parentId,
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

  /* ---------------------------------- API --------------------------------- */
  const api = {
    get state() { return state; },
    load, save, emit, subscribe, snapshot, undo, redo,
    makeBlock, createPage, getPage, updatePage, childrenOf, pathOf,
    movePage, deletePage, restorePage, purgePage, trashed, duplicatePage,
    toggleFavorite, isFavorite, open, search,
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
