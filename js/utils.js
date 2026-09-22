/* Utilidades compartidas */
const U = (() => {
  const uid = (p = "b") =>
    p + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  /** Crea un elemento con clase, atributos e hijos. */
  function el(tag, opts = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(opts)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "dataset") Object.assign(node.dataset, v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function debounce(fn, ms = 300) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  }

  const escapeHtml = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /** Quita etiquetas peligrosas del HTML enriquecido de un bloque. */
  function sanitizeInline(html = "") {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    tpl.content.querySelectorAll("script, style, iframe, object, embed").forEach((n) => n.remove());
    tpl.content.querySelectorAll("*").forEach((n) => {
      for (const attr of Array.from(n.attributes)) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();
        if (name.startsWith("on")) n.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && val.startsWith("javascript:"))
          n.removeAttribute(attr.name);
      }
      // Las menciones conservan su referencia y siguen sin ser editables
      if (n.classList?.contains("mention")) n.setAttribute("contenteditable", "false");
    });
    return tpl.innerHTML;
  }

  const stripHtml = (html = "") => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || "";
  };

  const today = () => new Date().toISOString().slice(0, 10);

  function formatDate(iso, opts) {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, opts || { month: "short", day: "numeric", year: "numeric" });
  }

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
    return formatDate(iso);
  }

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  /** Coloca el cursor al inicio/final de un elemento editable. */
  function placeCaret(node, atEnd = true) {
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(!atEnd);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Desplazamiento del cursor dentro del nodo (en caracteres). */
  function caretOffset(node) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(node);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  }

  const atStart = (node) => caretOffset(node) === 0;
  const atEnd = (node) => caretOffset(node) >= (node.textContent || "").length;

  /** Icono de una página: emoji, o imagen si es un archivo subido o una URL. */
  function iconNode(icon, size = 16) {
    const value = icon || "📄";
    const isImage = value.startsWith("asset:") || /^https?:\/\//.test(value) || value.startsWith("data:");
    if (!isImage) return el("span", { class: "page-emoji", text: value, style: { fontSize: size + "px" } });
    const node = el("span", {
      class: "icon-img",
      style: { width: size + "px", height: size + "px" },
    });
    if (typeof Assets !== "undefined") Assets.attach(node, value, "background");
    else node.style.backgroundImage = `url("${value}")`;
    return node;
  }

  function toast(msg) {
    document.querySelector(".toast")?.remove();
    const t = el("div", { class: "toast", text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  const NOTION_COLORS = [
    "default", "gray", "brown", "orange", "yellow",
    "green", "blue", "purple", "pink", "red",
  ];

  const COLOR_LABELS = {
    default: "Predeterminado", gray: "Gris", brown: "Café", orange: "Naranja",
    yellow: "Amarillo", green: "Verde", blue: "Azul", purple: "Morado",
    pink: "Rosa", red: "Rojo",
  };

  const pickColor = (seed = "") => {
    const pool = NOTION_COLORS.slice(1);
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
  };

  return {
    uid, el, $, $$, debounce, escapeHtml, sanitizeInline, stripHtml, today,
    formatDate, timeAgo, clamp, placeCaret, caretOffset, atStart, atEnd, toast,
    NOTION_COLORS, COLOR_LABELS, pickColor, iconNode,
  };
})();
