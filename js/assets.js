/* ==========================================================================
   Archivos subidos: almacén en IndexedDB, compresión y selector de medios
   --------------------------------------------------------------------------
   Los bloques guardan una referencia «asset:ID», no el binario, para que el
   estado en localStorage siga siendo pequeño. Los blobs viven en IndexedDB.
   ========================================================================== */
const Assets = (() => {
  const DB_NAME = "zas-notion-assets";
  const STORE = "blobs";
  const MAX_DIM = 2000;          // lado máximo tras comprimir
  const QUALITY = 0.85;
  const COMPRESS_OVER = 400 * 1024;

  const urlCache = new Map();    // id -> objectURL
  const memory = new Map();      // respaldo si IndexedDB no está disponible
  let dbPromise = null;

  /* ------------------------------ IndexedDB ------------------------------- */
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!("indexedDB" in window)) return resolve(null);
      let req;
      try {
        req = indexedDB.open(DB_NAME, 1);
      } catch {
        return resolve(null);
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbPromise;
  }

  async function idbPut(id, blob) {
    const db = await open();
    if (!db) { memory.set(id, blob); return false; }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => { memory.set(id, blob); resolve(false); };
    });
  }

  async function idbGet(id) {
    if (memory.has(id)) return memory.get(id);
    const db = await open();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function idbDelete(id) {
    memory.delete(id);
    const db = await open();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
  }

  /* ------------------------------ Compresión ------------------------------ */
  /** Reduce fotos grandes conservando GIF y SVG intactos. */
  async function compress(file) {
    if (!/^image\//.test(file.type)) return file;
    if (/gif|svg/.test(file.type)) return file;

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file;
    }
    const { width, height } = bitmap;
    const needsResize = Math.max(width, height) > MAX_DIM;
    if (!needsResize && file.size < COMPRESS_OVER) {
      bitmap.close?.();
      return file;
    }

    const scale = needsResize ? MAX_DIM / Math.max(width, height) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((r) => canvas.toBlob(r, type, QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: blob.type });
  }

  const dimensionsOf = (file) =>
    new Promise((resolve) => {
      if (!/^image\//.test(file.type)) return resolve({ w: 0, h: 0 });
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    });

  /* --------------------------------- API ---------------------------------- */
  const isRef = (src) => typeof src === "string" && src.startsWith("asset:");
  const idOf = (ref) => String(ref).slice(6);

  /** Guarda un archivo y devuelve su referencia «asset:ID». */
  async function save(file) {
    const compressed = await compress(file);
    const { w, h } = await dimensionsOf(compressed);
    const id = U.uid("as");
    await idbPut(id, compressed);
    Store.state.assets = Store.state.assets || [];
    Store.state.assets.unshift({
      id, name: file.name, type: compressed.type || file.type,
      size: compressed.size, w, h, createdAt: new Date().toISOString(),
    });
    Store.save();
    urlCache.set(id, URL.createObjectURL(compressed));
    return { ref: "asset:" + id, id, name: file.name, size: compressed.size, w, h };
  }

  const meta = (id) => (Store.state.assets || []).find((a) => a.id === id) || null;

  /** URL utilizable ya en caché, o null si todavía hay que leerla. */
  const cachedUrl = (ref) => (isRef(ref) ? urlCache.get(idOf(ref)) || null : ref);

  /** Resuelve una referencia a una URL utilizable. */
  async function url(ref) {
    if (!isRef(ref)) return ref;
    const id = idOf(ref);
    if (urlCache.has(id)) return urlCache.get(id);
    const blob = await idbGet(id);
    if (!blob) return null;
    const objectUrl = URL.createObjectURL(blob);
    urlCache.set(id, objectUrl);
    return objectUrl;
  }

  /** Asigna la imagen a un elemento en cuanto esté disponible. */
  function attach(el, ref, prop = "src") {
    const ready = cachedUrl(ref);
    if (ready) {
      if (prop === "background") el.style.backgroundImage = `url("${ready}")`;
      else el[prop] = ready;
      return;
    }
    url(ref).then((resolved) => {
      if (!resolved) {
        el.dataset.missing = "true";
        return;
      }
      if (prop === "background") el.style.backgroundImage = `url("${resolved}")`;
      else el[prop] = resolved;
    });
  }

  async function remove(id) {
    await idbDelete(id);
    const cached = urlCache.get(id);
    if (cached) { URL.revokeObjectURL(cached); urlCache.delete(id); }
    Store.state.assets = (Store.state.assets || []).filter((a) => a.id !== id);
    Store.save();
  }

  const usage = () => {
    const list = Store.state.assets || [];
    return { count: list.length, bytes: list.reduce((n, a) => n + (a.size || 0), 0) };
  };

  const fmtSize = (bytes) =>
    bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB"
    : bytes >= 1024 ? Math.round(bytes / 1024) + " KB"
    : bytes + " B";

  /* Degradados para portadas, sin depender de la red */
  const GRADIENTS = [
    "linear-gradient(135deg,#2383e2,#9065b0 60%,#d9730d)",
    "linear-gradient(135deg,#448361,#cb912f)",
    "linear-gradient(135deg,#d44c47,#d9730d)",
    "linear-gradient(135deg,#337ea9,#448361)",
    "linear-gradient(120deg,#9065b0,#c14c8a)",
    "linear-gradient(160deg,#191919,#787774)",
    "linear-gradient(135deg,#f5c63f,#d9730d 70%,#d44c47)",
    "linear-gradient(200deg,#e7f3f8,#9065b0)",
  ];

  /* ============================== Selector ================================= */
  /**
   * Abre el selector de medios al estilo de Notion.
   * opts: { anchor, tabs:["upload","link","gallery"], onPick(value), accept, title }
   */
  function pick(opts = {}) {
    const tabs = opts.tabs || ["upload", "link", "recent"];
    // «kind» decide qué se acepta y cómo se redactan los textos: imagen o vídeo
    const kind = opts.kind === "video" ? "video" : "image";
    const accept = opts.accept || (kind === "video" ? "video/*" : "image/*");
    const T = kind === "video"
      ? { drop: "Arrastra un vídeo o haz clic para elegirlo",
          hint: "MP4, WebM o MOV. Se guarda en este navegador y se reproduce sin conexión.",
          link: "Pega el enlace del vídeo…", insert: "Insertar vídeo",
          linkHint: "Funciona con archivos .mp4/.webm y con enlaces de YouTube o Vimeo.",
          wrong: "Ese archivo no es un vídeo.", empty: "Todavía no has subido ningún vídeo." }
      : { drop: "Arrastra una imagen o haz clic para elegirla",
          hint: "También puedes pegarla con ⌘/Ctrl + V. Se guarda en este navegador.",
          link: "Pega el enlace de la imagen…", insert: "Insertar imagen",
          linkHint: "Funciona con cualquier URL pública que termine en .jpg, .png, .webp o .gif.",
          wrong: "Ese archivo no es una imagen.", empty: "Todavía no has subido ninguna imagen." };
    let active = tabs[0];

    const panel = U.el("div", { class: "media-picker" });
    const body = U.el("div", { class: "media-body" });

    const choose = (value) => {
      close();
      opts.onPick?.(value);
    };

    /* --- Subir --- */
    const uploadPane = () => {
      const input = U.el("input", {
        type: "file", accept, style: { display: "none" },
        onchange: () => input.files[0] && handleFiles(input.files),
      });

      const zone = U.el(
        "div",
        {
          class: "media-drop",
          onclick: () => input.click(),
          ondragover: (e) => { e.preventDefault(); zone.classList.add("is-over"); },
          ondragleave: () => zone.classList.remove("is-over"),
          ondrop: (e) => {
            e.preventDefault();
            zone.classList.remove("is-over");
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          },
        },
        U.el("span", { class: "media-drop-icon", html: kind === "video" ? ICONS.video : ICONS.image }),
        U.el("strong", { text: T.drop }),
        U.el("span", { class: "media-hint", text: T.hint })
      );

      const status = U.el("div", { class: "media-status" });

      async function handleFiles(files) {
        const file = files[0];
        if (!file) return;
        const family = kind === "video" ? /^video\//: /^image\//;
        if (!family.test(file.type)) {
          status.textContent = T.wrong;
          return;
        }
        status.textContent = "Guardando…";
        try {
          const saved = await save(file);
          choose(saved.ref);
        } catch (err) {
          status.textContent = "No se pudo guardar: " + err.message;
        }
      }

      panel.addEventListener("paste", (e) => {
        const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith(kind + "/"));
        if (item) handleFiles([item.getAsFile()]);
      });

      return U.el("div", {}, zone, input, status);
    };

    /* --- Enlace --- */
    const linkPane = () => {
      const input = U.el("input", {
        class: "media-input", placeholder: T.link,
        onkeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) choose(e.target.value.trim()); },
      });
      return U.el(
        "div", { class: "media-link" },
        input,
        U.el("button", {
          class: "btn btn-primary", text: T.insert,
          onclick: () => input.value.trim() && choose(input.value.trim()),
        }),
        U.el("div", { class: "media-hint", text: T.linkHint })
      );
    };

    /* --- Subidas anteriores --- */
    const recentPane = () => {
      const list = (Store.state.assets || []).filter((a) =>
        kind === "video" ? /^video\//.test(a.type || "") : !/^video\//.test(a.type || ""));
      if (!list.length)
        return U.el("div", { class: "media-empty", text: T.empty });

      const grid = U.el("div", { class: "media-grid" });
      list.slice(0, 40).forEach((a) => {
        const isVideo = /^video\//.test(a.type || "");
        const thumb = U.el("div", {
          class: "media-thumb" + (isVideo ? " is-video" : ""), title: `${a.name} · ${fmtSize(a.size)}`,
          onclick: () => choose("asset:" + a.id),
        });
        if (isVideo) {
          // La miniatura es el propio vídeo parado en su primer fotograma
          const v = U.el("video", { muted: true, playsinline: true, preload: "metadata" });
          attach(v, "asset:" + a.id);
          thumb.append(v);
        } else attach(thumb, "asset:" + a.id, "background");
        thumb.append(
          U.el("button", {
            class: "media-del", html: ICONS.trash, title: "Eliminar del almacén",
            onclick: async (e) => {
              e.stopPropagation();
              await remove(a.id);
              body.innerHTML = "";
              body.append(recentPane());
            },
          })
        );
        grid.append(thumb);
      });
      const u = usage();
      return U.el("div", {}, grid,
        U.el("div", { class: "media-hint", text: `${u.count} archivo(s) · ${fmtSize(u.bytes)} en este navegador` }));
    };

    /* --- Galería de degradados --- */
    const galleryPane = () => {
      const grid = U.el("div", { class: "media-grid" });
      GRADIENTS.forEach((g) =>
        grid.append(
          U.el("div", {
            class: "media-thumb", style: { backgroundImage: g },
            onclick: () => choose(g),
          })
        )
      );
      return grid;
    };

    const PANES = { upload: uploadPane, link: linkPane, recent: recentPane, gallery: galleryPane };
    const LABELS = { upload: "Subir archivo", link: "Insertar enlace", recent: "Subidas", gallery: "Galería" };

    const tabsRow = U.el("div", { class: "media-tabs" });
    const paint = () => {
      tabsRow.innerHTML = "";
      tabs.forEach((t) =>
        tabsRow.append(
          U.el("button", {
            class: "media-tab" + (t === active ? " is-active" : ""),
            text: LABELS[t],
            onclick: () => { active = t; paint(); },
          })
        )
      );
      if (opts.onRemove)
        tabsRow.append(
          U.el("button", {
            class: "media-tab media-remove", text: "Quitar",
            onclick: () => { close(); opts.onRemove(); },
          })
        );
      body.innerHTML = "";
      body.append(PANES[active]());
    };

    panel.append(tabsRow, body);
    document.body.append(panel);
    paint();

    // Posicionamiento junto al elemento que lo abrió
    const rect = (opts.anchor || document.body).getBoundingClientRect();
    const w = panel.offsetWidth, h = panel.offsetHeight;
    panel.style.left = U.clamp(rect.left, 10, window.innerWidth - w - 10) + "px";
    panel.style.top =
      (window.innerHeight - rect.bottom > h + 16 ? rect.bottom + 6 : Math.max(10, rect.top - h - 6)) + "px";
    panel.tabIndex = -1;
    panel.focus();

    function close() {
      panel.remove();
      document.removeEventListener("mousedown", away, true);
      document.removeEventListener("keydown", onKey, true);
    }
    const away = (e) => { if (!panel.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    setTimeout(() => {
      document.addEventListener("mousedown", away, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);

    return { close };
  }

  /* -------------------------- Exportar / importar -------------------------- */
  const toDataUrl = (blob) =>
    new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });

  /** Empaqueta los binarios para que el JSON exportado sea autocontenido. */
  async function exportAll() {
    const out = {};
    for (const a of Store.state.assets || []) {
      const blob = await idbGet(a.id);
      if (blob) out[a.id] = await toDataUrl(blob);
    }
    return out;
  }

  async function importAll(map) {
    for (const [id, dataUrl] of Object.entries(map || {})) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        await idbPut(id, blob);
      } catch { /* un archivo ilegible no debe romper la importación */ }
    }
  }

  return {
    save, url, cachedUrl, attach, remove, meta, usage, fmtSize,
    isRef, idOf, pick, GRADIENTS, exportAll, importAll,
  };
})();
